// Test-harness-only SQLite writers. The live app runtime uses the Postgres-first
// repository in runtime-write-repository.ts; these helpers exist only for the
// in-memory unit-test database.

import { and, eq, gt, inArray, ne, or } from 'drizzle-orm';
import { animalOptions, foodProcessingOptions, resolveActivityKey } from '$lib/profile-config';
import { buildChecklistSlugSet, computeObligationSummary, deriveProfileNames } from '$lib/profile-logic';
import type { EditableProfileInput } from '$lib/types/profile';
import type { AppDb } from './client';
import type { NormalizedAdminUserAccountInput } from './runtime-write-repository';
import {
	appAnswerStates,
	appChecklistAssignments,
	appChecklists,
	appQuestionGroups,
	appQuestions,
	appSections,
	appPdfExportEvents,
	appPublicationDeliveries,
	appPublicationJobs,
	appProfileUpdateEvents,
	appSessions,
	appUserActivities,
	appUserAnimalTypes,
	appUserProfiles,
	appUsers,
	appUserSettings
} from './schema';

const cropAreaKey = 'Odlingsarealer';
const pastureAreaKey = 'Betesarealer';
const foodAnimalKey = 'foodAnimalProcessing';
const foodVegetableKey = 'foodVegetableProcessing';
const animalLabelMap = new Map(animalOptions.map((option) => [option.key, option.label]));

export async function findRuntimeUserByLoginFromSqlite(db: AppDb, normalizedLogin: string) {
	return (
		db
			.select()
			.from(appUsers)
			.where(or(eq(appUsers.email, normalizedLogin), eq(appUsers.username, normalizedLogin)))
			.get() ?? null
	);
}

export async function findRuntimeUserByIdFromSqlite(db: AppDb, userId: number) {
	return db.select().from(appUsers).where(eq(appUsers.id, userId)).get() ?? null;
}

export async function insertRuntimeSessionFromSqlite(
	db: AppDb,
	input: { userId: number; tokenHash: string; expiresAt: string; createdAt: string }
) {
	db.insert(appSessions).values(input).run();
	return findRuntimeSessionByTokenHashFromSqlite(db, input.tokenHash);
}

export async function findRuntimeSessionByTokenHashFromSqlite(db: AppDb, tokenHash: string) {
	return db.select().from(appSessions).where(eq(appSessions.tokenHash, tokenHash)).get() ?? null;
}

export async function findActiveRuntimeSessionByTokenHashFromSqlite(
	db: AppDb,
	tokenHash: string,
	nowIso: string
) {
	return (
		db
			.select()
			.from(appSessions)
			.where(and(eq(appSessions.tokenHash, tokenHash), gt(appSessions.expiresAt, nowIso)))
			.get() ?? null
	);
}

export async function deleteRuntimeSessionByTokenHashFromSqlite(db: AppDb, tokenHash: string) {
	db.delete(appSessions).where(eq(appSessions.tokenHash, tokenHash)).run();
}

export async function upsertRuntimeAnswerStateFromSqlite(
	db: AppDb,
	input: {
		userId: number;
		questionId: number;
		responseValue: 'yes' | 'no' | 'na' | 'blank';
		comment: string;
		dueDate: string | null;
		updatedAt: string;
	}
) {
	db
		.insert(appAnswerStates)
		.values(input)
		.onConflictDoUpdate({
			target: [appAnswerStates.userId, appAnswerStates.questionId],
			set: {
				responseValue: input.responseValue,
				comment: input.comment,
				dueDate: input.dueDate,
				updatedAt: input.updatedAt
			}
		})
		.run();

	return (
		db
			.select()
			.from(appAnswerStates)
			.where(and(eq(appAnswerStates.userId, input.userId), eq(appAnswerStates.questionId, input.questionId)))
			.get() ?? null
	);
}

