import { relations, sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const appResponseValues = ['yes', 'no', 'na', 'blank'] as const;

export const appChecklists = sqliteTable(
	'app_checklists',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		variantKey: text('variant_key').notNull(),
		snapshotKey: text('snapshot_key').notNull(),
		createdAt: text('created_at').notNull().default(sql`current_timestamp`)
	},
	(table) => ({
		slugIdx: uniqueIndex('app_checklists_slug_idx').on(table.slug)
	})
);

export const appSections = sqliteTable(
	'app_sections',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		checklistId: integer('checklist_id')
			.notNull()
			.references(() => appChecklists.id, { onDelete: 'cascade' }),
		nodeId: text('node_id').notNull(),
		prefix: text('prefix').notNull(),
		title: text('title').notNull(),
		description: text('description').notNull().default(''),
		sortOrder: integer('sort_order').notNull()
	},
	(table) => ({
		checklistNodeIdx: uniqueIndex('app_sections_checklist_node_idx').on(table.checklistId, table.nodeId),
		checklistSortIdx: index('app_sections_checklist_sort_idx').on(table.checklistId, table.sortOrder)
	})
);

export const appQuestionGroups = sqliteTable(
	'app_question_groups',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		sectionId: integer('section_id')
			.notNull()
			.references(() => appSections.id, { onDelete: 'cascade' }),
		nodeId: text('node_id').notNull(),
		prefix: text('prefix').notNull(),
		title: text('title').notNull(),
		introText: text('intro_text').notNull().default(''),
		sortOrder: integer('sort_order').notNull()
	},
	(table) => ({
		sectionNodeIdx: uniqueIndex('app_question_groups_section_node_idx').on(table.sectionId, table.nodeId),
		sectionSortIdx: index('app_question_groups_section_sort_idx').on(table.sectionId, table.sortOrder)
	})
);

export const appProfileCatalog = sqliteTable(
	'app_profile_catalog',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		sectionTitle: text('section_title').notNull(),
		profileKey: text('profile_key').notNull(),
		profileName: text('profile_name').notNull()
	},
	(table) => ({
		profileKeyIdx: uniqueIndex('app_profile_catalog_profile_key_idx').on(table.profileKey),
		sectionTitleIdx: index('app_profile_catalog_section_title_idx').on(table.sectionTitle)
	})
);

export const appSectionProfiles = sqliteTable(
	'app_section_profiles',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		sectionId: integer('section_id')
			.notNull()
			.references(() => appSections.id, { onDelete: 'cascade' }),
		profileKey: text('profile_key').notNull(),
		profileName: text('profile_name').notNull()
	},
	(table) => ({
		sectionProfileIdx: uniqueIndex('app_section_profiles_section_profile_idx').on(
			table.sectionId,
			table.profileKey
		),
		sectionIdx: index('app_section_profiles_section_idx').on(table.sectionId)
	})
);

export const appQuestions = sqliteTable(
	'app_questions',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		groupId: integer('group_id')
			.notNull()
			.references(() => appQuestionGroups.id, { onDelete: 'cascade' }),
		nodeId: text('node_id').notNull(),
		prefix: text('prefix').notNull(),
		questionText: text('question_text').notNull(),
		sortOrder: integer('sort_order').notNull(),
		cc: integer('cc', { mode: 'boolean' }).notNull().default(false),
		ccExtra: integer('cc_extra', { mode: 'boolean' }).notNull().default(false),
		base: integer('base', { mode: 'boolean' }).notNull().default(false),
		annualQuestion: integer('annual_question', { mode: 'boolean' }).notNull().default(false),
		newFlag: integer('new_flag', { mode: 'boolean' }).notNull().default(false),
		recommended: integer('recommended', { mode: 'boolean' }).notNull().default(false)
	},
	(table) => ({
		groupNodeIdx: uniqueIndex('app_questions_group_node_idx').on(table.groupId, table.nodeId),
		groupSortIdx: index('app_questions_group_sort_idx').on(table.groupId, table.sortOrder)
	})
);

