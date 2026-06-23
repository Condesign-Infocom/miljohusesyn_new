import { getAppDbEngine, requireRuntimePostgresPool, type AppDb } from './client';
import {
	findRuntimeChecklistByIdFromSqlite,
	findRuntimeChecklistBySlugFromSqlite,
	loadRuntimeAdminUserDetailSeedDataFromSqlite,
	loadRuntimeAdminUserListDataFromSqlite,
	loadRuntimeAdminUserStatsDataFromSqlite,
	loadRuntimeChecklistDataFromSqlite,
	loadRuntimeEditableProfileSeedDataFromSqlite,
	loadRuntimeFactDetailDataFromSqlite,
	loadRuntimeProfileMirrorDataFromSqlite,
	loadRuntimePublicationPlanSourceDataFromSqlite,
	loadRuntimeReportingDataFromSqlite,
	loadRuntimeVisibilitySeedDataFromSqlite
} from './runtime-read-repository.sqlite';
import type { QueryResultRow } from 'pg';
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
import { ensureRuntimePostgresQuestionColumns } from './migrate';

const CHECKLISTS_SELECT = `
	select id, slug, title, variant_key as "variantKey", snapshot_key as "snapshotKey", created_at as "createdAt"
	from app_checklists
`;

const SECTIONS_SELECT = `
	select id, checklist_id as "checklistId", node_id as "nodeId", prefix, title, description, sort_order as "sortOrder"
	from app_sections
`;

const QUESTION_GROUPS_SELECT = `
	select id, section_id as "sectionId", node_id as "nodeId", prefix, title, intro_text as "introText", sort_order as "sortOrder"
	from app_question_groups
`;

const QUESTIONS_SELECT = `
	select id, group_id as "groupId", node_id as "nodeId", prefix, question_text as "questionText", sort_order as "sortOrder",
		cc, cc_extra as "ccExtra", base, annual_question as "annualQuestion", new_flag as "newFlag", recommended
	from app_questions
`;

function isMissingAnnualQuestionColumn(error: unknown) {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code?: string }).code === '42703' &&
		'message' in error &&
		typeof (error as { message?: string }).message === 'string' &&
		(error as { message: string }).message.includes('annual_question')
	);
}

async function queryQuestionsFromPostgres<T extends QueryResultRow = typeof appQuestions.$inferSelect>(
	sql: string,
	params: unknown[] = []
) {
	const pool = requireRuntimePostgresPool();

	try {
		return await pool.query<T>(sql, params);
	} catch (error) {
		if (!isMissingAnnualQuestionColumn(error)) {
			throw error;
		}

		await ensureRuntimePostgresQuestionColumns();
		return await pool.query<T>(sql, params);
	}
}

const SECTION_PROFILES_SELECT = `
	select id, section_id as "sectionId", profile_key as "profileKey", profile_name as "profileName"
	from app_section_profiles
`;

const QUESTION_PROFILES_SELECT = `
	select id, question_id as "questionId", profile_key as "profileKey", profile_name as "profileName"
	from app_question_profiles
`;

const FACT_LINKS_SELECT = `
	select id, question_id as "questionId", fact_id as "factId", node_id as "nodeId", provenance
	from app_question_fact_links
`;

const FACTS_SELECT = `
	select id, fact_id as "factId", node_id as "nodeId", title, body_html as "bodyHtml", snapshot_key as "snapshotKey"
	from app_facts
`;

const ANSWER_STATES_SELECT = `
	select id, user_id as "userId", question_id as "questionId", response_value as "responseValue", comment,
		due_date as "dueDate", updated_at as "updatedAt"
	from app_answer_states
`;

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

const CHECKLIST_ASSIGNMENTS_SELECT = `
	select id, user_id as "userId", checklist_id as "checklistId"
	from app_checklist_assignments
`;

const SESSIONS_SELECT = `
	select id, user_id as "userId", token_hash as "tokenHash", expires_at as "expiresAt", created_at as "createdAt"
	from app_sessions
`;

