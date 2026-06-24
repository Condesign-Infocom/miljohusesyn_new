import type { DomainStoreClient } from './client';

export type ContentStudioSnapshot = {
	id: string;
	sourceLabel: string;
	sourceType: string;
	importedAt: string;
	status: string;
};

export type ContentStudioDraftState = {
	id: string;
	status: string;
	updatedAt: string;
	latestRevisionNumber: number | null;
	latestRevisionValidationStatus: string | null;
	reviewRequest: {
		id: string;
		status: string;
		requestedAt: string;
	} | null;
};

export type ContentStudioDraftRevision = {
	id: string;
	draftId: string;
	revisionNumber: number;
	payloadJson: string;
	validationStatus: string;
	createdByUserId: number;
	createdAt: string;
};

export type ContentStudioPublishingQueueItem = {
	draftId: string;
	contentKind: 'fact' | 'standard_content' | 'news';
	sourceRowId: string;
	snapshotId: string;
	title: string;
	identifier: string;
	reviewRequestId: string;
	reviewRequestedAt: string;
	reviewRequestStatus: string;
	draftStatus: string;
	latestRevisionNumber: number | null;
	latestRevisionValidationStatus: string | null;
};

export type ContentStudioSummary = {
	latestSnapshot: ContentStudioSnapshot | null;
	checklistCount: number;
	factCount: number;
	standardContentCount: number;
	openDraftCount: number;
	pendingReviewCount: number;
};

export type ContentStudioChecklistListRow = {
	id: string;
	sourceRowId: string;
	snapshotId: string;
	checklistId: string;
	qaType: string;
	title: string;
	groupCount: number;
	questionCount: number;
};

export type ContentStudioFactRow = {
	id: string;
	sourceRowId: string;
	snapshotId: string;
	factId: string | null;
	nodeId: string | null;
	title: string;
	sourceFile: string;
	bodyHtml: string;
	latestDraft: ContentStudioDraftState | null;
};

export type ContentStudioStandardContentRow = {
	id: string;
	sourceRowId: string;
	snapshotId: string;
	blockId: string | null;
	contentType: string;
	title: string;
	rootTag: string;
	sourceFile: string;
	bodyHtml: string;
	targetCount: number;
	targets: string[];
	latestDraft: ContentStudioDraftState | null;
};

export type ContentStudioNewsRow = {
	id: string;
	sourceRowId: string;
	snapshotId: string;
	sortOrder: number;
	slug: string;
	title: string;
	publishedAt: string;
	excerpt: string;
	bodyHtml: string;
	legacyUrl: string;
	sourceFile: string;
	latestDraft: ContentStudioDraftState | null;
};

export type ContentStudioChecklistTree = {
	checklist: {
		id: string;
		sourceRowId: string;
		snapshotId: string;
		checklistId: string;
		qaType: string;
		title: string;
	};
	groups: Array<{
		id: string;
		sourceRowId: string;
		nodeId: string;
		title: string;
		introText: string;
		sortOrder: number;
		profiles: Array<{ profileKey: string; profileName: string }>;
		factLinks: Array<{
			id: string;
			factRowId: string;
			factId: string | null;
			title: string;
			nodeId: string;
			linkSource: string;
			linkStatus: string;
		}>;
		questions: Array<{
			id: string;
			sourceRowId: string;
			nodeId: string;
			questionText: string;
			sortOrder: number;
			flags: {
				cc: boolean;
				ccExtra: boolean;
				base: boolean;
				annualQuestion: boolean;
				newFlag: boolean;
				recommended: boolean;
			};
			profiles: Array<{ profileKey: string; profileName: string }>;
			factLinks: Array<{
				id: string;
				factRowId: string;
				factId: string | null;
				title: string;
				nodeId: string;
				linkSource: string;
				linkStatus: string;
			}>;
		}>;
	}>;
};

export type ContentStudioProfileCatalogRow = {
	profileKey: string;
	profileName: string;
	sectionTitle: string;
};

type DraftStateRow = {
	draftId: string | null;
	draftStatus: string | null;
	draftUpdatedAt: string | null;
	latestRevisionNumber: number | null;
	latestRevisionValidationStatus: string | null;
	reviewRequestId: string | null;
	reviewRequestStatus: string | null;
	reviewRequestedAt: string | null;
};

type ChecklistHeaderRow = {
	id: string;
	sourceRowId: string;
	snapshotId: string;
	checklistId: string;
	qaType: string;
	title: string;
};

type ChecklistGroupRow = {
	sourceRowId: string;
	nodeId: string;
	title: string;
	introText: string;
	sortOrder: number;
};

type ChecklistMutableGroupRow = {
	id: string;
	snapshotId: string;
	checklistRowId: string;
	nodeId: string;
	title: string;
	introText: string;
	sortOrder: number;
};

type ChecklistQuestionRow = {
	sourceRowId: string;
	groupRowId: string;
	nodeId: string;
	questionText: string;
	sortOrder: number;
	cc: number | boolean;
	ccExtra: number | boolean;
	base: number | boolean;
	annualQuestion: number | boolean;
	newFlag: number | boolean;
	recommended: number | boolean;
};

type ChecklistMutableQuestionRow = {
	id: string;
	snapshotId: string;
	groupRowId: string;
	nodeId: string;
	questionText: string;
	sortOrder: number;
	cc: number | boolean;
	ccExtra: number | boolean;
	base: number | boolean;
	annualQuestion: number | boolean;
	newFlag: number | boolean;
	recommended: number | boolean;
};

type ProfileRow = {
	foreignRowId: string;
	profileKey: string;
	profileName: string;
};

type ProfileCatalogRow = {
	profileKey: string;
	profileName: string;
	sectionTitle: string;
};

type FactLinkContextRow = {
	id: string;
	factRowId: string;
	factId: string | null;
	title: string;
	nodeId: string;
	linkSource: string;
	linkStatus: string;
};

type CountRow = { count: number | string };
type StandardContentTargetRow = { targetHref: string };
type LatestWorkflowStateRow = {
	sourceRowId: string;
} & DraftStateRow;

type DraftRevisionRow = {
	id: string;
	draftId: string;
	revisionNumber: number | string;
	payloadJson: string;
	validationStatus: string;
	createdByUserId: number | string;
	createdAt: string;
};

type PublishingQueueRow = {
	draftId: string;
	contentKind: 'fact' | 'standard_content' | 'news';
	sourceRowId: string;
	snapshotId: string;
	title: string;
	identifier: string;
	reviewRequestId: string;
	reviewRequestedAt: string;
	reviewRequestStatus: string;
	draftStatus: string;
	latestRevisionNumber: number | string | null;
	latestRevisionValidationStatus: string | null;
};