export const appQuestionProfiles = sqliteTable(
	'app_question_profiles',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		questionId: integer('question_id')
			.notNull()
			.references(() => appQuestions.id, { onDelete: 'cascade' }),
		profileKey: text('profile_key').notNull(),
		profileName: text('profile_name').notNull()
	},
	(table) => ({
		questionProfileIdx: uniqueIndex('app_question_profiles_question_profile_idx').on(
			table.questionId,
			table.profileKey
		),
		questionIdx: index('app_question_profiles_question_idx').on(table.questionId)
	})
);

export const appFacts = sqliteTable(
	'app_facts',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		factId: text('fact_id').notNull(),
		nodeId: text('node_id').notNull(),
		title: text('title').notNull(),
		bodyHtml: text('body_html').notNull().default(''),
		snapshotKey: text('snapshot_key').notNull()
	},
	(table) => ({
		snapshotFactIdx: uniqueIndex('app_facts_snapshot_fact_idx').on(table.snapshotKey, table.factId),
		nodeIdx: index('app_facts_node_idx').on(table.nodeId)
	})
);

export const appQuestionFactLinks = sqliteTable(
	'app_question_fact_links',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		questionId: integer('question_id')
			.notNull()
			.references(() => appQuestions.id, { onDelete: 'cascade' }),
		factId: integer('fact_id')
			.notNull()
			.references(() => appFacts.id, { onDelete: 'cascade' }),
		nodeId: text('node_id').notNull(),
		provenance: text('provenance').notNull().default('explicit')
	},
	(table) => ({
		questionFactIdx: uniqueIndex('app_question_fact_links_question_fact_idx').on(
			table.questionId,
			table.factId
		),
		nodeIdx: index('app_question_fact_links_node_idx').on(table.nodeId)
	})
);

export const appUsers = sqliteTable('app_users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	email: text('email').notNull().unique(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull().default(''),
	displayName: text('display_name').notNull(),
	role: text('role').notNull().default('user'),
	firstName: text('first_name').notNull().default(''),
	lastName: text('last_name').notNull().default(''),
	phone: text('phone').notNull().default(''),
	website: text('website').notNull().default(''),
	companyName: text('company_name').notNull().default(''),
	companyOrgNum: text('company_org_num').notNull().default(''),
	companyAddress1: text('company_address_1').notNull().default(''),
	companyAddress2: text('company_address_2').notNull().default(''),
	companyCity: text('company_city').notNull().default(''),
	companyPostcode: text('company_postcode').notNull().default(''),
	address1: text('address_1').notNull().default(''),
	address2: text('address_2').notNull().default(''),
	postcode: text('postcode').notNull().default(''),
	city: text('city').notNull().default(''),
	lrfId: text('lrf_id').notNull().default(''),
	alertSms: integer('alert_sms', { mode: 'boolean' }).notNull().default(false),
	alertEmail: integer('alert_email', { mode: 'boolean' }).notNull().default(true),
	createdAt: text('created_at').notNull().default(sql`current_timestamp`)
});

export const appUserSettings = sqliteTable(
	'app_user_settings',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => appUsers.id, { onDelete: 'cascade' }),
		key: text('key').notNull(),
		value: text('value').notNull().default('true')
	},
	(table) => ({
		userSettingIdx: uniqueIndex('app_user_settings_user_key_idx').on(table.userId, table.key),
		userIdx: index('app_user_settings_user_idx').on(table.userId)
	})
);

export const appUserProfiles = sqliteTable(
	'app_user_profiles',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => appUsers.id, { onDelete: 'cascade' }),
		profileKey: text('profile_key').notNull(),
		profileName: text('profile_name').notNull()
	},
	(table) => ({
		userProfileIdx: uniqueIndex('app_user_profiles_user_profile_idx').on(
			table.userId,
			table.profileKey
		),
		userIdx: index('app_user_profiles_user_idx').on(table.userId)
	})
);

export const appUserActivities = sqliteTable(
	'app_user_activities',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => appUsers.id, { onDelete: 'cascade' }),
		activityName: text('activity_name').notNull(),
		certified: integer('certified')
	},
	(table) => ({
		userActivityIdx: uniqueIndex('app_user_activities_user_activity_idx').on(
			table.userId,
			table.activityName
		),
		userIdx: index('app_user_activities_user_idx').on(table.userId)
	})
);