const USER_PROFILES_SELECT = `
	select id, user_id as "userId", profile_key as "profileKey", profile_name as "profileName"
	from app_user_profiles
`;

const USER_ACTIVITIES_SELECT = `
	select id, user_id as "userId", activity_name as "activityName", certified
	from app_user_activities
`;

const USER_SETTINGS_SELECT = `
	select id, user_id as "userId", key, value
	from app_user_settings
`;

const USER_ANIMAL_TYPES_SELECT = `
	select id, user_id as "userId", animal_key as "animalKey", animal_name as "animalName", amount
	from app_user_animal_types
`;

const PDF_EXPORT_EVENTS_SELECT = `
	select id, user_id as "userId", checklist_id as "checklistId", export_kind as "exportKind", filename,
		created_at as "createdAt"
	from app_pdf_export_events
`;

const PROFILE_UPDATE_EVENTS_SELECT = `
	select id, user_id as "userId", created_at as "createdAt"
	from app_profile_update_events
`;

const PUBLICATION_JOBS_SELECT = `
	select id, user_id as "userId", checklist_id as "checklistId", publication_kind as "publicationKind", status,
		attempt_count as "attemptCount", max_attempts as "maxAttempts", filename, output_pdf_path as "outputPdfPath",
		report_path as "reportPath", error_message as "errorMessage", queued_at as "queuedAt",
		last_attempt_at as "lastAttemptAt", next_retry_at as "nextRetryAt", created_at as "createdAt",
		finished_at as "finishedAt"
	from app_publication_jobs
`;

const PUBLICATION_DELIVERIES_SELECT = `
	select id, publication_job_id as "publicationJobId", user_id as "userId", checklist_id as "checklistId",
		delivery_kind as "deliveryKind", filename, byte_count as "byteCount", created_at as "createdAt"
	from app_publication_deliveries
`;

const EMPTY_PUBLICATION_PLAN_SOURCE_DATA = {
	hasAssignment: false,
	sections: [],
	questionGroups: [],
	questions: [],
	sectionProfiles: [],
	questionProfiles: [],
	factLinks: [],
	facts: [],
	answers: []
} satisfies Omit<PublicationPlanSourceData, 'checklist' | 'user'>;

export type ChecklistAssignmentRow = typeof appChecklistAssignments.$inferSelect;
export type ChecklistRow = typeof appChecklists.$inferSelect;
export type AnswerStateRow = typeof appAnswerStates.$inferSelect;
export type QuestionFactLinkRow = typeof appQuestionFactLinks.$inferSelect;

export type ChecklistRuntimeData = {
	assignments: ChecklistAssignmentRow[];
	checklists: ChecklistRow[];
	sections: typeof appSections.$inferSelect[];
	groups: typeof appQuestionGroups.$inferSelect[];
	questions: typeof appQuestions.$inferSelect[];
	sectionProfiles: typeof appSectionProfiles.$inferSelect[];
	questionProfiles: typeof appQuestionProfiles.$inferSelect[];
	answerStates: AnswerStateRow[];
	factLinks: QuestionFactLinkRow[];
};

export type ReportingData = {
	users: Array<typeof appUsers.$inferSelect>;
	checklists: Array<typeof appChecklists.$inferSelect>;
	assignments: Array<typeof appChecklistAssignments.$inferSelect>;
	answerStates: Array<typeof appAnswerStates.$inferSelect>;
	sessions: Array<typeof appSessions.$inferSelect>;
	profiles: Array<typeof appUserProfiles.$inferSelect>;
	activities: Array<typeof appUserActivities.$inferSelect>;
	questions: Array<typeof appQuestions.$inferSelect>;
	groups: Array<typeof appQuestionGroups.$inferSelect>;
	sections: Array<typeof appSections.$inferSelect>;
	pdfExportEvents: Array<typeof appPdfExportEvents.$inferSelect>;
	profileUpdateEvents: Array<typeof appProfileUpdateEvents.$inferSelect>;
	publicationJobs: Array<typeof appPublicationJobs.$inferSelect>;
	publicationDeliveries: Array<typeof appPublicationDeliveries.$inferSelect>;
};

