-- Canonical Phase 1 runtime schema for the SvelteKit checklist app.
-- The importer remains an offline ingest edge.
-- A separate sync/materialization step is responsible for copying imported
-- content into these app_* runtime tables.

pragma foreign_keys = on;

create table if not exists app_checklists (
    id integer primary key autoincrement,
    slug text not null unique,
    title text not null,
    variant_key text not null,
    snapshot_key text not null,
    created_at text not null default current_timestamp
);

create table if not exists app_sections (
    id integer primary key autoincrement,
    checklist_id integer not null references app_checklists(id) on delete cascade,
    node_id text not null,
    prefix text not null,
    title text not null,
    description text not null default '',
    sort_order integer not null,
    unique (checklist_id, node_id)
);

create table if not exists app_question_groups (
    id integer primary key autoincrement,
    section_id integer not null references app_sections(id) on delete cascade,
    node_id text not null,
    prefix text not null,
    title text not null,
    intro_text text not null default '',
    sort_order integer not null,
    unique (section_id, node_id)
);

create table if not exists app_profile_catalog (
    id integer primary key autoincrement,
    section_title text not null,
    profile_key text not null unique,
    profile_name text not null
);

create table if not exists app_section_profiles (
    id integer primary key autoincrement,
    section_id integer not null references app_sections(id) on delete cascade,
    profile_key text not null,
    profile_name text not null,
    unique (section_id, profile_key)
);

create table if not exists app_questions (
    id integer primary key autoincrement,
    group_id integer not null references app_question_groups(id) on delete cascade,
    node_id text not null,
    prefix text not null,
    question_text text not null,
    sort_order integer not null,
    cc integer not null default 0,
    cc_extra integer not null default 0,
    base integer not null default 0,
    annual_question integer not null default 0,
    new_flag integer not null default 0,
    recommended integer not null default 0,
    unique (group_id, node_id)
);

create table if not exists app_question_profiles (
    id integer primary key autoincrement,
    question_id integer not null references app_questions(id) on delete cascade,
    profile_key text not null,
    profile_name text not null,
    unique (question_id, profile_key)
);

create table if not exists app_facts (
    id integer primary key autoincrement,
    fact_id text not null,
    node_id text not null,
    title text not null,
    body_html text not null default '',
    snapshot_key text not null,
    unique (snapshot_key, fact_id)
);

create table if not exists app_question_fact_links (
    id integer primary key autoincrement,
    question_id integer not null references app_questions(id) on delete cascade,
    fact_id integer not null references app_facts(id) on delete cascade,
    node_id text not null,
    provenance text not null default 'explicit',
    unique (question_id, fact_id)
);

create table if not exists app_users (
    id integer primary key autoincrement,
    email text not null unique,
    username text not null unique,
    password_hash text not null default '',
    display_name text not null,
    role text not null default 'user',
    first_name text not null default '',
    last_name text not null default '',
    phone text not null default '',
    website text not null default '',
    company_name text not null default '',
    company_org_num text not null default '',
    company_address_1 text not null default '',
    company_address_2 text not null default '',
    company_city text not null default '',
    company_postcode text not null default '',
    address_1 text not null default '',
    address_2 text not null default '',
    postcode text not null default '',
    city text not null default '',
    lrf_id text not null default '',
    alert_sms integer not null default 0,
    alert_email integer not null default 1,
    created_at text not null default current_timestamp
);

create table if not exists app_user_settings (
    id integer primary key autoincrement,
    user_id integer not null references app_users(id) on delete cascade,
    key text not null,
    value text not null default 'true',
    unique (user_id, key)
);

create table if not exists app_user_profiles (
    id integer primary key autoincrement,
    user_id integer not null references app_users(id) on delete cascade,
    profile_key text not null,
    profile_name text not null,
    unique (user_id, profile_key)
);

create table if not exists app_user_activities (
    id integer primary key autoincrement,
    user_id integer not null references app_users(id) on delete cascade,
    activity_name text not null,
    certified integer,
    unique (user_id, activity_name)
);

create table if not exists app_user_animal_types (
    id integer primary key autoincrement,
    user_id integer not null references app_users(id) on delete cascade,
    animal_key text not null,
    animal_name text not null,
    amount integer not null default 0,
    unique (user_id, animal_key)
);

create table if not exists app_sessions (
    id integer primary key autoincrement,
    user_id integer not null references app_users(id) on delete cascade,
    token_hash text not null unique,
    expires_at text not null,
    created_at text not null default current_timestamp
);

create table if not exists app_checklist_assignments (
    id integer primary key autoincrement,
    user_id integer not null references app_users(id) on delete cascade,
    checklist_id integer not null references app_checklists(id) on delete cascade,
    unique (user_id, checklist_id)
);