export async function resetRuntimeAnswerStatesForQuestionFromSqlite(
	db: AppDb,
	input: {
		checklistVariantKey: string;
		groupNodeId: string;
		questionNodeId: string;
		updatedAt: string;
	}
) {
	const questionIds = db
		.select({ id: appQuestions.id })
		.from(appQuestions)
		.innerJoin(appQuestionGroups, eq(appQuestions.groupId, appQuestionGroups.id))
		.innerJoin(appSections, eq(appQuestionGroups.sectionId, appSections.id))
		.innerJoin(appChecklists, eq(appSections.checklistId, appChecklists.id))
		.where(
			and(
				eq(appChecklists.variantKey, input.checklistVariantKey),
				eq(appSections.nodeId, input.groupNodeId),
				eq(appQuestions.nodeId, input.questionNodeId)
			)
		)
		.all()
		.map((row) => row.id);

	if (questionIds.length === 0) {
		return 0;
	}

	const result = db
		.update(appAnswerStates)
		.set({
			responseValue: 'blank',
			comment: '',
			dueDate: null,
			updatedAt: input.updatedAt
		})
		.where(inArray(appAnswerStates.questionId, questionIds))
		.run();

	return result.changes;
}

export async function updateRuntimeUserAccountRowFromSqlite(
	db: AppDb,
	targetUserId: number,
	values: NormalizedAdminUserAccountInput
) {
	db.update(appUsers)
		.set({
			email: values.email.trim().toLowerCase(),
			username: values.username.trim().toLowerCase(),
			displayName: values.displayName.trim(),
			role: values.role,
			phone: values.phone.trim(),
			companyName: values.companyName.trim(),
			companyOrgNum: values.companyOrgNum.trim(),
			companyAddress1: values.companyAddress1.trim(),
			companyPostcode: values.companyPostcode.trim(),
			companyCity: values.companyCity.trim()
		})
		.where(eq(appUsers.id, targetUserId))
		.run();
}

export async function insertRuntimeUserRowFromSqlite(
	db: AppDb,
	values: NormalizedAdminUserAccountInput & { passwordHash: string }
) {
	const result = db
		.insert(appUsers)
		.values({
			email: values.email.trim().toLowerCase(),
			username: values.username.trim().toLowerCase(),
			passwordHash: values.passwordHash,
			displayName: values.displayName.trim(),
			role: values.role,
			phone: values.phone.trim(),
			companyName: values.companyName.trim(),
			companyOrgNum: values.companyOrgNum.trim(),
			companyAddress1: values.companyAddress1.trim(),
			companyPostcode: values.companyPostcode.trim(),
			companyCity: values.companyCity.trim()
		})
		.run();

	return Number(result.lastInsertRowid);
}

export async function deleteRuntimeUserCascadeFromSqlite(db: AppDb, targetUserId: number) {
	db.transaction((tx) => {
		const publicationJobIds = tx
			.select({ id: appPublicationJobs.id })
			.from(appPublicationJobs)
			.where(eq(appPublicationJobs.userId, targetUserId))
			.all()
			.map((row) => row.id);

		if (publicationJobIds.length > 0) {
			tx.delete(appPublicationDeliveries)
				.where(inArray(appPublicationDeliveries.publicationJobId, publicationJobIds))
				.run();
		}

		tx.delete(appPublicationDeliveries).where(eq(appPublicationDeliveries.userId, targetUserId)).run();
		tx.delete(appPublicationJobs).where(eq(appPublicationJobs.userId, targetUserId)).run();
		tx.delete(appPdfExportEvents).where(eq(appPdfExportEvents.userId, targetUserId)).run();
		tx.delete(appProfileUpdateEvents).where(eq(appProfileUpdateEvents.userId, targetUserId)).run();
		tx.delete(appAnswerStates).where(eq(appAnswerStates.userId, targetUserId)).run();
		tx.delete(appChecklistAssignments).where(eq(appChecklistAssignments.userId, targetUserId)).run();
		tx.delete(appSessions).where(eq(appSessions.userId, targetUserId)).run();
		tx.delete(appUserAnimalTypes).where(eq(appUserAnimalTypes.userId, targetUserId)).run();
		tx.delete(appUserActivities).where(eq(appUserActivities.userId, targetUserId)).run();
		tx.delete(appUserProfiles).where(eq(appUserProfiles.userId, targetUserId)).run();
		tx.delete(appUserSettings).where(eq(appUserSettings.userId, targetUserId)).run();
		tx.delete(appUsers).where(eq(appUsers.id, targetUserId)).run();
	});
}