export type PublicationPlanSourceData = {
	checklist: typeof appChecklists.$inferSelect | null;
	user: typeof appUsers.$inferSelect | null;
	hasAssignment: boolean;
	sections: Array<typeof appSections.$inferSelect>;
	questionGroups: Array<typeof appQuestionGroups.$inferSelect>;
	questions: Array<typeof appQuestions.$inferSelect>;
	sectionProfiles: Array<typeof appSectionProfiles.$inferSelect>;
	questionProfiles: Array<typeof appQuestionProfiles.$inferSelect>;
	factLinks: Array<typeof appQuestionFactLinks.$inferSelect>;
	facts: Array<typeof appFacts.$inferSelect>;
	answers: Array<typeof appAnswerStates.$inferSelect>;
};

export type VisibilitySeedData = {
	user: Pick<typeof appUsers.$inferSelect, 'id' | 'role'> | null;
	profiles: Array<{ profileKey: string; profileName: string }>;
	settings: Array<{ key: string; value: string }>;
	activities: Array<{ activityName: string }>;
	animalTypes: Array<{ animalKey: string; animalName: string; amount: number }>;
	profileCatalog: Array<{ profileKey: string; profileName: string }>;
};

export type AdminUserListData = {
	users: Array<typeof appUsers.$inferSelect>;
	assignments: Array<typeof appChecklistAssignments.$inferSelect>;
	profiles: Array<typeof appUserProfiles.$inferSelect>;
};

export type AdminUserDetailSeedData = {
	user: typeof appUsers.$inferSelect | null;
	activities: Array<typeof appUserActivities.$inferSelect>;
};

export type AdminUserStatsData = {
	users: Array<typeof appUsers.$inferSelect>;
	profiles: Array<typeof appUserProfiles.$inferSelect>;
	assignments: Array<typeof appChecklistAssignments.$inferSelect>;
	activities: Array<typeof appUserActivities.$inferSelect>;
};

export type RuntimeProfileMirrorData = {
	user: typeof appUsers.$inferSelect | null;
	settings: Array<typeof appUserSettings.$inferSelect>;
	activities: Array<typeof appUserActivities.$inferSelect>;
	animalTypes: Array<typeof appUserAnimalTypes.$inferSelect>;
	profiles: Array<typeof appUserProfiles.$inferSelect>;
	assignments: Array<typeof appChecklistAssignments.$inferSelect>;
	checklistsById: Map<number, typeof appChecklists.$inferSelect>;
	profileUpdateEvent: typeof appProfileUpdateEvents.$inferSelect | null;
};

export type EditableProfileSeedData = {
	user: (typeof appUsers.$inferSelect & {
		settings: Array<typeof appUserSettings.$inferSelect>;
		activities: Array<typeof appUserActivities.$inferSelect>;
		animalTypes: Array<typeof appUserAnimalTypes.$inferSelect>;
		profiles: Array<typeof appUserProfiles.$inferSelect>;
		checklistAssignments: Array<
			typeof appChecklistAssignments.$inferSelect & {
				checklist: typeof appChecklists.$inferSelect;
			}
		>;
	}) | null;
};

export type FactDetailData = {
	nodeId: string;
	title: string;
	bodyHtml: string;
} | null;

export async function findRuntimeChecklistById(db: AppDb, checklistId: number) {
	if (getAppDbEngine(db) === 'postgres') {
		const result = await requireRuntimePostgresPool().query<ChecklistRow>(
			`${CHECKLISTS_SELECT} where id = $1 limit 1`,
			[checklistId]
		);
		return result.rows[0] ?? null;
	}

	return findRuntimeChecklistByIdFromSqlite(db, checklistId);
}

export async function findRuntimeChecklistBySlug(db: AppDb, checklistSlug: string) {
	if (getAppDbEngine(db) === 'postgres') {
		const result = await requireRuntimePostgresPool().query<ChecklistRow>(
			`${CHECKLISTS_SELECT} where slug = $1 limit 1`,
			[checklistSlug]
		);
		return result.rows[0] ?? null;
	}

	return findRuntimeChecklistBySlugFromSqlite(db, checklistSlug);
}

