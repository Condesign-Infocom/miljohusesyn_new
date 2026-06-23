import { type AppDb } from '$lib/server/db/client';
import { createRuntimeGateway, type RuntimeGateway } from '$lib/server/db/runtime-gateway';
import { type ChecklistRuntimeData } from '$lib/server/db/runtime-read-repository';
import { type RuntimeChecklistTree } from '$lib/server/db/runtime-query-repository';
import type { ChecklistList, ChecklistOverview, ChecklistSectionDetail } from '$lib/types/checklists';
import { canViewQuestion, canViewSection } from './visibility';

type ChecklistTree = RuntimeChecklistTree;
type VisibilityContext = Awaited<ReturnType<RuntimeGateway['loadChecklistQuery']>>['context'];
type CompositeMode = 'full' | 'cc' | 'new';
type ResolvedChecklistTarget =
	| { kind: 'single'; slug: string }
	| { kind: 'composite'; slug: string; mode: CompositeMode };
type ChecklistTargetDescriptor = {
	slug: string;
	mode: CompositeMode;
	showExportActions: boolean;
};
type TreeQuestion = ChecklistTree['questions'][number];
type TreeGroup = ChecklistTree['groups'][number];
type TreeSection = ChecklistTree['sections'][number];
type CompositeBundle = {
	checklistId: number;
	tree: ChecklistTree;
};
type CompositeVisibleSection = {
	bundle: CompositeBundle;
	section: TreeSection;
};
type CompositeAreaSummary = {
	prefixKey: string;
	checklistSlug: string;
	nodeId: string;
	title: string;
	completedQuestions: number;
	totalQuestions: number;
	members: CompositeVisibleSection[];
};

const COMPOSITE_TARGETS: ChecklistTargetDescriptor[] = [
	{ slug: 'miljohusesyn', mode: 'full', showExportActions: true },
	{ slug: 'grundvillkor', mode: 'cc', showExportActions: false },
	{ slug: 'nya-fragor', mode: 'new', showExportActions: false }
];

const CHECKLIST_ORDER = ['miljohusesyn-g', 'miljohusesyn-v', 'miljohusesyn-d', 'miljohusesyn-a'];

export async function getChecklistList(db: AppDb, userId: number): Promise<ChecklistList> {
	const { data, context, assignedChecklistIds } = await createRuntimeGateway(db).loadChecklistListQuery(
		userId
	);
	const assignedChecklists = orderedAssignedChecklists(data, assignedChecklistIds);
	const bundles = assignedChecklists.map((checklist) => ({
		checklistId: checklist.id,
		tree: buildChecklistTreeFromData(data, checklist.id)
	}));

	return {
		items: COMPOSITE_TARGETS.map((target) => ({
			slug: target.slug,
			title: compositeChecklistTitle(target.mode),
			...summarizeCompositeProgress(data, bundles, userId, context, target.mode)
		})).filter((item) => item.totalQuestions > 0)
	};
}

export async function getChecklistOverview(
	db: AppDb,
	checklistSlug: string,
	userId: number
): Promise<ChecklistOverview | null> {
	const resolved = resolveChecklistTarget(checklistSlug);

	if (resolved.kind === 'single') {
		return getSingleChecklistOverview(db, resolved.slug, userId);
	}

	return getCompositeChecklistOverview(db, resolved, userId);
}

export async function getChecklistSectionDetail(
	db: AppDb,
	checklistSlug: string,
	sectionNodeId: string,
	userId: number
): Promise<ChecklistSectionDetail | null> {
	const resolved = resolveChecklistTarget(checklistSlug);

	if (resolved.kind === 'single') {
		return getSingleChecklistSectionDetail(db, resolved.slug, sectionNodeId, userId);
	}

	return getCompositeChecklistSectionDetail(db, resolved, sectionNodeId, userId);
}

function resolveChecklistTarget(checklistSlug: string): ResolvedChecklistTarget {
	const composite = COMPOSITE_TARGETS.find((target) => target.slug === checklistSlug);
	if (composite) {
		return { kind: 'composite', slug: composite.slug, mode: composite.mode };
	}

	return { kind: 'single', slug: checklistSlug };
}

