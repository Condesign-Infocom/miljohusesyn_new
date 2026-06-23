// Test-harness-only SQLite loaders. The live app runtime uses the Postgres-first
// repository in runtime-read-repository.ts; these helpers exist only for the
// in-memory unit-test database.

import { and, eq, inArray } from 'drizzle-orm';
import type { AppDb } from './client';
import {
	appAnswerStates,
	appChecklistAssignments,
	appChecklists,
	appFacts,
	appProfileCatalog,
	appPdfExportEvents,
	appProfileUpdateEvents,
	appPublicationDeliveries,
	appPublicationJobs,
	appQuestionFactLinks,
	appQuestionGroups,
	appQuestionProfiles,
	appQuestions,
	appSectionProfiles,
	appSections,
	appSessions,
	appUserActivities,
	appUserAnimalTypes,
	appUserProfiles,
	appUserSettings,
	appUsers
} from './schema';

export async function findRuntimeChecklistByIdFromSqlite(db: AppDb, checklistId: number) {
	return db.select().from(appChecklists).where(eq(appChecklists.id, checklistId)).get() ?? null;
}

export async function findRuntimeChecklistBySlugFromSqlite(db: AppDb, checklistSlug: string) {
	return db.select().from(appChecklists).where(eq(appChecklists.slug, checklistSlug)).get() ?? null;
}

export async function loadRuntimeEditableProfileSeedDataFromSqlite(db: AppDb, userId: number) {
	const user = await db.query.appUsers.findFirst({
		where: eq(appUsers.id, userId),
		with: {
			settings: true,
			activities: true,
			animalTypes: true,
			profiles: true,
			checklistAssignments: {
				with: {
					checklist: true
				}
			}
		}
	});

	return { user: user ?? null };
}

export async function loadRuntimeFactDetailDataFromSqlite(db: AppDb, nodeId: string) {
	const factLink = await db.query.appQuestionFactLinks.findFirst({
		where: eq(appQuestionFactLinks.nodeId, nodeId),
		with: { fact: true }
	});

	if (!factLink) {
		return null;
	}

	return {
		nodeId,
		title: factLink.fact.title,
		bodyHtml: factLink.fact.bodyHtml
	};
}

export async function loadRuntimeChecklistDataFromSqlite(db: AppDb, userId: number) {
	const [
		assignments,
		checklists,
		sections,
		groups,
		questions,
		sectionProfiles,
		questionProfiles,
		answerStates,
		factLinks
	] = await Promise.all([
		db.query.appChecklistAssignments.findMany({
			where: (row, { eq: rowEq }) => rowEq(row.userId, userId)
		}),
		db.select().from(appChecklists).all(),
		db.select().from(appSections).orderBy(appSections.sortOrder).all(),
		db.select().from(appQuestionGroups).orderBy(appQuestionGroups.sortOrder).all(),
		db.select().from(appQuestions).orderBy(appQuestions.sortOrder).all(),
		db.select().from(appSectionProfiles).all(),
		db.select().from(appQuestionProfiles).all(),
		db.query.appAnswerStates.findMany({
			where: (row, { eq: rowEq }) => rowEq(row.userId, userId)
		}),
		db.select().from(appQuestionFactLinks).all()
	]);

	return {
		assignments,
		checklists,
		sections,
		groups,
		questions,
		sectionProfiles,
		questionProfiles,
		answerStates,
		factLinks
	};
}

export async function loadRuntimeReportingDataFromSqlite(db: AppDb) {
	const [
		users,
		checklists,
		assignments,
		answerStates,
		sessions,
		profiles,
		activities,
		questions,
		groups,
		sections,
		pdfExportEvents,
		profileUpdateEvents,
		publicationJobs,
		publicationDeliveries
	] = await Promise.all([
		db.select().from(appUsers).all(),
		db.select().from(appChecklists).all(),
		db.select().from(appChecklistAssignments).all(),
		db.select().from(appAnswerStates).all(),
		db.select().from(appSessions).all(),
		db.select().from(appUserProfiles).all(),
		db.select().from(appUserActivities).all(),
		db.select().from(appQuestions).all(),
		db.select().from(appQuestionGroups).all(),
		db.select().from(appSections).all(),
		db.select().from(appPdfExportEvents).all(),
		db.select().from(appProfileUpdateEvents).all(),
		db.select().from(appPublicationJobs).all(),
		db.select().from(appPublicationDeliveries).all()
	]);

	return {
		users,
		checklists,
		assignments,
		answerStates,
		sessions,
		profiles,
		activities,
		questions,
		groups,
		sections,
		pdfExportEvents,
		profileUpdateEvents,
		publicationJobs,
		publicationDeliveries
	};
}

export async function loadRuntimeAdminUserListDataFromSqlite(db: AppDb) {
	const [users, assignments, profiles] = await Promise.all([
		db.select().from(appUsers).all(),
		db.select().from(appChecklistAssignments).all(),
		db.select().from(appUserProfiles).all()
	]);

	return { users, assignments, profiles };
}

export async function loadRuntimeAdminUserDetailSeedDataFromSqlite(db: AppDb, userId: number) {
	const user = db.select().from(appUsers).where(eq(appUsers.id, userId)).get() ?? null;

	if (!user) {
		return { user: null, activities: [] };
	}

	const activities = db.select().from(appUserActivities).where(eq(appUserActivities.userId, userId)).all();
	return { user, activities };
}

export async function loadRuntimeAdminUserStatsDataFromSqlite(db: AppDb) {
	const [users, profiles, assignments, activities] = await Promise.all([
		db.select().from(appUsers).all(),
		db.select().from(appUserProfiles).all(),
		db.select().from(appChecklistAssignments).all(),
		db.select().from(appUserActivities).all()
	]);

	return { users, profiles, assignments, activities };
}

