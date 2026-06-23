import { eq } from 'drizzle-orm';
import { createRequire } from 'node:module';
import type Database from 'better-sqlite3';
import { Client, type PoolClient } from 'pg';
import { getRuntimeDbEngine, requireRuntimePostgresPool, type AppDb } from '../db/client';
import { resetRuntimePostgresSequences, runtimePostgresContentSequenceTables } from '../db/runtime-postgres-sequences';
import { replaceRuntimeContentSnapshotInPostgres } from '../db/runtime-postgres-shadow';
import {
	appChecklists,
	appFacts,
	appProfileCatalog,
	appQuestionFactLinks,
	appQuestionProfiles,
	appQuestionGroups,
	appQuestions,
	appSectionProfiles,
	appSections
} from '../db/schema';

const require = createRequire(import.meta.url);
type ImportFlagMap = Partial<
	Record<'cc' | 'cc_extra' | 'base' | 'annual_question' | 'new' | 'recommended', boolean>
>;
let sqliteDatabaseConstructor: typeof Database | null = null;

function loadBetterSqlite3() {
	sqliteDatabaseConstructor ??=
		(require('better-sqlite3') as { default?: typeof Database }).default ??
		(require('better-sqlite3') as typeof Database);
	return sqliteDatabaseConstructor;
}

type ImportQuestion = {
	node_id?: unknown;
	question_text?: unknown;
	sort_order?: unknown;
	flags?: ImportFlagMap;
	profiles?: string[];
};

type ImportGroup = {
	node_id?: unknown;
	title?: unknown;
	intro_text?: unknown;
	sort_order?: unknown;
	profiles?: string[];
	questions?: ImportQuestion[];
};

type ChecklistRecord = {
	checklist_id?: unknown;
	qa_type?: unknown;
	title?: unknown;
	groups?: ImportGroup[];
};

type FactLink = {
	node_id?: unknown;
	link_source?: unknown;
	status?: unknown;
};

type FactRecord = {
	fact_id?: unknown;
	node_id?: unknown;
	title?: unknown;
	body_preview?: unknown;
	body_html?: unknown;
	links?: FactLink[];
};

type ImportPayload = {
	snapshotKey: string;
	checklistImport: { records: ChecklistRecord[] };
	profileImport?: { records: Array<{ section_title?: unknown; profile_key?: unknown; profile_name?: unknown }> };
	factImport: { records: FactRecord[] };
};

type DomainStoreRow = Record<string, unknown>;

type QuestionLookup = Map<string, number>;
type PostgresExecutor = Client | PoolClient;

export function syncImporterSnapshot(db: AppDb, payload: ImportPayload) {
	db.transaction((tx) => {
		if (payload.profileImport) {
			replaceProfileCatalog(tx, payload.profileImport.records);
		}

		const questionLookup: QuestionLookup = new Map();

		for (const checklist of payload.checklistImport.records) {
			const checklistId = upsertChecklist(tx, checklist, payload.snapshotKey);
			const groups = orderImportGroups(checklist.groups);

			for (const [index, group] of groups.entries()) {
				const groupPrefix = inferGroupPrefix(checklist, group, index + 1);
				const forceSequentialQuestionPrefixes = shouldForceSequentialQuestionPrefixes(group, groupPrefix);
				const sectionId = upsertSection(tx, checklistId, group, groupPrefix);
				replaceSectionProfiles(tx, sectionId, stringArray(group.profiles));
				const groupId = upsertQuestionGroup(tx, sectionId, group, groupPrefix);

				const questions = orderImportQuestions(group.questions);
				for (const [index, question] of questions.entries()) {
					const questionId = upsertQuestion(
						tx,
						groupId,
						groupPrefix,
						question,
						index + 1,
						forceSequentialQuestionPrefixes
					);
					replaceQuestionProfiles(tx, questionId, stringArray(question.profiles));
					indexQuestion(questionLookup, question.node_id, questionId);
				}
			}
		}

		for (const fact of payload.factImport.records) {
			const factId = upsertFact(tx, fact, payload.snapshotKey);

			for (const link of asArray<FactLink>(fact.links)) {
				const linkedQuestionId = findQuestionId(questionLookup, link.node_id);

				if (linkedQuestionId) {
					upsertQuestionFactLink(tx, linkedQuestionId, factId, stringValue(link.node_id), link);
				}
			}
		}
	});
}

