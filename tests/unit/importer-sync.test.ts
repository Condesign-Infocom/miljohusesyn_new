import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	loadImportPayloadFromDomainStore,
	syncDomainStoreSnapshot,
	syncImporterSnapshot
} from '$lib/server/sync/importer-sync';
import { createTestDb } from './test-db';
import checklistFixture from '../fixtures/importer/minimal-checklist-import.json';
import factFixture from '../fixtures/importer/minimal-fact-import.json';

const originalRuntimeDbEngine = process.env.APP_DB_ENGINE;
const originalRuntimePostgresDsn = process.env.APP_DB_POSTGRES_DSN;
const importerDir = path.resolve(process.cwd(), '../importer');
const openSqlite = (filename: string) => new Database(filename);
const domainStoreFixtureSchema = `
	create table content_snapshots (id text primary key, source_label text, source_type text, imported_at text, status text);
	create table imported_files (id text primary key, snapshot_id text, source_path text, content_family text, detected_uid text, detected_node_id text, detected_fact_id text, validation_status text);
	create table imported_file_node_ids (id text primary key, imported_file_row_id text, node_id text);
	create table checklists (id text primary key, snapshot_id text, checklist_id text, qa_type text, title text);
	create table checklist_groups (id text primary key, snapshot_id text, checklist_row_id text, node_id text, title text, intro_text text, sort_order integer);
	create table questions (id text primary key, snapshot_id text, group_row_id text, node_id text, question_text text, sort_order integer, cc integer, cc_extra integer, base integer, new_flag integer, recommended integer);
	create table facts (id text primary key, snapshot_id text, fact_id text, node_id text, title text, source_file text, body_html text);
	create table fact_links (id text primary key, snapshot_id text, fact_row_id text, node_id text, link_source text, link_status text);
	create table standard_content_blocks (id text primary key, snapshot_id text, block_id text, content_type text, title text, root_tag text, source_file text, body_html text);
	create table standard_content_targets (id text primary key, snapshot_id text, block_row_id text, target_href text);
	create table profile_catalog (id text primary key, snapshot_id text, section_title text, profile_key text, profile_name text);
	create table checklist_group_profiles (id text primary key, snapshot_id text, group_row_id text, profile_key text, profile_name text);
	create table question_profiles (id text primary key, snapshot_id text, question_row_id text, profile_key text, profile_name text);
	create table editorial_drafts (id text primary key, snapshot_id text, content_kind text, source_row_id text, status text, created_by_user_id integer, updated_by_user_id integer, created_at text, updated_at text);
	create table editorial_draft_revisions (id text primary key, draft_id text, revision_number integer, payload_json text, validation_status text, created_by_user_id integer, created_at text);
	create table editorial_review_requests (id text primary key, draft_id text, requested_by_user_id integer, requested_at text, status text);
`;

beforeEach(() => {
	process.env.APP_DB_ENGINE = 'sqlite';
	delete process.env.APP_DB_POSTGRES_DSN;
});

afterEach(() => {
	if (originalRuntimeDbEngine === undefined) {
		delete process.env.APP_DB_ENGINE;
	} else {
		process.env.APP_DB_ENGINE = originalRuntimeDbEngine;
	}

	if (originalRuntimePostgresDsn === undefined) {
		delete process.env.APP_DB_POSTGRES_DSN;
	} else {
		process.env.APP_DB_POSTGRES_DSN = originalRuntimePostgresDsn;
	}
});