export async function updateRuntimeUserPasswordHashFromSqlite(
	db: AppDb,
	targetUserId: number,
	passwordHash: string
) {
	db.update(appUsers).set({ passwordHash }).where(eq(appUsers.id, targetUserId)).run();
}

export async function insertRuntimePublicationJobRowFromSqlite(
	db: AppDb,
	input: { userId: number; checklistId: number; publicationKind: string; maxAttempts: number }
) {
	return Number(
		db
			.insert(appPublicationJobs)
			.values({
				userId: input.userId,
				checklistId: input.checklistId,
				publicationKind: input.publicationKind,
				status: 'queued',
				maxAttempts: input.maxAttempts
			})
			.run().lastInsertRowid
	);
}

export async function findRuntimePublicationJobByIdFromSqlite(db: AppDb, jobId: number) {
	return db.select().from(appPublicationJobs).where(eq(appPublicationJobs.id, jobId)).get() ?? null;
}

export async function listRuntimePublicationJobsFromSqlite(db: AppDb) {
	return db.select().from(appPublicationJobs).all();
}

export async function incrementRuntimePublicationAttemptFromSqlite(
	db: AppDb,
	jobId: number,
	attemptCount: number,
	timestamp: string
) {
	db.update(appPublicationJobs)
		.set({
			status: 'running',
			attemptCount,
			lastAttemptAt: timestamp,
			nextRetryAt: null,
			finishedAt: null
		})
		.where(eq(appPublicationJobs.id, jobId))
		.run();
}

export async function markRuntimePublicationJobSucceededFromSqlite(
	db: AppDb,
	input: { jobId: number; filename: string; outputPdfPath: string; reportPath: string; finishedAt: string }
) {
	db.update(appPublicationJobs)
		.set({
			status: 'succeeded',
			filename: input.filename,
			outputPdfPath: input.outputPdfPath,
			reportPath: input.reportPath,
			errorMessage: '',
			finishedAt: input.finishedAt
		})
		.where(eq(appPublicationJobs.id, input.jobId))
		.run();
}

export async function markRuntimePublicationJobFailedFromSqlite(
	db: AppDb,
	input: {
		jobId: number;
		errorMessage: string;
		retryable: boolean;
		nextRetryAt: string | null;
		finishedAt: string;
	}
) {
	db.update(appPublicationJobs)
		.set({
			status: input.retryable ? 'retryable' : 'failed',
			errorMessage: input.errorMessage,
			nextRetryAt: input.retryable ? input.nextRetryAt : null,
			finishedAt: input.finishedAt
		})
		.where(eq(appPublicationJobs.id, input.jobId))
		.run();
}

export async function requeueRuntimePublicationJobRowFromSqlite(
	db: AppDb,
	jobId: number,
	nextRetryAt: string | null
) {
	db.update(appPublicationJobs)
		.set({
			status: 'queued',
			nextRetryAt,
			errorMessage: '',
			finishedAt: null
		})
		.where(eq(appPublicationJobs.id, jobId))
		.run();
}

export async function insertRuntimePublicationDeliveryRowFromSqlite(
	db: AppDb,
	input: {
		jobId: number;
		userId: number;
		checklistId: number;
		deliveryKind: string;
		filename: string;
		byteCount: number;
	}
) {
	db.insert(appPublicationDeliveries)
		.values({
			publicationJobId: input.jobId,
			userId: input.userId,
			checklistId: input.checklistId,
			deliveryKind: input.deliveryKind,
			filename: input.filename,
			byteCount: input.byteCount
		})
		.run();
}

export async function insertRuntimePdfExportEventRowFromSqlite(
	db: AppDb,
	input: { userId: number; checklistId: number; exportKind: string; filename: string }
) {
	db.insert(appPdfExportEvents).values(input).run();
}