export function loadImportPayloadFromDomainStore(domainStorePath: string, snapshotKey?: string): ImportPayload {
	const SqliteDatabase = loadBetterSqlite3();
	const sqlite = new SqliteDatabase(domainStorePath, { readonly: true });

	try {
		const resolvedSnapshotKey =
			snapshotKey ??
			((sqlite.prepare('select id from content_snapshots order by imported_at desc, id desc limit 1').get() as
				| { id?: string }
				| undefined)?.id ??
				null);

		if (!resolvedSnapshotKey) {
			throw new Error(`No content snapshot found in domain store ${domainStorePath}`);
		}

		return buildImportPayload(
			resolvedSnapshotKey,
			sqlite
				.prepare(
					`
					select id, checklist_id, qa_type, title
					from checklists
					where snapshot_id = ?
					order by checklist_id, id
					`
				)
				.all(resolvedSnapshotKey) as DomainStoreRow[],
			sqlite
				.prepare(
					`
					select id, checklist_row_id, node_id, title, intro_text, sort_order
					from checklist_groups
					where snapshot_id = ?
					order by checklist_row_id, sort_order, id
					`
				)
				.all(resolvedSnapshotKey) as DomainStoreRow[],
			sqlite
				.prepare(
					`
					select group_row_id, profile_key, profile_name
					from checklist_group_profiles
					where snapshot_id = ?
					order by group_row_id, id
					`
				)
				.all(resolvedSnapshotKey) as DomainStoreRow[],
			sqlite
				.prepare(
					`
					select id, group_row_id, node_id, question_text, sort_order, cc, cc_extra, base, annual_question, new_flag, recommended
					from questions
					where snapshot_id = ?
					order by group_row_id, sort_order, id
					`
				)
				.all(resolvedSnapshotKey) as DomainStoreRow[],
			sqlite
				.prepare(
					`
					select question_row_id, profile_key, profile_name
					from question_profiles
					where snapshot_id = ?
					order by question_row_id, id
					`
				)
				.all(resolvedSnapshotKey) as DomainStoreRow[],
			sqlite
				.prepare(
					`
					select id, fact_id, node_id, title, body_html
					from facts
					where snapshot_id = ?
					order by id
					`
				)
				.all(resolvedSnapshotKey) as DomainStoreRow[],
			sqlite
				.prepare(
					`
					select fact_row_id, node_id, link_source, link_status
					from fact_links
					where snapshot_id = ?
					order by fact_row_id, id
					`
				)
				.all(resolvedSnapshotKey) as DomainStoreRow[],
			sqlite
				.prepare(
					`
					select section_title, profile_key, profile_name
					from profile_catalog
					where snapshot_id = ?
					order by section_title, profile_name, id
					`
				)
				.all(resolvedSnapshotKey) as DomainStoreRow[]
		);
	} finally {
		sqlite.close();
	}
}

export async function syncDomainStoreSnapshot(db: AppDb, domainStorePath: string, snapshotKey?: string) {
	const payload = loadImportPayloadFromDomainStore(domainStorePath, snapshotKey);
	await syncImporterPayloadToConfiguredRuntime(db, payload);
	return payload.snapshotKey;
}

export async function loadImportPayloadFromPostgresDomainStore(
	postgresDsn: string,
	snapshotKey?: string
): Promise<ImportPayload> {
	const client = new Client({ connectionString: postgresDsn });
	await client.connect();

	try {
		const snapshotResult = snapshotKey
			? { rows: [{ id: snapshotKey }] }
			: await client.query<{ id: string }>(
					'select id from content_snapshots order by imported_at desc, id desc limit 1'
				);

		const resolvedSnapshotKey = snapshotResult.rows[0]?.id ?? null;
		if (!resolvedSnapshotKey) {
			throw new Error('No content snapshot found in the configured domain store');
		}

		return buildImportPayload(
			resolvedSnapshotKey,
			(
				await client.query(
					`
					select id, checklist_id, qa_type, title
					from checklists
					where snapshot_id = $1
					order by checklist_id, id
					`,
					[resolvedSnapshotKey]
				)
			).rows as DomainStoreRow[],
			(
				await client.query(
					`
					select id, checklist_row_id, node_id, title, intro_text, sort_order
					from checklist_groups
					where snapshot_id = $1
					order by checklist_row_id, sort_order, id
					`,
					[resolvedSnapshotKey]
				)
			).rows as DomainStoreRow[],
			(
				await client.query(
					`
					select group_row_id, profile_key, profile_name
					from checklist_group_profiles
					where snapshot_id = $1
					order by group_row_id, id
					`,
					[resolvedSnapshotKey]
				)
			).rows as DomainStoreRow[],
			(
				await client.query(
					`
					select id, group_row_id, node_id, question_text, sort_order, cc, cc_extra, base, annual_question, new_flag, recommended
					from questions
					where snapshot_id = $1
					order by group_row_id, sort_order, id
					`,
					[resolvedSnapshotKey]
				)
			).rows as DomainStoreRow[],
			(
				await client.query(
					`
					select question_row_id, profile_key, profile_name
					from question_profiles
					where snapshot_id = $1
					order by question_row_id, id
					`,
					[resolvedSnapshotKey]
				)
			).rows as DomainStoreRow[],
			(
				await client.query(
					`
					select id, fact_id, node_id, title, body_html
					from facts
					where snapshot_id = $1
					order by id
					`,
					[resolvedSnapshotKey]
				)
			).rows as DomainStoreRow[],
			(
				await client.query(
					`
					select fact_row_id, node_id, link_source, link_status
					from fact_links
					where snapshot_id = $1
					order by fact_row_id, id
					`,
					[resolvedSnapshotKey]
				)
			).rows as DomainStoreRow[],
			(
				await client.query(
					`
					select section_title, profile_key, profile_name
					from profile_catalog
					where snapshot_id = $1
					order by section_title, profile_name, id
					`,
					[resolvedSnapshotKey]
				)
			).rows as DomainStoreRow[]
		);
	} finally {
		await client.end();
	}
}