describe('syncImporterSnapshot', () => {
	it('materializes one checklist section, one group, one question, and one linked fact', async () => {
		const db = createTestDb();

		syncImporterSnapshot(db, {
			snapshotKey: 'snapshot-test',
			checklistImport: checklistFixture,
			profileImport: {
				records: [
					{
						section_title: 'Djurhallning',
						profile_key: 'Grisar',
						profile_name: 'Grisar'
					}
				]
			},
			factImport: factFixture
		});

		const profileCatalogRows = await db.query.appProfileCatalog.findMany();
		const sectionRows = await db.query.appSections.findMany();
		const groupRows = await db.query.appQuestionGroups.findMany();
		const questionRows = await db.query.appQuestions.findMany();
		const sectionProfileRows = await db.query.appSectionProfiles.findMany();
		const questionProfileRows = await db.query.appQuestionProfiles.findMany();
		const factRows = await db.query.appFacts.findMany();
		const factLinkRows = await db.query.appQuestionFactLinks.findMany();

		expect(profileCatalogRows).toHaveLength(1);
		expect(sectionRows).toHaveLength(1);
		expect(groupRows).toHaveLength(1);
		expect(questionRows).toHaveLength(1);
		expect(sectionProfileRows).toHaveLength(1);
		expect(questionProfileRows).toHaveLength(1);
		expect(factRows).toHaveLength(1);
		expect(factLinkRows).toHaveLength(1);
	});

	it('matches fact links against timestamped checklist node ids using the normalized legacy key', async () => {
		const db = createTestDb();

		syncImporterSnapshot(db, {
			snapshotKey: 'snapshot-timestamped',
			checklistImport: {
				records: [
					{
						checklist_id: 'checklist-a',
						qa_type: 'A',
						title: 'Arbetsmiljo',
						groups: [
							{
								node_id: 'node-id-A1-2015-04-20-0200',
								title: 'Systematiskt arbetsmiljoarbete',
								sort_order: 1,
								questions: [
									{
										node_id: 'node-id-A-86757-2021-01-04T190816191-0100',
										question_text: 'Timestamped question',
										sort_order: 1
									}
								]
							}
						]
					}
				]
			},
			factImport: {
				records: [
					{
						fact_id: 'fact-a-86757',
						node_id: 'A-86757',
						title: 'Helpful fact',
						body_html: '<p>Fact body</p>',
						links: [
							{
								node_id: 'A-86757',
								link_source: 'explicit_node_id',
								status: 'linked'
							}
						]
					}
				]
			}
		});

		const factLinkRows = await db.query.appQuestionFactLinks.findMany();
		expect(factLinkRows).toHaveLength(1);
	});

	it('falls back to group-based legacy question prefixes for malformed timestamped node ids', async () => {
		const db = createTestDb();

		syncImporterSnapshot(db, {
			snapshotKey: 'snapshot-prefix-fallback',
			checklistImport: {
				records: [
					{
						checklist_id: 'checklist-v',
						qa_type: 'V',
						title: 'Vaxtodling',
						groups: [
							{
								node_id: 'node-id-V20-2015-04-20-0200',
								title: 'Fornlamningar',
								sort_order: 1,
								questions: [
									{
										node_id: 'node-id-V20-1-2015-04-20-0200',
										question_text: 'Question 1',
										sort_order: 1
									},
									{
										node_id: 'node-id-V20-2-2015-04-20-0200',
										question_text: 'Question 2',
										sort_order: 2
									},
									{
										node_id: 'node-id-V-427216-2017-03-30T154231545-0200',
										question_text: 'Question 3',
										sort_order: 3
									}
								]
							}
						]
					}
				]
			},
			factImport: { records: [] }
		});

		const questionRows = await db.query.appQuestions.findMany();
		expect(questionRows.map((question) => question.prefix)).toEqual(['V20-1', 'V20-2', 'V20-3']);
	});

	it('infers malformed group prefixes from child question numbering and repairs question numbering from that group', async () => {
		const db = createTestDb();

		syncImporterSnapshot(db, {
			snapshotKey: 'snapshot-group-prefix-fallback',
			checklistImport: {
				records: [
					{
						checklist_id: 'checklist-a',
						qa_type: 'A',
						title: 'Arbetsmiljo',
						groups: [
							{
								node_id: 'node-id-A-216679-2020-12-04T155044127-0100',
								title: 'Systematiskt arbetsmiljoarbete',
								sort_order: 1,
								questions: [
									{
										node_id: 'node-id-A-86757-2021-01-04T190816191-0100',
										question_text: 'Question 1',
										sort_order: 1
									},
									{
										node_id: 'node-id-A1-2-2015-04-20-0200',
										question_text: 'Question 2',
										sort_order: 2
									},
									{
										node_id: 'node-id-A-606547-2016-02-02T131851424-0100',
										question_text: 'Question 3',
										sort_order: 3
									},
									{
										node_id: 'node-id-A1-3-2015-04-20-0200',
										question_text: 'Question 4',
										sort_order: 4
									},
									{
										node_id: 'node-id-A1-4-2015-04-20-0200',
										question_text: 'Question 5',
										sort_order: 5
									}
								]
							}
						]
					}
				]
			},
			factImport: { records: [] }
		});

		const sectionRows = await db.query.appSections.findMany();
		const groupRows = await db.query.appQuestionGroups.findMany();
		const questionRows = await db.query.appQuestions.findMany();

		expect(sectionRows.map((section) => section.prefix)).toEqual(['A1']);
		expect(groupRows.map((group) => group.prefix)).toEqual(['A1']);
		expect(questionRows.map((question) => question.prefix)).toEqual([
			'A1-1',
			'A1-2',
			'A1-3',
			'A1-4',
			'A1-5'
		]);
	});

	it('loads a materialization payload directly from the durable domain store', () => {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'domain-store-fixture-'));
		const domainStorePath = path.join(tempDir, 'domain-store.sqlite');
		const sqlite = openSqlite(domainStorePath);

		try {
			sqlite.exec(domainStoreFixtureSchema);

			sqlite.prepare("insert into content_snapshots values (?, ?, ?, ?, ?)").run(
				'snapshot-domain',
				'domain',
				'xml_import',
				'2026-05-18T10:00:00Z',
				'imported'
			);
			sqlite.prepare("insert into checklists values (?, ?, ?, ?, ?)").run(
				'snapshot-domain:checklist:1',
				'snapshot-domain',
				'checklist-default',
				'default',
				'Miljohusesyn'
			);
			sqlite.prepare("insert into checklist_groups values (?, ?, ?, ?, ?, ?, ?)").run(
				'snapshot-domain:checklist:1:group:1',
				'snapshot-domain',
				'snapshot-domain:checklist:1',
				'node-id-G1-2015-02-25',
				'Environment',
				'Intro text',
				1
			);
			sqlite.prepare("insert into checklist_group_profiles values (?, ?, ?, ?, ?)").run(
				'snapshot-domain:group-profile:1',
				'snapshot-domain',
				'snapshot-domain:checklist:1:group:1',
				'Har_djur',
				'Har_djur'
			);
			sqlite.prepare("insert into questions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
				'snapshot-domain:checklist:1:group:1:question:1',
				'snapshot-domain',
				'snapshot-domain:checklist:1:group:1',
				'node-id-G1-1-2015-02-25',
				'Is the activity registered?',
				1,
				0,
				0,
				0,
				1,
				0
			);
			sqlite.prepare("insert into question_profiles values (?, ?, ?, ?, ?)").run(
				'snapshot-domain:question-profile:1',
				'snapshot-domain',
				'snapshot-domain:checklist:1:group:1:question:1',
				'Har_grisar',
				'Har_grisar'
			);
			sqlite.prepare("insert into facts values (?, ?, ?, ?, ?, ?, ?)").run(
				'snapshot-domain:fact:1',
				'snapshot-domain',
				'fact-1',
				'G1-1',
				'Helpful fact',
				'facts/fact-1.xml',
				'<p>Fact body</p>'
			);
			sqlite.prepare("insert into fact_links values (?, ?, ?, ?, ?, ?)").run(
				'snapshot-domain:fact-link:1',
				'snapshot-domain',
				'snapshot-domain:fact:1',
				'G1-1',
				'explicit_node_id',
				'linked'
			);
			sqlite.prepare("insert into profile_catalog values (?, ?, ?, ?, ?)").run(
				'snapshot-domain:profile-catalog:1',
				'snapshot-domain',
				'Djurhallning',
				'Grisar',
				'Grisar'
			);
			sqlite.prepare("insert into standard_content_blocks values (?, ?, ?, ?, ?, ?, ?, ?)").run(
				'snapshot-domain:standard-content:1',
				'snapshot-domain',
				'id-preface1',
				'preface',
				'Preface',
				'section',
				'standard-texts/preface.xml',
				'<section xml:id=\"id-preface1\"><title>Preface</title></section>'
			);
			sqlite.prepare("insert into standard_content_targets values (?, ?, ?, ?)").run(
				'snapshot-domain:standard-content:1:target:1',
				'snapshot-domain',
				'snapshot-domain:standard-content:1',
				'standard-texts/preface.xml#id-preface1'
			);

			const payload = loadImportPayloadFromDomainStore(domainStorePath);
			const checklistRecord = payload.checklistImport.records[0];
			const group = checklistRecord?.groups?.[0];
			const question = group?.questions?.[0];
			const factRecord = payload.factImport.records[0];
			const factLink = factRecord?.links?.[0];

			expect(payload.snapshotKey).toBe('snapshot-domain');
			expect(payload.profileImport?.records).toHaveLength(1);
			expect(group?.intro_text).toBe('Intro text');
			expect(group?.profiles).toEqual(['Har_djur']);
			expect(question?.profiles).toEqual(['Har_grisar']);
			expect(factLink).toMatchObject({
				node_id: 'G1-1',
				link_source: 'explicit_node_id',
				status: 'linked'
			});
		} finally {
			sqlite.close();
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it('materializes runtime tables directly from the durable domain store', async () => {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'domain-store-sync-'));
		const domainStorePath = path.join(tempDir, 'domain-store.sqlite');
		const sqlite = openSqlite(domainStorePath);
		const db = createTestDb();

		try {
			sqlite.exec(domainStoreFixtureSchema);

			sqlite.prepare("insert into content_snapshots values (?, ?, ?, ?, ?)").run(
				'snapshot-domain',
				'domain',
				'xml_import',
				'2026-05-18T10:00:00Z',
				'imported'
			);
			sqlite.prepare("insert into checklists values (?, ?, ?, ?, ?)").run(
				'snapshot-domain:checklist:1',
				'snapshot-domain',
				'checklist-default',
				'default',
				'Miljohusesyn'
			);
			sqlite.prepare("insert into checklist_groups values (?, ?, ?, ?, ?, ?, ?)").run(
				'snapshot-domain:checklist:1:group:1',
				'snapshot-domain',
				'snapshot-domain:checklist:1',
				'node-id-G1-2015-02-25',
				'Environment',
				'Intro text',
				1
			);
			sqlite.prepare("insert into questions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
				'snapshot-domain:checklist:1:group:1:question:1',
				'snapshot-domain',
				'snapshot-domain:checklist:1:group:1',
				'node-id-G1-1-2015-02-25',
				'Is the activity registered?',
				1,
				0,
				0,
				0,
				1,
				0
			);
			sqlite.prepare("insert into facts values (?, ?, ?, ?, ?, ?, ?)").run(
				'snapshot-domain:fact:1',
				'snapshot-domain',
				'fact-1',
				'G1-1',
				'Helpful fact',
				'facts/fact-1.xml',
				'<p>Fact body</p>'
			);
			sqlite.prepare("insert into fact_links values (?, ?, ?, ?, ?, ?)").run(
				'snapshot-domain:fact-link:1',
				'snapshot-domain',
				'snapshot-domain:fact:1',
				'G1-1',
				'explicit_node_id',
				'linked'
			);

			const syncedSnapshotKey = await syncDomainStoreSnapshot(db, domainStorePath);
			const sectionRows = await db.query.appSections.findMany();
			const factLinkRows = await db.query.appQuestionFactLinks.findMany();

			expect(syncedSnapshotKey).toBe('snapshot-domain');
			expect(sectionRows).toHaveLength(1);
			expect(sectionRows[0]?.description).toBe('Intro text');
			expect(factLinkRows).toHaveLength(1);
		} finally {
			sqlite.close();
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it('persists imported node ids, rendered bodies, and parsed flags into the durable store', () => {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'domain-store-write-'));
		const domainStorePath = path.join(tempDir, 'domain-store.sqlite');
		let sqlite: ReturnType<typeof openSqlite> | null = null;

		try {
			const snapshot = {
				snapshot_id: 'snapshot-write',
				source_label: 'test',
				source_type: 'xml_import',
				imported_at: '2026-05-19T10:00:00Z',
				status: 'imported'
			};
			const manifest = {
				records: [
					{
						relative_path: 'source/checklists/multi-node.xml',
						content_family: 'checklist-domain',
						detected_uid: 'uid0',
						detected_node_ids: ['node-id-G1-2015-02-25', 'node-id-G1-1-2015-02-25'],
						detected_fact_id: null
					}
				]
			};
			const checklistImport = {
				records: [
					{
						checklist_id: 'checklist-default',
						qa_type: 'default',
						title: 'Miljohusesyn',
						groups: [
							{
								node_id: 'node-id-G1-2015-02-25',
								title: 'Environment',
								intro_text: 'Intro text',
								sort_order: 1,
								profiles: [],
								questions: [
									{
										node_id: 'node-id-G1-1-2015-02-25',
										question_text: 'Is the activity registered?',
										sort_order: 1,
										flags: {
											cc: '0',
											'cc-extra': 'yes',
											base: 'false',
											new: '1',
											recommended: ''
										},
										profiles: []
									}
								]
							}
						]
					}
				]
			};
			const factImport = {
				records: [
					{
						fact_id: 'fact-1',
						title: 'Helpful fact',
						source_file: 'facts/fact-1.xml',
						body_preview: 'Fact preview text',
						body_html: '<p>Raw fact body should not win</p>',
						links: [
							{
								node_id: 'G1-1',
								link_source: 'explicit_node_id',
								status: 'linked'
							}
						]
					}
				]
			};
			const standardContentImport = {
				records: [
					{
						block_id: 'id-preface1',
						content_type: 'preface',
						title: 'Preface',
						root_tag: 'section',
						source_file: 'standard-texts/preface.xml',
						body_preview: 'Standard content preview',
						body_html: '<section>Raw standard content should not win</section>',
						assembly_targets: [
							'standard-texts/preface.xml#id-preface1',
							'standard-texts/preface.xml#id-preface2'
						]
					}
				]
			};
			const profileImport = { records: [] };
			const pythonScript = `
import json
import sys

sys.path.insert(0, sys.argv[1])
from write_domain_store import sync_snapshot_bundle

sync_snapshot_bundle(
    json.loads(sys.argv[2]),
    json.loads(sys.argv[3]),
    json.loads(sys.argv[4]),
    json.loads(sys.argv[5]),
    json.loads(sys.argv[6]),
    json.loads(sys.argv[7]),
)
`;

			execFileSync(
				'python',
				[
					'-c',
					pythonScript,
					importerDir,
					JSON.stringify(snapshot),
					JSON.stringify(manifest),
					JSON.stringify(checklistImport),
					JSON.stringify(factImport),
					JSON.stringify(standardContentImport),
					JSON.stringify(profileImport)
				],
				{
					cwd: process.cwd(),
					env: {
						...process.env,
						MHS_DOMAIN_STORE_ENGINE: 'sqlite',
						MHS_DOMAIN_STORE_SQLITE_PATH: domainStorePath
					}
				}
			);

			sqlite = openSqlite(domainStorePath);
			const importedFile = sqlite
				.prepare('select detected_node_id from imported_files where snapshot_id = ?')
				.get('snapshot-write') as { detected_node_id: string } | undefined;
			const importedNodeIds = sqlite
				.prepare(
					'select node_id from imported_file_node_ids where imported_file_row_id = ? order by id'
				)
				.all('snapshot-write:file:1') as Array<{ node_id: string }>;
			const questionFlags = sqlite
				.prepare('select cc, cc_extra, base, new_flag, recommended from questions where snapshot_id = ?')
				.get('snapshot-write') as
				| { cc: number; cc_extra: number; base: number; new_flag: number; recommended: number }
				| undefined;
			const factRow = sqlite
				.prepare('select body_html from facts where snapshot_id = ?')
				.get('snapshot-write') as { body_html: string } | undefined;
			const standardContentRow = sqlite
				.prepare('select body_html from standard_content_blocks where snapshot_id = ?')
				.get('snapshot-write') as { body_html: string } | undefined;
			const standardContentTargets = sqlite
				.prepare('select target_href from standard_content_targets where snapshot_id = ? order by id')
				.all('snapshot-write') as Array<{ target_href: string }>;

			expect(importedFile?.detected_node_id).toBe('node-id-G1-2015-02-25');
			expect(importedNodeIds.map((row) => row.node_id)).toEqual([
				'node-id-G1-2015-02-25',
				'node-id-G1-1-2015-02-25'
			]);
			expect(questionFlags).toMatchObject({
				cc: 0,
				cc_extra: 1,
				base: 0,
				new_flag: 1,
				recommended: 0
			});
			expect(factRow?.body_html).toBe('<p>Raw fact body should not win</p>');
			expect(standardContentRow?.body_html).toBe(
				'<section>Raw standard content should not win</section>'
			);
			expect(standardContentTargets.map((row) => row.target_href)).toEqual([
				'standard-texts/preface.xml#id-preface1',
				'standard-texts/preface.xml#id-preface2'
			]);
		} finally {
			sqlite?.close();
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it('renders structured fact HTML and rewrites fact image refs to local assets', () => {
		const fixtureRoot = path.resolve(process.cwd(), '../../tmp');
		fs.mkdirSync(fixtureRoot, { recursive: true });
		const tempDir = fs.mkdtempSync(path.join(fixtureRoot, 'fact-render-fixture-'));
		const factPath = path.join(tempDir, 'G04-14.xml');

		try {
			fs.writeFileSync(
				factPath,
				`<?xml version="1.0" encoding="UTF-8"?>
<sect1 xmlns="http://docbook.org/ns/docbook" node-id="node-id-G4-14-2015-04-20-0200" text-type="fact" fact-id="fact-G04-14">
	<title>Vattenskyddsområde – informationsskylt</title>
	<para>Vid påfyllningsrör för cistern inom vattenskyddsområde ska skylt vara uppsatt.</para>
	<itemizedlist>
		<listitem>
			<para>Fastighetsbeteckning</para>
		</listitem>
		<listitem>
			<para><emphasis role="italic">Volym</emphasis></para>
		</listitem>
	</itemizedlist>
	<figure>
		<title>.</title>
		<mediaobject>
			<imageobject>
				<imagedata fileref="http://miljohusesyn.nu:8080/exist/rest/db/lrf/mhs/pub/images/Cisterner_Vattenskyddsomrade_skylt.jpg"/>
			</imageobject>
		</mediaobject>
	</figure>
</sect1>`,
				'utf8'
			);

			const pythonScript = `
import json
import pathlib
import sys

sys.path.insert(0, sys.argv[1])
from import_snapshot import import_fact_file

record = import_fact_file(pathlib.Path(sys.argv[2]), {})
print(json.dumps(record.to_dict(), ensure_ascii=False))
`;

			const output = execFileSync('python', ['-c', pythonScript, importerDir, factPath], {
				cwd: process.cwd(),
				encoding: 'utf8'
			});
			const record = JSON.parse(output) as { body_html: string; body_preview: string; links: Array<{ node_id: string; status: string }> };

			expect(record.body_html).toContain('<p>Vid ');
			expect(record.body_html).toContain('ska skylt vara uppsatt.</p>');
			expect(record.body_html).toContain('<ul><li><p>Fastighetsbeteckning</p></li><li><p><em>Volym</em></p></li></ul>');
			expect(record.body_html).toContain('<figure><img src="/fact-images/Cisterner_Vattenskyddsomrade_skylt.jpg" alt=""></figure>');
			expect(record.body_preview).toContain('Vid p');
			expect(record.body_preview).toContain('ska skylt vara uppsatt.');
			expect(record.links).toEqual([
				{
					node_id: 'G4-14',
					link_level: 'question_or_group',
					link_source: 'explicit_node_id',
					status: 'linked'
				}
			]);
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});
});
