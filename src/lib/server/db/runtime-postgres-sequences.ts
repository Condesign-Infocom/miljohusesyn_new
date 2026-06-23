type PostgresSequenceExecutor = {
	query: (sql: string, params?: unknown[]) => Promise<unknown>;
};

export const runtimePostgresSequenceTables = [
	'app_checklists',
	'app_sections',
	'app_question_groups',
	'app_profile_catalog',
	'app_section_profiles',
	'app_questions',
	'app_question_profiles',
	'app_facts',
	'app_question_fact_links',
	'app_users',
	'app_user_settings',
	'app_user_profiles',
	'app_user_activities',
	'app_user_animal_types',
	'app_sessions',
	'app_checklist_assignments',
	'app_pdf_export_events',
	'app_profile_update_events',
	'app_publication_jobs',
	'app_publication_deliveries',
	'app_answer_states'
] as const;

export const runtimePostgresContentSequenceTables = [
	'app_checklists',
	'app_sections',
	'app_question_groups',
	'app_questions',
	'app_profile_catalog',
	'app_section_profiles',
	'app_question_profiles',
	'app_facts',
	'app_question_fact_links'
] as const;

type RuntimePostgresSequenceTable = (typeof runtimePostgresSequenceTables)[number];

const runtimePostgresSequenceTableSet = new Set<string>(runtimePostgresSequenceTables);

export async function resetRuntimePostgresSequences(
	executor: PostgresSequenceExecutor,
	tables: readonly RuntimePostgresSequenceTable[] = runtimePostgresSequenceTables
) {
	for (const table of tables) {
		assertKnownRuntimePostgresSequenceTable(table);
		await executor.query(
			`select setval(
				pg_get_serial_sequence($1, 'id'),
				coalesce((select max(id) from ${table}), 0) + 1,
				false
			)`,
			[table]
		);
	}
}

function assertKnownRuntimePostgresSequenceTable(table: string): asserts table is RuntimePostgresSequenceTable {
	if (!runtimePostgresSequenceTableSet.has(table)) {
		throw new Error(`Unsupported runtime PostgreSQL identity table: ${table}`);
	}
}