export async function syncPostgresDomainStoreSnapshot(
	db: AppDb,
	postgresDsn: string,
	snapshotKey?: string
) {
	const payload = await loadImportPayloadFromPostgresDomainStore(postgresDsn, snapshotKey);
	await syncImporterPayloadToConfiguredRuntime(db, payload);
	return payload.snapshotKey;
}

async function syncImporterPayloadToConfiguredRuntime(db: AppDb, payload: ImportPayload) {
	if (getRuntimeDbEngine() === 'postgres') {
		await syncImporterSnapshotToRuntimePostgres(payload);
		return;
	}

	syncImporterSnapshot(db, payload);
	await mirrorRuntimeContentToConfiguredPostgres(db);
}

export async function mirrorRuntimeContentToConfiguredPostgres(db: AppDb) {
	await replaceRuntimeContentSnapshotInPostgres({
		checklists: db.select().from(appChecklists).all(),
		profileCatalog: db.select().from(appProfileCatalog).all(),
		sections: db.select().from(appSections).all(),
		sectionProfiles: db.select().from(appSectionProfiles).all(),
		questionGroups: db.select().from(appQuestionGroups).all(),
		questions: db.select().from(appQuestions).all(),
		questionProfiles: db.select().from(appQuestionProfiles).all(),
		facts: db.select().from(appFacts).all(),
		questionFactLinks: db.select().from(appQuestionFactLinks).all()
	});
}

async function syncImporterSnapshotToRuntimePostgres(payload: ImportPayload) {
	const client = await requireRuntimePostgresPool().connect();

	try {
		await client.query('begin');
		await resetRuntimePostgresSequences(client, runtimePostgresContentSequenceTables);

		if (payload.profileImport) {
			await client.query('delete from app_profile_catalog');
			for (const record of payload.profileImport.records) {
				const sectionTitle = stringValue(record.section_title);
				const profileKey = stringValue(record.profile_key, stringValue(record.profile_name));
				const profileName = stringValue(record.profile_name, stringValue(record.profile_key));

				if (!profileKey || !profileName) {
					continue;
				}

				await client.query(
					`insert into app_profile_catalog (section_title, profile_key, profile_name)
					values ($1, $2, $3)
					on conflict (profile_key) do update set
						section_title = excluded.section_title,
						profile_name = excluded.profile_name`,
					[sectionTitle, profileKey, profileName]
				);
			}
		}

		const questionLookup: QuestionLookup = new Map();

		for (const checklist of payload.checklistImport.records) {
			const checklistId = await upsertChecklistInPostgres(client, checklist, payload.snapshotKey);
			const groups = orderImportGroups(checklist.groups);

			for (const [index, group] of groups.entries()) {
				const groupPrefix = inferGroupPrefix(checklist, group, index + 1);
				const forceSequentialQuestionPrefixes = shouldForceSequentialQuestionPrefixes(group, groupPrefix);
				const sectionId = await upsertSectionInPostgres(client, checklistId, group, groupPrefix);
				await replaceSectionProfilesInPostgres(client, sectionId, stringArray(group.profiles));
				const groupId = await upsertQuestionGroupInPostgres(client, sectionId, group, groupPrefix);

				const questions = orderImportQuestions(group.questions);
				for (const [index, question] of questions.entries()) {
					const questionId = await upsertQuestionInPostgres(
						client,
						groupId,
						groupPrefix,
						question,
						index + 1,
						forceSequentialQuestionPrefixes
					);
					await replaceQuestionProfilesInPostgres(client, questionId, stringArray(question.profiles));
					indexQuestion(questionLookup, question.node_id, questionId);
				}
			}
		}

		for (const fact of payload.factImport.records) {
			await upsertFactInPostgres(client, fact, payload.snapshotKey);
		}

		await rebuildQuestionFactLinksInRuntimePostgres(client, payload, questionLookup);

		await client.query('commit');
	} catch (error) {
		await client.query('rollback');
		throw error;
	} finally {
		client.release();
	}
}