export const appUserAnimalTypes = sqliteTable(
	'app_user_animal_types',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => appUsers.id, { onDelete: 'cascade' }),
		animalKey: text('animal_key').notNull(),
		animalName: text('animal_name').notNull(),
		amount: integer('amount').notNull().default(0)
	},
	(table) => ({
		userAnimalIdx: uniqueIndex('app_user_animal_types_user_animal_idx').on(
			table.userId,
			table.animalKey
		),
		userIdx: index('app_user_animal_types_user_idx').on(table.userId)
	})
);

export const appSessions = sqliteTable(
	'app_sessions',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => appUsers.id, { onDelete: 'cascade' }),
		tokenHash: text('token_hash').notNull().unique(),
		expiresAt: text('expires_at').notNull(),
		createdAt: text('created_at').notNull().default(sql`current_timestamp`)
	},
	(table) => ({
		tokenIdx: uniqueIndex('app_sessions_token_hash_idx').on(table.tokenHash),
		userIdx: index('app_sessions_user_idx').on(table.userId),
		expiresAtIdx: index('app_sessions_expires_at_idx').on(table.expiresAt)
	})
);

export const appChecklistAssignments = sqliteTable(
	'app_checklist_assignments',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => appUsers.id, { onDelete: 'cascade' }),
		checklistId: integer('checklist_id')
			.notNull()
			.references(() => appChecklists.id, { onDelete: 'cascade' })
	},
	(table) => ({
		userChecklistIdx: uniqueIndex('app_checklist_assignments_user_checklist_idx').on(
			table.userId,
			table.checklistId
		),
		userIdx: index('app_checklist_assignments_user_idx').on(table.userId)
	})
);

export const appPdfExportEvents = sqliteTable(
	'app_pdf_export_events',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => appUsers.id, { onDelete: 'cascade' }),
		checklistId: integer('checklist_id')
			.notNull()
			.references(() => appChecklists.id, { onDelete: 'cascade' }),
		exportKind: text('export_kind').notNull().default('plan'),
		filename: text('filename').notNull().default(''),
		createdAt: text('created_at').notNull().default(sql`current_timestamp`)
	},
	(table) => ({
		userIdx: index('app_pdf_export_events_user_idx').on(table.userId),
		checklistIdx: index('app_pdf_export_events_checklist_idx').on(table.checklistId),
		createdAtIdx: index('app_pdf_export_events_created_at_idx').on(table.createdAt)
	})
);

export const appProfileUpdateEvents = sqliteTable(
	'app_profile_update_events',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => appUsers.id, { onDelete: 'cascade' }),
		createdAt: text('created_at').notNull().default(sql`current_timestamp`)
	},
	(table) => ({
		userIdx: index('app_profile_update_events_user_idx').on(table.userId),
		createdAtIdx: index('app_profile_update_events_created_at_idx').on(table.createdAt)
	})
);

export const appPublicationJobs = sqliteTable(
	'app_publication_jobs',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => appUsers.id, { onDelete: 'cascade' }),
		checklistId: integer('checklist_id')
			.notNull()
			.references(() => appChecklists.id, { onDelete: 'cascade' }),
		publicationKind: text('publication_kind').notNull().default('user-plan'),
		status: text('status').notNull().default('queued'),
		attemptCount: integer('attempt_count').notNull().default(0),
		maxAttempts: integer('max_attempts').notNull().default(3),
		filename: text('filename').notNull().default(''),
		outputPdfPath: text('output_pdf_path').notNull().default(''),
		reportPath: text('report_path').notNull().default(''),
		errorMessage: text('error_message').notNull().default(''),
		queuedAt: text('queued_at').notNull().default(sql`current_timestamp`),
		lastAttemptAt: text('last_attempt_at'),
		nextRetryAt: text('next_retry_at'),
		createdAt: text('created_at').notNull().default(sql`current_timestamp`),
		finishedAt: text('finished_at')
	},
	(table) => ({
		userIdx: index('app_publication_jobs_user_idx').on(table.userId),
		checklistIdx: index('app_publication_jobs_checklist_idx').on(table.checklistId),
		statusIdx: index('app_publication_jobs_status_idx').on(table.status),
		createdAtIdx: index('app_publication_jobs_created_at_idx').on(table.createdAt)
	})
);