async function getSingleChecklistOverview(
	db: AppDb,
	checklistSlug: string,
	userId: number
): Promise<ChecklistOverview | null> {
	const { data, context, checklist, hasAssignment, tree } = await createRuntimeGateway(
		db
	).loadChecklistQuery(checklistSlug, userId);

	if (!checklist || !hasAssignment || !context || !tree) {
		return null;
	}

	const visibleSections = tree.sections.filter((section) =>
		sectionHasVisibleQuestions(tree, context, section.id, 'full')
	);

	return {
		slug: checklist.slug,
		title: checklist.title,
		sections: visibleSections.map((section) => ({
			nodeId: section.nodeId,
			prefix: section.prefix,
			title: section.title,
			...summarizeSectionsProgressFromData(data, tree, [section.id], userId, context, 'full')
		})),
		showExportActions: true
	};
}

async function getCompositeChecklistOverview(
	db: AppDb,
	resolved: Extract<ResolvedChecklistTarget, { kind: 'composite' }>,
	userId: number
): Promise<ChecklistOverview | null> {
	const { data, context, assignedChecklistIds } = await createRuntimeGateway(db).loadChecklistListQuery(
		userId
	);
	if (!context) {
		return null;
	}

	const assignedChecklists = orderedAssignedChecklists(data, assignedChecklistIds);
	const bundles = assignedChecklists.map((checklist) => ({
		checklistId: checklist.id,
		tree: buildChecklistTreeFromData(data, checklist.id)
	}));
	const visibleSections = flattenVisibleCompositeSections(bundles, context, resolved.mode);

	if (visibleSections.length === 0) {
		return null;
	}

	const descriptor = COMPOSITE_TARGETS.find((target) => target.slug === resolved.slug)!;

	return {
		slug: descriptor.slug,
		title: compositeChecklistTitle(descriptor.mode),
		sections: visibleSections.map(({ bundle, section }) => ({
			nodeId: section.nodeId,
			prefix: section.prefix,
			title: section.title,
			...summarizeSectionsProgressFromData(data, bundle.tree, [section.id], userId, context, resolved.mode)
		})),
		showExportActions: descriptor.showExportActions
	};
}

async function getSingleChecklistSectionDetail(
	db: AppDb,
	checklistSlug: string,
	sectionNodeId: string,
	userId: number
): Promise<ChecklistSectionDetail | null> {
	const { data, context, checklist, hasAssignment, tree, answerByQuestionId, factNodeIdByQuestionId } =
		await createRuntimeGateway(db).loadChecklistQuery(checklistSlug, userId);

	if (!checklist || !hasAssignment || !context || !tree) {
		return null;
	}

	const section = tree.sections.find((entry) => entry.nodeId === sectionNodeId);

	if (!section || !sectionHasVisibleQuestions(tree, context, section.id, 'full')) {
		return null;
	}

	const visibleSections = tree.sections
		.filter((entry) => sectionHasVisibleQuestions(tree, context, entry.id, 'full'))
		.map((entry) => ({
			nodeId: entry.nodeId,
			prefix: entry.prefix,
			title: entry.title,
			...summarizeSectionsProgressFromData(data, tree, [entry.id], userId, context, 'full')
		}));
	const sectionIndex = visibleSections.findIndex((entry) => entry.nodeId === section.nodeId);

	return {
		checklistSlug: checklist.slug,
		checklistTitle: checklist.title,
		sections: visibleSections,
		section: {
			nodeId: section.nodeId,
			prefix: section.prefix,
			title: section.title,
			description: section.description
		},
		previousSection: sectionIndex > 0 ? visibleSections[sectionIndex - 1] ?? null : null,
		nextSection:
			sectionIndex >= 0 && sectionIndex < visibleSections.length - 1 ? visibleSections[sectionIndex + 1] ?? null : null,
		groups: buildVisibleGroups(tree, context, section.id, answerByQuestionId, factNodeIdByQuestionId, 'full')
	};
}