export async function loadRuntimeEditableProfileSeedData(
	db: AppDb,
	userId: number
): Promise<EditableProfileSeedData> {
	if (getAppDbEngine(db) === 'postgres') {
		return loadRuntimeEditableProfileSeedDataFromPostgres(userId);
	}

	return loadRuntimeEditableProfileSeedDataFromSqlite(db, userId);
}

export async function loadRuntimeFactDetailData(db: AppDb, nodeId: string): Promise<FactDetailData> {
	if (getAppDbEngine(db) === 'postgres') {
		return loadRuntimeFactDetailDataFromPostgres(nodeId);
	}

	return loadRuntimeFactDetailDataFromSqlite(db, nodeId);
}

function loadEmptyPublicationPlanSourceData(
	checklist: PublicationPlanSourceData['checklist'],
	user: PublicationPlanSourceData['user']
): PublicationPlanSourceData {
	return {
		checklist,
		user,
		...EMPTY_PUBLICATION_PLAN_SOURCE_DATA
	};
}

export async function loadRuntimeChecklistData(db: AppDb, userId: number): Promise<ChecklistRuntimeData> {
	if (getAppDbEngine(db) === 'postgres') {
		return loadRuntimeChecklistDataFromPostgres(userId);
	}

	return loadRuntimeChecklistDataFromSqlite(db, userId);
}

export async function loadRuntimeReportingData(db: AppDb): Promise<ReportingData> {
	if (getAppDbEngine(db) === 'postgres') {
		return loadRuntimeReportingDataFromPostgres();
	}

	return loadRuntimeReportingDataFromSqlite(db);
}

export async function loadRuntimeAdminUserListData(db: AppDb): Promise<AdminUserListData> {
	if (getAppDbEngine(db) === 'postgres') {
		return loadRuntimeAdminUserListDataFromPostgres();
	}

	return loadRuntimeAdminUserListDataFromSqlite(db);
}

export async function loadRuntimeAdminUserDetailSeedData(
	db: AppDb,
	userId: number
): Promise<AdminUserDetailSeedData> {
	if (getAppDbEngine(db) === 'postgres') {
		return loadRuntimeAdminUserDetailSeedDataFromPostgres(userId);
	}

	return loadRuntimeAdminUserDetailSeedDataFromSqlite(db, userId);
}

export async function loadRuntimeAdminUserStatsData(db: AppDb): Promise<AdminUserStatsData> {
	if (getAppDbEngine(db) === 'postgres') {
		return loadRuntimeAdminUserStatsDataFromPostgres();
	}

	return loadRuntimeAdminUserStatsDataFromSqlite(db);
}

export async function loadRuntimeProfileMirrorData(
	db: AppDb,
	userId: number,
	profileUpdateEventId: number
): Promise<RuntimeProfileMirrorData> {
	if (getAppDbEngine(db) === 'postgres') {
		return loadRuntimeProfileMirrorDataFromPostgres(userId, profileUpdateEventId);
	}

	return loadRuntimeProfileMirrorDataFromSqlite(db, userId, profileUpdateEventId);
}

export async function loadRuntimePublicationPlanSourceData(
	db: AppDb,
	checklistSlug: string,
	userId: number,
	kind: 'complete' | 'user-full' | 'user-plan'
): Promise<PublicationPlanSourceData> {
	if (getAppDbEngine(db) === 'postgres') {
		return loadRuntimePublicationPlanSourceDataFromPostgres(checklistSlug, userId, kind);
	}

	return loadRuntimePublicationPlanSourceDataFromSqlite(db, checklistSlug, userId, kind);
}

export async function loadRuntimeVisibilitySeedData(
	db: AppDb,
	userId: number
): Promise<VisibilitySeedData> {
	if (getAppDbEngine(db) === 'postgres') {
		return loadRuntimeVisibilitySeedDataFromPostgres(userId);
	}

	return loadRuntimeVisibilitySeedDataFromSqlite(db, userId);
}