create table if not exists app_pdf_export_events (
    id integer primary key autoincrement,
    user_id integer not null references app_users(id) on delete cascade,
    checklist_id integer not null references app_checklists(id) on delete cascade,
    export_kind text not null default 'plan',
    filename text not null default '',
    created_at text not null default current_timestamp
);

create table if not exists app_profile_update_events (
    id integer primary key autoincrement,
    user_id integer not null references app_users(id) on delete cascade,
    created_at text not null default current_timestamp
);

create table if not exists app_publication_jobs (
    id integer primary key autoincrement,
    user_id integer not null references app_users(id) on delete cascade,
    checklist_id integer not null references app_checklists(id) on delete cascade,
    publication_kind text not null default 'user-plan',
    status text not null default 'queued',
    attempt_count integer not null default 0,
    max_attempts integer not null default 3,
    filename text not null default '',
    output_pdf_path text not null default '',
    report_path text not null default '',
    error_message text not null default '',
    queued_at text not null default current_timestamp,
    last_attempt_at text,
    next_retry_at text,
    created_at text not null default current_timestamp,
    finished_at text
);

create table if not exists app_publication_deliveries (
    id integer primary key autoincrement,
    publication_job_id integer not null references app_publication_jobs(id) on delete cascade,
    user_id integer not null references app_users(id) on delete cascade,
    checklist_id integer not null references app_checklists(id) on delete cascade,
    delivery_kind text not null default 'download',
    filename text not null default '',
    byte_count integer not null default 0,
    created_at text not null default current_timestamp
);

create table if not exists app_answer_states (
    id integer primary key autoincrement,
    user_id integer not null references app_users(id) on delete cascade,
    question_id integer not null references app_questions(id) on delete cascade,
    response_value text not null default 'blank' check (response_value in ('yes', 'no', 'na', 'blank')),
    comment text not null default '',
    due_date text,
    updated_at text not null default current_timestamp,
    unique (user_id, question_id)
);

create index if not exists idx_app_sections_checklist_sort_order
    on app_sections (checklist_id, sort_order);

create index if not exists idx_app_question_groups_section_sort_order
    on app_question_groups (section_id, sort_order);

create index if not exists idx_app_profile_catalog_section_title
    on app_profile_catalog (section_title);

create index if not exists idx_app_section_profiles_section_id
    on app_section_profiles (section_id);

create index if not exists idx_app_questions_group_sort_order
    on app_questions (group_id, sort_order);

create index if not exists idx_app_question_profiles_question_id
    on app_question_profiles (question_id);

create index if not exists idx_app_facts_node_id
    on app_facts (node_id);

create index if not exists idx_app_question_fact_links_node_id
    on app_question_fact_links (node_id);

create index if not exists idx_app_checklist_assignments_user_id
    on app_checklist_assignments (user_id);

create index if not exists idx_app_pdf_export_events_user_id
    on app_pdf_export_events (user_id);

create index if not exists idx_app_pdf_export_events_checklist_id
    on app_pdf_export_events (checklist_id);

create index if not exists idx_app_pdf_export_events_created_at
    on app_pdf_export_events (created_at);

create index if not exists idx_app_profile_update_events_user_id
    on app_profile_update_events (user_id);

create index if not exists idx_app_profile_update_events_created_at
    on app_profile_update_events (created_at);

create index if not exists idx_app_publication_jobs_user_id
    on app_publication_jobs (user_id);

create index if not exists idx_app_publication_jobs_checklist_id
    on app_publication_jobs (checklist_id);

create index if not exists idx_app_publication_jobs_status
    on app_publication_jobs (status);

create index if not exists idx_app_publication_jobs_created_at
    on app_publication_jobs (created_at);

create index if not exists idx_app_publication_deliveries_job_id
    on app_publication_deliveries (publication_job_id);

create index if not exists idx_app_publication_deliveries_user_id
    on app_publication_deliveries (user_id);

create index if not exists idx_app_publication_deliveries_checklist_id
    on app_publication_deliveries (checklist_id);

create index if not exists idx_app_publication_deliveries_created_at
    on app_publication_deliveries (created_at);

create unique index if not exists idx_app_users_username
    on app_users (username);

create index if not exists idx_app_answer_states_user_id
    on app_answer_states (user_id);

create index if not exists idx_app_answer_states_question_id
    on app_answer_states (question_id);

create index if not exists idx_app_user_settings_user_id
    on app_user_settings (user_id);

create index if not exists idx_app_user_profiles_user_id
    on app_user_profiles (user_id);

create index if not exists idx_app_user_activities_user_id
    on app_user_activities (user_id);

create index if not exists idx_app_user_animal_types_user_id
    on app_user_animal_types (user_id);

create index if not exists idx_app_sessions_user_id
    on app_sessions (user_id);

create index if not exists idx_app_sessions_expires_at
    on app_sessions (expires_at);