async function rebuildQuestionFactLinksInRuntimePostgres(
	client: PostgresExecutor,
	payload: ImportPayload,
	questionLookup: QuestionLookup
) {
	await client.query('delete from app_question_fact_links');

	const factRows = await client.query<{ id: number; factId: string }>(
		'select id, fact_id as "factId" from app_facts'
	);
	const factLookup = new Map(factRows.rows.map((row) => [row.factId, row.id]));

	for (const fact of payload.factImport.records) {
		const factId = factLookup.get(importedFactSourceId(fact));

		if (!factId) {
			continue;
		}

		for (const link of asArray<FactLink>(fact.links)) {
			const linkedQuestionId = findQuestionId(questionLookup, link.node_id);

			if (linkedQuestionId) {
				await upsertQuestionFactLinkInPostgres(
					client,
					linkedQuestionId,
					factId,
					stringValue(link.node_id),
					link
				);
			}
		}
	}
}

function buildImportPayload(
	resolvedSnapshotKey: string,
	checklistRows: DomainStoreRow[],
	groupRows: DomainStoreRow[],
	groupProfileRows: DomainStoreRow[],
	questionRows: DomainStoreRow[],
	questionProfileRows: DomainStoreRow[],
	factRows: DomainStoreRow[],
	factLinkRows: DomainStoreRow[],
	profileCatalogRows: DomainStoreRow[]
): ImportPayload {
	const groupsByChecklist = new Map<string, DomainStoreRow[]>();
	for (const row of groupRows) {
		const bucket = groupsByChecklist.get(String(row.checklist_row_id)) ?? [];
		bucket.push(row);
		groupsByChecklist.set(String(row.checklist_row_id), bucket);
	}

	const questionsByGroup = new Map<string, DomainStoreRow[]>();
	for (const row of questionRows) {
		const bucket = questionsByGroup.get(String(row.group_row_id)) ?? [];
		bucket.push(row);
		questionsByGroup.set(String(row.group_row_id), bucket);
	}

	const profilesByGroup = new Map<string, string[]>();
	for (const row of groupProfileRows) {
		const bucket = profilesByGroup.get(String(row.group_row_id)) ?? [];
		bucket.push(String(row.profile_key ?? row.profile_name ?? ''));
		profilesByGroup.set(String(row.group_row_id), bucket.filter(Boolean));
	}

	const profilesByQuestion = new Map<string, string[]>();
	for (const row of questionProfileRows) {
		const bucket = profilesByQuestion.get(String(row.question_row_id)) ?? [];
		bucket.push(String(row.profile_key ?? row.profile_name ?? ''));
		profilesByQuestion.set(String(row.question_row_id), bucket.filter(Boolean));
	}

	const linksByFact = new Map<string, DomainStoreRow[]>();
	for (const row of factLinkRows) {
		const bucket = linksByFact.get(String(row.fact_row_id)) ?? [];
		bucket.push(row);
		linksByFact.set(String(row.fact_row_id), bucket);
	}

	return {
		snapshotKey: resolvedSnapshotKey,
		checklistImport: {
			records: checklistRows.map((checklist) => ({
				checklist_id: checklist.checklist_id,
				qa_type: checklist.qa_type,
				title: checklist.title,
				groups: (groupsByChecklist.get(String(checklist.id)) ?? []).map((group) => ({
					node_id: group.node_id,
					title: group.title,
					intro_text: group.intro_text,
					sort_order: group.sort_order,
					profiles: profilesByGroup.get(String(group.id)) ?? [],
					questions: (questionsByGroup.get(String(group.id)) ?? []).map((question) => ({
						node_id: question.node_id,
						question_text: question.question_text,
						sort_order: question.sort_order,
						profiles: profilesByQuestion.get(String(question.id)) ?? [],
						flags: {
							...(Number(question.cc) ? { cc: true } : {}),
							...(Number(question.cc_extra) ? { cc_extra: true } : {}),
							...(Number(question.base) ? { base: true } : {}),
							...(Number(question.annual_question) ? { annual_question: true } : {}),
							...(Number(question.new_flag) ? { new: true } : {}),
							...(Number(question.recommended) ? { recommended: true } : {})
						}
					}))
				}))
			}))
		},
		profileImport: {
			records: profileCatalogRows.map((row) => ({
				section_title: row.section_title,
				profile_key: row.profile_key,
				profile_name: row.profile_name
			}))
		},
		factImport: {
			records: factRows.map((fact) => ({
				fact_id: fact.fact_id,
				node_id: fact.node_id,
				title: fact.title,
				body_html: fact.body_html,
				links: (linksByFact.get(String(fact.id)) ?? []).map((link) => ({
					node_id: link.node_id,
					link_source: link.link_source,
					status: link.link_status
				}))
			}))
		}
	};
}

function upsertChecklist(db: AppDb, checklist: ChecklistRecord, snapshotKey: string) {
	const slug = checklistSlug(checklist);

	db.insert(appChecklists)
		.values({
			slug,
			title: stringValue(checklist.title, slug),
			variantKey: 'default',
			snapshotKey
		})
		.onConflictDoUpdate({
			target: appChecklists.slug,
			set: {
				title: stringValue(checklist.title, slug),
				variantKey: 'default',
				snapshotKey
			}
		})
		.run();

	const row = db.select({ id: appChecklists.id }).from(appChecklists).where(eq(appChecklists.slug, slug)).get();

	if (!row) {
		throw new Error(`Failed to materialize checklist ${slug}`);
	}

	return row.id;
}

