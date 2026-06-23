import { animalOptions, foodProcessingOptions, resolveActivityKey } from '$lib/profile-config';
import { buildChecklistSlugSet, computeObligationSummary, deriveProfileNames } from '$lib/profile-logic';
import type { AppRole } from '$lib/roles';
import type { EditableProfileInput } from '$lib/types/profile';
import { getAppDbEngine, requireRuntimePostgresPool, type AppDb } from './client';
import {
	claimNextRuntimePublicationJobFromSqlite,
	deleteRuntimeSessionByTokenHashFromSqlite,
	deleteRuntimeUserCascadeFromSqlite,
	findActiveRuntimeSessionByTokenHashFromSqlite,
	findRuntimePublicationJobByIdFromSqlite,
	findRuntimeSessionByTokenHashFromSqlite,
	findRuntimeUserByIdFromSqlite,
	findRuntimeUserByLoginFromSqlite,
	insertRuntimePdfExportEventRowFromSqlite,
	insertRuntimePublicationDeliveryRowFromSqlite,
	insertRuntimePublicationJobRowFromSqlite,
	insertRuntimeSessionFromSqlite,
	insertRuntimeUserRowFromSqlite,
	incrementRuntimePublicationAttemptFromSqlite,
	listRuntimePublicationJobsFromSqlite,
	markRuntimePublicationJobFailedFromSqlite,
	markRuntimePublicationJobSucceededFromSqlite,
	replaceRuntimeEditableProfileStateFromSqlite,
	requeueRuntimePublicationJobRowFromSqlite,
	resetRuntimeAnswerStatesForQuestionFromSqlite,
	updateRuntimeUserAccountRowFromSqlite,
	updateRuntimeUserPasswordHashFromSqlite,
	upsertRuntimeAnswerStateFromSqlite
} from './runtime-write-repository.sqlite';
import type { AdminUserAccountInput } from '../services/admin-users';
import {
	appAnswerStates,
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

const USERS_SELECT = `
	select id, email, username, password_hash as "passwordHash", display_name as "displayName", role,
		first_name as "firstName", last_name as "lastName", phone, website, company_name as "companyName",
		company_org_num as "companyOrgNum", company_address_1 as "companyAddress1",
		company_address_2 as "companyAddress2", company_city as "companyCity",
		company_postcode as "companyPostcode", address_1 as "address1", address_2 as "address2",
		postcode, city, lrf_id as "lrfId", alert_sms as "alertSms", alert_email as "alertEmail",
		created_at as "createdAt"
	from app_users
`;

const SESSIONS_SELECT = `
	select id, user_id as "userId", token_hash as "tokenHash", expires_at as "expiresAt", created_at as "createdAt"
	from app_sessions
`;

const ANSWER_STATES_SELECT = `
	select id, user_id as "userId", question_id as "questionId", response_value as "responseValue", comment,
		due_date as "dueDate", updated_at as "updatedAt"
	from app_answer_states
`;

const PUBLICATION_JOBS_SELECT = `
	select id, user_id as "userId", checklist_id as "checklistId", publication_kind as "publicationKind", status,
		attempt_count as "attemptCount", max_attempts as "maxAttempts", filename, output_pdf_path as "outputPdfPath",
		report_path as "reportPath", error_message as "errorMessage", queued_at as "queuedAt",
		last_attempt_at as "lastAttemptAt", next_retry_at as "nextRetryAt", created_at as "createdAt",
		finished_at as "finishedAt"
	from app_publication_jobs
`;

export type NormalizedAdminUserAccountInput = Omit<AdminUserAccountInput, 'role'> & { role: AppRole };

export async function findRuntimeUserByLogin(db: AppDb, normalizedLogin: string) {
	if (getAppDbEngine(db) === 'postgres') {
		const result = await requireRuntimePostgresPool().query<typeof appUsers.$inferSelect>(
			`${USERS_SELECT} where email = $1 or username = $1 limit 1`,
			[normalizedLogin]
		);
		return result.rows[0] ?? null;
	}

	return (
		findRuntimeUserByLoginFromSqlite(db, normalizedLogin)
	);
}

export async function findRuntimeUserById(db: AppDb, userId: number) {
	if (getAppDbEngine(db) === 'postgres') {
		const result = await requireRuntimePostgresPool().query<typeof appUsers.$inferSelect>(
			`${USERS_SELECT} where id = $1 limit 1`,
			[userId]
		);
		return result.rows[0] ?? null;
	}

	return findRuntimeUserByIdFromSqlite(db, userId);
}

export async function insertRuntimeSession(
	db: AppDb,
	input: {
		userId: number;
		tokenHash: string;
		expiresAt: string;
		createdAt: string;
	}
) {
	if (getAppDbEngine(db) === 'postgres') {
		const result = await requireRuntimePostgresPool().query<typeof appSessions.$inferSelect>(
			`insert into app_sessions (user_id, token_hash, expires_at, created_at)
			values ($1, $2, $3, $4)
			returning id, user_id as "userId", token_hash as "tokenHash", expires_at as "expiresAt", created_at as "createdAt"`,
			[input.userId, input.tokenHash, input.expiresAt, input.createdAt]
		);
		return result.rows[0] ?? null;
	}

	return insertRuntimeSessionFromSqlite(db, input);
}

export async function findRuntimeSessionByTokenHash(db: AppDb, tokenHash: string) {
	if (getAppDbEngine(db) === 'postgres') {
		const result = await requireRuntimePostgresPool().query<typeof appSessions.$inferSelect>(
			`${SESSIONS_SELECT} where token_hash = $1 limit 1`,
			[tokenHash]
		);
		return result.rows[0] ?? null;
	}

	return findRuntimeSessionByTokenHashFromSqlite(db, tokenHash);
}

export async function findActiveRuntimeSessionByTokenHash(
	db: AppDb,
	tokenHash: string,
	nowIso: string
) {
	if (getAppDbEngine(db) === 'postgres') {
		const result = await requireRuntimePostgresPool().query<typeof appSessions.$inferSelect>(
			`${SESSIONS_SELECT} where token_hash = $1 and expires_at > $2 limit 1`,
			[tokenHash, nowIso]
		);
		return result.rows[0] ?? null;
	}

	return findActiveRuntimeSessionByTokenHashFromSqlite(db, tokenHash, nowIso);
}

export async function deleteRuntimeSessionByTokenHash(db: AppDb, tokenHash: string) {
	if (getAppDbEngine(db) === 'postgres') {
		await requireRuntimePostgresPool().query('delete from app_sessions where token_hash = $1', [tokenHash]);
		return;
	}

	return deleteRuntimeSessionByTokenHashFromSqlite(db, tokenHash);
}

export async function upsertRuntimeAnswerState(
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
	if (getAppDbEngine(db) === 'postgres') {
		const result = await requireRuntimePostgresPool().query<typeof appAnswerStates.$inferSelect>(
			`insert into app_answer_states (user_id, question_id, response_value, comment, due_date, updated_at)
			values ($1, $2, $3, $4, $5, $6)
			on conflict (user_id, question_id) do update set
				response_value = excluded.response_value,
				comment = excluded.comment,
				due_date = excluded.due_date,
				updated_at = excluded.updated_at
			returning id, user_id as "userId", question_id as "questionId", response_value as "responseValue",
				comment, due_date as "dueDate", updated_at as "updatedAt"`,
			[
				input.userId,
				input.questionId,
				input.responseValue,
				input.comment,
				input.dueDate,
				input.updatedAt
			]
		);
		return result.rows[0] ?? null;
	}

	return upsertRuntimeAnswerStateFromSqlite(db, input);
}

export async function resetRuntimeAnswerStatesForQuestion(
	db: AppDb,
	input: {
		checklistVariantKey: string;
		groupNodeId: string;
		questionNodeId: string;
		updatedAt: string;
	}
) {
	if (getAppDbEngine(db) === 'postgres') {
		const result = await requireRuntimePostgresPool().query(
			`update app_answer_states set
				response_value = 'blank',
				comment = '',
				due_date = null,
				updated_at = $4
			where question_id in (
				select q.id
				from app_questions q
				join app_question_groups g on g.id = q.group_id
				join app_sections s on s.id = g.section_id
				join app_checklists c on c.id = s.checklist_id
				where c.variant_key = $1
				  and s.node_id = $2
				  and q.node_id = $3
			)`,
			[input.checklistVariantKey, input.groupNodeId, input.questionNodeId, input.updatedAt]
		);
		return result.rowCount ?? 0;
	}

	return resetRuntimeAnswerStatesForQuestionFromSqlite(db, input);
}

export async function updateRuntimeUserAccountRow(
	db: AppDb,
	targetUserId: number,
	values: NormalizedAdminUserAccountInput
) {
	if (getAppDbEngine(db) === 'postgres') {
		await requireRuntimePostgresPool().query(
			`update app_users set
				email = $2,
				username = $3,
				display_name = $4,
				role = $5,
				phone = $6,
				company_name = $7,
				company_org_num = $8,
				company_address_1 = $9,
				company_postcode = $10,
				company_city = $11
			where id = $1`,
			[
				targetUserId,
				values.email.trim().toLowerCase(),
				values.username.trim().toLowerCase(),
				values.displayName.trim(),
				values.role,
				values.phone.trim(),
				values.companyName.trim(),
				values.companyOrgNum.trim(),
				values.companyAddress1.trim(),
				values.companyPostcode.trim(),
				values.companyCity.trim()
			]
		);
		return;
	}

	return updateRuntimeUserAccountRowFromSqlite(db, targetUserId, values);
}

export async function insertRuntimeUserRow(
	db: AppDb,
	values: NormalizedAdminUserAccountInput & { passwordHash: string }
) {
	if (getAppDbEngine(db) === 'postgres') {
		const result = await requireRuntimePostgresPool().query<{ id: number }>(
			`insert into app_users (
				email, username, password_hash, display_name, role, phone,
				company_name, company_org_num, company_address_1, company_postcode, company_city
			)
			values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			returning id`,
			[
				values.email.trim().toLowerCase(),
				values.username.trim().toLowerCase(),
				values.passwordHash,
				values.displayName.trim(),
				values.role,
				values.phone.trim(),
				values.companyName.trim(),
				values.companyOrgNum.trim(),
				values.companyAddress1.trim(),
				values.companyPostcode.trim(),
				values.companyCity.trim()
			]
		);
		return result.rows[0]?.id ?? 0;
	}

	return insertRuntimeUserRowFromSqlite(db, values);
}

export async function deleteRuntimeUserCascade(db: AppDb, targetUserId: number) {
	if (getAppDbEngine(db) === 'postgres') {
		await requireRuntimePostgresPool().query('delete from app_users where id = $1', [targetUserId]);
		return;
	}

	return deleteRuntimeUserCascadeFromSqlite(db, targetUserId);
}

export async function updateRuntimeUserPasswordHash(
	db: AppDb,
	targetUserId: number,
	passwordHash: string
) {
	if (getAppDbEngine(db) === 'postgres') {
		await requireRuntimePostgresPool().query(
			'update app_users set password_hash = $2 where id = $1',
			[targetUserId, passwordHash]
		);
		return;
	}

	return updateRuntimeUserPasswordHashFromSqlite(db, targetUserId, passwordHash);
}

export async function insertRuntimePublicationJobRow(
	db: AppDb,
	input: {
		userId: number;
		checklistId: number;
		publicationKind: string;
		maxAttempts: number;
	}
) {
	if (getAppDbEngine(db) === 'postgres') {
		const result = await requireRuntimePostgresPool().query<{ id: number }>(
			`insert into app_publication_jobs (user_id, checklist_id, publication_kind, status, max_attempts)
			values ($1, $2, $3, 'queued', $4)
			returning id`,
			[input.userId, input.checklistId, input.publicationKind, input.maxAttempts]
		);
		return result.rows[0]?.id ?? 0;
	}

	return insertRuntimePublicationJobRowFromSqlite(db, input);
}

export async function findRuntimePublicationJobById(db: AppDb, jobId: number) {
	if (getAppDbEngine(db) === 'postgres') {
		const result = await requireRuntimePostgresPool().query<typeof appPublicationJobs.$inferSelect>(
			`${PUBLICATION_JOBS_SELECT} where id = $1 limit 1`,
			[jobId]
		);
		return result.rows[0] ?? null;
	}

	return findRuntimePublicationJobByIdFromSqlite(db, jobId);
}

export async function listRuntimePublicationJobs(db: AppDb) {
	if (getAppDbEngine(db) === 'postgres') {
		const result = await requireRuntimePostgresPool().query<typeof appPublicationJobs.$inferSelect>(
			PUBLICATION_JOBS_SELECT
		);
		return result.rows;
	}

	return listRuntimePublicationJobsFromSqlite(db);
}

export async function incrementRuntimePublicationAttempt(db: AppDb, jobId: number, timestamp: string) {
	const job = await findRuntimePublicationJobById(db, jobId);

	if (!job) {
		throw new Error(`Publication job ${jobId} not found`);
	}

	if (getAppDbEngine(db) === 'postgres') {
		await requireRuntimePostgresPool().query(
			`update app_publication_jobs set
				status = 'running',
				attempt_count = $2,
				last_attempt_at = $3,
				next_retry_at = null,
				finished_at = null
			where id = $1`,
			[jobId, job.attemptCount + 1, timestamp]
		);
		return;
	}

	return incrementRuntimePublicationAttemptFromSqlite(db, jobId, job.attemptCount + 1, timestamp);
}

export async function markRuntimePublicationJobSucceeded(
	db: AppDb,
	input: {
		jobId: number;
		filename: string;
		outputPdfPath: string;
		reportPath: string;
		finishedAt: string;
	}
) {
	if (getAppDbEngine(db) === 'postgres') {
		await requireRuntimePostgresPool().query(
			`update app_publication_jobs set
				status = 'succeeded',
				filename = $2,
				output_pdf_path = $3,
				report_path = $4,
				error_message = '',
				finished_at = $5
			where id = $1`,
			[input.jobId, input.filename, input.outputPdfPath, input.reportPath, input.finishedAt]
		);
		return;
	}

	return markRuntimePublicationJobSucceededFromSqlite(db, input);
}

export async function markRuntimePublicationJobFailed(
	db: AppDb,
	input: {
		jobId: number;
		errorMessage: string;
		retryable: boolean;
		nextRetryAt: string | null;
		finishedAt: string;
	}
) {
	if (getAppDbEngine(db) === 'postgres') {
		await requireRuntimePostgresPool().query(
			`update app_publication_jobs set
				status = $2,
				error_message = $3,
				next_retry_at = $4,
				finished_at = $5
			where id = $1`,
			[
				input.jobId,
				input.retryable ? 'retryable' : 'failed',
				input.errorMessage,
				input.retryable ? input.nextRetryAt : null,
				input.finishedAt
			]
		);
		return;
	}

	return markRuntimePublicationJobFailedFromSqlite(db, input);
}

export async function requeueRuntimePublicationJobRow(
	db: AppDb,
	jobId: number,
	nextRetryAt: string | null
) {
	if (getAppDbEngine(db) === 'postgres') {
		await requireRuntimePostgresPool().query(
			`update app_publication_jobs set
				status = 'queued',
				next_retry_at = $2,
				error_message = '',
				finished_at = null
			where id = $1`,
			[jobId, nextRetryAt]
		);
		return;
	}

	return requeueRuntimePublicationJobRowFromSqlite(db, jobId, nextRetryAt);
}

export async function insertRuntimePublicationDeliveryRow(
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
	if (getAppDbEngine(db) === 'postgres') {
		await requireRuntimePostgresPool().query(
			`insert into app_publication_deliveries (
				publication_job_id, user_id, checklist_id, delivery_kind, filename, byte_count
			) values ($1, $2, $3, $4, $5, $6)`,
			[
				input.jobId,
				input.userId,
				input.checklistId,
				input.deliveryKind,
				input.filename,
				input.byteCount
			]
		);
		return;
	}

	return insertRuntimePublicationDeliveryRowFromSqlite(db, input);
}

export async function insertRuntimePdfExportEventRow(
	db: AppDb,
	input: {
		userId: number;
		checklistId: number;
		exportKind: string;
		filename: string;
	}
) {
	if (getAppDbEngine(db) === 'postgres') {
		await requireRuntimePostgresPool().query(
			`insert into app_pdf_export_events (user_id, checklist_id, export_kind, filename)
			values ($1, $2, $3, $4)`,
			[input.userId, input.checklistId, input.exportKind, input.filename]
		);
		return;
	}

	return insertRuntimePdfExportEventRowFromSqlite(db, input);
}

export async function claimNextRuntimePublicationJob(db: AppDb, nowIso: string) {
	if (getAppDbEngine(db) === 'postgres') {
		const client = await requireRuntimePostgresPool().connect();
		try {
			await client.query('begin');
			const candidates = (
				await client.query<typeof appPublicationJobs.$inferSelect>(
					`${PUBLICATION_JOBS_SELECT} order by "queuedAt", id for update`
				)
			).rows;
			const nextJob = candidates.find((job) => isRuntimePublicationJobReadyForClaim(job, nowIso));

			if (!nextJob) {
				await client.query('rollback');
				return null;
			}

			await client.query(
				`update app_publication_jobs set
					status = 'running',
					attempt_count = $2,
					last_attempt_at = $3,
					next_retry_at = null,
					finished_at = null
				where id = $1`,
				[nextJob.id, nextJob.attemptCount + 1, nowIso]
			);
			const updated = (
				await client.query<typeof appPublicationJobs.$inferSelect>(
					`${PUBLICATION_JOBS_SELECT} where id = $1 limit 1`,
					[nextJob.id]
				)
			).rows[0] ?? null;
			await client.query('commit');
			return updated;
		} catch (error) {
			await client.query('rollback');
			throw error;
		} finally {
			client.release();
		}
	}

	return claimNextRuntimePublicationJobFromSqlite(db, nowIso);
}

export async function replaceRuntimeEditableProfileState(
	db: AppDb,
	{
		userId,
		input,
		isAdmin
	}: {
		userId: number;
		input: EditableProfileInput;
		isAdmin: boolean;
	}
) {
	if (getAppDbEngine(db) === 'postgres') {
		const client = await requireRuntimePostgresPool().connect();

		try {
			await client.query('begin');
			const currentUserResult = await client.query<{ id: number; role: string }>(
				'select id, role from app_users where id = $1 limit 1',
				[userId]
			);
			const currentUser = currentUserResult.rows[0] ?? null;

			if (!currentUser) {
				throw new Error(`User ${userId} not found`);
			}

			await client.query(
				`update app_users set
					display_name = $2,
					phone = $3,
					company_name = $4,
					company_org_num = $5,
					company_address_1 = $6,
					company_postcode = $7,
					company_city = $8
				where id = $1`,
				[
					userId,
					input.displayName,
					input.phone,
					input.companyName,
					input.companyOrgNum,
					input.companyAddress1,
					input.companyPostcode,
					input.companyCity
				]
			);

			await client.query('delete from app_user_settings where user_id = $1', [userId]);
			await client.query('delete from app_user_activities where user_id = $1', [userId]);
			await client.query('delete from app_user_animal_types where user_id = $1', [userId]);
			await client.query('delete from app_user_profiles where user_id = $1', [userId]);
			await client.query('delete from app_checklist_assignments where user_id = $1', [userId]);

			for (const setting of buildPersistedSettings(userId, input)) {
				await client.query(
					'insert into app_user_settings (user_id, key, value) values ($1, $2, $3)',
					[setting.userId, setting.key, setting.value]
				);
			}

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

			for (const activity of selectedActivities) {
				await client.query(
					'insert into app_user_activities (user_id, activity_name, certified) values ($1, $2, $3)',
					[activity.userId, activity.activityName, activity.certified]
				);
			}

			const selectedAnimals = Object.entries(input.animals)
				.filter(([, amount]) => amount > 0)
				.map(([animalKey, amount]) => ({
					userId,
					animalKey,
					animalName: animalLabelMap.get(animalKey as keyof typeof input.animals) ?? animalKey,
					amount
				}));

			for (const animal of selectedAnimals) {
				await client.query(
					'insert into app_user_animal_types (user_id, animal_key, animal_name, amount) values ($1, $2, $3, $4)',
					[animal.userId, animal.animalKey, animal.animalName, animal.amount]
				);
			}

			const derivedProfiles = deriveProfileNames(input);
			for (const profileName of derivedProfiles) {
				await client.query(
					'insert into app_user_profiles (user_id, profile_key, profile_name) values ($1, $2, $3)',
					[userId, profileName, profileName]
				);
			}

			const availableChecklists = (
				await client.query<{ id: number; slug: string }>(
					"select id, slug from app_checklists where snapshot_key <> 'demo-snapshot'"
				)
			).rows;
			const desiredSlugs =
				isAdmin || currentUser.role === 'admin' ?
					new Set(availableChecklists.map((checklist) => checklist.slug))
				:	buildChecklistSlugSet(input);

			for (const checklist of availableChecklists.filter((entry) => desiredSlugs.has(entry.slug))) {
				await client.query(
					'insert into app_checklist_assignments (user_id, checklist_id) values ($1, $2)',
					[userId, checklist.id]
				);
			}

			const profileUpdateEventResult = await client.query<{ id: number }>(
				'insert into app_profile_update_events (user_id) values ($1) returning id',
				[userId]
			);
			await client.query('commit');
			return profileUpdateEventResult.rows[0]?.id ?? 0;
		} catch (error) {
			await client.query('rollback');
			throw error;
		} finally {
			client.release();
		}
	}

	return replaceRuntimeEditableProfileStateFromSqlite(db, { userId, input, isAdmin });
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
		{
			userId,
			key: cropAreaKey,
			value: input.areas.cropHa
		},
		{
			userId,
			key: pastureAreaKey,
			value: input.areas.pastureHa
		},
		{
			userId,
			key: foodAnimalKey,
			value: input.foodProcessing.animalProducts ? 'true' : 'false'
		},
		{
			userId,
			key: foodVegetableKey,
			value: input.foodProcessing.vegetableProducts ? 'true' : 'false'
		},
		{
			userId,
			key: 'AP1',
			value: computed.ap1 ? 'true' : 'false'
		},
		{
			userId,
			key: 'TP1',
			value: computed.tp1 ? 'true' : 'false'
		},
		{
			userId,
			key: 'TP3',
			value: computed.tp3 ? 'true' : 'false'
		},
		{
			userId,
			key: 'Anmalningsplikt',
			value: computed.anmalningsplikt ? 'true' : 'false'
		},
		{
			userId,
			key: 'Tillstandsplikt',
			value: computed.tillstandsplikt ? 'true' : 'false'
		}
	];
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