export async function loadRuntimeProfileMirrorDataFromSqlite(
	db: AppDb,
	userId: number,
	profileUpdateEventId: number
) {
	const [user, settings, activities, animalTypes, profiles, assignments, checklists, profileUpdateEvent] =
		await Promise.all([
			db.select().from(appUsers).where(eq(appUsers.id, userId)).get() ?? null,
			db.select().from(appUserSettings).where(eq(appUserSettings.userId, userId)).all(),
			db.select().from(appUserActivities).where(eq(appUserActivities.userId, userId)).all(),
			db.select().from(appUserAnimalTypes).where(eq(appUserAnimalTypes.userId, userId)).all(),
			db.select().from(appUserProfiles).where(eq(appUserProfiles.userId, userId)).all(),
			db.select().from(appChecklistAssignments).where(eq(appChecklistAssignments.userId, userId)).all(),
			db.select().from(appChecklists).all(),
			db.select().from(appProfileUpdateEvents).where(eq(appProfileUpdateEvents.id, profileUpdateEventId)).get() ??
				null
		]);

	return {
		user,
		settings,
		activities,
		animalTypes,
		profiles,
		assignments,
		checklistsById: new Map(checklists.map((checklist) => [checklist.id, checklist])),
		profileUpdateEvent
	};
}

export async function loadRuntimePublicationPlanSourceDataFromSqlite(
	db: AppDb,
	checklistSlug: string,
	userId: number,
	kind: 'complete' | 'user-full' | 'user-plan'
) {
	const checklist = db.select().from(appChecklists).where(eq(appChecklists.slug, checklistSlug)).get() ?? null;
	const user = db.select().from(appUsers).where(eq(appUsers.id, userId)).get() ?? null;

	if (!checklist || !user) {
		return {
			checklist,
			user,
			hasAssignment: false,
			sections: [],
			questionGroups: [],
			questions: [],
			sectionProfiles: [],
			questionProfiles: [],
			factLinks: [],
			facts: [],
			answers: []
		};
	}

	const hasAssignment =
		kind === 'complete' ||
		Boolean(
			db
				.select({ id: appChecklistAssignments.id })
				.from(appChecklistAssignments)
				.where(and(eq(appChecklistAssignments.userId, userId), eq(appChecklistAssignments.checklistId, checklist.id)))
				.get()
		);
	const sections = db
		.select()
		.from(appSections)
		.where(eq(appSections.checklistId, checklist.id))
		.orderBy(appSections.sortOrder)
		.all();
	const sectionIds = sections.map((section) => section.id);
	const questionGroups =
		sectionIds.length > 0 ?
			db
				.select()
				.from(appQuestionGroups)
				.where(inArray(appQuestionGroups.sectionId, sectionIds))
				.orderBy(appQuestionGroups.sortOrder)
				.all()
		:	[];
	const groupIds = questionGroups.map((group) => group.id);
	const questions =
		groupIds.length > 0 ?
			db
				.select()
				.from(appQuestions)
				.where(inArray(appQuestions.groupId, groupIds))
				.orderBy(appQuestions.sortOrder)
				.all()
		:	[];
	const questionIds = questions.map((question) => question.id);
	const sectionProfiles =
		kind !== 'complete' && sectionIds.length > 0 ?
			db.select().from(appSectionProfiles).where(inArray(appSectionProfiles.sectionId, sectionIds)).all()
		:	[];
	const questionProfiles =
		kind !== 'complete' && questionIds.length > 0 ?
			db.select().from(appQuestionProfiles).where(inArray(appQuestionProfiles.questionId, questionIds)).all()
		:	[];
	const factLinks =
		questionIds.length > 0 ?
			db.select().from(appQuestionFactLinks).where(inArray(appQuestionFactLinks.questionId, questionIds)).all()
		:	[];
	const factIds = Array.from(new Set(factLinks.map((link) => link.factId)));
	const facts =
		factIds.length > 0 ? db.select().from(appFacts).where(inArray(appFacts.id, factIds)).all() : [];
	const answers =
		kind !== 'complete' && questionIds.length > 0 ?
			db
				.select()
				.from(appAnswerStates)
				.where(inArray(appAnswerStates.questionId, questionIds))
				.all()
				.filter((answer) => answer.userId === userId)
		:	[];

	return {
		checklist,
		user,
		hasAssignment,
		sections,
		questionGroups,
		questions,
		sectionProfiles,
		questionProfiles,
		factLinks,
		facts,
		answers
	};
}

export async function loadRuntimeVisibilitySeedDataFromSqlite(db: AppDb, userId: number) {
	const user = await db.query.appUsers.findFirst({
		where: eq(appUsers.id, userId),
		with: {
			profiles: true,
			settings: true,
			activities: true,
			animalTypes: true
		}
	});
	const profileCatalog = await db.select().from(appProfileCatalog).all();

	return {
		user: user ? { id: user.id, role: user.role } : null,
		profiles:
			user?.profiles.map((profile) => ({
				profileKey: profile.profileKey,
				profileName: profile.profileName
			})) ?? [],
		settings:
			user?.settings.map((setting) => ({
				key: setting.key,
				value: setting.value
			})) ?? [],
		activities:
			user?.activities.map((activity) => ({
				activityName: activity.activityName
			})) ?? [],
		animalTypes:
			user?.animalTypes.map((animalType) => ({
				animalKey: animalType.animalKey,
				animalName: animalType.animalName,
				amount: animalType.amount
			})) ?? [],
		profileCatalog: profileCatalog.map((profile) => ({
			profileKey: profile.profileKey,
			profileName: profile.profileName
		}))
	};
}