function upsertSection(db: AppDb, checklistId: number, group: ImportGroup, groupPrefix: string) {
	const nodeId = stringValue(group.node_id);

	db.insert(appSections)
		.values({
			checklistId,
			nodeId,
			prefix: groupPrefix,
			title: stringValue(group.title, nodeId),
			description: normalizeSingleParagraphText(group.intro_text),
			sortOrder: numberValue(group.sort_order, 0)
		})
		.onConflictDoUpdate({
			target: [appSections.checklistId, appSections.nodeId],
			set: {
				prefix: groupPrefix,
				title: stringValue(group.title, nodeId),
				description: normalizeSingleParagraphText(group.intro_text),
				sortOrder: numberValue(group.sort_order, 0)
			}
		})
		.run();

	const row = db
		.select({ id: appSections.id })
		.from(appSections)
		.where(eq(appSections.nodeId, nodeId))
		.get();

	if (!row) {
		throw new Error(`Failed to materialize section ${nodeId}`);
	}

	return row.id;
}

function upsertQuestionGroup(db: AppDb, sectionId: number, group: ImportGroup, groupPrefix: string) {
	const sectionNodeId = stringValue(group.node_id);
	const nodeId = `${sectionNodeId}:group`;

	db.insert(appQuestionGroups)
		.values({
			sectionId,
			nodeId,
			prefix: groupPrefix,
			title: stringValue(group.title, sectionNodeId),
			introText: normalizeSingleParagraphText(group.intro_text),
			sortOrder: numberValue(group.sort_order, 0)
		})
		.onConflictDoUpdate({
			target: [appQuestionGroups.sectionId, appQuestionGroups.nodeId],
			set: {
				prefix: groupPrefix,
				title: stringValue(group.title, sectionNodeId),
				introText: normalizeSingleParagraphText(group.intro_text),
				sortOrder: numberValue(group.sort_order, 0)
			}
		})
		.run();

	const row = db
		.select({ id: appQuestionGroups.id })
		.from(appQuestionGroups)
		.where(eq(appQuestionGroups.nodeId, nodeId))
		.get();

	if (!row) {
		throw new Error(`Failed to materialize question group ${nodeId}`);
	}

	return row.id;
}

function upsertQuestion(
	db: AppDb,
	groupId: number,
	groupPrefix: string,
	question: ImportQuestion,
	questionOrder: number,
	forceSequentialQuestionPrefixes: boolean
) {
	const nodeId = stringValue(question.node_id);
	const flags = flagMap(question.flags);

	db.insert(appQuestions)
		.values({
			groupId,
			nodeId,
			prefix: legacyQuestionPrefix(nodeId, groupPrefix, questionOrder, forceSequentialQuestionPrefixes),
			questionText: stringValue(question.question_text, nodeId),
			sortOrder: numberValue(question.sort_order, 0),
			cc: Boolean(flags.cc),
			ccExtra: Boolean(flags.cc_extra),
			base: Boolean(flags.base),
			annualQuestion: Boolean(flags.annual_question),
			newFlag: Boolean(flags.new),
			recommended: Boolean(flags.recommended)
		})
		.onConflictDoUpdate({
			target: [appQuestions.groupId, appQuestions.nodeId],
			set: {
				prefix: legacyQuestionPrefix(
					nodeId,
					groupPrefix,
					questionOrder,
					forceSequentialQuestionPrefixes
				),
				questionText: stringValue(question.question_text, nodeId),
				sortOrder: numberValue(question.sort_order, 0),
				cc: Boolean(flags.cc),
				ccExtra: Boolean(flags.cc_extra),
				base: Boolean(flags.base),
				annualQuestion: Boolean(flags.annual_question),
				newFlag: Boolean(flags.new),
				recommended: Boolean(flags.recommended)
			}
		})
		.run();

	const row = db
		.select({ id: appQuestions.id })
		.from(appQuestions)
		.where(eq(appQuestions.nodeId, nodeId))
		.get();

	if (!row) {
		throw new Error(`Failed to materialize question ${nodeId}`);
	}

	return row.id;
}

function upsertFact(db: AppDb, fact: FactRecord, snapshotKey: string) {
	const fallbackId = stringValue(fact.node_id, stringValue(fact.title, 'fact'));
	const factSourceId = stringValue(fact.fact_id, fallbackId);

	db.insert(appFacts)
		.values({
			factId: factSourceId,
			nodeId: stringValue(fact.node_id, factSourceId),
			title: stringValue(fact.title, factSourceId),
			bodyHtml: stringValue(fact.body_html, stringValue(fact.body_preview)),
			snapshotKey
		})
		.onConflictDoUpdate({
			target: [appFacts.snapshotKey, appFacts.factId],
			set: {
				nodeId: stringValue(fact.node_id, factSourceId),
				title: stringValue(fact.title, factSourceId),
				bodyHtml: stringValue(fact.body_html, stringValue(fact.body_preview))
			}
		})
		.run();

	const row = db
		.select({ id: appFacts.id })
		.from(appFacts)
		.where(eq(appFacts.factId, factSourceId))
		.get();

	if (!row) {
		throw new Error(`Failed to materialize fact ${factSourceId}`);
	}

	return row.id;
}