export const appPublicationDeliveries = sqliteTable(
	'app_publication_deliveries',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		publicationJobId: integer('publication_job_id')
			.notNull()
			.references(() => appPublicationJobs.id, { onDelete: 'cascade' }),
		userId: integer('user_id')
			.notNull()
			.references(() => appUsers.id, { onDelete: 'cascade' }),
		checklistId: integer('checklist_id')
			.notNull()
			.references(() => appChecklists.id, { onDelete: 'cascade' }),
		deliveryKind: text('delivery_kind').notNull().default('download'),
		filename: text('filename').notNull().default(''),
		byteCount: integer('byte_count').notNull().default(0),
		createdAt: text('created_at').notNull().default(sql`current_timestamp`)
	},
	(table) => ({
		jobIdx: index('app_publication_deliveries_job_idx').on(table.publicationJobId),
		userIdx: index('app_publication_deliveries_user_idx').on(table.userId),
		checklistIdx: index('app_publication_deliveries_checklist_idx').on(table.checklistId),
		createdAtIdx: index('app_publication_deliveries_created_at_idx').on(table.createdAt)
	})
);

export const appAnswerStates = sqliteTable(
	'app_answer_states',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => appUsers.id, { onDelete: 'cascade' }),
		questionId: integer('question_id')
			.notNull()
			.references(() => appQuestions.id, { onDelete: 'cascade' }),
		responseValue: text('response_value', { enum: appResponseValues }).notNull().default('blank'),
		comment: text('comment').notNull().default(''),
		dueDate: text('due_date'),
		updatedAt: text('updated_at').notNull().default(sql`current_timestamp`)
	},
	(table) => ({
		userQuestionIdx: uniqueIndex('app_answer_states_user_question_idx').on(table.userId, table.questionId),
		userIdx: index('app_answer_states_user_idx').on(table.userId),
		questionIdx: index('app_answer_states_question_idx').on(table.questionId)
	})
);

export const appChecklistsRelations = relations(appChecklists, ({ many }) => ({
	sections: many(appSections),
	checklistAssignments: many(appChecklistAssignments),
	pdfExportEvents: many(appPdfExportEvents),
	publicationJobs: many(appPublicationJobs),
	publicationDeliveries: many(appPublicationDeliveries)
}));

export const appSectionsRelations = relations(appSections, ({ one, many }) => ({
	checklist: one(appChecklists, {
		fields: [appSections.checklistId],
		references: [appChecklists.id]
	}),
	questionGroups: many(appQuestionGroups),
	profiles: many(appSectionProfiles)
}));

export const appQuestionGroupsRelations = relations(appQuestionGroups, ({ one, many }) => ({
	section: one(appSections, {
		fields: [appQuestionGroups.sectionId],
		references: [appSections.id]
	}),
	questions: many(appQuestions)
}));

export const appQuestionsRelations = relations(appQuestions, ({ one, many }) => ({
	group: one(appQuestionGroups, {
		fields: [appQuestions.groupId],
		references: [appQuestionGroups.id]
	}),
	factLinks: many(appQuestionFactLinks),
	answerStates: many(appAnswerStates),
	profiles: many(appQuestionProfiles)
}));

export const appSectionProfilesRelations = relations(appSectionProfiles, ({ one }) => ({
	section: one(appSections, {
		fields: [appSectionProfiles.sectionId],
		references: [appSections.id]
	})
}));

export const appQuestionProfilesRelations = relations(appQuestionProfiles, ({ one }) => ({
	question: one(appQuestions, {
		fields: [appQuestionProfiles.questionId],
		references: [appQuestions.id]
	})
}));

export const appFactsRelations = relations(appFacts, ({ many }) => ({
	questionLinks: many(appQuestionFactLinks)
}));

