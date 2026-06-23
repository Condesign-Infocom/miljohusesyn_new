import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import type { AppDb } from '$lib/server/db/client';
import { createRuntimeGateway } from '$lib/server/db/runtime-gateway';
import {
	appAnswerStates,
	appChecklists,
	appFacts,
	appQuestionFactLinks,
	appQuestionGroups,
	appQuestionProfiles,
	appQuestions,
	appSectionProfiles,
	appSections
} from '$lib/server/db/schema';
import { canViewQuestion, canViewSection, loadVisibilityContext } from './visibility';
import { generateChecklistActionPlanPdf } from './checklist-action-plan-pdf';
import { generateChecklistCompleteBookHtmlPdf } from './checklist-complete-book-pdf';

type AnswerProjection = {
	uid: string;
	node_id: string;
	response_value: string;
	comment: string;
	due_date: string | null;
	answered_at: string | null;
	applicability: string | null;
};

type QuestionAssembly = {
	question_id: string;
	node_id: string;
	prefix: string;
	question_text: string;
	sort_order: number;
	flags: Record<string, string>;
	status: string;
	linked_fact_ids: string[];
	answer: AnswerProjection;
};

type ChecklistGroupAssembly = {
	group_id: string;
	node_id: string;
	prefix: string;
	title: string;
	intro_text: string;
	sort_order: number;
	flags: Record<string, string>;
	status: string;
	questions: QuestionAssembly[];
};

type ChecklistAssembly = {
	checklist_id: string;
	prefix: string;
	title: string;
	qa_type: string;
	groups: ChecklistGroupAssembly[];
};

type PublicationMetadata = {
	planId: string;
	publicationType: 'uid0' | 'uidXYZ' | 'uidXYZ-plan';
	uid: string;
	warnings: string[];
	userContext: {
		uid: string;
		displayName: string;
		companyName: string;
		operationTypes: string[];
		checklistRefs: string[];
	};
};

type ChecklistPublicationXml = {
	metadata: PublicationMetadata;
	userInfoXml: string;
	checklistsXml: string;
};

type RendererSuccess = {
	ok: true;
	outputPdf: string;
	reportPath: string;
};

type RendererFailure = {
	ok: false;
	message: string;
	stdout: string;
	stderr: string;
};

type RendererResult = RendererSuccess | RendererFailure;

type RendererInput = {
	userInfoPath: string;
	checklistsPath: string;
	outputDir: string;
	checklistSlug: string;
	mode: 'full' | 'plan';
	publicationType: 'uid0' | 'uidXYZ' | 'uidXYZ-plan';
	uid: string;
};

type PdfRenderer = (input: RendererInput) => Promise<RendererResult>;

type PdfExportArtifact = {
	filename: string;
	contentType: 'application/pdf';
	pdfPath: string;
	reportPath: string;
};

type ChecklistPdfKind = 'complete' | 'user-full' | 'user-plan';
export type PublicationRequestKind = 'complete' | 'user-full' | 'plan';

type PublicationChecklistBundle = {
	checklist: typeof appChecklists.$inferSelect;
	sections: Array<typeof appSections.$inferSelect>;
	questionGroups: Array<typeof appQuestionGroups.$inferSelect>;
	questions: Array<typeof appQuestions.$inferSelect>;
	sectionProfiles: Array<typeof appSectionProfiles.$inferSelect>;
	questionProfiles: Array<typeof appQuestionProfiles.$inferSelect>;
	factLinks: Array<typeof appQuestionFactLinks.$inferSelect>;
	facts: Array<typeof appFacts.$inferSelect>;
	answers: Array<typeof appAnswerStates.$inferSelect>;
};

const workspaceRoot = path.resolve(process.cwd(), '..', '..');
const rendererScriptPath = path.join(
	workspaceRoot,
	'new-system',
	'publishing',
	'build_app_checklist_pdf.py'
);
const exportOutputRoot = path.join(
	workspaceRoot,
	'new-system',
	'publishing',
	'outputs',
	'app-exports'
);