function upsertQuestionFactLink(db: AppDb, questionId: number, factId: number, nodeId: string, link: FactLink) {
	db.insert(appQuestionFactLinks)
		.values({
			questionId,
			factId,
			nodeId,
			provenance: stringValue(link.link_source, stringValue(link.status, 'explicit'))
		})
		.onConflictDoUpdate({
			target: [appQuestionFactLinks.questionId, appQuestionFactLinks.factId],
			set: {
				nodeId,
				provenance: stringValue(link.link_source, stringValue(link.status, 'explicit'))
			}
		})
		.run();
}

function replaceSectionProfiles(db: AppDb, sectionId: number, profiles: string[]) {
	db.delete(appSectionProfiles).where(eq(appSectionProfiles.sectionId, sectionId)).run();

	if (profiles.length === 0) {
		return;
	}

	db.insert(appSectionProfiles)
		.values(
			profiles.map((profile) => ({
				sectionId,
				profileKey: profile,
				profileName: profile
			}))
		)
		.onConflictDoNothing()
		.run();
}

function replaceProfileCatalog(
	db: AppDb,
	records: Array<{ section_title?: unknown; profile_key?: unknown; profile_name?: unknown }>
) {
	db.delete(appProfileCatalog).run();

	if (records.length === 0) {
		return;
	}

	db.insert(appProfileCatalog)
		.values(
			records
				.map((record) => ({
					sectionTitle: stringValue(record.section_title),
					profileKey: stringValue(record.profile_key, stringValue(record.profile_name)),
					profileName: stringValue(record.profile_name, stringValue(record.profile_key))
				}))
				.filter((record) => record.profileKey.length > 0 && record.profileName.length > 0)
		)
		.onConflictDoNothing()
		.run();
}

function replaceQuestionProfiles(db: AppDb, questionId: number, profiles: string[]) {
	db.delete(appQuestionProfiles).where(eq(appQuestionProfiles.questionId, questionId)).run();

	if (profiles.length === 0) {
		return;
	}

	db.insert(appQuestionProfiles)
		.values(
			profiles.map((profile) => ({
				questionId,
				profileKey: profile,
				profileName: profile
			}))
		)
		.onConflictDoNothing()
		.run();
}

async function upsertChecklistInPostgres(
	client: PostgresExecutor,
	checklist: ChecklistRecord,
	snapshotKey: string
) {
	const slug = checklistSlug(checklist);
	const result = await client.query<{ id: number }>(
		`insert into app_checklists (slug, title, variant_key, snapshot_key)
		values ($1, $2, 'default', $3)
		on conflict (slug) do update set
			title = excluded.title,
			variant_key = excluded.variant_key,
			snapshot_key = excluded.snapshot_key
		returning id`,
		[slug, stringValue(checklist.title, slug), snapshotKey]
	);

	const id = result.rows[0]?.id;
	if (!id) {
		throw new Error(`Failed to materialize checklist ${slug}`);
	}

	return id;
}

async function upsertSectionInPostgres(
	client: PostgresExecutor,
	checklistId: number,
	group: ImportGroup,
	groupPrefix: string
) {
	const nodeId = stringValue(group.node_id);
	const result = await client.query<{ id: number }>(
		`insert into app_sections (checklist_id, node_id, prefix, title, description, sort_order)
		values ($1, $2, $3, $4, $5, $6)
		on conflict (checklist_id, node_id) do update set
			prefix = excluded.prefix,
			title = excluded.title,
			description = excluded.description,
			sort_order = excluded.sort_order
		returning id`,
		[
			checklistId,
			nodeId,
			groupPrefix,
			stringValue(group.title, nodeId),
			normalizeSingleParagraphText(group.intro_text),
			numberValue(group.sort_order, 0)
		]
	);

	const id = result.rows[0]?.id;
	if (!id) {
		throw new Error(`Failed to materialize section ${nodeId}`);
	}

	return id;
}

async function upsertQuestionGroupInPostgres(
	client: PostgresExecutor,
	sectionId: number,
	group: ImportGroup,
	groupPrefix: string
) {
	const sectionNodeId = stringValue(group.node_id);
	const nodeId = `${sectionNodeId}:group`;
	const result = await client.query<{ id: number }>(
		`insert into app_question_groups (section_id, node_id, prefix, title, intro_text, sort_order)
		values ($1, $2, $3, $4, $5, $6)
		on conflict (section_id, node_id) do update set
			prefix = excluded.prefix,
			title = excluded.title,
			intro_text = excluded.intro_text,
			sort_order = excluded.sort_order
		returning id`,
		[
			sectionId,
			nodeId,
			groupPrefix,
			stringValue(group.title, sectionNodeId),
			normalizeSingleParagraphText(group.intro_text),
			numberValue(group.sort_order, 0)
		]
	);

	const id = result.rows[0]?.id;
	if (!id) {
		throw new Error(`Failed to materialize question group ${nodeId}`);
	}

	return id;
}