async function loadRuntimeChecklistDataFromPostgres(userId: number): Promise<ChecklistRuntimeData> {
	const pool = requireRuntimePostgresPool();
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
		pool.query<ChecklistAssignmentRow>(`${CHECKLIST_ASSIGNMENTS_SELECT} where user_id = $1`, [userId]),
		pool.query<ChecklistRow>(CHECKLISTS_SELECT),
		pool.query<typeof appSections.$inferSelect>(`${SECTIONS_SELECT} order by "sortOrder"`),
		pool.query<typeof appQuestionGroups.$inferSelect>(`${QUESTION_GROUPS_SELECT} order by "sortOrder"`),
		queryQuestionsFromPostgres<typeof appQuestions.$inferSelect>(`${QUESTIONS_SELECT} order by "sortOrder"`),
		pool.query<typeof appSectionProfiles.$inferSelect>(SECTION_PROFILES_SELECT),
		pool.query<typeof appQuestionProfiles.$inferSelect>(QUESTION_PROFILES_SELECT),
		pool.query<AnswerStateRow>(`${ANSWER_STATES_SELECT} where user_id = $1`, [userId]),
		pool.query<QuestionFactLinkRow>(FACT_LINKS_SELECT)
	]);

	return {
		assignments: assignments.rows,
		checklists: checklists.rows,
		sections: sections.rows,
		groups: groups.rows,
		questions: questions.rows,
		sectionProfiles: sectionProfiles.rows,
		questionProfiles: questionProfiles.rows,
		answerStates: answerStates.rows,
		factLinks: factLinks.rows
	};
}

async function loadRuntimeReportingDataFromPostgres(): Promise<ReportingData> {
	const pool = requireRuntimePostgresPool();
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
		pool.query(USERS_SELECT),
		pool.query(CHECKLISTS_SELECT),
		pool.query(CHECKLIST_ASSIGNMENTS_SELECT),
		pool.query(ANSWER_STATES_SELECT),
		pool.query(SESSIONS_SELECT),
		pool.query(USER_PROFILES_SELECT),
		pool.query(USER_ACTIVITIES_SELECT),
		queryQuestionsFromPostgres(QUESTIONS_SELECT),
		pool.query(QUESTION_GROUPS_SELECT),
		pool.query(SECTIONS_SELECT),
		pool.query(PDF_EXPORT_EVENTS_SELECT),
		pool.query(PROFILE_UPDATE_EVENTS_SELECT),
		pool.query(PUBLICATION_JOBS_SELECT),
		pool.query(PUBLICATION_DELIVERIES_SELECT)
	]);

	return {
		users: users.rows as ReportingData['users'],
		checklists: checklists.rows as ReportingData['checklists'],
		assignments: assignments.rows as ReportingData['assignments'],
		answerStates: answerStates.rows as ReportingData['answerStates'],
		sessions: sessions.rows as ReportingData['sessions'],
		profiles: profiles.rows as ReportingData['profiles'],
		activities: activities.rows as ReportingData['activities'],
		questions: questions.rows as ReportingData['questions'],
		groups: groups.rows as ReportingData['groups'],
		sections: sections.rows as ReportingData['sections'],
		pdfExportEvents: pdfExportEvents.rows as ReportingData['pdfExportEvents'],
		profileUpdateEvents: profileUpdateEvents.rows as ReportingData['profileUpdateEvents'],
		publicationJobs: publicationJobs.rows as ReportingData['publicationJobs'],
		publicationDeliveries: publicationDeliveries.rows as ReportingData['publicationDeliveries']
	};
}

async function loadRuntimeAdminUserListDataFromPostgres(): Promise<AdminUserListData> {
	const pool = requireRuntimePostgresPool();
	const [users, assignments, profiles] = await Promise.all([
		pool.query(USERS_SELECT),
		pool.query(CHECKLIST_ASSIGNMENTS_SELECT),
		pool.query(USER_PROFILES_SELECT)
	]);

	return {
		users: users.rows as AdminUserListData['users'],
		assignments: assignments.rows as AdminUserListData['assignments'],
		profiles: profiles.rows as AdminUserListData['profiles']
	};
}

