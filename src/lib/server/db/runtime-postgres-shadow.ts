import { requireRuntimePostgresPool, isRuntimePostgresEnabled } from './client';
import { resetRuntimePostgresSequences } from './runtime-postgres-sequences';
import type {
	appAnswerStates,
	appChecklists,
	appChecklistAssignments,
	appFacts,
	appProfileUpdateEvents,
	appProfileCatalog,
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

type UserRow = typeof appUsers.$inferSelect;
type ChecklistRow = typeof appChecklists.$inferSelect;
type SessionRow = typeof appSessions.$inferSelect;
type PublicationJobRow = typeof appPublicationJobs.$inferSelect;
type UserSettingRow = typeof appUserSettings.$inferSelect;
type UserProfileRow = typeof appUserProfiles.$inferSelect;
type UserActivityRow = typeof appUserActivities.$inferSelect;
type UserAnimalTypeRow = typeof appUserAnimalTypes.$inferSelect;
type ChecklistAssignmentRow = typeof appChecklistAssignments.$inferSelect;
type ProfileUpdateEventRow = typeof appProfileUpdateEvents.$inferSelect;
type AnswerStateRow = typeof appAnswerStates.$inferSelect;
type ProfileCatalogRow = typeof appProfileCatalog.$inferSelect;
type SectionRow = typeof appSections.$inferSelect;
type SectionProfileRow = typeof appSectionProfiles.$inferSelect;
type QuestionGroupRow = typeof appQuestionGroups.$inferSelect;
type QuestionRow = typeof appQuestions.$inferSelect;
type QuestionProfileRow = typeof appQuestionProfiles.$inferSelect;
type FactRow = typeof appFacts.$inferSelect;
type QuestionFactLinkRow = typeof appQuestionFactLinks.$inferSelect;

export function isRuntimePostgresShadowEnabled() {
	return isRuntimePostgresEnabled();
}

export async function mirrorUserToRuntimePostgres(user: UserRow) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	const pool = requireRuntimePostgresPool();
	await pool.query(
		`insert into app_users (
			id, email, username, password_hash, display_name, role, first_name, last_name, phone, website,
			company_name, company_org_num, company_address_1, company_address_2, company_city,
			company_postcode, address_1, address_2, postcode, city, lrf_id, alert_sms, alert_email, created_at
		)
		overriding system value
		values (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
		)
		on conflict (id) do update set
			email = excluded.email,
			username = excluded.username,
			password_hash = excluded.password_hash,
			display_name = excluded.display_name,
			role = excluded.role,
			first_name = excluded.first_name,
			last_name = excluded.last_name,
			phone = excluded.phone,
			website = excluded.website,
			company_name = excluded.company_name,
			company_org_num = excluded.company_org_num,
			company_address_1 = excluded.company_address_1,
			company_address_2 = excluded.company_address_2,
			company_city = excluded.company_city,
			company_postcode = excluded.company_postcode,
			address_1 = excluded.address_1,
			address_2 = excluded.address_2,
			postcode = excluded.postcode,
			city = excluded.city,
			lrf_id = excluded.lrf_id,
			alert_sms = excluded.alert_sms,
			alert_email = excluded.alert_email,
			created_at = excluded.created_at`,
		[
			user.id,
			user.email,
			user.username,
			user.passwordHash,
			user.displayName,
			user.role,
			user.firstName,
			user.lastName,
			user.phone,
			user.website,
			user.companyName,
			user.companyOrgNum,
			user.companyAddress1,
			user.companyAddress2,
			user.companyCity,
			user.companyPostcode,
			user.address1,
			user.address2,
			user.postcode,
			user.city,
			user.lrfId,
			user.alertSms,
			user.alertEmail,
			user.createdAt
		]
	);
	await resetRuntimePostgresSequences(pool, ['app_users']);
}

export async function mirrorChecklistToRuntimePostgres(checklist: ChecklistRow) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	const pool = requireRuntimePostgresPool();
	await pool.query(
		`insert into app_checklists (id, slug, title, variant_key, snapshot_key, created_at)
		overriding system value
		values ($1, $2, $3, $4, $5, $6)
		on conflict (id) do update set
			slug = excluded.slug,
			title = excluded.title,
			variant_key = excluded.variant_key,
			snapshot_key = excluded.snapshot_key,
			created_at = excluded.created_at`,
		[
			checklist.id,
			checklist.slug,
			checklist.title,
			checklist.variantKey,
			checklist.snapshotKey,
			checklist.createdAt
		]
	);
	await resetRuntimePostgresSequences(pool, ['app_checklists']);
}