function buildParityWarnings(
	kind: ChecklistPdfKind,
	visibleQuestionCount: number,
	questionsWithLinkedFactsCount: number
): string[] {
	const warnings = [
		kind === 'user-plan' ?
			'App-driven PDF export renders the legacy user plan PDF shape and includes questions answered no plus unanswered questions.'
		:	'App-driven PDF export renders the legacy full-book PDF shape from app-originated XML.'
	];

	if (kind !== 'user-plan') {
		warnings.push(
			'App-driven PDF export currently omits legacy standard-content sections such as prefatory material, journal, glossary, plan text, and appendices.'
		);
	}

	if (visibleQuestionCount > questionsWithLinkedFactsCount) {
		warnings.push(
			`App-driven PDF export currently has linked facts for ${questionsWithLinkedFactsCount} of ${visibleQuestionCount} visible questions, so fact coverage is not yet at legacy parity.`
		);
	}

	return warnings;
}

function deriveChecklistQaType(checklist: typeof appChecklists.$inferSelect) {
	const key = `${checklist.slug} ${checklist.title}`.toLowerCase();
	const slugSuffix = checklist.slug.match(/miljohusesyn-([a-z0-9]+)$/i)?.[1]?.toLowerCase();

	if (checklist.variantKey && checklist.variantKey !== 'default') {
		return checklist.variantKey;
	}

	if (slugSuffix === 'a' || key.includes('arbetsmilj')) {
		return 'work-env';
	}

	if (slugSuffix === 'g') {
		return 'farm';
	}

	if (slugSuffix === 'v') {
		return 'crop';
	}

	if (slugSuffix === 'd') {
		return 'livestock';
	}

	return 'common';
}

function deriveChecklistPrefix(checklist: typeof appChecklists.$inferSelect) {
	const suffix = checklist.slug.match(/miljohusesyn-([a-z0-9]+)$/i)?.[1]?.toUpperCase();

	if (suffix) {
		return suffix;
	}

	return checklist.title.slice(0, 1).toUpperCase() || 'M';
}

export async function buildChecklistPublicationXml(
	db: AppDb,
	checklistSlug: string,
	userId: number
): Promise<ChecklistPublicationXml | null> {
	return buildChecklistPublication(db, checklistSlug, userId, 'user-plan');
}

export async function buildCompletePublicationXml(
	db: AppDb,
	checklistSlug: string,
	userId = 1
): Promise<ChecklistPublicationXml | null> {
	return buildChecklistPublication(db, checklistSlug, userId, 'complete');
}

export async function buildUserPublicationXml(
	db: AppDb,
	checklistSlug: string,
	userId: number
): Promise<ChecklistPublicationXml | null> {
	return buildChecklistPublication(db, checklistSlug, userId, 'user-full');
}