async function loadRuntimeAdminUserDetailSeedDataFromPostgres(
	userId: number
): Promise<AdminUserDetailSeedData> {
	const pool = requireRuntimePostgresPool();
	const [user, activities] = await Promise.all([
		pool.query<typeof appUsers.$inferSelect>(`${USERS_SELECT} where id = $1 limit 1`, [userId]),
		pool.query<typeof appUserActivities.$inferSelect>(`${USER_ACTIVITIES_SELECT} where user_id = $1`, [userId])
	]);

	return {
		user: user.rows[0] ?? null,
		activities: activities.rows
	};
}

async function loadRuntimeAdminUserStatsDataFromPostgres(): Promise<AdminUserStatsData> {
	const pool = requireRuntimePostgresPool();
	const [users, profiles, assignments, activities] = await Promise.all([
		pool.query(USERS_SELECT),
		pool.query(USER_PROFILES_SELECT),
		pool.query(CHECKLIST_ASSIGNMENTS_SELECT),
		pool.query(USER_ACTIVITIES_SELECT)
	]);

	return {
		users: users.rows as AdminUserStatsData['users'],
		profiles: profiles.rows as AdminUserStatsData['profiles'],
		assignments: assignments.rows as AdminUserStatsData['assignments'],
		activities: activities.rows as AdminUserStatsData['activities']
	};
}

async function loadRuntimeProfileMirrorDataFromPostgres(
	userId: number,
	profileUpdateEventId: number
): Promise<RuntimeProfileMirrorData> {
	const pool = requireRuntimePostgresPool();
	const [user, settings, activities, animalTypes, profiles, assignments, checklists, profileUpdateEvent] =
		await Promise.all([
			pool.query<typeof appUsers.$inferSelect>(`${USERS_SELECT} where id = $1 limit 1`, [userId]),
			pool.query<typeof appUserSettings.$inferSelect>(
				'select id, user_id as "userId", key, value from app_user_settings where user_id = $1',
				[userId]
			),
			pool.query<typeof appUserActivities.$inferSelect>(`${USER_ACTIVITIES_SELECT} where user_id = $1`, [userId]),
			pool.query<typeof appUserAnimalTypes.$inferSelect>(
				'select id, user_id as "userId", animal_key as "animalKey", animal_name as "animalName", amount from app_user_animal_types where user_id = $1',
				[userId]
			),
			pool.query<typeof appUserProfiles.$inferSelect>(`${USER_PROFILES_SELECT} where user_id = $1`, [userId]),
			pool.query<typeof appChecklistAssignments.$inferSelect>(
				`${CHECKLIST_ASSIGNMENTS_SELECT} where user_id = $1`,
				[userId]
			),
			pool.query<typeof appChecklists.$inferSelect>(CHECKLISTS_SELECT),
			pool.query<typeof appProfileUpdateEvents.$inferSelect>(
				`${PROFILE_UPDATE_EVENTS_SELECT} where id = $1 limit 1`,
				[profileUpdateEventId]
			)
		]);

	return {
		user: user.rows[0] ?? null,
		settings: settings.rows,
		activities: activities.rows,
		animalTypes: animalTypes.rows,
		profiles: profiles.rows,
		assignments: assignments.rows,
		checklistsById: new Map(
			(checklists.rows as Array<typeof appChecklists.$inferSelect>).map((checklist) => [
				checklist.id,
				checklist
			])
		),
		profileUpdateEvent: profileUpdateEvent.rows[0] ?? null
	};
}