async function getCompositeChecklistSectionDetail(
	db: AppDb,
	resolved: Extract<ResolvedChecklistTarget, { kind: 'composite' }>,
	sectionNodeId: string,
	userId: number
): Promise<ChecklistSectionDetail | null> {
	const runtimeGateway = createRuntimeGateway(db);
	const { data, context, assignedChecklistIds } = await runtimeGateway.loadChecklistListQuery(userId);

	if (!context) {
		return null;
	}

	const assignedChecklists = orderedAssignedChecklists(data, assignedChecklistIds);
	const bundles = assignedChecklists.map((checklist) => ({
		checklistId: checklist.id,
		tree: buildChecklistTreeFromData(data, checklist.id)
	}));
	const visibleSections = flattenVisibleCompositeSections(bundles, context, resolved.mode);
	const areaSections = buildCompositeAreaSections(data, visibleSections, userId, context, resolved.mode);
	const areaIndex = areaSections.findIndex(
		(area) =>
			area.nodeId === sectionNodeId || area.members.some(({ section }) => section.nodeId === sectionNodeId)
	);

	if (areaIndex === -1) {
		return null;
	}

	const answerByQuestionId = new Map(data.answerStates.map((answer) => [answer.questionId, answer] as const));
	const factNodeIdByQuestionId = new Map(data.factLinks.map((link) => [link.questionId, link.nodeId] as const));
	const currentArea = areaSections[areaIndex];
	const descriptor = COMPOSITE_TARGETS.find((target) => target.slug === resolved.slug)!;

	return {
		checklistSlug: descriptor.slug,
		checklistTitle: compositeChecklistTitle(descriptor.mode),
		sections: areaSections.map((area) => ({
			nodeId: area.nodeId,
			prefix: area.prefixKey,
			title: area.title,
			completedQuestions: area.completedQuestions,
			totalQuestions: area.totalQuestions
		})),
		section: {
			nodeId: currentArea.nodeId,
			prefix: currentArea.prefixKey,
			title: currentArea.title,
			description: ''
		},
		previousSection:
			areaIndex > 0 ?
				{
					nodeId: areaSections[areaIndex - 1].nodeId,
					prefix: areaSections[areaIndex - 1].prefixKey,
					title: areaSections[areaIndex - 1].title,
					completedQuestions: areaSections[areaIndex - 1].completedQuestions,
					totalQuestions: areaSections[areaIndex - 1].totalQuestions
				}
			:	null,
		nextSection:
			areaIndex >= 0 && areaIndex < areaSections.length - 1 ?
				{
					nodeId: areaSections[areaIndex + 1].nodeId,
					prefix: areaSections[areaIndex + 1].prefixKey,
					title: areaSections[areaIndex + 1].title,
					completedQuestions: areaSections[areaIndex + 1].completedQuestions,
					totalQuestions: areaSections[areaIndex + 1].totalQuestions
				}
			:	null,
		groups: currentArea.members.flatMap(({ bundle, section }) =>
			buildVisibleGroups(
				bundle.tree,
				context,
				section.id,
				answerByQuestionId,
				factNodeIdByQuestionId,
				resolved.mode
			)
		)
	};
}

function compositeChecklistTitle(mode: CompositeMode) {
	const year = new Date().getFullYear().toString();
	if (mode === 'full') {
		return `Miljöhusesyn ${year}`;
	}

	if (mode === 'new') {
		return `Nya frågor ${year}`;
	}

	return 'Grundvillkor';
}

function orderedAssignedChecklists(data: ChecklistRuntimeData, assignedChecklistIds: Set<number>) {
	const orderIndex = new Map(CHECKLIST_ORDER.map((slug, index) => [slug, index]));
	return data.checklists
		.filter((checklist) => assignedChecklistIds.has(checklist.id))
		.sort((left, right) => {
			const leftRank = orderIndex.get(left.slug) ?? Number.MAX_SAFE_INTEGER;
			const rightRank = orderIndex.get(right.slug) ?? Number.MAX_SAFE_INTEGER;
			return leftRank - rightRank || left.title.localeCompare(right.title);
		});
}