async function buildChecklistPublication(
	db: AppDb,
	checklistSlug: string,
	userId: number,
	kind: ChecklistPdfKind
): Promise<ChecklistPublicationXml | null> {
	const runtimeGateway = createRuntimeGateway(db);
	const [{ data, context, assignedChecklistIds }, requestedChecklist, user] = await Promise.all([
		runtimeGateway.loadChecklistListQuery(userId),
		runtimeGateway.findChecklistBySlug(checklistSlug),
		runtimeGateway.findUserById(userId)
	]);

	if (!requestedChecklist || !user) {
		return null;
	}

	if (kind !== 'complete' && !assignedChecklistIds.has(requestedChecklist.id)) {
		return null;
	}

	const selectedChecklists =
		kind === 'complete' ? [ ...data.checklists ].sort((left, right) => left.title.localeCompare(right.title))
		: [ ...data.checklists ]
				.filter((checklist) => assignedChecklistIds.has(checklist.id))
				.sort((left, right) => left.title.localeCompare(right.title));

	if (selectedChecklists.length === 0) {
		return null;
	}

	const visibilityContext = kind === 'complete' ? null : context;
	const checklistBundles = (
		await Promise.all(
			selectedChecklists.map(async (checklist) => {
				const { sourceData } = await runtimeGateway.loadPublicationPlanQuery(
					checklist.slug,
					userId,
					kind
				);

				if (!sourceData.checklist) {
					return null;
				}

				return {
					checklist: sourceData.checklist,
					sections: sourceData.sections,
					questionGroups: sourceData.questionGroups,
					questions: sourceData.questions,
					sectionProfiles: sourceData.sectionProfiles,
					questionProfiles: sourceData.questionProfiles,
					factLinks: sourceData.factLinks,
					facts: sourceData.facts,
					answers: sourceData.answers
				} satisfies PublicationChecklistBundle;
			})
		)
	).filter((bundle): bundle is PublicationChecklistBundle => bundle !== null);

	const factRowsById = new Map(
		checklistBundles.flatMap((bundle) => bundle.facts).map((fact) => [fact.id, fact] as const)
	);
	const checklistAssemblies: ChecklistAssembly[] = [];
	let visibleQuestionCount = 0;
	let questionsWithLinkedFactsCount = 0;

	for (const bundle of checklistBundles) {
		const groupsBySection = new Map<number, typeof bundle.questionGroups>();
		for (const group of bundle.questionGroups) {
			const existing = groupsBySection.get(group.sectionId) ?? [];
			existing.push(group);
			groupsBySection.set(group.sectionId, existing);
		}

		const questionsByGroup = new Map<number, typeof bundle.questions>();
		for (const question of bundle.questions) {
			const existing = questionsByGroup.get(question.groupId) ?? [];
			existing.push(question);
			questionsByGroup.set(question.groupId, existing);
		}

		const sectionProfilesBySection = buildProfileMap(bundle.sectionProfiles, 'sectionId');
		const questionProfilesByQuestion = buildProfileMap(bundle.questionProfiles, 'questionId');
		const answersByQuestion = new Map(bundle.answers.map((answer) => [answer.questionId, answer]));
		const factLinksByQuestion = new Map<number, typeof bundle.factLinks>();
		for (const link of bundle.factLinks) {
			const existing = factLinksByQuestion.get(link.questionId) ?? [];
			existing.push(link);
			factLinksByQuestion.set(link.questionId, existing);
		}

		const visibleSectionIds =
			kind === 'complete' ?
				new Set(bundle.sections.map((section) => section.id))
			:	filterVisibleSectionIds(
					visibilityContext,
					bundle.sections,
					bundle.questionGroups,
					bundle.questions,
					sectionProfilesBySection,
					questionProfilesByQuestion
				);
		const bundleVisibleQuestionIds =
			kind === 'complete' ?
				new Set(bundle.questions.map((question) => question.id))
			:	filterVisibleQuestionIds(visibilityContext, bundle.questions, questionProfilesByQuestion);

		const visibleSections = bundle.sections
			.filter((section) => visibleSectionIds.has(section.id))
			.sort((left, right) => left.sortOrder - right.sortOrder);

		const checklistGroups: ChecklistGroupAssembly[] = visibleSections
			.map((section, sectionIndex) => {
				const visibleQuestions = (groupsBySection.get(section.id) ?? [])
					.sort((left, right) => left.sortOrder - right.sortOrder)
					.flatMap((group) =>
						(questionsByGroup.get(group.id) ?? [])
							.sort((left, right) => left.sortOrder - right.sortOrder)
							.filter((question) => bundleVisibleQuestionIds.has(question.id))
					);
				const repairedGroupPrefix = resolvePublicationGroupPrefix(
					deriveChecklistPrefix(bundle.checklist),
					section.prefix,
					visibleQuestions,
					sectionIndex
				);
				const groupedQuestions = visibleQuestions.map((question) =>
					toQuestionAssembly(
						question,
						answersByQuestion.get(question.id),
						factLinksByQuestion.get(question.id) ?? [],
						factRowsById as Map<number, typeof appFacts.$inferSelect>,
						user.id,
						resolvePublicationQuestionPrefix(repairedGroupPrefix, visibleQuestions, question)
					)
				);

				return {
					group_id: section.nodeId,
					node_id: section.nodeId,
					prefix: repairedGroupPrefix,
					title: section.title,
					intro_text: section.description,
					sort_order: section.sortOrder,
					flags: {},
					status: 'included',
					questions: groupedQuestions
				};
			})
			.filter((group) => group.questions.length > 0);

		visibleQuestionCount += checklistGroups.reduce(
			(total, group) => total + group.questions.length,
			0
		);
		questionsWithLinkedFactsCount += checklistGroups.reduce(
			(total, group) =>
				total + group.questions.filter((question) => question.linked_fact_ids.length > 0).length,
			0
		);

		checklistAssemblies.push({
			checklist_id: bundle.checklist.slug,
			prefix: deriveChecklistPrefix(bundle.checklist),
			title: bundle.checklist.title,
			qa_type: deriveChecklistQaType(bundle.checklist),
			groups: checklistGroups
		});
	}

	const publicationType =
		kind === 'complete' ? 'uid0'
		: kind === 'user-full' ? 'uidXYZ'
		: 'uidXYZ-plan';
	const uid = kind === 'complete' ? '0' : String(user.id);
	const exportScopeSlug =
		selectedChecklists.length === 1 ? selectedChecklists[0].slug : 'miljohusesyn';
	const userContext = {
		uid: String(user.id),
		displayName: user.displayName,
		companyName: user.companyName || user.displayName,
		operationTypes: Array.from(
			new Set(selectedChecklists.map((checklist) => deriveChecklistQaType(checklist)))
		),
		checklistRefs: selectedChecklists.map((checklist) => checklist.slug)
	};
	const metadata = {
		planId:
			kind === 'complete' ? `app-complete-pdf-${exportScopeSlug}`
			: kind === 'user-full' ? `app-user-pdf-${exportScopeSlug}-user-${user.id}`
			: `app-checklist-plan-pdf-${exportScopeSlug}-user-${user.id}`,
		publicationType,
		uid,
		warnings: buildParityWarnings(kind, visibleQuestionCount, questionsWithLinkedFactsCount),
		userContext
	} satisfies PublicationMetadata;

	return {
		metadata,
		userInfoXml: buildUserInfoXml(metadata),
		checklistsXml: buildChecklistsXml(uid, checklistAssemblies)
	};
}