async function loadRuntimePublicationPlanSourceDataFromPostgres(
	checklistSlug: string,
	userId: number,
	kind: 'complete' | 'user-full' | 'user-plan'
): Promise<PublicationPlanSourceData> {
	const pool = requireRuntimePostgresPool();
	const checklistResult = await pool.query<typeof appChecklists.$inferSelect>(
		`${CHECKLISTS_SELECT} where slug = $1 limit 1`,
		[checklistSlug]
	);
	const userResult = await pool.query<typeof appUsers.$inferSelect>(
		`${USERS_SELECT} where id = $1 limit 1`,
		[userId]
	);

	const checklist = checklistResult.rows[0] ?? null;
	const user = userResult.rows[0] ?? null;

	if (!checklist || !user) {
		return loadEmptyPublicationPlanSourceData(checklist, user);
	}

	const assignmentResult =
		kind === 'complete' ?
			{ rows: [{ id: 1 }] }
		:	await pool.query<{ id: number }>(
				`${CHECKLIST_ASSIGNMENTS_SELECT} where user_id = $1 and checklist_id = $2 limit 1`,
				[userId, checklist.id]
			);
	const sectionsResult = await pool.query<typeof appSections.$inferSelect>(
		`${SECTIONS_SELECT} where checklist_id = $1 order by "sortOrder"`,
		[checklist.id]
	);
	const sectionIds = sectionsResult.rows.map((section) => section.id);
	const questionGroupsResult =
		sectionIds.length === 0 ?
			{ rows: [] as Array<typeof appQuestionGroups.$inferSelect> }
		:	await pool.query<typeof appQuestionGroups.$inferSelect>(
				`${QUESTION_GROUPS_SELECT} where section_id = any($1::int[]) order by "sortOrder"`,
				[sectionIds]
			);
	const groupIds = questionGroupsResult.rows.map((group) => group.id);
	const questionsResult =
		groupIds.length === 0 ?
			{ rows: [] as Array<typeof appQuestions.$inferSelect> }
		:	await queryQuestionsFromPostgres<typeof appQuestions.$inferSelect>(
				`${QUESTIONS_SELECT} where group_id = any($1::int[]) order by "sortOrder"`,
				[groupIds]
			);
	const questionIds = questionsResult.rows.map((question) => question.id);
	const sectionProfilesResult =
		kind === 'complete' || sectionIds.length === 0 ?
			{ rows: [] as Array<typeof appSectionProfiles.$inferSelect> }
		:	await pool.query<typeof appSectionProfiles.$inferSelect>(
				`${SECTION_PROFILES_SELECT} where section_id = any($1::int[])`,
				[sectionIds]
			);
	const questionProfilesResult =
		kind === 'complete' || questionIds.length === 0 ?
			{ rows: [] as Array<typeof appQuestionProfiles.$inferSelect> }
		:	await pool.query<typeof appQuestionProfiles.$inferSelect>(
				`${QUESTION_PROFILES_SELECT} where question_id = any($1::int[])`,
				[questionIds]
			);
	const factLinksResult =
		questionIds.length === 0 ?
			{ rows: [] as Array<typeof appQuestionFactLinks.$inferSelect> }
		:	await pool.query<typeof appQuestionFactLinks.$inferSelect>(
				`${FACT_LINKS_SELECT} where question_id = any($1::int[])`,
				[questionIds]
			);
	const factIds = Array.from(new Set(factLinksResult.rows.map((link) => link.factId)));
	const factsResult =
		factIds.length === 0 ?
			{ rows: [] as Array<typeof appFacts.$inferSelect> }
		:	await pool.query<typeof appFacts.$inferSelect>(
				`${FACTS_SELECT} where id = any($1::int[])`,
				[factIds]
			);
	const answersResult =
		kind === 'complete' || questionIds.length === 0 ?
			{ rows: [] as Array<typeof appAnswerStates.$inferSelect> }
		:	await pool.query<typeof appAnswerStates.$inferSelect>(
				`${ANSWER_STATES_SELECT} where user_id = $1 and question_id = any($2::int[])`,
				[userId, questionIds]
			);

	return {
		checklist,
		user,
		hasAssignment: assignmentResult.rows.length > 0,
		sections: sectionsResult.rows,
		questionGroups: questionGroupsResult.rows,
		questions: questionsResult.rows,
		sectionProfiles: sectionProfilesResult.rows,
		questionProfiles: questionProfilesResult.rows,
		factLinks: factLinksResult.rows,
		facts: factsResult.rows,
		answers: answersResult.rows
	};
}