export function createContentStudioRepository(client: DomainStoreClient) {
	async function ensurePublicNewsSchema() {
		await client.run(
			`
				create table if not exists public_news_items (
					id text primary key,
					snapshot_id text not null,
					sort_order integer not null default 0,
					slug text not null,
					title text not null,
					published_at text not null,
					excerpt text not null default '',
					body_html text not null default '',
					legacy_url text not null default '',
					source_file text not null default ''
				)
			`
		);
		await client.run(
			'create unique index if not exists public_news_items_snapshot_slug_idx on public_news_items (snapshot_id, slug)'
		);
		await ensureTableColumn('public_news_items', 'sort_order', 'integer not null default 0');
	}

	async function ensureChecklistMutationSchema() {
		await client.run(
			`
				create table if not exists archived_checklist_groups (
					id text primary key,
					snapshot_id text not null,
					checklist_row_id text not null,
					node_id text not null,
					title text not null,
					intro_text text not null default '',
					sort_order integer not null,
					archived_at text not null
				)
			`
		);
		await client.run(
			`
				create table if not exists archived_questions (
					id text primary key,
					snapshot_id text not null,
					group_row_id text not null,
					node_id text not null,
					question_text text not null,
					sort_order integer not null,
					cc integer not null default 0,
					cc_extra integer not null default 0,
					base integer not null default 0,
					annual_question integer not null default 0,
					new_flag integer not null default 0,
					recommended integer not null default 0,
					archived_at text not null
				)
			`
		);
		await ensureChecklistQuestionFlagSchema();
	}

	async function ensureChecklistQuestionFlagSchema() {
		await ensureTableColumn('questions', 'annual_question', 'integer not null default 0');
		await ensureTableColumn('archived_questions', 'annual_question', 'integer not null default 0');
	}

	async function ensureTableColumn(tableName: string, columnName: string, definition: string) {
		const tableProbe =
			client.engine === 'postgres' ?
				await client.get<{ exists: string | null }>('select to_regclass(?) as exists', [tableName])
			:	await client.get<{ name: string }>(
					'select name from sqlite_master where type = ? and name = ? limit 1',
					['table', tableName]
				);
		const tableExists =
			client.engine === 'postgres' ? Boolean((tableProbe as { exists?: string | null } | null)?.exists) : Boolean(tableProbe);
		if (!tableExists) {
			return;
		}

		try {
			if (client.engine === 'postgres') {
				const column = await client.get<{ column_name: string }>(
					`
						select column_name
						from information_schema.columns
						where table_schema = current_schema()
						  and table_name = ?
						  and column_name = ?
						limit 1
					`,
					[tableName, columnName]
				);
				if (!column) {
					await client.run(`alter table ${tableName} add column ${columnName} ${definition}`);
				}
				return;
			}

			const columns = await client.all<{ name: string }>(`pragma table_info(${tableName})`);
			if (!columns.some((column) => column.name === columnName)) {
				await client.run(`alter table ${tableName} add column ${columnName} ${definition}`);
			}
		} catch {
			await client.run(`alter table ${tableName} add column if not exists ${columnName} ${definition}`);
		}
	}

	async function resolveSnapshot(snapshotId?: string) {
		return snapshotId ? await findSnapshot(snapshotId) : await findLatestSnapshot();
	}

	async function resolveSnapshotId(snapshotId?: string) {
		return (await resolveSnapshot(snapshotId))?.id ?? null;
	}

	async function countRows(sql: string, params: readonly unknown[]) {
		const row = await client.get<CountRow>(sql, params);
		return numberValue(row?.count);
	}

	async function loadStandardContentTargetsByBlockRowId(snapshotId: string) {
		const rows = await client.all<
			{
				blockRowId: string;
			} & StandardContentTargetRow
		>(
			`
				select
					block_row_id as "blockRowId",
					target_href as "targetHref"
				from standard_content_targets
				where snapshot_id = ?
				order by block_row_id, id
			`,
			[snapshotId]
		);
		const targetsByBlockRowId = new Map<string, string[]>();

		for (const row of rows) {
			const bucket = targetsByBlockRowId.get(row.blockRowId) ?? [];
			bucket.push(row.targetHref);
			targetsByBlockRowId.set(row.blockRowId, bucket);
		}

		return targetsByBlockRowId;
	}

	async function findLatestSnapshot(): Promise<ContentStudioSnapshot | null> {
		return await client.get<ContentStudioSnapshot>(
			`
				select
					id,
					source_label as "sourceLabel",
					source_type as "sourceType",
					imported_at as "importedAt",
					status
				from content_snapshots
				order by imported_at desc, id desc
				limit 1
			`
		);
	}

	async function findSnapshot(snapshotId: string): Promise<ContentStudioSnapshot | null> {
		return await client.get<ContentStudioSnapshot>(
			`
				select
					id,
					source_label as "sourceLabel",
					source_type as "sourceType",
					imported_at as "importedAt",
					status
				from content_snapshots
				where id = ?
				limit 1
			`,
			[snapshotId]
		);
	}

	async function loadContentStudioSummary(snapshotId?: string): Promise<ContentStudioSummary> {
		const latestSnapshot = await resolveSnapshot(snapshotId);

		if (!latestSnapshot) {
			return emptySummary();
		}

		const [checklistCount, factCount, standardContentCount, latestWorkflowStates] =
			await Promise.all([
				countRows('select count(*) as count from checklists where snapshot_id = ?', [latestSnapshot.id]),
				countRows('select count(*) as count from facts where snapshot_id = ?', [latestSnapshot.id]),
				countRows(
					'select count(*) as count from standard_content_blocks where snapshot_id = ?',
					[latestSnapshot.id]
				),
				loadLatestWorkflowStates(latestSnapshot.id)
			]);
		const latestDraftStates = latestWorkflowStates.map((row) => mapDraftState(row));
		const openDraftCount = latestDraftStates.filter(
			(draft): draft is NonNullable<typeof draft> =>
				draft !== null && (draft.status === 'draft' || draft.status === 'in_review')
		).length;
		const pendingReviewCount = latestDraftStates.filter(
			(draft) => draft?.reviewRequest?.status === 'pending'
		).length;

		return {
			latestSnapshot,
			checklistCount,
			factCount,
			standardContentCount,
			openDraftCount,
			pendingReviewCount
		};
	}

	async function loadLatestWorkflowStates(snapshotId: string): Promise<LatestWorkflowStateRow[]> {
		await ensurePublicNewsSchema();

		return await client.all<LatestWorkflowStateRow>(
			`
				select
					workflow_rows.source_row_id as "sourceRowId",
					workflow_rows."draftId",
					workflow_rows."draftStatus",
					workflow_rows."draftUpdatedAt",
					workflow_rows."latestRevisionNumber",
					workflow_rows."latestRevisionValidationStatus",
					workflow_rows."reviewRequestId",
					workflow_rows."reviewRequestStatus",
					workflow_rows."reviewRequestedAt"
				from (
					select
						facts.id as source_row_id,
						drafts.id as "draftId",
						drafts.status as "draftStatus",
						drafts.updated_at as "draftUpdatedAt",
						revisions.revision_number as "latestRevisionNumber",
						revisions.validation_status as "latestRevisionValidationStatus",
						review_requests.id as "reviewRequestId",
						review_requests.status as "reviewRequestStatus",
						review_requests.requested_at as "reviewRequestedAt"
					from facts
					${draftJoinSql('facts')}
					where facts.snapshot_id = ?

					union all

					select
						blocks.id as source_row_id,
						drafts.id as "draftId",
						drafts.status as "draftStatus",
						drafts.updated_at as "draftUpdatedAt",
						revisions.revision_number as "latestRevisionNumber",
						revisions.validation_status as "latestRevisionValidationStatus",
						review_requests.id as "reviewRequestId",
						review_requests.status as "reviewRequestStatus",
						review_requests.requested_at as "reviewRequestedAt"
					from standard_content_blocks blocks
					${draftJoinSql('blocks')}
					where blocks.snapshot_id = ?

					union all

					select
						news.id as source_row_id,
						drafts.id as "draftId",
						drafts.status as "draftStatus",
						drafts.updated_at as "draftUpdatedAt",
						revisions.revision_number as "latestRevisionNumber",
						revisions.validation_status as "latestRevisionValidationStatus",
						review_requests.id as "reviewRequestId",
						review_requests.status as "reviewRequestStatus",
						review_requests.requested_at as "reviewRequestedAt"
					from public_news_items news
					${draftJoinSql('news')}
					where news.snapshot_id = ?
				) workflow_rows
			`,
			['fact', snapshotId, 'standard_content', snapshotId, 'news', snapshotId]
		);
	}

	async function findLatestDraftForSource(
		contentKind: 'fact' | 'standard_content' | 'news',
		sourceRowId: string,
		snapshotId: string
	): Promise<ContentStudioDraftState | null> {
		const row = await client.get<DraftStateRow>(
			`
				select
					drafts.id as "draftId",
					drafts.status as "draftStatus",
					drafts.updated_at as "draftUpdatedAt",
					revisions.revision_number as "latestRevisionNumber",
					revisions.validation_status as "latestRevisionValidationStatus",
					review_requests.id as "reviewRequestId",
					review_requests.status as "reviewRequestStatus",
					review_requests.requested_at as "reviewRequestedAt"
				from editorial_drafts drafts
				left join editorial_draft_revisions revisions on revisions.id = (
					select revision_rows.id
					from editorial_draft_revisions revision_rows
					where revision_rows.draft_id = drafts.id
					order by revision_rows.revision_number desc, revision_rows.id desc
					limit 1
				)
				left join editorial_review_requests review_requests on review_requests.id = (
					select review_rows.id
					from editorial_review_requests review_rows
					where review_rows.draft_id = drafts.id
					order by review_rows.requested_at desc, review_rows.id desc
					limit 1
				)
				where drafts.content_kind = ?
				  and drafts.source_row_id = ?
				  and drafts.snapshot_id = ?
				order by drafts.updated_at desc, drafts.id desc
				limit 1
			`,
			[contentKind, sourceRowId, snapshotId]
		);

		return row ? mapDraftState(row) : null;
	}

	async function loadLatestDraftRevision(draftId: string): Promise<ContentStudioDraftRevision | null> {
		const row = await client.get<DraftRevisionRow>(
			`
				select
					id,
					draft_id as "draftId",
					revision_number as "revisionNumber",
					payload_json as "payloadJson",
					validation_status as "validationStatus",
					created_by_user_id as "createdByUserId",
					created_at as "createdAt"
				from editorial_draft_revisions
				where draft_id = ?
				order by revision_number desc, id desc
				limit 1
			`,
			[draftId]
		);

		return row ? mapDraftRevision(row) : null;
	}

	async function createDraft(input: {
		id: string;
		snapshotId: string;
		contentKind: 'fact' | 'standard_content' | 'news';
		sourceRowId: string;
		status: string;
		userId: number;
		now: string;
	}) {
		await client.run(
			`
				insert into editorial_drafts (
					id, snapshot_id, content_kind, source_row_id, status,
					created_by_user_id, updated_by_user_id, created_at, updated_at
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
			[
				input.id,
				input.snapshotId,
				input.contentKind,
				input.sourceRowId,
				input.status,
				input.userId,
				input.userId,
				input.now,
				input.now
			]
		);
	}

	async function updateDraftStatus(input: {
		draftId: string;
		status: string;
		userId: number;
		now: string;
	}) {
		await client.run(
			`
				update editorial_drafts
				set status = ?, updated_by_user_id = ?, updated_at = ?
				where id = ?
			`,
			[input.status, input.userId, input.now, input.draftId]
		);
	}

	async function appendDraftRevision(input: {
		id: string;
		draftId: string;
		revisionNumber: number;
		payloadJson: string;
		validationStatus: string;
		userId: number;
		now: string;
	}) {
		await client.run(
			`
				insert into editorial_draft_revisions (
					id, draft_id, revision_number, payload_json, validation_status,
					created_by_user_id, created_at
				) values (?, ?, ?, ?, ?, ?, ?)
			`,
			[
				input.id,
				input.draftId,
				input.revisionNumber,
				input.payloadJson,
				input.validationStatus,
				input.userId,
				input.now
			]
		);
	}

	async function createReviewRequest(input: {
		id: string;
		draftId: string;
		userId: number;
		now: string;
		status: string;
	}) {
		await client.run(
			`
				insert into editorial_review_requests (
					id, draft_id, requested_by_user_id, requested_at, status
				) values (?, ?, ?, ?, ?)
			`,
			[input.id, input.draftId, input.userId, input.now, input.status]
		);
	}

	async function updateReviewRequestsForDraft(input: {
		draftId: string;
		fromStatus?: string;
		toStatus: string;
	}) {
		if (input.fromStatus) {
			await client.run(
				`
					update editorial_review_requests
					set status = ?
					where draft_id = ? and status = ?
				`,
				[input.toStatus, input.draftId, input.fromStatus]
			);
			return;
		}

		await client.run(
			`
				update editorial_review_requests
				set status = ?
				where draft_id = ?
			`,
			[input.toStatus, input.draftId]
		);
	}

	async function listPublishingQueue(snapshotId?: string): Promise<ContentStudioPublishingQueueItem[]> {
		const resolvedSnapshotId = await resolveSnapshotId(snapshotId);

		if (!resolvedSnapshotId) {
			return [];
		}

		await ensurePublicNewsSchema();

		const rows = await client.all<PublishingQueueRow>(
			`
				select
					drafts.id as "draftId",
					drafts.content_kind as "contentKind",
					drafts.source_row_id as "sourceRowId",
					drafts.snapshot_id as "snapshotId",
					coalesce(facts.title, blocks.title, news.title, drafts.source_row_id) as title,
					coalesce(facts.fact_id, facts.node_id, blocks.block_id, news.slug, blocks.content_type, drafts.source_row_id) as identifier,
					review_requests.id as "reviewRequestId",
					review_requests.requested_at as "reviewRequestedAt",
					review_requests.status as "reviewRequestStatus",
					drafts.status as "draftStatus",
					revisions.revision_number as "latestRevisionNumber",
					revisions.validation_status as "latestRevisionValidationStatus"
				from editorial_drafts drafts
				join editorial_review_requests review_requests on review_requests.id = (
					select review_rows.id
					from editorial_review_requests review_rows
					where review_rows.draft_id = drafts.id
					order by review_rows.requested_at desc, review_rows.id desc
					limit 1
				)
				left join editorial_draft_revisions revisions on revisions.id = (
					select revision_rows.id
					from editorial_draft_revisions revision_rows
					where revision_rows.draft_id = drafts.id
					order by revision_rows.revision_number desc, revision_rows.id desc
					limit 1
				)
				left join facts on drafts.content_kind = 'fact' and facts.id = drafts.source_row_id
				left join standard_content_blocks blocks on drafts.content_kind = 'standard_content' and blocks.id = drafts.source_row_id
				left join public_news_items news on drafts.content_kind = 'news' and news.id = drafts.source_row_id
				where drafts.snapshot_id = ?
				  and review_requests.status = 'pending'
				order by review_requests.requested_at asc, drafts.id asc
			`,
			[resolvedSnapshotId]
		);

		return rows.map((row) => ({
			draftId: row.draftId,
			contentKind: row.contentKind,
			sourceRowId: row.sourceRowId,
			snapshotId: row.snapshotId,
			title: row.title,
			identifier: row.identifier,
			reviewRequestId: row.reviewRequestId,
			reviewRequestedAt: row.reviewRequestedAt,
			reviewRequestStatus: row.reviewRequestStatus,
			draftStatus: row.draftStatus,
			latestRevisionNumber: row.latestRevisionNumber === null ? null : numberValue(row.latestRevisionNumber),
			latestRevisionValidationStatus: row.latestRevisionValidationStatus ?? null
		}));
	}

	async function approveReviewRequest(input: {
		reviewRequestId: string;
		draftId: string;
		userId: number;
		now: string;
	}) {
		await client.run(
			`
				update editorial_review_requests
				set status = 'approved'
				where id = ?
			`,
			[input.reviewRequestId]
		);

		await client.run(
			`
				update editorial_drafts
				set status = 'published', updated_by_user_id = ?, updated_at = ?
				where id = ?
			`,
			[input.userId, input.now, input.draftId]
		);
	}

	async function listChecklistRows(snapshotId?: string): Promise<ContentStudioChecklistListRow[]> {
		const resolvedSnapshotId = await resolveSnapshotId(snapshotId);

		if (!resolvedSnapshotId) {
			return [];
		}

		return await client.all<ContentStudioChecklistListRow>(
			`
				select
					coalesce(nullif(checklist_id, ''), id) as id,
					id as "sourceRowId",
					snapshot_id as "snapshotId",
					checklist_id as "checklistId",
					qa_type as "qaType",
					title,
					(
						select count(*)
						from checklist_groups groups
						where groups.checklist_row_id = checklists.id
					) as "groupCount",
					(
						select count(*)
						from questions
						join checklist_groups groups on groups.id = questions.group_row_id
						where groups.checklist_row_id = checklists.id
					) as "questionCount"
				from checklists
				where snapshot_id = ?
				order by title, checklist_id, id
			`,
			[resolvedSnapshotId]
		);
	}

	async function listChecklistGroupRecords(checklistRowId: string) {
		return await client.all<ChecklistMutableGroupRow>(
			`
				select
					id,
					snapshot_id as "snapshotId",
					checklist_row_id as "checklistRowId",
					node_id as "nodeId",
					title,
					intro_text as "introText",
					sort_order as "sortOrder"
				from checklist_groups
				where checklist_row_id = ?
				order by sort_order, id
			`,
			[checklistRowId]
		);
	}

	async function listQuestionRecords(groupRowId: string) {
		await ensureChecklistQuestionFlagSchema();
		return await client.all<ChecklistMutableQuestionRow>(
			`
				select
					id,
					snapshot_id as "snapshotId",
					group_row_id as "groupRowId",
					node_id as "nodeId",
					question_text as "questionText",
					sort_order as "sortOrder",
					cc,
					cc_extra as "ccExtra",
					base,
					annual_question as "annualQuestion",
					new_flag as "newFlag",
					recommended
				from questions
				where group_row_id = ?
				order by sort_order, id
			`,
			[groupRowId]
		);
	}

	async function getChecklistGroupRecord(groupRowId: string) {
		return await client.get<ChecklistMutableGroupRow>(
			`
				select
					id,
					snapshot_id as "snapshotId",
					checklist_row_id as "checklistRowId",
					node_id as "nodeId",
					title,
					intro_text as "introText",
					sort_order as "sortOrder"
				from checklist_groups
				where id = ?
				limit 1
			`,
			[groupRowId]
		);
	}

	async function getQuestionRecord(questionRowId: string) {
		await ensureChecklistQuestionFlagSchema();
		return await client.get<ChecklistMutableQuestionRow>(
			`
				select
					id,
					snapshot_id as "snapshotId",
					group_row_id as "groupRowId",
					node_id as "nodeId",
					question_text as "questionText",
					sort_order as "sortOrder",
					cc,
					cc_extra as "ccExtra",
					base,
					annual_question as "annualQuestion",
					new_flag as "newFlag",
					recommended
				from questions
				where id = ?
				limit 1
			`,
			[questionRowId]
		);
	}

	async function getProfileCatalogRecord(snapshotId: string, profileKey: string) {
		return await client.get<ProfileCatalogRow>(
			`
				select
					profile_key as "profileKey",
					profile_name as "profileName",
					section_title as "sectionTitle"
				from profile_catalog
				where snapshot_id = ?
				  and profile_key = ?
				limit 1
			`,
			[snapshotId, profileKey]
		);
	}

	async function insertChecklistGroup(input: {
		id: string;
		snapshotId: string;
		checklistRowId: string;
		nodeId: string;
		title: string;
		introText: string;
		position: 'before' | 'after' | 'end';
		referenceGroupRowId?: string;
	}) {
		const groups = await listChecklistGroupRecords(input.checklistRowId);
		const referenceGroup =
			input.referenceGroupRowId ? groups.find((group) => group.id === input.referenceGroupRowId) : undefined;
		const targetSortOrder =
			input.position === 'end' || !referenceGroup ?
				(groups.at(-1)?.sortOrder ?? 0) + 1
			:	input.position === 'before' ? referenceGroup.sortOrder
			:	referenceGroup.sortOrder + 1;

		if (input.position !== 'end' && referenceGroup) {
			await client.run(
				`
					update checklist_groups
					set sort_order = sort_order + 1
					where checklist_row_id = ?
					  and sort_order >= ?
				`,
				[input.checklistRowId, targetSortOrder]
			);
		}

		await client.run(
			`
				insert into checklist_groups (
					id, snapshot_id, checklist_row_id, node_id, title, intro_text, sort_order
				) values (?, ?, ?, ?, ?, ?, ?)
			`,
			[
				input.id,
				input.snapshotId,
				input.checklistRowId,
				input.nodeId,
				input.title,
				input.introText,
				targetSortOrder
			]
		);
	}

	async function insertChecklistQuestion(input: {
		id: string;
		snapshotId: string;
		groupRowId: string;
		nodeId: string;
		questionText: string;
		position: 'before' | 'after' | 'end';
		referenceQuestionRowId?: string;
	}) {
		await ensureChecklistQuestionFlagSchema();
		const questions = await listQuestionRecords(input.groupRowId);
		const referenceQuestion =
			input.referenceQuestionRowId ?
				questions.find((question) => question.id === input.referenceQuestionRowId)
			:	undefined;
		const targetSortOrder =
			input.position === 'end' || !referenceQuestion ?
				(questions.at(-1)?.sortOrder ?? 0) + 1
			:	input.position === 'before' ? referenceQuestion.sortOrder
			:	referenceQuestion.sortOrder + 1;

		if (input.position !== 'end' && referenceQuestion) {
			await client.run(
				`
					update questions
					set sort_order = sort_order + 1
					where group_row_id = ?
					  and sort_order >= ?
				`,
				[input.groupRowId, targetSortOrder]
			);
		}

		await client.run(
			`
				insert into questions (
					id, snapshot_id, group_row_id, node_id, question_text, sort_order, cc, cc_extra, base, annual_question, new_flag, recommended
				) values (?, ?, ?, ?, ?, ?, false, false, false, false, false, false)
			`,
			[
				input.id,
				input.snapshotId,
				input.groupRowId,
				input.nodeId,
				input.questionText,
				targetSortOrder
			]
		);
	}

	async function moveChecklistGroup(input: { groupRowId: string; direction: 'up' | 'down' }) {
		const current = await getChecklistGroupRecord(input.groupRowId);
		if (!current) {
			return null;
		}

		const groups = await listChecklistGroupRecords(current.checklistRowId);
		const currentIndex = groups.findIndex((group) => group.id === current.id);
		const targetIndex = input.direction === 'up' ? currentIndex - 1 : currentIndex + 1;
		const neighbor = targetIndex >= 0 ? groups[targetIndex] : undefined;

		if (!neighbor) {
			return current;
		}

		await client.run('update checklist_groups set sort_order = ? where id = ?', [neighbor.sortOrder, current.id]);
		await client.run('update checklist_groups set sort_order = ? where id = ?', [current.sortOrder, neighbor.id]);
		return current;
	}

	async function reorderChecklistGroups(input: { checklistRowId: string; groupRowIds: string[] }) {
		const groups = await listChecklistGroupRecords(input.checklistRowId);
		const currentIds = groups.map((group) => group.id);
		if (!sameIdSet(currentIds, input.groupRowIds)) {
			throw new Error('Gruppordningen matchar inte checklistans aktiva grupper.');
		}

		for (const [index, groupRowId] of input.groupRowIds.entries()) {
			await client.run('update checklist_groups set sort_order = ? where id = ?', [
				index + 1,
				groupRowId
			]);
		}

		return await listChecklistGroupRecords(input.checklistRowId);
	}

	async function moveChecklistQuestion(input: { questionRowId: string; direction: 'up' | 'down' }) {
		const current = await getQuestionRecord(input.questionRowId);
		if (!current) {
			return null;
		}

		const questions = await listQuestionRecords(current.groupRowId);
		const currentIndex = questions.findIndex((question) => question.id === current.id);
		const targetIndex = input.direction === 'up' ? currentIndex - 1 : currentIndex + 1;
		const neighbor = targetIndex >= 0 ? questions[targetIndex] : undefined;

		if (!neighbor) {
			return current;
		}

		await client.run('update questions set sort_order = ? where id = ?', [neighbor.sortOrder, current.id]);
		await client.run('update questions set sort_order = ? where id = ?', [current.sortOrder, neighbor.id]);
		return current;
	}

	async function reorderChecklistQuestions(input: { groupRowId: string; questionRowIds: string[] }) {
		const group = await getChecklistGroupRecord(input.groupRowId);
		if (!group) {
			return null;
		}

		const questions = await listQuestionRecords(input.groupRowId);
		const currentIds = questions.map((question) => question.id);
		if (!sameIdSet(currentIds, input.questionRowIds)) {
			throw new Error('Frågeordningen matchar inte gruppens aktiva frågor.');
		}

		for (const [index, questionRowId] of input.questionRowIds.entries()) {
			await client.run('update questions set sort_order = ? where id = ?', [
				index + 1,
				questionRowId
			]);
		}

		return await listQuestionRecords(input.groupRowId);
	}

	async function updateChecklistGroup(input: {
		groupRowId: string;
		title: string;
		introText: string;
	}) {
		const group = await getChecklistGroupRecord(input.groupRowId);
		if (!group) {
			return null;
		}

		await client.run(
			`
				update checklist_groups
				set title = ?,
					intro_text = ?
				where id = ?
			`,
			[input.title, input.introText, input.groupRowId]
		);

		return await getChecklistGroupRecord(input.groupRowId);
	}

	async function updateChecklistQuestion(input: {
		questionRowId: string;
		questionText: string;
		flags: {
			cc: boolean;
			ccExtra: boolean;
			base: boolean;
			annualQuestion: boolean;
			newFlag: boolean;
			recommended: boolean;
		};
	}) {
		await ensureChecklistQuestionFlagSchema();
		const question = await getQuestionRecord(input.questionRowId);
		if (!question) {
			return null;
		}

		await client.run(
			`
				update questions
				set question_text = ?,
					cc = ?,
					cc_extra = ?,
					base = ?,
					annual_question = ?,
					new_flag = ?,
					recommended = ?
				where id = ?
			`,
			[
				input.questionText,
				flagNumberValue(input.flags.cc),
				flagNumberValue(input.flags.ccExtra),
				flagNumberValue(input.flags.base),
				flagNumberValue(input.flags.annualQuestion),
				flagNumberValue(input.flags.newFlag),
				flagNumberValue(input.flags.recommended),
				input.questionRowId
			]
		);

		return await getQuestionRecord(input.questionRowId);
	}

	async function archiveChecklistQuestion(input: { questionRowId: string; archivedAt: string }) {
		await ensureChecklistMutationSchema();
		await ensureChecklistQuestionFlagSchema();

		const question = await getQuestionRecord(input.questionRowId);
		if (!question) {
			return null;
		}

		await client.run(
			`
				insert into archived_questions (
					id, snapshot_id, group_row_id, node_id, question_text, sort_order, cc, cc_extra, base, annual_question, new_flag, recommended, archived_at
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
			[
				question.id,
				question.snapshotId,
				question.groupRowId,
				question.nodeId,
				question.questionText,
				question.sortOrder,
				flagNumberValue(question.cc),
				flagNumberValue(question.ccExtra),
				flagNumberValue(question.base),
				flagNumberValue(question.annualQuestion),
				flagNumberValue(question.newFlag),
				flagNumberValue(question.recommended),
				input.archivedAt
			]
		);
		await client.run('delete from questions where id = ?', [question.id]);
		return question;
	}

	async function deleteChecklistQuestion(input: { questionRowId: string }) {
		await ensureChecklistMutationSchema();
		await ensureChecklistQuestionFlagSchema();

		const question = await getQuestionRecord(input.questionRowId);
		if (!question) {
			return null;
		}

		await deleteFactLinksForNode({
			snapshotId: question.snapshotId,
			nodeId: question.nodeId
		});
		await client.run('delete from questions where id = ?', [question.id]);
		return question;
	}

	async function archiveChecklistGroup(input: { groupRowId: string; archivedAt: string }) {
		await ensureChecklistMutationSchema();
		await ensureChecklistQuestionFlagSchema();

		const group = await getChecklistGroupRecord(input.groupRowId);
		if (!group) {
			return null;
		}

		const questions = await listQuestionRecords(group.id);
		await client.run(
			`
				insert into archived_checklist_groups (
					id, snapshot_id, checklist_row_id, node_id, title, intro_text, sort_order, archived_at
				) values (?, ?, ?, ?, ?, ?, ?, ?)
			`,
			[
				group.id,
				group.snapshotId,
				group.checklistRowId,
				group.nodeId,
				group.title,
				group.introText,
				group.sortOrder,
				input.archivedAt
			]
		);

		for (const question of questions) {
			await client.run(
				`
					insert into archived_questions (
						id, snapshot_id, group_row_id, node_id, question_text, sort_order, cc, cc_extra, base, annual_question, new_flag, recommended, archived_at
					) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				[
					question.id,
					question.snapshotId,
					question.groupRowId,
					question.nodeId,
					question.questionText,
					question.sortOrder,
					flagNumberValue(question.cc),
					flagNumberValue(question.ccExtra),
					flagNumberValue(question.base),
					flagNumberValue(question.annualQuestion),
					flagNumberValue(question.newFlag),
					flagNumberValue(question.recommended),
					input.archivedAt
				]
			);
		}

		await client.run('delete from questions where group_row_id = ?', [group.id]);
		await client.run('delete from checklist_groups where id = ?', [group.id]);
		return group;
	}

	async function deleteChecklistGroup(input: { groupRowId: string }) {
		await ensureChecklistMutationSchema();
		await ensureChecklistQuestionFlagSchema();

		const group = await getChecklistGroupRecord(input.groupRowId);
		if (!group) {
			return null;
		}

		const questions = await listQuestionRecords(group.id);
		if (questions.length > 0) {
			throw new Error('Gruppen kan inte tas bort eftersom den fortfarande innehåller frågor.');
		}

		await deleteFactLinksForNode({
			snapshotId: group.snapshotId,
			nodeId: group.nodeId
		});
		await client.run('delete from checklist_groups where id = ?', [group.id]);
		return group;
	}

	async function listFactRows({
		search = '',
		snapshotId
	}: {
		search?: string;
		snapshotId?: string;
	} = {}): Promise<ContentStudioFactRow[]> {
		const resolvedSnapshotId = await resolveSnapshotId(snapshotId);

		if (!resolvedSnapshotId) {
			return [];
		}

		const normalizedSearch = search.trim().toLowerCase();
		const whereClauses = ['facts.snapshot_id = ?'];
		const params: unknown[] = ['fact', resolvedSnapshotId];

		if (normalizedSearch) {
			const pattern = `%${normalizedSearch}%`;
			whereClauses.push(buildFactSearchClause());
			params.push(pattern, pattern, pattern, pattern);
		}

		const rows = await client.all<
			{
				id: string;
				sourceRowId: string;
				snapshotId: string;
				factId: string | null;
				nodeId: string | null;
				title: string;
				sourceFile: string;
				bodyHtml: string;
			} & DraftStateRow
		>(
			`
				select
					coalesce(nullif(facts.fact_id, ''), facts.id) as id,
					facts.id as "sourceRowId",
					facts.snapshot_id as "snapshotId",
					facts.fact_id as "factId",
					facts.node_id as "nodeId",
					facts.title,
					facts.source_file as "sourceFile",
					facts.body_html as "bodyHtml",
					drafts.id as "draftId",
					drafts.status as "draftStatus",
					drafts.updated_at as "draftUpdatedAt",
					revisions.revision_number as "latestRevisionNumber",
					revisions.validation_status as "latestRevisionValidationStatus",
					review_requests.id as "reviewRequestId",
					review_requests.status as "reviewRequestStatus",
					review_requests.requested_at as "reviewRequestedAt"
				from facts
				${draftJoinSql('facts')}
				where ${whereClauses.join(' and ')}
				order by facts.title, facts.fact_id, facts.id
			`,
			params
		);

		return rows.map((row) => ({
			id: row.id,
			sourceRowId: row.sourceRowId,
			snapshotId: row.snapshotId,
			factId: row.factId,
			nodeId: row.nodeId,
			title: row.title,
			sourceFile: row.sourceFile,
			bodyHtml: row.bodyHtml,
			latestDraft: mapDraftState(row)
		}));
	}

	async function loadFactRow(
		factId: string,
		snapshotId?: string
	): Promise<ContentStudioFactRow | null> {
		const rows = await listFactRows({ snapshotId });
		return rows.find((row) => row.id === factId || row.sourceRowId === factId || row.factId === factId) ?? null;
	}

	async function insertFactRow(input: {
		id: string;
		snapshotId: string;
		factId: string | null;
		nodeId: string | null;
		title: string;
		sourceFile: string;
		bodyHtml: string;
	}) {
		await client.run(
			`
				insert into facts (
					id, snapshot_id, fact_id, node_id, title, source_file, body_html
				) values (?, ?, ?, ?, ?, ?, ?)
			`,
			[
				input.id,
				input.snapshotId,
				input.factId,
				input.nodeId,
				input.title,
				input.sourceFile,
				input.bodyHtml
			]
		);
	}

	async function updateFactRow(input: {
		factRowId: string;
		title: string;
		bodyHtml: string;
	}) {
		await client.run(
			`
				update facts
				set title = ?, body_html = ?
				where id = ?
			`,
			[input.title, input.bodyHtml, input.factRowId]
		);
	}

	async function insertFactLink(input: {
		id: string;
		snapshotId: string;
		factRowId: string;
		nodeId: string;
		linkSource: string;
		linkStatus: string;
	}) {
		await client.run(
			`
				insert into fact_links (
					id, snapshot_id, fact_row_id, node_id, link_source, link_status
				) values (?, ?, ?, ?, ?, ?)
			`,
			[
				input.id,
				input.snapshotId,
				input.factRowId,
				input.nodeId,
				input.linkSource,
				input.linkStatus
			]
		);
	}

	async function hasFactLink(input: {
		snapshotId: string;
		factRowId: string;
		nodeId: string;
	}) {
		const row = await client.get<{ id: string }>(
			`
				select id
				from fact_links
				where snapshot_id = ? and fact_row_id = ? and node_id = ?
				limit 1
			`,
			[input.snapshotId, input.factRowId, input.nodeId]
		);

		return Boolean(row);
	}

	async function deleteFactLink(input: {
		snapshotId: string;
		factRowId: string;
		nodeId: string;
	}) {
		await client.run(
			`
				delete from fact_links
				where snapshot_id = ? and fact_row_id = ? and node_id = ?
			`,
			[input.snapshotId, input.factRowId, input.nodeId]
		);
	}

	async function deleteFactLinksForNode(input: { snapshotId: string; nodeId: string }) {
		const normalizedNodeId = normalizeLegacyNodeId(input.nodeId);
		const nodeIds =
			normalizedNodeId && normalizedNodeId !== input.nodeId ?
				[input.nodeId, normalizedNodeId]
			:	[input.nodeId];

		await client.run(
			`
				delete from fact_links
				where snapshot_id = ?
					and node_id in (${nodeIds.map(() => '?').join(', ')})
			`,
			[input.snapshotId, ...nodeIds]
		);
	}

	async function replaceFactLinks(input: {
		snapshotId: string;
		factRowId: string;
		nodeIds: string[];
	}) {
		await client.run(
			`
				delete from fact_links
				where snapshot_id = ? and fact_row_id = ?
			`,
			[input.snapshotId, input.factRowId]
		);

		for (const [index, nodeId] of input.nodeIds.entries()) {
			await insertFactLink({
				id: `${input.factRowId}:editorial-link:${index + 1}`,
				snapshotId: input.snapshotId,
				factRowId: input.factRowId,
				nodeId,
				linkSource: 'editorial_manual',
				linkStatus: 'linked'
			});
		}
	}

	async function listFactLinkCounts(snapshotId?: string) {
		const resolvedSnapshotId = await resolveSnapshotId(snapshotId);
		if (!resolvedSnapshotId) {
			return [];
		}

		return await client.all<{ factRowId: string; usageCount: number }>(
			`
				select fact_row_id as "factRowId", count(*) as "usageCount"
				from fact_links
				where snapshot_id = ?
				group by fact_row_id
			`,
			[resolvedSnapshotId]
		);
	}

	async function listStandardContentRows({
		kind,
		contentType,
		snapshotId
	}: {
		kind?: string;
		contentType?: string;
		snapshotId?: string;
	} = {}): Promise<ContentStudioStandardContentRow[]> {
		const resolvedSnapshotId = await resolveSnapshotId(snapshotId);

		if (!resolvedSnapshotId) {
			return [];
		}

		const normalizedKind = (kind ?? contentType ?? '').trim();
		const whereClauses = ['blocks.snapshot_id = ?'];
		const params: unknown[] = ['standard_content', resolvedSnapshotId];

		if (normalizedKind) {
			whereClauses.push('blocks.content_type = ?');
			params.push(normalizedKind);
		}

		const rows = await client.all<
			{
				id: string;
				sourceRowId: string;
				snapshotId: string;
				blockId: string | null;
				contentType: string;
				title: string;
				rootTag: string;
				sourceFile: string;
				bodyHtml: string;
				targetCount: number | string;
			} & DraftStateRow
		>(
			`
				select
					coalesce(nullif(blocks.block_id, ''), blocks.id) as id,
					blocks.id as "sourceRowId",
					blocks.snapshot_id as "snapshotId",
					blocks.block_id as "blockId",
					blocks.content_type as "contentType",
					blocks.title,
					blocks.root_tag as "rootTag",
					blocks.source_file as "sourceFile",
					blocks.body_html as "bodyHtml",
					(
						select count(*)
						from standard_content_targets targets
						where targets.block_row_id = blocks.id
					) as "targetCount",
					drafts.id as "draftId",
					drafts.status as "draftStatus",
					drafts.updated_at as "draftUpdatedAt",
					revisions.revision_number as "latestRevisionNumber",
					revisions.validation_status as "latestRevisionValidationStatus",
					review_requests.id as "reviewRequestId",
					review_requests.status as "reviewRequestStatus",
					review_requests.requested_at as "reviewRequestedAt"
				from standard_content_blocks blocks
				${draftJoinSql('blocks')}
				where ${whereClauses.join(' and ')}
				order by blocks.content_type, blocks.title, blocks.id
			`,
			params
		);

		const targetsByBlockRowId = await loadStandardContentTargetsByBlockRowId(resolvedSnapshotId);

		return rows.map((row) => ({
			id: row.id,
			sourceRowId: row.sourceRowId,
			snapshotId: row.snapshotId,
			blockId: row.blockId,
			contentType: row.contentType,
			title: row.title,
			rootTag: row.rootTag,
			sourceFile: row.sourceFile,
			bodyHtml: row.bodyHtml,
			targetCount: numberValue(row.targetCount),
			targets: targetsByBlockRowId.get(row.sourceRowId) ?? [],
			latestDraft: mapDraftState(row)
		}));
	}

	async function loadStandardContentRow(
		blockId: string,
		snapshotId?: string
	): Promise<ContentStudioStandardContentRow | null> {
		const rows = await listStandardContentRows({ snapshotId });
		return rows.find((row) => row.id === blockId || row.sourceRowId === blockId || row.blockId === blockId) ?? null;
	}

	async function updateStandardContentRow(input: {
		blockRowId: string;
		title: string;
		bodyHtml: string;
	}) {
		await client.run(
			`
				update standard_content_blocks
				set title = ?, body_html = ?
				where id = ?
			`,
			[input.title, input.bodyHtml, input.blockRowId]
		);
	}

	async function insertStandardContentRow(input: {
		id: string;
		snapshotId: string;
		blockId: string;
		contentType: string;
		title: string;
		rootTag: string;
		sourceFile: string;
		bodyHtml: string;
	}) {
		await client.run(
			`
				insert into standard_content_blocks (
					id, snapshot_id, block_id, content_type, title, root_tag, source_file, body_html
				) values (?, ?, ?, ?, ?, ?, ?, ?)
			`,
			[
				input.id,
				input.snapshotId,
				input.blockId,
				input.contentType,
				input.title,
				input.rootTag,
				input.sourceFile,
				input.bodyHtml
			]
		);
	}

	async function replaceStandardContentTargets(input: {
		snapshotId: string;
		blockRowId: string;
		targets: string[];
	}) {
		await client.run(
			`
				delete from standard_content_targets
				where snapshot_id = ? and block_row_id = ?
			`,
			[input.snapshotId, input.blockRowId]
		);

		for (const [index, targetHref] of input.targets.entries()) {
			await client.run(
				`
					insert into standard_content_targets (
						id, snapshot_id, block_row_id, target_href
					) values (?, ?, ?, ?)
				`,
				[
					`${input.blockRowId}:editorial-target:${index + 1}`,
					input.snapshotId,
					input.blockRowId,
					targetHref
				]
			);
		}
	}

	async function listNewsRows(snapshotId?: string): Promise<ContentStudioNewsRow[]> {
		const resolvedSnapshotId = await resolveSnapshotId(snapshotId);

		if (!resolvedSnapshotId) {
			return [];
		}

		await ensurePublicNewsSchema();

		const rows = await client.all<
			{
				id: string;
				sourceRowId: string;
				snapshotId: string;
				sortOrder: number | string;
				slug: string;
				title: string;
				publishedAt: string;
				excerpt: string;
				bodyHtml: string;
				legacyUrl: string;
				sourceFile: string;
			} & DraftStateRow
		>(
			`
				select
					news.id as id,
					news.id as "sourceRowId",
					news.snapshot_id as "snapshotId",
					news.sort_order as "sortOrder",
					news.slug as slug,
					news.title as title,
					news.published_at as "publishedAt",
					news.excerpt as excerpt,
					news.body_html as "bodyHtml",
					news.legacy_url as "legacyUrl",
					news.source_file as "sourceFile",
					drafts.id as "draftId",
					drafts.status as "draftStatus",
					drafts.updated_at as "draftUpdatedAt",
					revisions.revision_number as "latestRevisionNumber",
					revisions.validation_status as "latestRevisionValidationStatus",
					review_requests.id as "reviewRequestId",
					review_requests.status as "reviewRequestStatus",
					review_requests.requested_at as "reviewRequestedAt"
				from public_news_items news
				${draftJoinSql('news')}
				where news.snapshot_id = ?
				order by news.sort_order asc, news.id asc
			`,
			['news', resolvedSnapshotId]
		);

		return rows.map((row) => ({
			id: row.id,
			sourceRowId: row.sourceRowId,
			snapshotId: row.snapshotId,
			sortOrder: numberValue(row.sortOrder),
			slug: row.slug,
			title: row.title,
			publishedAt: row.publishedAt,
			excerpt: row.excerpt,
			bodyHtml: row.bodyHtml,
			legacyUrl: row.legacyUrl,
			sourceFile: row.sourceFile,
			latestDraft: mapDraftState(row)
		}));
	}

	async function loadNewsRow(newsId: string, snapshotId?: string): Promise<ContentStudioNewsRow | null> {
		const rows = await listNewsRows(snapshotId);
		return rows.find((row) => row.id === newsId || row.slug === newsId) ?? null;
	}

	async function upsertNewsRow(input: {
		id: string;
		snapshotId: string;
		sortOrder: number;
		slug: string;
		title: string;
		publishedAt: string;
		excerpt: string;
		bodyHtml: string;
		legacyUrl: string;
		sourceFile: string;
	}) {
		await ensurePublicNewsSchema();
		await client.run(
			`
				insert into public_news_items (
					id, snapshot_id, sort_order, slug, title, published_at, excerpt, body_html, legacy_url, source_file
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				on conflict (id) do update set
					snapshot_id = excluded.snapshot_id,
					sort_order = excluded.sort_order,
					slug = excluded.slug,
					title = excluded.title,
					published_at = excluded.published_at,
					excerpt = excluded.excerpt,
					body_html = excluded.body_html,
					legacy_url = excluded.legacy_url,
					source_file = excluded.source_file
			`,
			[
				input.id,
				input.snapshotId,
				input.sortOrder,
				input.slug,
				input.title,
				input.publishedAt,
				input.excerpt,
				input.bodyHtml,
				input.legacyUrl,
				input.sourceFile
			]
		);
	}

	async function updateNewsRow(input: {
		newsRowId: string;
		title: string;
		publishedAt: string;
		excerpt: string;
		bodyHtml: string;
		legacyUrl: string;
	}) {
		await ensurePublicNewsSchema();
		await client.run(
			`
				update public_news_items
				set title = ?,
					published_at = ?,
					excerpt = ?,
					body_html = ?,
					legacy_url = ?
				where id = ?
			`,
			[
				input.title,
				input.publishedAt,
				input.excerpt,
				input.bodyHtml,
				input.legacyUrl,
				input.newsRowId
			]
		);
	}

	async function deleteEditorialDraftsForSource(input: {
		contentKind: 'fact' | 'standard_content' | 'news';
		sourceRowId: string;
		snapshotId: string;
	}) {
		await client.run(
			`
				delete from editorial_drafts
				where content_kind = ? and source_row_id = ? and snapshot_id = ?
			`,
			[input.contentKind, input.sourceRowId, input.snapshotId]
		);
	}

	async function deleteStandardContentRow(input: { blockRowId: string; snapshotId: string }) {
		await client.run(
			`
				delete from standard_content_blocks
				where id = ? and snapshot_id = ?
			`,
			[input.blockRowId, input.snapshotId]
		);
	}

	async function deleteNewsRow(input: { newsRowId: string; snapshotId: string }) {
		await ensurePublicNewsSchema();
		await client.run(
			`
				delete from public_news_items
				where id = ? and snapshot_id = ?
			`,
			[input.newsRowId, input.snapshotId]
		);
	}

	async function loadChecklistTree(
		checklistId: string,
		snapshotId?: string
	): Promise<ContentStudioChecklistTree | null> {
		await ensureChecklistQuestionFlagSchema();
		const resolvedSnapshotId = await resolveSnapshotId(snapshotId);

		if (!resolvedSnapshotId) {
			return null;
		}

		const checklist = await client.get<ChecklistHeaderRow>(
			`
				select
					coalesce(nullif(checklist_id, ''), id) as id,
					id as "sourceRowId",
					snapshot_id as "snapshotId",
					checklist_id as "checklistId",
					qa_type as "qaType",
					title
				from checklists
				where snapshot_id = ?
				  and (id = ? or checklist_id = ?)
				limit 1
			`,
			[resolvedSnapshotId, checklistId, checklistId]
		);

		if (!checklist) {
			return null;
		}

		const [groups, questions, groupProfiles, questionProfiles, factLinkRows] = await Promise.all([
			client.all<ChecklistGroupRow>(
				`
					select
						id as "sourceRowId",
						node_id as "nodeId",
						title,
						intro_text as "introText",
						sort_order as "sortOrder"
					from checklist_groups
					where checklist_row_id = ?
					order by sort_order, id
				`,
				[checklist.sourceRowId]
			),
			client.all<ChecklistQuestionRow>(
				`
					select
						id as "sourceRowId",
						group_row_id as "groupRowId",
						node_id as "nodeId",
						question_text as "questionText",
						sort_order as "sortOrder",
						cc,
						cc_extra as "ccExtra",
						base,
						annual_question as "annualQuestion",
						new_flag as "newFlag",
						recommended
					from questions
					where snapshot_id = ?
					order by group_row_id, sort_order, id
				`,
				[resolvedSnapshotId]
			),
			client.all<ProfileRow>(
				`
					select
						group_row_id as "foreignRowId",
						profile_key as "profileKey",
						profile_name as "profileName"
					from checklist_group_profiles
					where snapshot_id = ?
					order by group_row_id, id
				`,
				[resolvedSnapshotId]
			),
			client.all<ProfileRow>(
				`
					select
						question_row_id as "foreignRowId",
						profile_key as "profileKey",
						profile_name as "profileName"
					from question_profiles
					where snapshot_id = ?
					order by question_row_id, id
				`,
				[resolvedSnapshotId]
			),
			client.all<FactLinkContextRow>(
				`
					select
						fact_links.id,
						fact_links.fact_row_id as "factRowId",
						facts.fact_id as "factId",
						facts.title,
						fact_links.node_id as "nodeId",
						fact_links.link_source as "linkSource",
						fact_links.link_status as "linkStatus"
					from fact_links
					join facts on facts.id = fact_links.fact_row_id
					where fact_links.snapshot_id = ?
					order by fact_links.id
				`,
				[resolvedSnapshotId]
			)
		]);

		const groupRowsById = new Map(groups.map((group) => [group.sourceRowId, group]));
		const questionRowsForChecklist = questions.filter((question) => groupRowsById.has(question.groupRowId));
		const groupProfilesByGroupRowId = buildProfileMap(
			groupProfiles.filter((profile) => groupRowsById.has(profile.foreignRowId))
		);
		const questionRowIds = new Set(questionRowsForChecklist.map((question) => question.sourceRowId));
		const questionProfilesByQuestionRowId = buildProfileMap(
			questionProfiles.filter((profile) => questionRowIds.has(profile.foreignRowId))
		);
		const factLinksByNodeId = buildFactLinkMap(factLinkRows);
		const questionsByGroupRowId = new Map<string, ContentStudioChecklistTree['groups'][number]['questions']>();

		for (const question of questionRowsForChecklist) {
			const bucket = questionsByGroupRowId.get(question.groupRowId) ?? [];
			bucket.push({
				id: question.sourceRowId,
				sourceRowId: question.sourceRowId,
				nodeId: question.nodeId,
				questionText: question.questionText,
				sortOrder: question.sortOrder,
				flags: {
					cc: booleanValue(question.cc),
					ccExtra: booleanValue(question.ccExtra),
					base: booleanValue(question.base),
					annualQuestion: booleanValue(question.annualQuestion),
					newFlag: booleanValue(question.newFlag),
					recommended: booleanValue(question.recommended)
				},
				profiles: questionProfilesByQuestionRowId.get(question.sourceRowId) ?? [],
				factLinks: factLinksByNodeId.get(normalizeLegacyNodeId(question.nodeId)) ?? []
			});
			questionsByGroupRowId.set(question.groupRowId, bucket);
		}

		return {
			checklist,
			groups: groups.map((group) => ({
				id: group.sourceRowId,
				sourceRowId: group.sourceRowId,
				nodeId: group.nodeId,
				title: group.title,
				introText: normalizeSingleParagraphText(group.introText),
				sortOrder: group.sortOrder,
				profiles: groupProfilesByGroupRowId.get(group.sourceRowId) ?? [],
				factLinks: factLinksByNodeId.get(normalizeLegacyNodeId(group.nodeId)) ?? [],
				questions: (questionsByGroupRowId.get(group.sourceRowId) ?? []).sort(
					(left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)
				)
			}))
		};
	}

	async function listProfileCatalog(snapshotId?: string): Promise<ContentStudioProfileCatalogRow[]> {
		const resolvedSnapshotId = await resolveSnapshotId(snapshotId);

		if (!resolvedSnapshotId) {
			return [];
		}

		const rows = await client.all<ProfileCatalogRow>(
			`
				select
					profile_key as "profileKey",
					profile_name as "profileName",
					section_title as "sectionTitle"
				from profile_catalog
				where snapshot_id = ?
				order by profile_name, profile_key
			`,
			[resolvedSnapshotId]
		);

		return rows.map((row) => ({
			profileKey: row.profileKey,
			profileName: row.profileName,
			sectionTitle: row.sectionTitle
		}));
	}

	async function addChecklistGroupProfile(input: { groupRowId: string; profileKey: string }) {
		const group = await getChecklistGroupRecord(input.groupRowId);
		if (!group) {
			return { status: 'missing-target' as const };
		}

		const profile = await getProfileCatalogRecord(group.snapshotId, input.profileKey);
		if (!profile) {
			return { status: 'missing-profile' as const };
		}

		const existing = await client.get<{ id: string }>(
			`
				select id
				from checklist_group_profiles
				where snapshot_id = ?
				  and group_row_id = ?
				  and profile_key = ?
				limit 1
			`,
			[group.snapshotId, group.id, profile.profileKey]
		);

		if (existing) {
			return { status: 'ok' as const };
		}

		await client.run(
			`
				insert into checklist_group_profiles (
					id, snapshot_id, group_row_id, profile_key, profile_name
				) values (?, ?, ?, ?, ?)
			`,
			[
				`${group.id}:profile:${profile.profileKey}`,
				group.snapshotId,
				group.id,
				profile.profileKey,
				profile.profileName
			]
		);

		return { status: 'ok' as const };
	}

	async function removeChecklistGroupProfile(input: { groupRowId: string; profileKey: string }) {
		const group = await getChecklistGroupRecord(input.groupRowId);
		if (!group) {
			return { status: 'missing-target' as const };
		}

		await client.run(
			`
				delete from checklist_group_profiles
				where snapshot_id = ?
				  and group_row_id = ?
				  and profile_key = ?
			`,
			[group.snapshotId, group.id, input.profileKey]
		);

		return { status: 'ok' as const };
	}

	async function addChecklistQuestionProfile(input: { questionRowId: string; profileKey: string }) {
		const question = await getQuestionRecord(input.questionRowId);
		if (!question) {
			return { status: 'missing-target' as const };
		}

		const profile = await getProfileCatalogRecord(question.snapshotId, input.profileKey);
		if (!profile) {
			return { status: 'missing-profile' as const };
		}

		const existing = await client.get<{ id: string }>(
			`
				select id
				from question_profiles
				where snapshot_id = ?
				  and question_row_id = ?
				  and profile_key = ?
				limit 1
			`,
			[question.snapshotId, question.id, profile.profileKey]
		);

		if (existing) {
			return { status: 'ok' as const };
		}

		await client.run(
			`
				insert into question_profiles (
					id, snapshot_id, question_row_id, profile_key, profile_name
				) values (?, ?, ?, ?, ?)
			`,
			[
				`${question.id}:profile:${profile.profileKey}`,
				question.snapshotId,
				question.id,
				profile.profileKey,
				profile.profileName
			]
		);

		return { status: 'ok' as const };
	}

	async function removeChecklistQuestionProfile(input: { questionRowId: string; profileKey: string }) {
		const question = await getQuestionRecord(input.questionRowId);
		if (!question) {
			return { status: 'missing-target' as const };
		}

		await client.run(
			`
				delete from question_profiles
				where snapshot_id = ?
				  and question_row_id = ?
				  and profile_key = ?
			`,
			[question.snapshotId, question.id, input.profileKey]
		);

		return { status: 'ok' as const };
	}

	return {
		ensurePublicNewsSchema,
		ensureChecklistMutationSchema,
		findLatestSnapshot,
		findSnapshot,
		loadContentStudioSummary,
		findLatestDraftForSource,
		loadLatestDraftRevision,
		createDraft,
		updateDraftStatus,
		appendDraftRevision,
		createReviewRequest,
		updateReviewRequestsForDraft,
		listPublishingQueue,
		approveReviewRequest,
		listChecklistRows,
		listFactRows,
		loadFactRow,
		insertFactRow,
		updateFactRow,
		insertFactLink,
		hasFactLink,
		deleteFactLink,
		replaceFactLinks,
		listFactLinkCounts,
		listStandardContentRows,
		loadStandardContentRow,
		insertStandardContentRow,
		updateStandardContentRow,
		replaceStandardContentTargets,
		listNewsRows,
		loadNewsRow,
		upsertNewsRow,
		updateNewsRow,
		deleteEditorialDraftsForSource,
		deleteStandardContentRow,
		deleteNewsRow,
		loadChecklistTree,
		listProfileCatalog,
		addChecklistGroupProfile,
		removeChecklistGroupProfile,
		addChecklistQuestionProfile,
		removeChecklistQuestionProfile,
		insertChecklistGroup,
		insertChecklistQuestion,
		moveChecklistGroup,
		moveChecklistQuestion,
		reorderChecklistGroups,
		reorderChecklistQuestions,
		updateChecklistGroup,
		updateChecklistQuestion,
		deleteChecklistGroup,
		deleteChecklistQuestion,
		archiveChecklistGroup,
		archiveChecklistQuestion
	};
}

function sameIdSet(left: string[], right: string[]) {
	if (left.length !== right.length) {
		return false;
	}

	const rightIds = new Set(right);
	if (rightIds.size !== right.length) {
		return false;
	}

	return left.every((id) => rightIds.has(id));
}

function emptySummary(): ContentStudioSummary {
	return {
		latestSnapshot: null,
		checklistCount: 0,
		factCount: 0,
		standardContentCount: 0,
		openDraftCount: 0,
		pendingReviewCount: 0
	};
}

function draftJoinSql(sourceAlias: string) {
	return `
		left join editorial_drafts drafts on drafts.id = (
			select draft_rows.id
			from editorial_drafts draft_rows
			where draft_rows.content_kind = ?
			  and draft_rows.source_row_id = ${sourceAlias}.id
			  and draft_rows.snapshot_id = ${sourceAlias}.snapshot_id
			order by draft_rows.updated_at desc, draft_rows.id desc
			limit 1
		)
		left join editorial_draft_revisions revisions on revisions.id = (
			select revision_rows.id
			from editorial_draft_revisions revision_rows
			where revision_rows.draft_id = drafts.id
			order by revision_rows.revision_number desc, revision_rows.id desc
			limit 1
		)
		left join editorial_review_requests review_requests on review_requests.id = (
			select review_rows.id
			from editorial_review_requests review_rows
			where review_rows.draft_id = drafts.id
			order by review_rows.requested_at desc, review_rows.id desc
			limit 1
		)
	`;
}

function buildFactSearchClause() {
	return `
		(
			${lowerExpression('facts.fact_id')} like ?
			or ${lowerExpression('facts.node_id')} like ?
			or ${lowerExpression('facts.title')} like ?
			or ${lowerExpression('facts.source_file')} like ?
		)
	`;
}

function lowerExpression(column: string) {
	return `lower(coalesce(${column}, ''))`;
}

function buildProfileMap(rows: ProfileRow[]) {
	const map = new Map<string, Array<{ profileKey: string; profileName: string }>>();

	for (const row of rows) {
		const bucket = map.get(row.foreignRowId) ?? [];
		bucket.push({
			profileKey: row.profileKey,
			profileName: row.profileName
		});
		map.set(row.foreignRowId, bucket);
	}

	for (const bucket of map.values()) {
		bucket.sort(
			(left, right) =>
				left.profileName.localeCompare(right.profileName, 'sv') ||
				left.profileKey.localeCompare(right.profileKey, 'sv')
		);
	}

	return map;
}

function buildFactLinkMap(rows: FactLinkContextRow[]) {
	const map = new Map<string, FactLinkContextRow[]>();

	for (const row of rows) {
		const key = normalizeLegacyNodeId(row.nodeId);
		const bucket = map.get(key) ?? [];
		const dedupeKey = buildFactLinkDedupeKey(row);

		if (!bucket.some((existing) => buildFactLinkDedupeKey(existing) === dedupeKey)) {
			bucket.push(row);
			map.set(key, bucket);
		}
	}

	return map;
}

function buildFactLinkDedupeKey(row: Pick<FactLinkContextRow, 'factId' | 'factRowId'>) {
	return row.factId?.trim() || row.factRowId;
}

function mapDraftState(row: DraftStateRow): ContentStudioDraftState | null {
	if (!row.draftId || !row.draftStatus || !row.draftUpdatedAt) {
		return null;
	}

	return {
		id: row.draftId,
		status: row.draftStatus,
		updatedAt: row.draftUpdatedAt,
		latestRevisionNumber: row.latestRevisionNumber ?? null,
		latestRevisionValidationStatus: row.latestRevisionValidationStatus ?? null,
		reviewRequest:
			row.reviewRequestId && row.reviewRequestStatus && row.reviewRequestedAt ?
				{
					id: row.reviewRequestId,
					status: row.reviewRequestStatus,
					requestedAt: row.reviewRequestedAt
				}
			:	null
	};
}

function mapDraftRevision(row: DraftRevisionRow): ContentStudioDraftRevision {
	return {
		id: row.id,
		draftId: row.draftId,
		revisionNumber: numberValue(row.revisionNumber),
		payloadJson: row.payloadJson,
		validationStatus: row.validationStatus,
		createdByUserId: numberValue(row.createdByUserId),
		createdAt: row.createdAt
	};
}

function normalizeLegacyNodeId(nodeId: string | null | undefined) {
	return (nodeId ?? '').replace(/^node-id-/, '').replace(/-\d{4}-\d{2}-\d{2}.*$/, '');
}

function booleanValue(value: number | boolean | null | undefined) {
	return value === true || value === 1;
}

function numberValue(value: number | string | null | undefined) {
	return typeof value === 'number' ? value : Number(value ?? 0);
}

function flagNumberValue(value: number | boolean | null | undefined) {
	return value === true ? 1 : value === false ? 0 : numberValue(value ?? 0);
}

function normalizeSingleParagraphText(value: string | null | undefined) {
	return (value ?? '').replace(/\s+/g, ' ').trim();
}