async function upsertQuestionInPostgres(
	client: PostgresExecutor,
	groupId: number,
	groupPrefix: string,
	question: ImportQuestion,
	questionOrder: number,
	forceSequentialQuestionPrefixes: boolean
) {
	const nodeId = stringValue(question.node_id);
	const flags = flagMap(question.flags);
	const result = await client.query<{ id: number }>(
		`insert into app_questions (
			group_id, node_id, prefix, question_text, sort_order, cc, cc_extra, base, annual_question, new_flag, recommended
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		on conflict (group_id, node_id) do update set
			prefix = excluded.prefix,
			question_text = excluded.question_text,
			sort_order = excluded.sort_order,
			cc = excluded.cc,
			cc_extra = excluded.cc_extra,
			base = excluded.base,
			annual_question = excluded.annual_question,
			new_flag = excluded.new_flag,
			recommended = excluded.recommended
		returning id`,
		[
			groupId,
			nodeId,
			legacyQuestionPrefix(nodeId, groupPrefix, questionOrder, forceSequentialQuestionPrefixes),
			stringValue(question.question_text, nodeId),
			numberValue(question.sort_order, 0),
			Boolean(flags.cc),
			Boolean(flags.cc_extra),
			Boolean(flags.base),
			Boolean(flags.annual_question),
			Boolean(flags.new),
			Boolean(flags.recommended)
		]
	);

	const id = result.rows[0]?.id;
	if (!id) {
		throw new Error(`Failed to materialize question ${nodeId}`);
	}

	return id;
}

async function upsertFactInPostgres(client: PostgresExecutor, fact: FactRecord, snapshotKey: string) {
	const factSourceId = importedFactSourceId(fact);
	const result = await client.query<{ id: number }>(
		`insert into app_facts (fact_id, node_id, title, body_html, snapshot_key)
		values ($1, $2, $3, $4, $5)
		on conflict (snapshot_key, fact_id) do update set
			node_id = excluded.node_id,
			title = excluded.title,
			body_html = excluded.body_html
		returning id`,
		[
			factSourceId,
			stringValue(fact.node_id, factSourceId),
			stringValue(fact.title, factSourceId),
			stringValue(fact.body_html, stringValue(fact.body_preview)),
			snapshotKey
		]
	);

	const id = result.rows[0]?.id;
	if (!id) {
		throw new Error(`Failed to materialize fact ${factSourceId}`);
	}

	return id;
}

function importedFactSourceId(fact: FactRecord) {
	const fallbackId = stringValue(fact.node_id, stringValue(fact.title, 'fact'));
	return stringValue(fact.fact_id, fallbackId);
}

async function upsertQuestionFactLinkInPostgres(
	client: PostgresExecutor,
	questionId: number,
	factId: number,
	nodeId: string,
	link: FactLink
) {
	await client.query(
		`insert into app_question_fact_links (question_id, fact_id, node_id, provenance)
		values ($1, $2, $3, $4)
		on conflict (question_id, fact_id) do update set
			node_id = excluded.node_id,
			provenance = excluded.provenance`,
		[
			questionId,
			factId,
			nodeId,
			stringValue(link.link_source, stringValue(link.status, 'explicit'))
		]
	);
}

async function replaceSectionProfilesInPostgres(client: PostgresExecutor, sectionId: number, profiles: string[]) {
	await client.query('delete from app_section_profiles where section_id = $1', [sectionId]);

	for (const profile of profiles) {
		await client.query(
			`insert into app_section_profiles (section_id, profile_key, profile_name)
			values ($1, $2, $3)
			on conflict do nothing`,
			[sectionId, profile, profile]
		);
	}
}

async function replaceQuestionProfilesInPostgres(client: PostgresExecutor, questionId: number, profiles: string[]) {
	await client.query('delete from app_question_profiles where question_id = $1', [questionId]);

	for (const profile of profiles) {
		await client.query(
			`insert into app_question_profiles (question_id, profile_key, profile_name)
			values ($1, $2, $3)
			on conflict do nothing`,
			[questionId, profile, profile]
		);
	}
}

function checklistSlug(checklist: ChecklistRecord) {
	const raw = stringValue(checklist.qa_type, stringValue(checklist.checklist_id, 'default'));
	return `miljohusesyn-${raw.toLowerCase()}`;
}

function indexQuestion(lookup: QuestionLookup, nodeId: unknown, questionId: number) {
	const value = stringValue(nodeId);

	for (const key of nodeKeys(value)) {
		lookup.set(key, questionId);
	}
}