export async function generateChecklistPdf(
	db: AppDb,
	checklistSlug: string,
	userId: number,
	renderer: PdfRenderer = runChecklistPdfRenderer
): Promise<PdfExportArtifact | null> {
	return generateChecklistActionPlanPdf(db, checklistSlug, userId);
}

export async function generatePublicationPdf(
	db: AppDb,
	checklistSlug: string,
	userId: number,
	kind: PublicationRequestKind,
	renderer: PdfRenderer = runChecklistPdfRenderer
): Promise<PdfExportArtifact | null> {
	switch (kind) {
		case 'complete':
			return generateCompletePdf(db, checklistSlug, userId, renderer);
		case 'user-full':
			return generateUserPdf(db, checklistSlug, userId, renderer);
		case 'plan':
		default:
			return generateChecklistActionPlanPdf(db, checklistSlug, userId);
	}
}

export async function generateCompletePdf(
	db: AppDb,
	checklistSlug: string,
	userId = 1,
	_renderer: PdfRenderer = runChecklistPdfRenderer
): Promise<PdfExportArtifact | null> {
	return generateChecklistCompleteBookHtmlPdf(db, checklistSlug, userId, 'complete');
}

export async function generateUserPdf(
	db: AppDb,
	checklistSlug: string,
	userId: number,
	_renderer: PdfRenderer = runChecklistPdfRenderer
): Promise<PdfExportArtifact | null> {
	return generateChecklistCompleteBookHtmlPdf(db, checklistSlug, userId, 'user-full');
}

export async function generateUserPlanPdf(
	db: AppDb,
	checklistSlug: string,
	userId: number,
	renderer: PdfRenderer = runChecklistPdfRenderer
): Promise<PdfExportArtifact | null> {
	const publication = await buildChecklistPublicationXml(db, checklistSlug, userId);
	return renderChecklistPublication(publication, 'plan', 'plan', renderer);
}

async function renderChecklistPublication(
	publication: ChecklistPublicationXml | null,
	filenameSuffix: 'complete' | 'plan' | 'user',
	mode: RendererInput['mode'],
	renderer: PdfRenderer
): Promise<PdfExportArtifact | null> {
	if (!publication) {
		return null;
	}

	const exportFileBase = deriveExportFileBase(publication.metadata);
	const exportId = `${sanitizeFileSegment(exportFileBase)}-${Date.now()}-${randomUUID().slice(0, 8)}`;
	const outputDir = path.join(exportOutputRoot, exportId);
	await fs.mkdir(outputDir, { recursive: true });

	const userInfoPath = path.join(outputDir, 'pubdata-app.xml');
	const checklistsPath = path.join(outputDir, 'pub-checklists-app.xml');
	await fs.writeFile(userInfoPath, publication.userInfoXml, 'utf8');
	await fs.writeFile(checklistsPath, publication.checklistsXml, 'utf8');

	const renderResult = await renderer({
		userInfoPath,
		checklistsPath,
		outputDir,
		checklistSlug: exportFileBase,
		mode,
		publicationType: publication.metadata.publicationType,
		uid: publication.metadata.uid
	});

	if (!renderResult.ok) {
		throw new Error(
			`Checklist PDF export failed: ${renderResult.message}\n${renderResult.stderr || renderResult.stdout}`
		);
	}

	return {
		filename: `${sanitizeFileSegment(exportFileBase)}-${filenameSuffix}.pdf`,
		contentType: 'application/pdf',
		pdfPath: renderResult.outputPdf,
		reportPath: renderResult.reportPath
	};
}