export async function claimNextRuntimePublicationJobFromSqlite(db: AppDb, nowIso: string) {
	return db.transaction((tx) => {
		const candidates = tx.select().from(appPublicationJobs).all().sort((left, right) => {
			const queuedAtOrder = left.queuedAt.localeCompare(right.queuedAt);
			return queuedAtOrder !== 0 ? queuedAtOrder : left.id - right.id;
		});
		const nextJob = candidates.find((job) => isRuntimePublicationJobReadyForClaim(job, nowIso));

		if (!nextJob) {
			return null;
		}

		tx.update(appPublicationJobs)
			.set({
				status: 'running',
				attemptCount: nextJob.attemptCount + 1,
				lastAttemptAt: nowIso,
				nextRetryAt: null,
				finishedAt: null
			})
			.where(eq(appPublicationJobs.id, nextJob.id))
			.run();
		return tx.select().from(appPublicationJobs).where(eq(appPublicationJobs.id, nextJob.id)).get() ?? null;
	});
}

export async function replaceRuntimeEditableProfileStateFromSqlite(
	db: AppDb,
	input: { userId: number; input: EditableProfileInput; isAdmin: boolean }
) {
	const profileUpdateEventId = db.transaction((tx) => {
		const currentUser = tx.select().from(appUsers).where(eq(appUsers.id, input.userId)).get();

		if (!currentUser) {
			throw new Error(`User ${input.userId} not found`);
		}

		tx.update(appUsers)
			.set({
				displayName: input.input.displayName,
				phone: input.input.phone,
				companyName: input.input.companyName,
				companyOrgNum: input.input.companyOrgNum,
				companyAddress1: input.input.companyAddress1,
				companyPostcode: input.input.companyPostcode,
				companyCity: input.input.companyCity
			})
			.where(eq(appUsers.id, input.userId))
			.run();

		tx.delete(appUserSettings).where(eq(appUserSettings.userId, input.userId)).run();
		tx.delete(appUserActivities).where(eq(appUserActivities.userId, input.userId)).run();
		tx.delete(appUserAnimalTypes).where(eq(appUserAnimalTypes.userId, input.userId)).run();
		tx.delete(appUserProfiles).where(eq(appUserProfiles.userId, input.userId)).run();

		tx.insert(appUserSettings).values(buildPersistedSettings(input.userId, input.input)).run();

		const selectedActivities = buildSelectedActivities(input.userId, input.input);
		if (selectedActivities.length > 0) {
			tx.insert(appUserActivities).values(selectedActivities).run();
		}

		const selectedAnimals = buildSelectedAnimals(input.userId, input.input);
		if (selectedAnimals.length > 0) {
			tx.insert(appUserAnimalTypes).values(selectedAnimals).run();
		}

		const derivedProfiles = deriveProfileNames(input.input);
		if (derivedProfiles.length > 0) {
			tx.insert(appUserProfiles)
				.values(
					derivedProfiles.map((profileName) => ({
						userId: input.userId,
						profileKey: profileName,
						profileName
					}))
				)
				.run();
		}

		syncRuntimeChecklistAssignmentsFromSqlite(
			tx,
			input.userId,
			input.input,
			input.isAdmin || currentUser.role === 'admin'
		);

		return Number(tx.insert(appProfileUpdateEvents).values({ userId: input.userId }).run().lastInsertRowid);
	});

	return profileUpdateEventId;
}