export const appQuestionFactLinksRelations = relations(appQuestionFactLinks, ({ one }) => ({
	question: one(appQuestions, {
		fields: [appQuestionFactLinks.questionId],
		references: [appQuestions.id]
	}),
	fact: one(appFacts, {
		fields: [appQuestionFactLinks.factId],
		references: [appFacts.id]
	})
}));

export const appUsersRelations = relations(appUsers, ({ many }) => ({
	checklistAssignments: many(appChecklistAssignments),
	answerStates: many(appAnswerStates),
	settings: many(appUserSettings),
	profiles: many(appUserProfiles),
	activities: many(appUserActivities),
	animalTypes: many(appUserAnimalTypes),
	sessions: many(appSessions),
	pdfExportEvents: many(appPdfExportEvents),
	profileUpdateEvents: many(appProfileUpdateEvents),
	publicationJobs: many(appPublicationJobs),
	publicationDeliveries: many(appPublicationDeliveries)
}));

export const appPdfExportEventsRelations = relations(appPdfExportEvents, ({ one }) => ({
	user: one(appUsers, {
		fields: [appPdfExportEvents.userId],
		references: [appUsers.id]
	}),
	checklist: one(appChecklists, {
		fields: [appPdfExportEvents.checklistId],
		references: [appChecklists.id]
	})
}));

export const appProfileUpdateEventsRelations = relations(appProfileUpdateEvents, ({ one }) => ({
	user: one(appUsers, {
		fields: [appProfileUpdateEvents.userId],
		references: [appUsers.id]
	})
}));

export const appPublicationJobsRelations = relations(appPublicationJobs, ({ one, many }) => ({
	user: one(appUsers, {
		fields: [appPublicationJobs.userId],
		references: [appUsers.id]
	}),
	checklist: one(appChecklists, {
		fields: [appPublicationJobs.checklistId],
		references: [appChecklists.id]
	}),
	deliveries: many(appPublicationDeliveries)
}));

export const appPublicationDeliveriesRelations = relations(appPublicationDeliveries, ({ one }) => ({
	job: one(appPublicationJobs, {
		fields: [appPublicationDeliveries.publicationJobId],
		references: [appPublicationJobs.id]
	}),
	user: one(appUsers, {
		fields: [appPublicationDeliveries.userId],
		references: [appUsers.id]
	}),
	checklist: one(appChecklists, {
		fields: [appPublicationDeliveries.checklistId],
		references: [appChecklists.id]
	})
}));

export const appUserSettingsRelations = relations(appUserSettings, ({ one }) => ({
	user: one(appUsers, {
		fields: [appUserSettings.userId],
		references: [appUsers.id]
	})
}));

export const appUserProfilesRelations = relations(appUserProfiles, ({ one }) => ({
	user: one(appUsers, {
		fields: [appUserProfiles.userId],
		references: [appUsers.id]
	})
}));

export const appUserActivitiesRelations = relations(appUserActivities, ({ one }) => ({
	user: one(appUsers, {
		fields: [appUserActivities.userId],
		references: [appUsers.id]
	})
}));

export const appUserAnimalTypesRelations = relations(appUserAnimalTypes, ({ one }) => ({
	user: one(appUsers, {
		fields: [appUserAnimalTypes.userId],
		references: [appUsers.id]
	})
}));

export const appSessionsRelations = relations(appSessions, ({ one }) => ({
	user: one(appUsers, {
		fields: [appSessions.userId],
		references: [appUsers.id]
	})
}));

export const appChecklistAssignmentsRelations = relations(appChecklistAssignments, ({ one }) => ({
	user: one(appUsers, {
		fields: [appChecklistAssignments.userId],
		references: [appUsers.id]
	}),
	checklist: one(appChecklists, {
		fields: [appChecklistAssignments.checklistId],
		references: [appChecklists.id]
	})
}));

export const appAnswerStatesRelations = relations(appAnswerStates, ({ one }) => ({
	user: one(appUsers, {
		fields: [appAnswerStates.userId],
		references: [appUsers.id]
	}),
	question: one(appQuestions, {
		fields: [appAnswerStates.questionId],
		references: [appQuestions.id]
	})
}));
