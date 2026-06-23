create table if not exists content_snapshots (
    id text primary key,
    source_label text not null,
    source_type text not null,
    imported_at timestamptz not null,
    status text not null
);

create table if not exists imported_files (
    id text primary key,
    snapshot_id text not null references content_snapshots(id) on delete cascade,
    source_path text not null,
    content_family text not null,
    detected_uid text,
    detected_node_id text,
    detected_fact_id text,
    validation_status text not null
);

create table if not exists imported_file_node_ids (
    id text primary key,
    imported_file_row_id text not null references imported_files(id) on delete cascade,
    node_id text not null
);

create table if not exists checklists (
    id text primary key,
    snapshot_id text not null references content_snapshots(id) on delete cascade,
    checklist_id text not null,
    qa_type text not null,
    title text not null
);

create table if not exists checklist_groups (
    id text primary key,
    snapshot_id text not null references content_snapshots(id) on delete cascade,
    checklist_row_id text not null references checklists(id) on delete cascade,
    node_id text not null,
    title text not null,
    intro_text text not null default '',
    sort_order integer not null
);

create table if not exists questions (
    id text primary key,
    snapshot_id text not null references content_snapshots(id) on delete cascade,
    group_row_id text not null references checklist_groups(id) on delete cascade,
    node_id text not null,
    question_text text not null,
    sort_order integer not null,
    cc boolean not null default false,
    cc_extra boolean not null default false,
    base boolean not null default false,
    annual_question boolean not null default false,
    new_flag boolean not null default false,
    recommended boolean not null default false
);

create table if not exists facts (
    id text primary key,
    snapshot_id text not null references content_snapshots(id) on delete cascade,
    fact_id text,
    node_id text,
    title text not null,
    source_file text not null,
    body_html text not null default ''
);

create table if not exists fact_links (
    id text primary key,
    snapshot_id text not null references content_snapshots(id) on delete cascade,
    fact_row_id text not null references facts(id) on delete cascade,
    node_id text not null,
    link_source text not null,
    link_status text not null
);

create table if not exists standard_content_blocks (
    id text primary key,
    snapshot_id text not null references content_snapshots(id) on delete cascade,
    block_id text,
    content_type text not null,
    title text not null,
    root_tag text not null,
    source_file text not null,
    body_html text not null default ''
);

create table if not exists standard_content_targets (
    id text primary key,
    snapshot_id text not null references content_snapshots(id) on delete cascade,
    block_row_id text not null references standard_content_blocks(id) on delete cascade,
    target_href text not null
);

create table if not exists profile_catalog (
    id text primary key,
    snapshot_id text not null references content_snapshots(id) on delete cascade,
    section_title text not null,
    profile_key text not null,
    profile_name text not null
);

create table if not exists checklist_group_profiles (
    id text primary key,
    snapshot_id text not null references content_snapshots(id) on delete cascade,
    group_row_id text not null references checklist_groups(id) on delete cascade,
    profile_key text not null,
    profile_name text not null
);

create table if not exists question_profiles (
    id text primary key,
    snapshot_id text not null references content_snapshots(id) on delete cascade,
    question_row_id text not null references questions(id) on delete cascade,
    profile_key text not null,
    profile_name text not null
);

create table if not exists editorial_drafts (
    id text primary key,
    snapshot_id text not null references content_snapshots(id) on delete cascade,
    content_kind text not null,
    source_row_id text not null,
    status text not null,
    created_by_user_id integer not null,
    updated_by_user_id integer not null,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists editorial_draft_revisions (
    id text primary key,
    draft_id text not null references editorial_drafts(id) on delete cascade,
    revision_number integer not null,
    payload_json text not null,
    validation_status text not null,
    created_by_user_id integer not null,
    created_at timestamptz not null
);

create table if not exists editorial_review_requests (
    id text primary key,
    draft_id text not null references editorial_drafts(id) on delete cascade,
    requested_by_user_id integer not null,
    requested_at timestamptz not null,
    status text not null
);

create index if not exists idx_imported_files_snapshot_id on imported_files (snapshot_id);
create index if not exists idx_imported_file_node_ids_imported_file_row_id on imported_file_node_ids (imported_file_row_id);
create index if not exists idx_imported_file_node_ids_node_id on imported_file_node_ids (node_id);
create index if not exists idx_checklists_snapshot_id on checklists (snapshot_id);
create index if not exists idx_checklist_groups_snapshot_id on checklist_groups (snapshot_id);
create index if not exists idx_questions_snapshot_id on questions (snapshot_id);
create index if not exists idx_facts_snapshot_id on facts (snapshot_id);
create index if not exists idx_fact_links_snapshot_id on fact_links (snapshot_id);
create index if not exists idx_standard_content_blocks_snapshot_id on standard_content_blocks (snapshot_id);
create index if not exists idx_standard_content_targets_snapshot_id on standard_content_targets (snapshot_id);
create index if not exists idx_standard_content_targets_block_row_id on standard_content_targets (block_row_id);
create index if not exists idx_profile_catalog_snapshot_id on profile_catalog (snapshot_id);
create index if not exists idx_checklist_group_profiles_snapshot_id on checklist_group_profiles (snapshot_id);
create index if not exists idx_question_profiles_snapshot_id on question_profiles (snapshot_id);
create index if not exists idx_editorial_drafts_snapshot_id on editorial_drafts (snapshot_id);
create index if not exists idx_editorial_drafts_status on editorial_drafts (status);
create index if not exists idx_editorial_drafts_content_kind_source_row_id on editorial_drafts (content_kind, source_row_id);
create index if not exists idx_editorial_draft_revisions_draft_id on editorial_draft_revisions (draft_id);
create unique index if not exists idx_editorial_draft_revisions_draft_revision on editorial_draft_revisions (draft_id, revision_number);
create index if not exists idx_editorial_review_requests_draft_id on editorial_review_requests (draft_id);
create index if not exists idx_editorial_review_requests_status on editorial_review_requests (status);

create index if not exists idx_questions_node_id on questions (node_id);
create index if not exists idx_fact_links_node_id on fact_links (node_id);