export async function mirrorSessionToRuntimePostgres(session: SessionRow) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	const pool = requireRuntimePostgresPool();
	await pool.query(
		`insert into app_sessions (id, user_id, token_hash, expires_at, created_at)
		overriding system value
		values ($1, $2, $3, $4, $5)
		on conflict (token_hash) do update set
			user_id = excluded.user_id,
			expires_at = excluded.expires_at,
			created_at = excluded.created_at`,
		[session.id, session.userId, session.tokenHash, session.expiresAt, session.createdAt]
	);
	await resetRuntimePostgresSequences(pool, ['app_sessions']);
}

export async function deleteMirroredSessionFromRuntimePostgres(tokenHash: string) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	await requireRuntimePostgresPool().query('delete from app_sessions where token_hash = $1', [tokenHash]);
}

export async function mirrorPublicationJobToRuntimePostgres(job: PublicationJobRow) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	const pool = requireRuntimePostgresPool();
	await pool.query(
		`insert into app_publication_jobs (
			id, user_id, checklist_id, publication_kind, status, attempt_count, max_attempts,
			filename, output_pdf_path, report_path, error_message, queued_at, last_attempt_at,
			next_retry_at, created_at, finished_at
		)
		overriding system value
		values (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12, $13,
			$14, $15, $16
		)
		on conflict (id) do update set
			user_id = excluded.user_id,
			checklist_id = excluded.checklist_id,
			publication_kind = excluded.publication_kind,
			status = excluded.status,
			attempt_count = excluded.attempt_count,
			max_attempts = excluded.max_attempts,
			filename = excluded.filename,
			output_pdf_path = excluded.output_pdf_path,
			report_path = excluded.report_path,
			error_message = excluded.error_message,
			queued_at = excluded.queued_at,
			last_attempt_at = excluded.last_attempt_at,
			next_retry_at = excluded.next_retry_at,
			created_at = excluded.created_at,
			finished_at = excluded.finished_at`,
		[
			job.id,
			job.userId,
			job.checklistId,
			job.publicationKind,
			job.status,
			job.attemptCount,
			job.maxAttempts,
			job.filename,
			job.outputPdfPath,
			job.reportPath,
			job.errorMessage,
			job.queuedAt,
			job.lastAttemptAt,
			job.nextRetryAt,
			job.createdAt,
			job.finishedAt
		]
	);
	await resetRuntimePostgresSequences(pool, ['app_publication_jobs']);
}

export async function mirrorPublicationDeliveryToRuntimePostgres(input: {
	publicationJobId: number;
	userId: number;
	checklistId: number;
	deliveryKind: string;
	filename: string;
	byteCount: number;
}) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	await requireRuntimePostgresPool().query(
		`insert into app_publication_deliveries (
			publication_job_id, user_id, checklist_id, delivery_kind, filename, byte_count
		)
		values ($1, $2, $3, $4, $5, $6)`,
		[
			input.publicationJobId,
			input.userId,
			input.checklistId,
			input.deliveryKind,
			input.filename,
			input.byteCount
		]
	);
}

export async function replaceUserSettingsInRuntimePostgres(userId: number, settings: UserSettingRow[]) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	const pool = requireRuntimePostgresPool();
	await pool.query('delete from app_user_settings where user_id = $1', [userId]);

	for (const setting of settings) {
		await pool.query(
			`insert into app_user_settings (id, user_id, key, value)
			overriding system value
			values ($1, $2, $3, $4)`,
			[setting.id, setting.userId, setting.key, setting.value]
		);
	}

	await resetRuntimePostgresSequences(pool, ['app_user_settings']);
}

