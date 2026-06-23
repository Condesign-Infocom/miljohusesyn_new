import type { AppDb } from './client';
import {
	loadRuntimeChecklistData,
	loadRuntimePublicationPlanSourceData,
	type ChecklistRuntimeData,
	type PublicationPlanSourceData
} from './runtime-read-repository';
import { loadVisibilityContext } from '../services/visibility';
import type { appQuestionGroups, appQuestionProfiles, appQuestions, appSectionProfiles, appSections } from './schema';

export type RuntimeChecklistTree = {
	sections: typeof appSections.$inferSelect[];
	groups: typeof appQuestionGroups.$inferSelect[];
	questions: typeof appQuestions.$inferSelect[];
	sectionProfilesBySection: Map<number, string[]>;
	questionProfilesByQuestion: Map<number, string[]>;
};

export async function loadRuntimeChecklistQuery(
	db: AppDb,
	checklistSlug: string,
	userId: number
) {
	const [data, context] = await Promise.all([
		loadRuntimeChecklistData(db, userId),
		loadVisibilityContext(db, userId)
	]);
	const checklist = data.checklists.find((entry) => entry.slug === checklistSlug) ?? null;
	const hasAssignment = Boolean(
		checklist &&
			data.assignments.some((assignment) => assignment.userId === userId && assignment.checklistId === checklist.id)
	);
	const tree = checklist ? buildRuntimeChecklistTree(data, checklist.id) : null;
	const answerByQuestionId = new Map(data.answerStates.map((answer) => [answer.questionId, answer]));
	const factNodeIdByQuestionId = new Map(data.factLinks.map((link) => [link.questionId, link.nodeId]));

	return {
		data,
		context,
		checklist,
		hasAssignment,
		tree,
		answerByQuestionId,
		factNodeIdByQuestionId
	};
}

export async function loadRuntimeChecklistListQuery(db: AppDb, userId: number) {
	const [data, context] = await Promise.all([
		loadRuntimeChecklistData(db, userId),
		loadVisibilityContext(db, userId)
	]);

	return {
		data,
		context,
		assignedChecklistIds: new Set(data.assignments.map((assignment) => assignment.checklistId))
	};
}

export async function loadRuntimePublicationPlanQuery(
	db: AppDb,
	checklistSlug: string,
	userId: number,
	kind: 'complete' | 'user-full' | 'user-plan'
) {
	const [sourceData, visibilityContext] = await Promise.all([
		loadRuntimePublicationPlanSourceData(db, checklistSlug, userId, kind),
		kind === 'complete' ? Promise.resolve(null) : loadVisibilityContext(db, userId)
	]);

	return {
		sourceData,
		visibilityContext
	};
}

export function buildRuntimeChecklistTree(
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