function findQuestionId(lookup: QuestionLookup, nodeId: unknown) {
	for (const key of nodeKeys(stringValue(nodeId))) {
		const questionId = lookup.get(key);

		if (questionId) {
			return questionId;
		}
	}

	return null;
}

function nodeKeys(nodeId: string) {
	const normalized = normalizeLegacyNodeId(nodeId);
	return Array.from(new Set([nodeId, normalized].filter(Boolean)));
}

function normalizeLegacyNodeId(nodeId: string) {
	return nodeId.replace(/^node-id-/, '').replace(/-\d{4}-\d{2}-\d{2}.*$/, '');
}

function legacyPrefix(nodeId: string) {
	return normalizeLegacyNodeId(nodeId);
}

function legacyQuestionPrefix(
	nodeId: string,
	groupPrefix: string,
	questionOrder: number,
	forceSequentialQuestionPrefixes = false
) {
	if (forceSequentialQuestionPrefixes) {
		return `${groupPrefix}-${questionOrder}`;
	}

	const normalized = legacyPrefix(nodeId);
	if (matchesGroupQuestionPrefix(normalized, groupPrefix)) {
		return normalized;
	}

	return `${groupPrefix}-${questionOrder}`;
}

function matchesGroupQuestionPrefix(questionPrefix: string, groupPrefix: string) {
	return (
		questionPrefix === groupPrefix ||
		questionPrefix.startsWith(`${groupPrefix}-`) ||
		questionPrefix.startsWith(`${groupPrefix}.`)
	);
}

function inferGroupPrefix(checklist: ChecklistRecord, group: ImportGroup, groupOrder: number) {
	const nodePrefix = legacyPrefix(stringValue(group.node_id));
	const questionGroupPrefixes = orderImportQuestions(group.questions)
		.map((question) => extractQuestionGroupPrefix(legacyPrefix(stringValue(question.node_id))))
		.filter((value): value is string => Boolean(value));
	const consistentQuestionPrefix =
		questionGroupPrefixes.length > 0 && questionGroupPrefixes.every((value) => value === questionGroupPrefixes[0])
			? questionGroupPrefixes[0]
			: null;

	if (consistentQuestionPrefix) {
		return consistentQuestionPrefix;
	}

	const checklistPrefix = inferChecklistPrefix(checklist);
	if (matchesChecklistGroupPrefix(nodePrefix, checklistPrefix)) {
		return nodePrefix;
	}

	return `${checklistPrefix}${groupOrder}`;
}

function shouldForceSequentialQuestionPrefixes(group: ImportGroup, groupPrefix: string) {
	const groupNodePrefix = legacyPrefix(stringValue(group.node_id));
	return groupNodePrefix !== groupPrefix;
}

function inferChecklistPrefix(checklist: ChecklistRecord) {
	const qaType = stringValue(checklist.qa_type).trim().toUpperCase();
	if (/^[A-Z]$/.test(qaType)) {
		return qaType;
	}

	const checklistId = stringValue(checklist.checklist_id).trim().toUpperCase();
	const checklistIdMatch = checklistId.match(/^([A-Z])/);
	if (checklistIdMatch) {
		return checklistIdMatch[1];
	}

	return 'G';
}

function matchesChecklistGroupPrefix(prefix: string, checklistPrefix: string) {
	return new RegExp(`^${checklistPrefix}\\d+$`).test(prefix);
}

function extractQuestionGroupPrefix(questionPrefix: string) {
	const match = questionPrefix.match(/^([A-Z]\d+)[-.]\d+$/);
	return match ? match[1] : null;
}

function orderImportGroups(value: unknown) {
	return asArray<ImportGroup>(value)
		.map((group, index) => ({
			group,
			index,
			sortOrder: numberValue(group.sort_order, Number.MAX_SAFE_INTEGER)
		}))
		.sort((left, right) => {
			if (left.sortOrder !== right.sortOrder) {
				return left.sortOrder - right.sortOrder;
			}

			return left.index - right.index;
		})
		.map(({ group }) => group);
}

function orderImportQuestions(value: unknown) {
	return asArray<ImportQuestion>(value)
		.map((question, index) => ({
			question,
			index,
			sortOrder: numberValue(question.sort_order, Number.MAX_SAFE_INTEGER)
		}))
		.sort((left, right) => {
			if (left.sortOrder !== right.sortOrder) {
				return left.sortOrder - right.sortOrder;
			}

			return left.index - right.index;
		})
		.map(({ question }) => question);
}

function flagMap(value: unknown): ImportFlagMap {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}

	return value as ImportFlagMap;
}

function asArray<T>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
}

function stringArray(value: unknown) {
	return asArray<unknown>(value).filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function stringValue(value: unknown, fallback = '') {
	return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function normalizeSingleParagraphText(value: unknown, fallback = '') {
	return stringValue(value, fallback).replace(/\s+/g, ' ').trim();
}

function numberValue(value: unknown, fallback: number) {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