export async function replaceUserProfilesInRuntimePostgres(userId: number, profiles: UserProfileRow[]) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	const pool = requireRuntimePostgresPool();
	await pool.query('delete from app_user_profiles where user_id = $1', [userId]);

	for (const profile of profiles) {
		await pool.query(
			`insert into app_user_profiles (id, user_id, profile_key, profile_name)
			overriding system value
			values ($1, $2, $3, $4)`,
			[profile.id, profile.userId, profile.profileKey, profile.profileName]
		);
	}

	await resetRuntimePostgresSequences(pool, ['app_user_profiles']);
}

export async function replaceUserActivitiesInRuntimePostgres(
	userId: number,
	activities: UserActivityRow[]
) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	const pool = requireRuntimePostgresPool();
	await pool.query('delete from app_user_activities where user_id = $1', [userId]);

	for (const activity of activities) {
		await pool.query(
			`insert into app_user_activities (id, user_id, activity_name, certified)
			overriding system value
			values ($1, $2, $3, $4)`,
			[activity.id, activity.userId, activity.activityName, activity.certified]
		);
	}

	await resetRuntimePostgresSequences(pool, ['app_user_activities']);
}

export async function replaceUserAnimalTypesInRuntimePostgres(
	userId: number,
	animalTypes: UserAnimalTypeRow[]
) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	const pool = requireRuntimePostgresPool();
	await pool.query('delete from app_user_animal_types where user_id = $1', [userId]);

	for (const animal of animalTypes) {
		await pool.query(
			`insert into app_user_animal_types (id, user_id, animal_key, animal_name, amount)
			overriding system value
			values ($1, $2, $3, $4, $5)`,
			[animal.id, animal.userId, animal.animalKey, animal.animalName, animal.amount]
		);
	}

	await resetRuntimePostgresSequences(pool, ['app_user_animal_types']);
}

export async function replaceChecklistAssignmentsInRuntimePostgres(
	userId: number,
	assignments: ChecklistAssignmentRow[]
) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	const pool = requireRuntimePostgresPool();
	await pool.query('delete from app_checklist_assignments where user_id = $1', [userId]);

	for (const assignment of assignments) {
		await pool.query(
			`insert into app_checklist_assignments (id, user_id, checklist_id)
			overriding system value
			values ($1, $2, $3)`,
			[assignment.id, assignment.userId, assignment.checklistId]
		);
	}

	await resetRuntimePostgresSequences(pool, ['app_checklist_assignments']);
}

export async function mirrorProfileUpdateEventToRuntimePostgres(event: ProfileUpdateEventRow) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	const pool = requireRuntimePostgresPool();
	await pool.query(
		`insert into app_profile_update_events (id, user_id, created_at)
		overriding system value
		values ($1, $2, $3)`,
		[event.id, event.userId, event.createdAt]
	);
	await resetRuntimePostgresSequences(pool, ['app_profile_update_events']);
}

export async function deleteUserFromRuntimePostgres(userId: number) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	await requireRuntimePostgresPool().query('delete from app_users where id = $1', [userId]);
}

export async function upsertAnswerStateToRuntimePostgres(answerState: AnswerStateRow) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	const pool = requireRuntimePostgresPool();
	await pool.query(
		`insert into app_answer_states (
			id, user_id, question_id, response_value, comment, due_date, updated_at
		)
		overriding system value
		values ($1, $2, $3, $4, $5, $6, $7)
		on conflict (user_id, question_id) do update set
			response_value = excluded.response_value,
			comment = excluded.comment,
			due_date = excluded.due_date,
			updated_at = excluded.updated_at`,
		[
			answerState.id,
			answerState.userId,
			answerState.questionId,
			answerState.responseValue,
			answerState.comment,
			answerState.dueDate,
			answerState.updatedAt
		]
	);
	await resetRuntimePostgresSequences(pool, ['app_answer_states']);
}