async function runChecklistPdfRenderer(input: RendererInput): Promise<RendererResult> {
	return new Promise((resolve) => {
		const child = spawn(
			'python',
			[
				rendererScriptPath,
				'--user-info',
				input.userInfoPath,
				'--checklists',
				input.checklistsPath,
				'--output-dir',
				input.outputDir,
				'--mode',
				input.mode,
				'--publication-type',
				input.publicationType,
				'--uid',
				input.uid
			],
			{
				cwd: workspaceRoot,
				windowsHide: true
			}
		);

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk: Buffer | string) => {
			stdout += chunk.toString();
		});

		child.stderr.on('data', (chunk: Buffer | string) => {
			stderr += chunk.toString();
		});

		child.on('error', (error) => {
			resolve({
				ok: false,
				message: error.message,
				stdout,
				stderr
			});
		});

		child.on('close', (code) => {
			if (code !== 0) {
				resolve({
					ok: false,
					message: `Renderer exited with code ${code ?? 'unknown'}`,
					stdout,
					stderr
				});
				return;
			}

			try {
				const summary = JSON.parse(stdout) as { output_pdf?: string; render_report?: string };
				if (!summary.output_pdf || !summary.render_report) {
					resolve({
						ok: false,
						message: 'Renderer did not return output paths.',
						stdout,
						stderr
					});
					return;
				}

				Promise.all([fs.access(summary.output_pdf), fs.access(summary.render_report)])
					.then(() => {
						resolve({
							ok: true,
							outputPdf: summary.output_pdf!,
							reportPath: summary.render_report!
						});
					})
					.catch(() => {
						resolve({
							ok: false,
							message: 'Renderer reported success but output files were not readable.',
							stdout,
							stderr
						});
					});
			} catch (error) {
				resolve({
					ok: false,
					message: error instanceof Error ? error.message : 'Failed to parse renderer output.',
					stdout,
					stderr
				});
			}
		});
	});
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

function filterVisibleQuestionIds(
	context: Awaited<ReturnType<typeof loadVisibilityContext>>,
	questions: Array<typeof appQuestions.$inferSelect>,
	questionProfilesByQuestion: Map<number, string[]>
) {
	if (!context) {
		return new Set<number>();
	}

	return new Set(
		questions
			.filter((question) =>
				canViewQuestion(
					context,
					questionProfilesByQuestion.get(question.id) ?? [],
					question.questionText
				)
			)
			.map((question) => question.id)
	);
}

function filterVisibleSectionIds(
	context: Awaited<ReturnType<typeof loadVisibilityContext>>,
	sections: Array<typeof appSections.$inferSelect>,
	questionGroups: Array<typeof appQuestionGroups.$inferSelect>,
	questions: Array<typeof appQuestions.$inferSelect>,
	sectionProfilesBySection: Map<number, string[]>,
	questionProfilesByQuestion: Map<number, string[]>
) {
	if (!context) {
		return new Set<number>();
	}

	const questionsByGroup = new Map<number, Array<typeof appQuestions.$inferSelect>>();
	for (const question of questions) {
		const bucket = questionsByGroup.get(question.groupId) ?? [];
		bucket.push(question);
		questionsByGroup.set(question.groupId, bucket);
	}

	const groupsBySection = new Map<number, Array<typeof appQuestionGroups.$inferSelect>>();
	for (const group of questionGroups) {
		const bucket = groupsBySection.get(group.sectionId) ?? [];
		bucket.push(group);
		groupsBySection.set(group.sectionId, bucket);
	}

	return new Set(
		sections
			.filter((section) => canViewSection(context, sectionProfilesBySection.get(section.id) ?? []))
			.filter((section) =>
				(groupsBySection.get(section.id) ?? []).some((group) =>
					(questionsByGroup.get(group.id) ?? []).some((question) =>
						canViewQuestion(
							context,
							questionProfilesByQuestion.get(question.id) ?? [],
							question.questionText
						)
					)
				)
			)
			.map((section) => section.id)
	);
}