function summarizeCompositeProgress(
	data: ChecklistRuntimeData,
	bundles: CompositeBundle[],
	userId: number,
	context: VisibilityContext,
	mode: CompositeMode
) {
	const completedQuestions = bundles.reduce(
		(total, bundle) =>
			total + summarizeSectionsProgressFromData(
				data,
				bundle.tree,
				bundle.tree.sections.map((section) => section.id),
				userId,
				context,
				mode
			).completedQuestions,
		0
	);
	const totalQuestions = bundles.reduce(
		(total, bundle) =>
			total + summarizeSectionsProgressFromData(
				data,
				bundle.tree,
				bundle.tree.sections.map((section) => section.id),
				userId,
				context,
				mode
			).totalQuestions,
		0
	);

	return { completedQuestions, totalQuestions };
}

function flattenVisibleCompositeSections(
	bundles: CompositeBundle[],
	context: VisibilityContext,
	mode: CompositeMode
): CompositeVisibleSection[] {
	return bundles.flatMap((bundle) =>
		bundle.tree.sections
			.filter((section) => sectionHasVisibleQuestions(bundle.tree, context, section.id, mode))
			.map((section) => ({ bundle, section }))
	);
}

function buildCompositeAreaSections(
	data: ChecklistRuntimeData,
	visibleSections: CompositeVisibleSection[],
	userId: number,
	context: VisibilityContext,
	mode: CompositeMode
): CompositeAreaSummary[] {
	const grouped = new Map<string, CompositeAreaSummary>();

	for (const entry of visibleSections) {
		const checklistSlug =
			data.checklists.find((checklist) => checklist.id === entry.bundle.checklistId)?.slug ?? '';
		const prefixKey = compositeAreaKeyForChecklistSlug(checklistSlug);
		const areaTitle = areaTitleFromPrefix(prefixKey);
		if (!areaTitle) {
			continue;
		}

		const existing = grouped.get(prefixKey) ?? {
			prefixKey,
			checklistSlug,
			nodeId: entry.section.nodeId,
			title: areaTitle,
			completedQuestions: 0,
			totalQuestions: 0,
			members: []
		};
		const progress = summarizeSectionsProgressFromData(
			data,
			entry.bundle.tree,
			[entry.section.id],
			userId,
			context,
			mode
		);
		existing.completedQuestions += progress.completedQuestions;
		existing.totalQuestions += progress.totalQuestions;
		existing.members.push(entry);
		grouped.set(prefixKey, existing);
	}

	return Array.from(grouped.values()).sort(
		(left, right) => areaOrderIndex(left.prefixKey) - areaOrderIndex(right.prefixKey)
	);
}

function normalizeAreaPrefix(prefix: string) {
	return prefix.trim().charAt(0).toUpperCase();
}

function compositeAreaKeyForChecklistSlug(slug: string) {
	if (slug.endsWith('-g')) {
		return 'G';
	}

	if (slug.endsWith('-v')) {
		return 'V';
	}

	if (slug.endsWith('-d')) {
		return 'D';
	}

	if (slug.endsWith('-a')) {
		return 'A';
	}

	return '';
}

function areaTitleFromPrefix(prefixKey: string) {
	switch (prefixKey) {
		case 'G':
			return 'Allmänna Gårdskrav';
		case 'V':
			return 'Växtodling';
		case 'D':
			return 'Djurhållning';
		case 'A':
			return 'Arbetsmiljö';
		default:
			return '';
	}
}

function areaOrderIndex(prefixKey: string) {
	return ['G', 'V', 'D', 'A'].indexOf(prefixKey);
}

function questionMatchesMode(question: TreeQuestion, mode: CompositeMode) {
	if (mode === 'cc') {
		return question.cc || question.ccExtra;
	}

	if (mode === 'new') {
		return question.newFlag;
	}

	return true;
}