export async function replaceRuntimeContentSnapshotInPostgres(input: {
	checklists: ChecklistRow[];
	profileCatalog: ProfileCatalogRow[];
	sections: SectionRow[];
	sectionProfiles: SectionProfileRow[];
	questionGroups: QuestionGroupRow[];
	questions: QuestionRow[];
	questionProfiles: QuestionProfileRow[];
	facts: FactRow[];
	questionFactLinks: QuestionFactLinkRow[];
}) {
	if (!isRuntimePostgresShadowEnabled()) {
		return;
	}

	const client = await requireRuntimePostgresPool().connect();

	try {
		await client.query('begin');
		await client.query('delete from app_question_fact_links');
		await client.query('delete from app_question_profiles');
		await client.query('delete from app_questions');
		await client.query('delete from app_question_groups');
		await client.query('delete from app_section_profiles');
		await client.query('delete from app_sections');
		await client.query('delete from app_facts');
		await client.query('delete from app_profile_catalog');

		for (const checklist of input.checklists) {
			await client.query(
				`insert into app_checklists (id, slug, title, variant_key, snapshot_key, created_at)
				overriding system value
				values ($1, $2, $3, $4, $5, $6)
				on conflict (id) do update set
					slug = excluded.slug,
					title = excluded.title,
					variant_key = excluded.variant_key,
					snapshot_key = excluded.snapshot_key,
					created_at = excluded.created_at`,
				[
					checklist.id,
					checklist.slug,
					checklist.title,
					checklist.variantKey,
					checklist.snapshotKey,
					checklist.createdAt
				]
			);
		}

		for (const row of input.profileCatalog) {
			await client.query(
				`insert into app_profile_catalog (id, section_title, profile_key, profile_name)
				overriding system value
				values ($1, $2, $3, $4)`,
				[row.id, row.sectionTitle, row.profileKey, row.profileName]
			);
		}

		for (const row of input.sections) {
			await client.query(
				`insert into app_sections (
					id, checklist_id, node_id, prefix, title, description, sort_order
				)
				overriding system value
				values ($1, $2, $3, $4, $5, $6, $7)`,
				[row.id, row.checklistId, row.nodeId, row.prefix, row.title, row.description, row.sortOrder]
			);
		}

		for (const row of input.sectionProfiles) {
			await client.query(
				`insert into app_section_profiles (id, section_id, profile_key, profile_name)
				overriding system value
				values ($1, $2, $3, $4)`,
				[row.id, row.sectionId, row.profileKey, row.profileName]
			);
		}

		for (const row of input.questionGroups) {
			await client.query(
				`insert into app_question_groups (
					id, section_id, node_id, prefix, title, intro_text, sort_order
				)
				overriding system value
				values ($1, $2, $3, $4, $5, $6, $7)`,
				[row.id, row.sectionId, row.nodeId, row.prefix, row.title, row.introText, row.sortOrder]
			);
		}

		for (const row of input.questions) {
			await client.query(
				`insert into app_questions (
					id, group_id, node_id, prefix, question_text, sort_order, cc, cc_extra, base, annual_question, new_flag, recommended
				)
				overriding system value
				values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
				[
					row.id,
					row.groupId,
					row.nodeId,
					row.prefix,
					row.questionText,
					row.sortOrder,
					row.cc,
					row.ccExtra,
					row.base,
					row.annualQuestion,
					row.newFlag,
					row.recommended
				]
			);
		}

		for (const row of input.questionProfiles) {
			await client.query(
				`insert into app_question_profiles (id, question_id, profile_key, profile_name)
				overriding system value
				values ($1, $2, $3, $4)`,
				[row.id, row.questionId, row.profileKey, row.profileName]
			);
		}

		for (const row of input.facts) {
			await client.query(
				`insert into app_facts (id, fact_id, node_id, title, body_html, snapshot_key)
				overriding system value
				values ($1, $2, $3, $4, $5, $6)`,
				[row.id, row.factId, row.nodeId, row.title, row.bodyHtml, row.snapshotKey]
			);
		}

		for (const row of input.questionFactLinks) {
			await client.query(
				`insert into app_question_fact_links (id, question_id, fact_id, node_id, provenance)
				overriding system value
				values ($1, $2, $3, $4, $5)`,
				[row.id, row.questionId, row.factId, row.nodeId, row.provenance]
			);
		}

		await resetRuntimePostgresSequences(client, [
			'app_checklists',
			'app_profile_catalog',
			'app_sections',
			'app_section_profiles',
			'app_question_groups',
			'app_questions',
			'app_question_profiles',
			'app_facts',
			'app_question_fact_links'
		]);
		await client.query('commit');
	} catch (error) {
		await client.query('rollback');
		throw error;
	} finally {
		client.release();
	}
}