function toQuestionAssembly(
	question: typeof appQuestions.$inferSelect,
	answer: typeof appAnswerStates.$inferSelect | undefined,
	links: Array<typeof appQuestionFactLinks.$inferSelect>,
	factsById: Map<number, typeof appFacts.$inferSelect>,
	userId: number,
	prefix = question.prefix
): QuestionAssembly {
	return {
		question_id: question.nodeId,
		node_id: question.nodeId,
		prefix,
		question_text: question.questionText,
		sort_order: question.sortOrder,
		flags: questionFlags(question),
		status: answer?.responseValue === 'na' ? 'suppressed' : 'included',
		linked_fact_ids: links
			.map((link) => factsById.get(link.factId)?.factId)
			.filter((factId): factId is string => Boolean(factId)),
		answer: {
			uid: String(userId),
			node_id: question.nodeId,
			response_value: answer?.responseValue === 'blank' ? '' : (answer?.responseValue ?? ''),
			comment: answer?.comment ?? '',
			due_date: answer?.dueDate ?? null,
			answered_at: answer?.updatedAt ?? null,
			applicability: answer?.responseValue === 'na' ? '0' : null
		}
	};
}

function resolvePublicationGroupPrefix(
	checklistPrefix: string,
	groupPrefix: string,
	groupQuestions: Array<typeof appQuestions.$inferSelect>,
	groupIndex: number
) {
	if (isStablePublicationGroupPrefix(groupPrefix)) {
		return groupPrefix;
	}

	const inferredFromQuestions = groupQuestions
		.map((question) => extractPublicationQuestionGroupPrefix(question.prefix))
		.filter((value): value is string => Boolean(value));
	if (
		inferredFromQuestions.length > 0 &&
		inferredFromQuestions.every((value) => value === inferredFromQuestions[0])
	) {
		return inferredFromQuestions[0];
	}

	return `${checklistPrefix}${groupIndex + 1}`;
}

function resolvePublicationQuestionPrefix(
	groupPrefix: string,
	groupQuestions: Array<typeof appQuestions.$inferSelect>,
	question: typeof appQuestions.$inferSelect
) {
	if (matchesPublicationGroupQuestionPrefix(question.prefix, groupPrefix)) {
		return question.prefix;
	}

	const questionIndex = groupQuestions.findIndex((entry) => entry.id === question.id);
	return questionIndex >= 0 ? `${groupPrefix}-${questionIndex + 1}` : question.prefix;
}

function matchesPublicationGroupQuestionPrefix(questionPrefix: string, groupPrefix: string) {
	return (
		questionPrefix === groupPrefix ||
		questionPrefix.startsWith(`${groupPrefix}-`) ||
		questionPrefix.startsWith(`${groupPrefix}.`)
	);
}

function extractPublicationQuestionGroupPrefix(questionPrefix: string) {
	const match = questionPrefix.match(/^([A-Z]\d+)[-.]\d+$/);
	return match ? match[1] : null;
}

function isStablePublicationGroupPrefix(groupPrefix: string) {
	return /^[A-Z]\d+$/.test(groupPrefix);
}

function questionFlags(question: typeof appQuestions.$inferSelect) {
	const flags: Record<string, string> = {};

	if (question.cc) {
		flags.cc = 'yes';
	}

	if (question.ccExtra) {
		flags.cc_extra = 'yes';
	}

	if (question.base) {
		flags.base = 'yes';
	}

	if (question.newFlag) {
		flags.new = 'true';
	}

	if (question.recommended) {
		flags.recommended = 'true';
	}

	return flags;
}

function buildUserInfoXml(metadata: PublicationMetadata) {
	const operations = metadata.userContext.operationTypes
		.map((operationType) => `    <operation qa-type="${escapeXmlAttribute(operationType)}" />`)
		.join('\n');

	return [
		'<?xml version="1.0" encoding="utf-8"?>',
		`<user-info id="id-user-info" uid="${escapeXmlAttribute(metadata.uid)}">`,
		'  <name>',
		`    <first>${escapeXmlText(metadata.userContext.displayName)}</first>`,
		'    <last />',
		'  </name>',
		`  <property-name>${escapeXmlText(metadata.userContext.companyName)}</property-name>`,
		'  <contact-info>',
		'    <address>',
		'      <street />',
		'      <zip />',
		'      <city />',
		'    </address>',
		'    <phones>',
		'      <phone type="home" />',
		'      <phone type="mobile" />',
		'    </phones>',
		'    <emails>',
		'      <email />',
		'    </emails>',
		'  </contact-info>',
		'  <receiving />',
		'  <operations>',
		operations,
		'  </operations>',
		'</user-info>',
		''
	].join('\n');
}