function sectionHasVisibleQuestions(
	tree: ChecklistTree,
	context: VisibilityContext,
	sectionId: number,
	mode: CompositeMode
) {
	if (!context) {
		return false;
	}

	if (!canViewSection(context, tree.sectionProfilesBySection.get(sectionId) ?? [])) {
		return false;
	}

	const groups = tree.groups.filter((group) => group.sectionId === sectionId);

	return groups.some((group) =>
		tree.questions
			.filter((question) => question.groupId === group.id)
			.filter((question) => questionMatchesMode(question, mode))
			.some((question) =>
				canViewQuestion(
					context,
					tree.questionProfilesByQuestion.get(question.id) ?? [],
					question.questionText
				)
			)
	);
}

function buildVisibleGroups(
	tree: ChecklistTree,
	context: VisibilityContext,
	sectionId: number,
	answerByQuestionId: Map<number, ChecklistRuntimeData['answerStates'][number]>,
	factNodeIdByQuestionId: Map<number, string>,
	mode: CompositeMode
) {
	return tree.groups
		.filter((group) => group.sectionId === sectionId)
		.map((group) => {
			const section = tree.sections.find((entry) => entry.id === group.sectionId);
			const orderedQuestions = tree.questions
				.filter((question) => question.groupId === group.id)
				.sort((left, right) => {
					if (left.sortOrder !== right.sortOrder) {
						return left.sortOrder - right.sortOrder;
					}

					return left.id - right.id;
				});
			const questions = orderedQuestions
				.filter((question) => questionMatchesMode(question, mode))
				.filter((question) =>
					canViewQuestion(
						context,
						tree.questionProfilesByQuestion.get(question.id) ?? [],
						question.questionText
					)
				);

			const displayGroupPrefix = resolvedGroupPrefix(section?.prefix ?? '', group.prefix, orderedQuestions);
			return {
				nodeId: group.nodeId,
				prefix: displayGroupPrefix,
				title: group.title,
				introText: group.introText,
				questions,
				forceSequentialQuestionPrefixes: shouldForceSequentialQuestionPrefixes(
					group.prefix,
					displayGroupPrefix
				)
			};
		})
		.filter((group) => group.questions.length > 0)
		.map((group) => ({
			nodeId: group.nodeId,
			prefix: group.prefix,
			title: group.title,
			introText: group.introText,
			questions: group.questions.map((question) => ({
				id: question.id,
				nodeId: question.nodeId,
				prefix: resolvedQuestionPrefix(
					group.prefix,
					group.questions,
					question,
					group.forceSequentialQuestionPrefixes
				),
				questionText: question.questionText,
				annualQuestion: question.annualQuestion,
				newFlag: question.newFlag,
				factNodeId: factNodeIdByQuestionId.get(question.id) ?? null,
				answer: {
					responseValue: answerByQuestionId.get(question.id)?.responseValue ?? 'blank',
					comment: answerByQuestionId.get(question.id)?.comment ?? '',
					dueDate: answerByQuestionId.get(question.id)?.dueDate ?? ''
				}
			}))
		}));
}

function resolvedGroupPrefix(sectionPrefix: string, groupPrefix: string, groupQuestions: TreeQuestion[]) {
	if (isStableGroupPrefix(groupPrefix)) {
		return groupPrefix;
	}

	const inferredFromQuestions = groupQuestions
		.map((question) => extractQuestionGroupPrefix(question.prefix))
		.filter((value): value is string => Boolean(value));
	if (
		inferredFromQuestions.length > 0 &&
		inferredFromQuestions.every((value) => value === inferredFromQuestions[0])
	) {
		return inferredFromQuestions[0];
	}

	const areaPrefix = normalizeAreaPrefix(sectionPrefix || groupPrefix);
	return areaPrefix ? `${areaPrefix}1` : groupPrefix;
}