function buildPersistedSettings(userId: number, input: EditableProfileInput) {
	const computed = computeObligationSummary(input);
	return [
		...Object.entries(input.settings)
			.filter(([key]) => !['AP1', 'TP1', 'TP3', 'Anmalningsplikt', 'Tillstandsplikt'].includes(key))
			.map(([key, value]) => ({
				userId,
				key,
				value: value ? 'true' : 'false'
			})),
		...Object.entries(input.obligationAnswers).map(([key, value]) => ({
			userId,
			key,
			value: encodeAnswerValue(value)
		})),
		{ userId, key: cropAreaKey, value: input.areas.cropHa },
		{ userId, key: pastureAreaKey, value: input.areas.pastureHa },
		{ userId, key: foodAnimalKey, value: input.foodProcessing.animalProducts ? 'true' : 'false' },
		{ userId, key: foodVegetableKey, value: input.foodProcessing.vegetableProducts ? 'true' : 'false' },
		{ userId, key: 'AP1', value: computed.ap1 ? 'true' : 'false' },
		{ userId, key: 'TP1', value: computed.tp1 ? 'true' : 'false' },
		{ userId, key: 'TP3', value: computed.tp3 ? 'true' : 'false' },
		{ userId, key: 'Anmalningsplikt', value: computed.anmalningsplikt ? 'true' : 'false' },
		{ userId, key: 'Tillstandsplikt', value: computed.tillstandsplikt ? 'true' : 'false' }
	];
}

function buildSelectedActivities(userId: number, input: EditableProfileInput) {
	const selectedActivities = Object.entries(input.activities)
		.filter(([, enabled]) => enabled)
		.map(([activityKey]) => {
			const resolvedKey = resolveActivityKey(activityKey);

			if (!resolvedKey) {
				return null;
			}

			const activityNameMap: Record<typeof resolvedKey, string> = {
				odling: 'Odling',
				djurhallning: 'Djurhallning',
				tradgardsforetagPotatisodlare: 'Tradgardsforetag / Potatisodlare',
				biodlingForetag: 'Biodling Foretag',
				biodlingHobby: 'Biodling Hobby',
				ovrigt: 'Ovrigt',
				livsmedelsforadling: 'Livsmedelsforadling'
			};

			const certified =
				resolvedKey === 'odling' || resolvedKey === 'tradgardsforetagPotatisodlare' ? input.certifications.crop
				: resolvedKey === 'djurhallning' ? input.certifications.animal
				: null;

			return {
				userId,
				activityName: activityNameMap[resolvedKey],
				certified
			};
		})
		.filter(Boolean) as Array<{ userId: number; activityName: string; certified: number | null }>;

	for (const option of foodProcessingOptions) {
		if (!input.activities.livsmedelsforadling || !input.foodProcessing[option.key]) {
			continue;
		}

		selectedActivities.push({
			userId,
			activityName: option.activityName,
			certified: null
		});
	}

	return selectedActivities;
}

function buildSelectedAnimals(userId: number, input: EditableProfileInput) {
	return Object.entries(input.animals)
		.filter(([, amount]) => amount > 0)
		.map(([animalKey, amount]) => ({
			userId,
			animalKey,
			animalName: animalLabelMap.get(animalKey as keyof typeof input.animals) ?? animalKey,
			amount
		}));
}

function syncRuntimeChecklistAssignmentsFromSqlite(
	db: AppDb,
	userId: number,
	input: EditableProfileInput,
	isAdmin: boolean
) {
	const availableChecklists = db
		.select()
		.from(appChecklists)
		.where(ne(appChecklists.snapshotKey, 'demo-snapshot'))
		.all();
	const desiredSlugs =
		isAdmin ? new Set(availableChecklists.map((checklist) => checklist.slug)) : buildChecklistSlugSet(input);

	db.delete(appChecklistAssignments).where(eq(appChecklistAssignments.userId, userId)).run();

	const rows = availableChecklists
		.filter((checklist) => desiredSlugs.has(checklist.slug))
		.map((checklist) => ({
			userId,
			checklistId: checklist.id
		}));

	if (rows.length > 0) {
		db.insert(appChecklistAssignments).values(rows).run();
	}
}

function encodeAnswerValue(value: string) {
	switch (value) {
		case 'yes':
			return '1';
		case 'no':
			return '2';
		case 'na':
		default:
			return '3';
	}
}

function isRuntimePublicationJobReadyForClaim(
	job: typeof appPublicationJobs.$inferSelect,
	nowIso: string
) {
	if (job.status === 'queued') {
		return true;
	}

	if (job.status !== 'retryable') {
		return false;
	}

	if (!job.nextRetryAt) {
		return true;
	}

	return job.nextRetryAt <= nowIso;
}