function buildChecklistsXml(uid: string, checklists: ChecklistAssembly[]) {
	const body = checklists.map((checklist) => renderChecklistXml(checklist)).join('\n');

	return [
		'<?xml version="1.0" encoding="utf-8"?>',
		`<checklists uid="${escapeXmlAttribute(uid)}" id="id-checklists">`,
		body,
		'</checklists>',
		''
	].join('\n');
}

function renderChecklistXml(checklist: ChecklistAssembly) {
	const groups = checklist.groups.map((group) => renderGroupXml(group)).join('\n');

	return [
		`  <checklist xml:lang="sv-SE" node-id="${escapeXmlAttribute(withLegacyNodePrefix(checklist.checklist_id))}" qa-type="${escapeXmlAttribute(checklist.qa_type)}">`,
		`    <prefix>${escapeXmlText(checklist.prefix)}</prefix>`,
		`    <title>${escapeXmlText(checklist.title)}</title>`,
		groups,
		'  </checklist>'
	].join('\n');
}

function renderGroupXml(group: ChecklistGroupAssembly) {
	const questions = group.questions.map((question) => renderQuestionXml(question)).join('\n');
	const introParagraph = group.intro_text ? `      <p>${escapeXmlText(group.intro_text)}</p>` : '      <p />';

	return [
		`    <group node-id="${escapeXmlAttribute(withLegacyNodePrefix(group.node_id))}">`,
		`      <prefix>${escapeXmlText(group.prefix)}</prefix>`,
		`      <title>${escapeXmlText(group.title)}</title>`,
		'      <intro>',
		introParagraph,
		'      </intro>',
		questions,
		'    </group>'
	].join('\n');
}

function renderQuestionXml(question: QuestionAssembly) {
	const qaAttrs = [
		`node-id="${escapeXmlAttribute(withLegacyNodePrefix(question.node_id))}"`
	];

	for (const [key, value] of Object.entries(question.flags)) {
		if (value) {
			qaAttrs.push(`${key.replaceAll('_', '-')}="${escapeXmlAttribute(value)}"`);
		}
	}

	if (question.answer.applicability === '0') {
		qaAttrs.push('applic="0"');
	}

	const answerAttrs =
		question.answer.response_value ? ` value="${escapeXmlAttribute(question.answer.response_value)}"` : '';
	const commentParagraph =
		question.answer.comment ? `          <p>${escapeXmlText(question.answer.comment)}</p>` : '          <p />';
	const dateXml = renderAnswerDateXml(question.answer.due_date);

	return [
		`      <qa ${qaAttrs.join(' ')}>`,
		`        <prefix>${escapeXmlText(question.prefix)}</prefix>`,
		'        <question>',
		`          <p>${escapeXmlText(question.question_text)}</p>`,
		'        </question>',
		`        <answer${answerAttrs}>`,
		'          <comment>',
		commentParagraph,
		'          </comment>',
		...(dateXml ? [dateXml] : []),
		'        </answer>',
		'      </qa>'
	].join('\n');
}

function renderAnswerDateXml(dueDate: string | null) {
	if (!dueDate) {
		return '';
	}

	const [year, month, day] = dueDate.split('-', 3);
	if (!year || !month || !day) {
		return '';
	}

	return [
		'          <date>',
		`            <y>${escapeXmlText(`${year}-`)}</y>`,
		`            <m>${escapeXmlText(`${month}-`)}</m>`,
		`            <d>${escapeXmlText(day)}</d>`,
		'          </date>'
	].join('\n');
}

function escapeXmlText(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function escapeXmlAttribute(value: string) {
	return escapeXmlText(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function withLegacyNodePrefix(nodeId: string) {
	return nodeId.startsWith('node-id-') ? nodeId : `node-id-${nodeId}`;
}

function sanitizeFileSegment(value: string) {
	return value.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function deriveExportFileBase(metadata: PublicationMetadata) {
	const refs = metadata.userContext.checklistRefs.filter(Boolean);
	return refs.length === 1 ? refs[0] : 'miljohusesyn';
}