function resolvedQuestionPrefix(
	groupPrefix: string,
	groupQuestions: Array<{ id: number; prefix: string }>,
	question: { id: number; prefix: string },
	forceSequentialQuestionPrefixes = false
) {
	if (forceSequentialQuestionPrefixes) {
		const questionIndex = groupQuestions.findIndex((entry) => entry.id === question.id);
		return questionIndex >= 0 ? `${groupPrefix}-${questionIndex + 1}` : question.prefix;
	}

	if (matchesGroupQuestionPrefix(question.prefix, groupPrefix)) {
		return question.prefix;
	}

	const questionIndex = groupQuestions.findIndex((entry) => entry.id === question.id);
	return questionIndex >= 0 ? `${groupPrefix}-${questionIndex + 1}` : question.prefix;
}

function matchesGroupQuestionPrefix(questionPrefix: string, groupPrefix: string) {
	return (
		questionPrefix === groupPrefix ||
		questionPrefix.startsWith(`${groupPrefix}-`) ||
		questionPrefix.startsWith(`${groupPrefix}.`)
	);
}

function extractQuestionGroupPrefix(questionPrefix: string) {
	const match = questionPrefix.match(/^([A-Z]\d+)[-.]\d+$/);
	return match ? match[1] : null;
}

function isStableGroupPrefix(groupPrefix: string) {
	return /^[A-Z]\d+$/.test(groupPrefix);
}

function shouldForceSequentialQuestionPrefixes(originalGroupPrefix: string, resolvedGroupPrefix: string) {
	return originalGroupPrefix !== resolvedGroupPrefix;
}

function summarizeSectionsProgressFromData(
	data: ChecklistRuntimeData,
	tree: ChecklistTree,
	sectionIds: number[],
	userId: number,
	context: VisibilityContext,
	mode: CompositeMode
) {
	if (!context) {
		return { completedQuestions: 0, totalQuestions: 0 };
	}

	const visibleQuestionIds = tree.questions
		.filter((question) => {
			const group = tree.groups.find((entry) => entry.id === question.groupId);
			return Boolean(group && sectionIds.includes(group.sectionId));
		})
		.filter((question) => questionMatchesMode(question, mode))
		.filter((question) =>
			canViewQuestion(
				context,
				tree.questionProfilesByQuestion.get(question.id) ?? [],
				question.questionText
			)
		)
		.map((question) => question.id);

	const answerRows = data.answerStates.filter(
		(answer) =>
			answer.userId === userId &&
			visibleQuestionIds.includes(answer.questionId) &&
			answer.responseValue !== 'blank'
	);

	return {
		completedQuestions: answerRows.length,
		totalQuestions: visibleQuestionIds.length
	};
}

function buildChecklistTreeFromData(
	data: ChecklistRuntimeData,
	checklistId: number
): RuntimeChecklistTree {
	const sections = data.sections.filter((section) => section.checklistId === checklistId);
	const sectionIds = new Set(sections.map((section) => section.id));
	const groups = data.groups.filter((group) => sectionIds.has(group.sectionId));
	const groupIds = new Set(groups.map((group) => group.id));
	const questions = data.questions.filter((question) => groupIds.has(question.groupId));
	const questionIds = new Set(questions.map((question) => question.id));

	return {
		sections,
		groups,
		questions,
		sectionProfilesBySection: buildProfileMap(
			data.sectionProfiles.filter((profile) => sectionIds.has(profile.sectionId)),
			'sectionId'
		),
		questionProfilesByQuestion: buildProfileMap(
			data.questionProfiles.filter((profile) => questionIds.has(profile.questionId)),
			'questionId'
		)
	};
}

function buildProfileMap<
	TRow extends { profileKey: string } & Record<TKey, number>,
	TKey extends keyof TRow
>(rows: TRow[], foreignKey: TKey) {
	const profileMap = new Map<number, string[]>();

	for (const row of rows) {
		const bucket = profileMap.get(row[foreignKey] as number) ?? [];
		bucket.push(row.profileKey);
		profileMap.set(row[foreignKey] as number, bucket);
	}

	return profileMap;
}