async function loadRuntimeVisibilitySeedDataFromPostgres(userId: number): Promise<VisibilitySeedData> {
	const pool = requireRuntimePostgresPool();
	const [userResult, profilesResult, settingsResult, activitiesResult, animalTypesResult, profileCatalogResult] =
		await Promise.all([
			pool.query<{ id: number; role: string }>(
				'select id, role from app_users where id = $1 limit 1',
				[userId]
			),
			pool.query<{ profileKey: string; profileName: string }>(
				'select profile_key as "profileKey", profile_name as "profileName" from app_user_profiles where user_id = $1',
				[userId]
			),
			pool.query<{ key: string; value: string }>(
				'select key, value from app_user_settings where user_id = $1',
				[userId]
			),
			pool.query<{ activityName: string }>(
				'select activity_name as "activityName" from app_user_activities where user_id = $1',
				[userId]
			),
			pool.query<{ animalKey: string; animalName: string; amount: number }>(
				'select animal_key as "animalKey", animal_name as "animalName", amount from app_user_animal_types where user_id = $1',
				[userId]
			),
			pool.query<{ profileKey: string; profileName: string }>(
				'select profile_key as "profileKey", profile_name as "profileName" from app_profile_catalog'
			)
		]);

	return {
		user: userResult.rows[0] ?? null,
		profiles: profilesResult.rows,
		settings: settingsResult.rows,
		activities: activitiesResult.rows,
		animalTypes: animalTypesResult.rows,
		profileCatalog: profileCatalogResult.rows
	};
}

async function loadRuntimeEditableProfileSeedDataFromPostgres(
	userId: number
): Promise<EditableProfileSeedData> {
	const pool = requireRuntimePostgresPool();
	const [user, settings, activities, animalTypes, profiles, assignments, checklists] = await Promise.all([
		pool.query<typeof appUsers.$inferSelect>(`${USERS_SELECT} where id = $1 limit 1`, [userId]),
		pool.query<typeof appUserSettings.$inferSelect>(`${USER_SETTINGS_SELECT} where user_id = $1`, [userId]),
		pool.query<typeof appUserActivities.$inferSelect>(`${USER_ACTIVITIES_SELECT} where user_id = $1`, [userId]),
		pool.query<typeof appUserAnimalTypes.$inferSelect>(
			`${USER_ANIMAL_TYPES_SELECT} where user_id = $1`,
			[userId]
		),
		pool.query<typeof appUserProfiles.$inferSelect>(`${USER_PROFILES_SELECT} where user_id = $1`, [userId]),
		pool.query<typeof appChecklistAssignments.$inferSelect>(
			`${CHECKLIST_ASSIGNMENTS_SELECT} where user_id = $1`,
			[userId]
		),
		pool.query<typeof appChecklists.$inferSelect>(CHECKLISTS_SELECT)
	]);

	const foundUser = user.rows[0];

	if (!foundUser) {
		return { user: null };
	}

	const checklistsById = new Map(checklists.rows.map((checklist) => [checklist.id, checklist]));

	return {
		user: {
			...foundUser,
			settings: settings.rows,
			activities: activities.rows,
			animalTypes: animalTypes.rows,
			profiles: profiles.rows,
			checklistAssignments: assignments.rows
				.map((assignment) => {
					const checklist = checklistsById.get(assignment.checklistId);

					return checklist ? { ...assignment, checklist } : null;
				})
				.filter(
					(
						assignment
					): assignment is typeof appChecklistAssignments.$inferSelect & {
						checklist: typeof appChecklists.$inferSelect;
					} => assignment !== null
				)
		}
	};
}

async function loadRuntimeFactDetailDataFromPostgres(nodeId: string): Promise<FactDetailData> {
	const result = await requireRuntimePostgresPool().query<NonNullable<FactDetailData>>(
		`
			select l.node_id as "nodeId", f.title, f.body_html as "bodyHtml"
			from app_question_fact_links l
			join app_facts f on f.id = l.fact_id
			where l.node_id = $1
			limit 1
		`,
		[nodeId]
	);

	return result.rows[0] ?? null;
}
