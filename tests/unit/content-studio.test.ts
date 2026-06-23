import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	archiveChecklistQuestionDraft,
	createChecklistQuestionDraft,
	loadContentStudioChecklists,
	loadContentStudioFact,
	loadContentStudioChecklistTree,
	loadContentStudioFacts,
	loadContentStudioLandingData,
	loadContentStudioProfileRules,
	loadChecklistEditor,
	moveChecklistQuestionDraft,
	loadContentStudioValidation,
	loadFactEditor,
	loadChecklistEditorWorkspace,
	loadStandardContentEditor,
	addChecklistGroupProfileRule,
	addChecklistQuestionProfileRule,
	removeChecklistGroupProfileRule,
	removeChecklistQuestionProfileRule,
	reorderChecklistGroupsDraft,
	reorderChecklistQuestionsDraft,
	saveChecklistGroupDraft,
	saveChecklistQuestionDraft,
	createChecklistWorkspaceFactFromQuestion,
	linkChecklistWorkspaceFact,
	saveFactDraft,
	saveChecklistWorkspaceFactDraft,
	saveStandardContentDraft,
	unlinkChecklistWorkspaceFact,
	loadContentStudioStandardContent,
	loadContentStudioStandardContentBlock
} from '$lib/server/services/content-studio';

const originalDomainStoreEngine = process.env.MHS_DOMAIN_STORE_ENGINE;
const originalDomainStoreSqlitePath = process.env.MHS_DOMAIN_STORE_SQLITE_PATH;
const originalDomainStorePostgresDsn = process.env.MHS_DOMAIN_STORE_POSTGRES_DSN;
const domainStoreSchemaPath = path.resolve(process.cwd(), '../schema/domain-store.sql');

let tempDir = '';
let domainStorePath = '';

beforeEach(() => {
	tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-studio-domain-store-'));
	domainStorePath = path.join(tempDir, 'domain-store.sqlite');

	const sqlite = new Database(domainStorePath);
	sqlite.exec(fs.readFileSync(domainStoreSchemaPath, 'utf8'));
	seedDomainStore(sqlite);
	sqlite.close();

	process.env.MHS_DOMAIN_STORE_ENGINE = 'sqlite';
	process.env.MHS_DOMAIN_STORE_SQLITE_PATH = domainStorePath;
	delete process.env.MHS_DOMAIN_STORE_POSTGRES_DSN;
});

afterEach(() => {
	if (originalDomainStoreEngine === undefined) {
		delete process.env.MHS_DOMAIN_STORE_ENGINE;
	} else {
		process.env.MHS_DOMAIN_STORE_ENGINE = originalDomainStoreEngine;
	}

	if (originalDomainStoreSqlitePath === undefined) {
		delete process.env.MHS_DOMAIN_STORE_SQLITE_PATH;
	} else {
		process.env.MHS_DOMAIN_STORE_SQLITE_PATH = originalDomainStoreSqlitePath;
	}

	if (originalDomainStorePostgresDsn === undefined) {
		delete process.env.MHS_DOMAIN_STORE_POSTGRES_DSN;
	} else {
		process.env.MHS_DOMAIN_STORE_POSTGRES_DSN = originalDomainStorePostgresDsn;
	}

	fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('content studio durable-store access', () => {
	it('loads landing summary counts from the latest snapshot', async () => {
		const sqlite = new Database(domainStorePath);
		sqlite.prepare('insert into editorial_drafts values (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
			'draft-fact-water-old',
			'snapshot-latest',
			'fact',
			'snapshot-latest:fact:1',
			'draft',
			11,
			11,
			'2026-05-19T08:55:00Z',
			'2026-05-19T09:15:00Z'
		);
		sqlite.prepare('insert into editorial_review_requests values (?, ?, ?, ?, ?)').run(
			'review-fact-water-old',
			'draft-fact-water-old',
			11,
			'2026-05-19T09:16:00Z',
			'pending'
		);
		sqlite.close();

		const summary = await loadContentStudioLandingData();

		expect(summary).toMatchObject({
			latestSnapshot: {
				id: 'snapshot-latest',
				sourceLabel: 'Proof Store',
				sourceType: 'xml_import',
				status: 'imported'
			},
			checklistCount: 2,
			factCount: 3,
			standardContentCount: 3,
			openDraftCount: 2,
			pendingReviewCount: 1
		});
	});

	it('loads checklist and detail discovery data from the latest snapshot', async () => {
		const checklists = await loadContentStudioChecklists();
		const fact = await loadContentStudioFact('fact-water');
		const standardContentBlock = await loadContentStudioStandardContentBlock('id-preface1');

		expect(checklists.latestSnapshot?.id).toBe('snapshot-latest');
		expect(checklists.items).toEqual([
			expect.objectContaining({
				id: 'checklist-energy',
				title: 'Energy review',
				checklistId: 'checklist-energy',
				qaType: 'energy',
				groupCount: 1,
				questionCount: 1,
				missingFactLinkCount: 1,
				duplicateNodeIdCount: 0
			}),
			expect.objectContaining({
				id: 'checklist-default',
				title: 'Miljohusesyn',
				checklistId: 'checklist-default',
				qaType: 'default',
				groupCount: 2,
				questionCount: 3,
				missingFactLinkCount: 1,
				duplicateNodeIdCount: 0
			})
		]);

		expect(fact.latestSnapshot?.id).toBe('snapshot-latest');
		expect(fact.item).toMatchObject({
			id: 'fact-water',
			sourceRowId: 'snapshot-latest:fact:1',
			title: 'Water storage',
			sourceFile: 'facts/water.xml'
		});

		expect(standardContentBlock.latestSnapshot?.id).toBe('snapshot-latest');
		expect(standardContentBlock.item).toMatchObject({
			id: 'id-preface1',
			sourceRowId: 'snapshot-latest:standard-content:1',
			contentType: 'preface',
			targetCount: 2
		});
		expect(standardContentBlock.item?.targets).toEqual([
			'standard-texts/preface.xml#id-preface1',
			'standard-texts/preface.xml#id-preface2'
		]);
	});

	it('filters facts by search and standard content by kind', async () => {
		const facts = await loadContentStudioFacts({ search: 'water' });
		const standardContent = await loadContentStudioStandardContent({ kind: 'preface' });

		expect(facts.latestSnapshot?.id).toBe('snapshot-latest');
		expect(facts.items).toHaveLength(1);
		expect(facts.items[0]).toMatchObject({
			id: 'fact-water',
			title: 'Water storage',
			nodeId: 'G1-1'
		});
		expect(facts.items[0]?.latestDraft).toMatchObject({
			id: 'draft-fact-water',
			status: 'draft',
			latestRevisionNumber: 1,
			latestRevisionValidationStatus: 'valid'
		});

		expect(standardContent.kind).toBe('preface');
		expect(standardContent.items).toHaveLength(1);
		expect(standardContent.items[0]).toMatchObject({
			id: 'id-preface1',
			contentType: 'preface',
			targetCount: 2
		});
		expect(standardContent.items[0]?.targets).toEqual([
			'standard-texts/preface.xml#id-preface1',
			'standard-texts/preface.xml#id-preface2'
		]);
	});

	it('loads a checklist tree with profiles and fact-link context', async () => {
		const result = await loadContentStudioChecklistTree('checklist-default');

		expect(result.latestSnapshot?.id).toBe('snapshot-latest');
		expect(result.tree?.checklist).toMatchObject({
			id: 'checklist-default',
			sourceRowId: 'snapshot-latest:checklist:1',
			title: 'Miljohusesyn'
		});
		expect(result.tree?.groups).toHaveLength(2);
		expect(result.tree?.groups[0]).toMatchObject({
			id: 'snapshot-latest:checklist:1:group:1',
			title: 'Environment',
			profiles: [{ profileKey: 'Har_djur', profileName: 'Har_djur' }]
		});
		expect(result.tree?.groups[0]?.questions[0]).toMatchObject({
			id: 'snapshot-latest:checklist:1:group:1:question:1',
			nodeId: 'node-id-G1-1-2015-02-25',
			questionText: 'Is the water supply documented?',
			profiles: [{ profileKey: 'Har_grisar', profileName: 'Har_grisar' }],
			factLinks: [
				{
					id: 'snapshot-latest:fact-link:1',
					factId: 'fact-water',
					title: 'Water storage',
					nodeId: 'G1-1',
					linkSource: 'explicit_node_id',
					linkStatus: 'linked'
				}
			]
		});
	});

	it('matches fact links for timestamped legacy question node ids', async () => {
		const sqlite = new Database(domainStorePath);
		sqlite.prepare('insert into facts values (?, ?, ?, ?, ?, ?, ?)').run(
			'snapshot-latest:fact:4',
			'snapshot-latest',
			'fact-a10-1',
			'A10-1',
			'Huvudströmbrytare',
			'facts/a10-1.xml',
			'<p>Fact body</p>'
		);
		sqlite.prepare('insert into questions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
			'snapshot-latest:checklist:1:group:1:question:timestamped',
			'snapshot-latest',
			'snapshot-latest:checklist:1:group:1',
			'node-id-A10-1-2015-04-20-0200',
			'Timestamped question',
			9,
			0,
			0,
			0,
			0,
			0,
			0
		);
		sqlite.prepare('insert into fact_links values (?, ?, ?, ?, ?, ?)').run(
			'snapshot-latest:fact-link:timestamped',
			'snapshot-latest',
			'snapshot-latest:fact:4',
			'A10-1',
			'explicit_node_id',
			'linked'
		);
		sqlite.close();

		const result = await loadContentStudioChecklistTree('checklist-default');
		const question = result.tree?.groups[0]?.questions.find(
			(item) => item.id === 'snapshot-latest:checklist:1:group:1:question:timestamped'
		);

		expect(question).toMatchObject({
			nodeId: 'node-id-A10-1-2015-04-20-0200',
			factLinks: [
				expect.objectContaining({
					nodeId: 'A10-1',
					title: 'Huvudströmbrytare',
					linkStatus: 'linked'
				})
			]
		});
	});

	it('normalizes imported checklist intro text whitespace on load', async () => {
		const sqlite = new Database(domainStorePath);
		sqlite
			.prepare('update checklist_groups set intro_text = ? where id = ?')
			.run(
				'  Syftet med reglerna är att låta myndigheterna få veta var\n                    livsmedelsanläggningar finns och hurdan verksamhet som bedrivs så att\n                    myndigheterna kan utföra offentliga kontroller.  ',
				'snapshot-latest:checklist:1:group:1'
			);
		sqlite.close();

		const result = await loadContentStudioChecklistTree('checklist-default');

		expect(result.tree?.groups[0]?.introText).toBe(
			'Syftet med reglerna är att låta myndigheterna få veta var livsmedelsanläggningar finns och hurdan verksamhet som bedrivs så att myndigheterna kan utföra offentliga kontroller.'
		);
	});

	it('classifies missing facts as warnings instead of blockers', async () => {
		const checklists = await loadContentStudioChecklists();
		const defaultChecklist = checklists.items.find((item) => item.id === 'checklist-default');
		const energyChecklist = checklists.items.find((item) => item.id === 'checklist-energy');

		expect(defaultChecklist?.readiness).toEqual({
			state: 'warning',
			blockerCount: 0,
			warningCount: 1
		});
		expect(energyChecklist?.readiness).toEqual({
			state: 'warning',
			blockerCount: 0,
			warningCount: 1
		});

		const editor = await loadChecklistEditor('checklist-default');
		expect(editor.validation.readiness).toEqual({
			state: 'warning',
			blockerCount: 0,
			warningCount: 1
		});
	});

	it('rewrites positional placeholders for the postgres client path', async () => {
		process.env.MHS_DOMAIN_STORE_ENGINE = 'postgres';
		process.env.MHS_DOMAIN_STORE_POSTGRES_DSN = 'postgres://proof-store';

		const query = vi.fn().mockResolvedValue({
			rows: [{ count: '2' }]
		});
		const poolFactory = vi.fn(() => ({ query }));

		vi.resetModules();
		vi.doMock('pg', () => ({
			Pool: poolFactory
		}));

		try {
			const { createDomainStoreClient } = await import('$lib/server/domain-store/client');
			const client = createDomainStoreClient(process.env);
			const row = await client.get<{ count: string }>(
				'select count(*) as count from facts where snapshot_id = ? and title like ?',
				['snapshot-latest', '%water%']
			);

			expect(poolFactory).toHaveBeenCalledWith({
				connectionString: 'postgres://proof-store'
			});
			expect(query).toHaveBeenCalledWith(
				'select count(*) as count from facts where snapshot_id = $1 and title like $2',
				['snapshot-latest', '%water%']
			);
			expect(row).toEqual({ count: '2' });
		} finally {
			vi.doUnmock('pg');
			vi.resetModules();
		}
	});

	it('saves fact changes directly to the source row and audit revision', async () => {
		const initialEditor = await loadFactEditor('fact-machines', 21);

		expect(initialEditor.item?.title).toBe('Machine service');
		expect(initialEditor.draft).toMatchObject({
			id: null,
			title: 'Machine service',
			nodeIds: ['M1-1'],
			status: 'draft'
		});
		expect(initialEditor.linkOptions.some((option) => option.questionText === 'Is the compressor serviced annually?')).toBe(true);
		expect(initialEditor.unresolvedNodeIds).toEqual(['M1-1']);

		const saved = await saveFactDraft({
			factId: 'fact-machines',
			userId: 21,
			values: {
				title: 'Machine service updated',
				bodyHtml: '<p>Updated machine fact</p>',
				nodeIds: ['M1-1', 'M1-2']
			},
			status: 'draft'
		});

		expect(saved.validation.status).toBe('valid');
		expect(saved.item?.title).toBe('Machine service updated');
		expect(saved.draft).toMatchObject({
			title: 'Machine service updated',
			bodyHtml: '<p>Updated machine fact</p>',
			nodeIds: ['M1-1', 'M1-2'],
			status: 'published',
			validationStatus: 'valid'
		});

		const reloaded = await loadFactEditor('fact-machines', 21);
		expect(reloaded.item).toMatchObject({
			title: 'Machine service updated',
			bodyHtml: '<p>Updated machine fact</p>'
		});
		expect(reloaded.draft).toMatchObject({
			status: 'published',
			reviewStatus: null
		});

		const sqlite = new Database(domainStorePath);
		const links = sqlite
			.prepare('select node_id from fact_links where fact_row_id = ? order by node_id')
			.all('snapshot-latest:fact:3') as Array<{ node_id: string }>;
		sqlite.close();

		expect(links.map((link) => link.node_id)).toEqual(['M1-1', 'M1-2']);
	});

	it('loads linked facts for a selected checklist question in workspace mode', async () => {
		const result = await loadChecklistEditorWorkspace(
			'checklist-default',
			'snapshot-latest:checklist:1:group:1:question:1'
		);

		expect(result.factWorkspace?.question).toMatchObject({
			id: 'snapshot-latest:checklist:1:group:1:question:1',
			nodeId: 'node-id-G1-1-2015-02-25',
			groupId: 'snapshot-latest:checklist:1:group:1',
			groupTitle: 'Environment'
		});
		expect(result.factWorkspace?.linkedFacts).toEqual([
			expect.objectContaining({
				factRowId: 'snapshot-latest:fact:1',
				factId: 'fact-water',
				title: 'Water storage',
				usageCount: 1
			})
		]);
		expect(result.factWorkspace?.selectedFact).toMatchObject({
			factRowId: 'snapshot-latest:fact:1',
			title: 'Water storage'
		});
	});

	it('returns an empty-state workspace for questions without linked facts', async () => {
		const result = await loadChecklistEditorWorkspace(
			'checklist-default',
			'snapshot-latest:checklist:1:group:1:question:2'
		);

		expect(result.factWorkspace?.question).toMatchObject({
			id: 'snapshot-latest:checklist:1:group:1:question:2',
			nodeId: 'node-id-G1-2-2015-02-25'
		});
		expect(result.factWorkspace?.linkedFacts).toEqual([]);
		expect(result.factWorkspace?.selectedFact).toBeNull();
	});

	it('saves a linked fact from checklist context and reloads the workspace', async () => {
		const result = await saveChecklistWorkspaceFactDraft({
			checklistId: 'checklist-default',
			questionId: 'snapshot-latest:checklist:1:group:1:question:1',
			factId: 'fact-water',
			userId: 21,
			values: {
				title: 'Water storage updated from workspace',
				bodyHtml: '<p>Updated in checklist workspace</p>',
				nodeIds: ['G1-1']
			}
		});

		expect(result.factValidation.status).toBe('valid');
		expect(result.factWorkspace?.question?.id).toBe(
			'snapshot-latest:checklist:1:group:1:question:1'
		);
		expect(result.factWorkspace?.selectedFact).toMatchObject({
			factRowId: 'snapshot-latest:fact:1',
			title: 'Water storage updated from workspace',
			usageCount: 1
		});
	});

	it('creates a new fact from the selected question and links it immediately', async () => {
		const created = await createChecklistWorkspaceFactFromQuestion({
			checklistId: 'checklist-default',
			questionId: 'snapshot-latest:checklist:1:group:1:question:2',
			userId: 21,
			values: {
				title: 'Custom feed fact',
				bodyHtml: '<p>Feed records are checked before inspection.</p>'
			}
		});

		expect(created.factWorkspace?.question?.id).toBe(
			'snapshot-latest:checklist:1:group:1:question:2'
		);
		expect(created.factWorkspace?.linkedFacts).toHaveLength(1);
		expect(created.factWorkspace?.selectedFact).toMatchObject({
			title: 'Custom feed fact',
			usageCount: 1
		});
		expect(created.factWorkspace?.selectedFactEditor).toMatchObject({
			title: 'Custom feed fact',
			bodyHtml: '<p>Feed records are checked before inspection.</p>'
		});

		const tree = await loadContentStudioChecklistTree('checklist-default');
		const question = tree.tree?.groups[0]?.questions.find(
			(item) => item.id === 'snapshot-latest:checklist:1:group:1:question:2'
		);

		expect(question?.factLinks).toEqual([
			expect.objectContaining({
				linkSource: 'editorial_manual',
				linkStatus: 'linked'
			})
		]);
	});

	it('links an existing fact from checklist workspace context', async () => {
		const linked = await linkChecklistWorkspaceFact({
			checklistId: 'checklist-default',
			questionId: 'snapshot-latest:checklist:1:group:1:question:2',
			factId: 'fact-machines'
		});

		expect(linked.factWorkspace?.question?.id).toBe('snapshot-latest:checklist:1:group:1:question:2');
		expect(linked.factWorkspace?.linkedFacts).toEqual([
			expect.objectContaining({
				factRowId: 'snapshot-latest:fact:3',
				factId: 'fact-machines',
				title: 'Machine service'
			})
		]);
		expect(
			linked.factWorkspace?.availableFacts.find((fact) => fact.factRowId === 'snapshot-latest:fact:3')
		).toMatchObject({ isLinked: true });
	});

	it('uses the fact node id as linked-fact fallback when fact-id is missing', async () => {
		const sqlite = new Database(domainStorePath);
		sqlite.prepare('insert into facts values (?, ?, ?, ?, ?, ?, ?)').run(
			'snapshot-latest:fact:no-fact-id',
			'snapshot-latest',
			null,
			'node-id-D23-5-2015-04-20-0200',
			'Aggressiv gris',
			'facts/D30-12.xml',
			'<p>Grundvillkor</p>'
		);
		sqlite.close();

		const linked = await linkChecklistWorkspaceFact({
			checklistId: 'checklist-default',
			questionId: 'snapshot-latest:checklist:1:group:1:question:2',
			factId: 'snapshot-latest:fact:no-fact-id'
		});

		expect(linked.factWorkspace?.linkedFacts).toEqual([
			expect.objectContaining({
				factRowId: 'snapshot-latest:fact:no-fact-id',
				factId: null,
				nodeId: 'node-id-D23-5-2015-04-20-0200',
				title: 'Aggressiv gris'
			})
		]);
	});

	it('unlinks a fact from checklist workspace context', async () => {
		const unlinked = await unlinkChecklistWorkspaceFact({
			checklistId: 'checklist-default',
			questionId: 'snapshot-latest:checklist:1:group:1:question:1',
			factId: 'fact-water'
		});

		expect(unlinked.factWorkspace?.question?.id).toBe('snapshot-latest:checklist:1:group:1:question:1');
		expect(unlinked.factWorkspace?.linkedFacts).toHaveLength(0);
		expect(
			unlinked.factWorkspace?.availableFacts.find((fact) => fact.factRowId === 'snapshot-latest:fact:1')
		).toMatchObject({ isLinked: false });
	});

	it('dedupes duplicate fact links in checklist workspace mode', async () => {
		const sqlite = new Database(domainStorePath);
		sqlite.prepare('insert into fact_links values (?, ?, ?, ?, ?, ?)').run(
			'snapshot-latest:fact-link:duplicate',
			'snapshot-latest',
			'snapshot-latest:fact:1',
			'G1-1',
			'editorial_manual',
			'linked'
		);
		sqlite.close();

		const result = await loadChecklistEditorWorkspace(
			'checklist-default',
			'snapshot-latest:checklist:1:group:1:question:1'
		);

		expect(result.factWorkspace?.linkedFacts).toHaveLength(1);
		expect(result.factWorkspace?.linkedFacts[0]).toMatchObject({
			factRowId: 'snapshot-latest:fact:1',
			title: 'Water storage'
		});
	});

	it('collapses duplicate fact rows with the same fact-id in checklist workspace mode', async () => {
		const sqlite = new Database(domainStorePath);
		sqlite.prepare('insert into facts values (?, ?, ?, ?, ?, ?, ?)').run(
			'snapshot-latest:fact:4',
			'snapshot-latest',
			'fact-water',
			'G1-1',
			'Water storage duplicate',
			'facts/water-duplicate.xml',
			'<p>More detailed duplicate water fact</p>'
		);
		sqlite.prepare('insert into fact_links values (?, ?, ?, ?, ?, ?)').run(
			'snapshot-latest:fact-link:logical-duplicate',
			'snapshot-latest',
			'snapshot-latest:fact:4',
			'G1-1',
			'editorial_manual',
			'linked'
		);
		sqlite.prepare('insert into fact_links values (?, ?, ?, ?, ?, ?)').run(
			'snapshot-latest:fact-link:logical-duplicate-extra-usage',
			'snapshot-latest',
			'snapshot-latest:fact:4',
			'G1-2',
			'editorial_manual',
			'linked'
		);
		sqlite.close();

		const result = await loadChecklistEditorWorkspace(
			'checklist-default',
			'snapshot-latest:checklist:1:group:1:question:1'
		);

		expect(result.factWorkspace?.linkedFacts).toHaveLength(1);
		const linkedFact = result.factWorkspace?.linkedFacts[0];
		expect(linkedFact).toMatchObject({
			factId: 'fact-water'
		});
		expect(result.factWorkspace?.selectedFactEditor).toMatchObject({
			factRowId: linkedFact?.factRowId,
			title: linkedFact?.title
		});
	});

	it('saves standard-content changes directly and warns when targets are missing', async () => {
		const saved = await saveStandardContentDraft({
			blockId: 'id-glossary1',
			userId: 34,
			values: {
				title: 'Glossary revised',
				bodyHtml: '<section>Revised glossary</section>',
				targets: []
			},
			status: 'draft'
		});

		expect(saved.validation.status).toBe('warning');
		expect(saved.item?.title).toBe('Glossary revised');
		expect(saved.draft).toMatchObject({
			title: 'Glossary revised',
			status: 'published',
			validationStatus: 'warning',
			targets: []
		});

		const editor = await loadStandardContentEditor('id-glossary1', 34);
		expect(editor.draft).toMatchObject({
			title: 'Glossary revised',
			targets: [],
			status: 'published'
		});

		expect(editor.item).toMatchObject({
			title: 'Glossary revised',
			bodyHtml: '<section>Revised glossary</section>'
		});
	});

	it('builds checklist-editor validation for duplicate node ids and missing fact coverage', async () => {
		const sqlite = new Database(domainStorePath);
		sqlite.prepare('insert into questions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
			'snapshot-latest:checklist:1:group:2:question:2',
			'snapshot-latest',
			'snapshot-latest:checklist:1:group:2',
			'node-id-G1-1-2015-02-25',
			'',
			2,
			0,
			0,
			0,
			0,
			0,
			0
		);
		sqlite.prepare('insert into fact_links values (?, ?, ?, ?, ?, ?)').run(
			'snapshot-latest:fact-link:3',
			'snapshot-latest',
			'snapshot-latest:fact:3',
			'G2-1',
			'explicit_node_id',
			'unresolved'
		);
		sqlite.prepare('insert into standard_content_blocks values (?, ?, ?, ?, ?, ?, ?, ?)').run(
			'snapshot-latest:standard-content:4',
			'snapshot-latest',
			'id-missing-targets',
			'appendix',
			'Appendix without targets',
			'section',
			'standard-texts/appendix.xml',
			'<section>Appendix</section>'
		);
		sqlite.close();

		const checklistEditor = await loadChecklistEditor('checklist-default');
		const validation = await loadContentStudioValidation();

		expect(checklistEditor.tree?.groups).toHaveLength(2);
		expect(checklistEditor.validation.duplicateNodeIds).toEqual([
			expect.objectContaining({
				nodeId: 'node-id-G1-1-2015-02-25',
				occurrences: 2
			})
		]);
		expect(checklistEditor.validation.emptyQuestionTexts).toEqual([
			expect.objectContaining({
				nodeId: 'node-id-G1-1-2015-02-25'
			})
		]);
		expect(checklistEditor.validation.missingFactLinks.length).toBeGreaterThan(0);
		expect(checklistEditor.validation.unresolvedFactNodeIds).toEqual([
			expect.objectContaining({
				nodeId: 'node-id-G2-1-2015-02-25',
				linkStatuses: ['unresolved']
			})
		]);
		expect(checklistEditor.validation.readiness).toEqual({
			state: 'blocking',
			blockerCount: 3,
			warningCount: 1
		});

		expect(validation.validation.missingStandardTargets).toEqual([
			expect.objectContaining({
				blockId: 'id-missing-targets',
				contentType: 'appendix'
			})
		]);
	});

	it('creates a checklist question draft after an existing question', async () => {
		const created = await createChecklistQuestionDraft({
			checklistId: 'checklist-default',
			groupId: 'snapshot-latest:checklist:1:group:1',
			referenceQuestionId: 'snapshot-latest:checklist:1:group:1:question:1',
			position: 'after',
			userId: 77
		});

		expect(created.questionId).toBeTruthy();

		const tree = await loadContentStudioChecklistTree('checklist-default');
		expect(tree.tree?.groups[0]?.questions.map((question) => question.id)).toEqual([
			'snapshot-latest:checklist:1:group:1:question:1',
			created.questionId,
			'snapshot-latest:checklist:1:group:1:question:2'
		]);
		expect(tree.tree?.groups[0]?.questions[1]).toMatchObject({
			id: created.questionId,
			questionText: 'Ny fråga'
		});
		expect(tree.tree?.groups[0]?.questions[1]?.nodeId).toMatch(/^draft-question-/);
	});

	it('moves a checklist question draft down within its group', async () => {
		const moved = await moveChecklistQuestionDraft({
			checklistId: 'checklist-default',
			questionId: 'snapshot-latest:checklist:1:group:1:question:1',
			direction: 'down',
			userId: 77
		});

		expect(moved.questionId).toBe('snapshot-latest:checklist:1:group:1:question:1');

		const tree = await loadContentStudioChecklistTree('checklist-default');
		expect(tree.tree?.groups[0]?.questions.map((question) => question.id)).toEqual([
			'snapshot-latest:checklist:1:group:1:question:2',
			'snapshot-latest:checklist:1:group:1:question:1'
		]);
	});

	it('moves a created checklist question up without duplicating rows', async () => {
		const created = await createChecklistQuestionDraft({
			checklistId: 'checklist-default',
			groupId: 'snapshot-latest:checklist:1:group:1',
			referenceQuestionId: 'snapshot-latest:checklist:1:group:1:question:2',
			position: 'after',
			userId: 77
		});

		const moved = await moveChecklistQuestionDraft({
			checklistId: 'checklist-default',
			questionId: created.questionId,
			direction: 'up',
			userId: 77
		});

		expect(moved.questionId).toBe(created.questionId);

		const tree = await loadContentStudioChecklistTree('checklist-default');
		const questionIds = tree.tree?.groups[0]?.questions.map((question) => question.id) ?? [];

		expect(questionIds).toEqual([
			'snapshot-latest:checklist:1:group:1:question:1',
			created.questionId,
			'snapshot-latest:checklist:1:group:1:question:2'
		]);
		expect(new Set(questionIds).size).toBe(questionIds.length);
	});

	it('reorders checklist groups from a complete sibling list', async () => {
		const reordered = await reorderChecklistGroupsDraft({
			checklistId: 'checklist-default',
			groupIds: [
				'snapshot-latest:checklist:1:group:2',
				'snapshot-latest:checklist:1:group:1'
			],
			selectedNodeId: 'snapshot-latest:checklist:1:group:2',
			userId: 77
		});

		expect(reordered.selectedNodeId).toBe('snapshot-latest:checklist:1:group:2');

		const tree = await loadContentStudioChecklistTree('checklist-default');
		expect(tree.tree?.groups.map((group) => group.id)).toEqual([
			'snapshot-latest:checklist:1:group:2',
			'snapshot-latest:checklist:1:group:1'
		]);
	});

	it('reorders checklist questions from a complete sibling list', async () => {
		const reordered = await reorderChecklistQuestionsDraft({
			checklistId: 'checklist-default',
			groupId: 'snapshot-latest:checklist:1:group:1',
			questionIds: [
				'snapshot-latest:checklist:1:group:1:question:2',
				'snapshot-latest:checklist:1:group:1:question:1'
			],
			selectedNodeId: 'snapshot-latest:checklist:1:group:1:question:2',
			userId: 77
		});

		expect(reordered.selectedNodeId).toBe('snapshot-latest:checklist:1:group:1:question:2');

		const tree = await loadContentStudioChecklistTree('checklist-default');
		expect(tree.tree?.groups[0]?.questions.map((question) => question.id)).toEqual([
			'snapshot-latest:checklist:1:group:1:question:2',
			'snapshot-latest:checklist:1:group:1:question:1'
		]);
	});

	it('rejects partial checklist group reorder payloads', async () => {
		await expect(
			reorderChecklistGroupsDraft({
				checklistId: 'checklist-default',
				groupIds: ['snapshot-latest:checklist:1:group:2'],
				userId: 77
			})
		).rejects.toThrow('Gruppordningen matchar inte checklistans aktiva grupper.');

		const tree = await loadContentStudioChecklistTree('checklist-default');
		expect(tree.tree?.groups.map((group) => group.id)).toEqual([
			'snapshot-latest:checklist:1:group:1',
			'snapshot-latest:checklist:1:group:2'
		]);
	});

	it('rejects question reorder payloads containing questions from another group', async () => {
		await expect(
			reorderChecklistQuestionsDraft({
				checklistId: 'checklist-default',
				groupId: 'snapshot-latest:checklist:1:group:1',
				questionIds: [
					'snapshot-latest:checklist:1:group:1:question:1',
					'snapshot-latest:checklist:1:group:2:question:1'
				],
				userId: 77
			})
		).rejects.toThrow('Frågeordningen matchar inte gruppens aktiva frågor.');

		const tree = await loadContentStudioChecklistTree('checklist-default');
		expect(tree.tree?.groups[0]?.questions.map((question) => question.id)).toEqual([
			'snapshot-latest:checklist:1:group:1:question:1',
			'snapshot-latest:checklist:1:group:1:question:2'
		]);
	});

	it('archives a checklist question draft and removes it from the live tree', async () => {
		const archived = await archiveChecklistQuestionDraft({
			checklistId: 'checklist-default',
			questionId: 'snapshot-latest:checklist:1:group:1:question:2',
			userId: 77
		});

		expect(archived.groupId).toBe('snapshot-latest:checklist:1:group:1');

		const tree = await loadContentStudioChecklistTree('checklist-default');
		expect(tree.tree?.groups[0]?.questions.map((question) => question.id)).toEqual([
			'snapshot-latest:checklist:1:group:1:question:1'
		]);

		const sqlite = new Database(domainStorePath, { readonly: true });
		const archivedRow = sqlite
			.prepare('select id, question_text as questionText from archived_questions where id = ?')
			.get('snapshot-latest:checklist:1:group:1:question:2') as
			| { id: string; questionText: string }
			| undefined;
		sqlite.close();

		expect(archivedRow).toEqual({
			id: 'snapshot-latest:checklist:1:group:1:question:2',
			questionText: 'Are feed logs retained?'
		});
	});

	it('saves checklist group title and intro text changes', async () => {
		const saved = await saveChecklistGroupDraft({
			checklistId: 'checklist-default',
			groupId: 'snapshot-latest:checklist:1:group:1',
			userId: 77,
			values: {
				title: 'Environment updated',
				introText: 'Updated intro\n   text with   uneven spacing'
			}
		});

		expect(saved.groupId).toBe('snapshot-latest:checklist:1:group:1');

		const tree = await loadContentStudioChecklistTree('checklist-default');
		expect(tree.tree?.groups[0]).toMatchObject({
			id: 'snapshot-latest:checklist:1:group:1',
			title: 'Environment updated',
			introText: 'Updated intro text with uneven spacing'
		});
	});

	it('saves checklist question text and flag changes', async () => {
		const saved = await saveChecklistQuestionDraft({
			checklistId: 'checklist-default',
			questionId: 'snapshot-latest:checklist:1:group:2:question:1',
			userId: 77,
			values: {
				questionText: 'Are doors inspected every week?',
				flags: {
					cc: true,
					ccExtra: false,
					base: true,
					annualQuestion: false,
					newFlag: false,
					recommended: true
				}
			}
		});

		expect(saved.questionId).toBe('snapshot-latest:checklist:1:group:2:question:1');

		const tree = await loadContentStudioChecklistTree('checklist-default');
		expect(tree.tree?.groups[1]?.questions[0]).toMatchObject({
			id: 'snapshot-latest:checklist:1:group:2:question:1',
			questionText: 'Are doors inspected every week?',
			flags: {
				cc: true,
				ccExtra: false,
				base: true,
				annualQuestion: false,
				newFlag: false,
				recommended: true
			}
		});
	});

	it('loads content profile rules with catalog, group profiles, and question profiles', async () => {
		const rules = await loadContentStudioProfileRules();

		expect(rules.latestSnapshot?.id).toBe('snapshot-latest');
		expect(rules.profileCatalog).toEqual([
			{ profileKey: 'Har_byggnader', profileName: 'Har_byggnader', sectionTitle: 'Checklistor' },
			{ profileKey: 'Har_djur', profileName: 'Har_djur', sectionTitle: 'Checklistor' },
			{ profileKey: 'Har_grisar', profileName: 'Har_grisar', sectionTitle: 'Checklistor' },
			{ profileKey: 'Har_stall', profileName: 'Har_stall', sectionTitle: 'Checklistor' }
		]);
		expect(rules.checklists[0]).toMatchObject({
			id: 'checklist-default',
			title: 'Miljohusesyn',
			groups: expect.arrayContaining([
				expect.objectContaining({
					id: 'snapshot-latest:checklist:1:group:1',
					title: 'Environment',
					profiles: [{ profileKey: 'Har_djur', profileName: 'Har_djur' }],
					questions: [
						expect.objectContaining({
							id: 'snapshot-latest:checklist:1:group:1:question:1',
							groupProfiles: [{ profileKey: 'Har_djur', profileName: 'Har_djur' }],
							profiles: [{ profileKey: 'Har_grisar', profileName: 'Har_grisar' }]
						}),
						expect.objectContaining({
							id: 'snapshot-latest:checklist:1:group:1:question:2',
							groupProfiles: [{ profileKey: 'Har_djur', profileName: 'Har_djur' }],
							profiles: []
						})
					]
				})
			])
		});
	});

	it('adds and removes direct group profile rules from existing catalog entries', async () => {
		await addChecklistGroupProfileRule({
			groupId: 'snapshot-latest:checklist:1:group:1',
			profileKey: 'Har_byggnader'
		});
		await addChecklistGroupProfileRule({
			groupId: 'snapshot-latest:checklist:1:group:1',
			profileKey: 'Har_byggnader'
		});

		let rules = await loadContentStudioProfileRules();
		expect(rules.checklists[0]?.groups[0]?.profiles).toEqual([
			{ profileKey: 'Har_byggnader', profileName: 'Har_byggnader' },
			{ profileKey: 'Har_djur', profileName: 'Har_djur' }
		]);

		await removeChecklistGroupProfileRule({
			groupId: 'snapshot-latest:checklist:1:group:1',
			profileKey: 'Har_byggnader'
		});

		rules = await loadContentStudioProfileRules();
		expect(rules.checklists[0]?.groups[0]?.profiles).toEqual([
			{ profileKey: 'Har_djur', profileName: 'Har_djur' }
		]);
	});

	it('adds and removes direct question profile rules without changing group profiles', async () => {
		await addChecklistQuestionProfileRule({
			questionId: 'snapshot-latest:checklist:1:group:1:question:2',
			profileKey: 'Har_stall'
		});

		let rules = await loadContentStudioProfileRules();
		const question = rules.checklists[0]?.groups[0]?.questions[1];
		expect(question?.profiles).toEqual([{ profileKey: 'Har_stall', profileName: 'Har_stall' }]);
		expect(question?.groupProfiles).toEqual([{ profileKey: 'Har_djur', profileName: 'Har_djur' }]);

		await removeChecklistQuestionProfileRule({
			questionId: 'snapshot-latest:checklist:1:group:1:question:2',
			profileKey: 'Har_stall'
		});

		rules = await loadContentStudioProfileRules();
		expect(rules.checklists[0]?.groups[0]?.questions[1]?.profiles).toEqual([]);
		expect(rules.checklists[0]?.groups[0]?.profiles).toEqual([
			{ profileKey: 'Har_djur', profileName: 'Har_djur' }
		]);
	});

	it('rejects profile rule writes for missing catalog entries or targets', async () => {
		await expect(
			addChecklistGroupProfileRule({
				groupId: 'snapshot-latest:checklist:1:group:1',
				profileKey: 'Missing_profile'
			})
		).rejects.toThrow('Profilen hittades inte.');
		await expect(
			addChecklistQuestionProfileRule({
				questionId: 'missing-question',
				profileKey: 'Har_djur'
			})
		).rejects.toThrow('Frågan hittades inte.');
	});

	it('materializes the selected snapshot through the configured durable-store engine', async () => {
		const sqliteSync = vi.fn().mockResolvedValue('snapshot-latest');
		const postgresSync = vi.fn().mockResolvedValue('snapshot-postgres');

		vi.resetModules();
		vi.doMock('$lib/server/sync/importer-sync', () => ({
			syncDomainStoreSnapshot: sqliteSync,
			syncPostgresDomainStoreSnapshot: postgresSync
		}));

		try {
			const serviceModule = await import('$lib/server/services/content-studio');

			process.env.MHS_DOMAIN_STORE_ENGINE = 'sqlite';
			process.env.MHS_DOMAIN_STORE_SQLITE_PATH = domainStorePath;
			delete process.env.MHS_DOMAIN_STORE_POSTGRES_DSN;

			expect(await serviceModule.materializePublishedSnapshot('snapshot-latest')).toBe('snapshot-latest');
			expect(sqliteSync).toHaveBeenCalled();

			process.env.MHS_DOMAIN_STORE_ENGINE = 'postgres';
			process.env.MHS_DOMAIN_STORE_POSTGRES_DSN = 'postgres://proof-store';

			expect(await serviceModule.materializePublishedSnapshot('snapshot-postgres')).toBe('snapshot-postgres');
			expect(postgresSync).toHaveBeenCalled();
		} finally {
			vi.doUnmock('$lib/server/sync/importer-sync');
			vi.resetModules();
		}
	});
});

function seedDomainStore(sqlite: Database.Database) {
	insertSnapshot(sqlite, 'snapshot-old', 'Old Proof Store', '2026-05-18T08:00:00Z');
	insertSnapshot(sqlite, 'snapshot-latest', 'Proof Store', '2026-05-19T08:00:00Z');

	sqlite.prepare('insert into checklists values (?, ?, ?, ?, ?)').run(
		'snapshot-old:checklist:1',
		'snapshot-old',
		'checklist-old',
		'default',
		'Old checklist'
	);
	sqlite.prepare('insert into facts values (?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-old:fact:1',
		'snapshot-old',
		'fact-old',
		'OLD-1',
		'Old fact',
		'facts/old.xml',
		'<p>Old</p>'
	);
	sqlite.prepare('insert into standard_content_blocks values (?, ?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-old:standard-content:1',
		'snapshot-old',
		'id-old',
		'preface',
		'Old preface',
		'section',
		'standard-texts/old.xml',
		'<section>Old</section>'
	);

	sqlite.prepare('insert into checklists values (?, ?, ?, ?, ?)').run(
		'snapshot-latest:checklist:1',
		'snapshot-latest',
		'checklist-default',
		'default',
		'Miljohusesyn'
	);
	sqlite.prepare('insert into checklists values (?, ?, ?, ?, ?)').run(
		'snapshot-latest:checklist:2',
		'snapshot-latest',
		'checklist-energy',
		'energy',
		'Energy review'
	);

	for (const profileName of ['Har_byggnader', 'Har_djur', 'Har_grisar', 'Har_stall']) {
		sqlite.prepare('insert into profile_catalog values (?, ?, ?, ?, ?)').run(
			`snapshot-latest:profile:${profileName}`,
			'snapshot-latest',
			'Checklistor',
			profileName,
			profileName
		);
	}

	sqlite.prepare('insert into checklist_groups values (?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:checklist:1:group:1',
		'snapshot-latest',
		'snapshot-latest:checklist:1',
		'node-id-G1-2015-02-25',
		'Environment',
		'Intro text',
		1
	);
	sqlite.prepare('insert into checklist_groups values (?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:checklist:1:group:2',
		'snapshot-latest',
		'snapshot-latest:checklist:1',
		'node-id-G2-2015-02-25',
		'Buildings',
		'Building intro',
		2
	);
	sqlite.prepare('insert into checklist_groups values (?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:checklist:2:group:1',
		'snapshot-latest',
		'snapshot-latest:checklist:2',
		'node-id-E1-2015-02-25',
		'Energy',
		'Energy intro',
		1
	);

	sqlite.prepare('insert into checklist_group_profiles values (?, ?, ?, ?, ?)').run(
		'snapshot-latest:group-profile:1',
		'snapshot-latest',
		'snapshot-latest:checklist:1:group:1',
		'Har_djur',
		'Har_djur'
	);
	sqlite.prepare('insert into checklist_group_profiles values (?, ?, ?, ?, ?)').run(
		'snapshot-latest:group-profile:2',
		'snapshot-latest',
		'snapshot-latest:checklist:1:group:2',
		'Har_byggnader',
		'Har_byggnader'
	);

	sqlite.prepare('insert into questions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:checklist:1:group:1:question:1',
		'snapshot-latest',
		'snapshot-latest:checklist:1:group:1',
		'node-id-G1-1-2015-02-25',
		'Is the water supply documented?',
		1,
		1,
		0,
		1,
		0,
		0,
		1
	);
	sqlite.prepare('insert into questions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:checklist:1:group:1:question:2',
		'snapshot-latest',
		'snapshot-latest:checklist:1:group:1',
		'node-id-G1-2-2015-02-25',
		'Are feed logs retained?',
		2,
		0,
		0,
		0,
		0,
		0,
		0
	);
	sqlite.prepare('insert into questions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:checklist:1:group:2:question:1',
		'snapshot-latest',
		'snapshot-latest:checklist:1:group:2',
		'node-id-G2-1-2015-02-25',
		'Are doors inspected monthly?',
		1,
		0,
		1,
		0,
		0,
		1,
		0
	);
	sqlite.prepare('insert into questions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:checklist:2:group:1:question:1',
		'snapshot-latest',
		'snapshot-latest:checklist:2:group:1',
		'node-id-E1-1-2015-02-25',
		'Is the compressor serviced annually?',
		1,
		0,
		0,
		0,
		0,
		0,
		0
	);

	sqlite.prepare('insert into question_profiles values (?, ?, ?, ?, ?)').run(
		'snapshot-latest:question-profile:1',
		'snapshot-latest',
		'snapshot-latest:checklist:1:group:1:question:1',
		'Har_grisar',
		'Har_grisar'
	);
	sqlite.prepare('insert into question_profiles values (?, ?, ?, ?, ?)').run(
		'snapshot-latest:question-profile:2',
		'snapshot-latest',
		'snapshot-latest:checklist:1:group:2:question:1',
		'Har_stall',
		'Har_stall'
	);

	sqlite.prepare('insert into facts values (?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:fact:1',
		'snapshot-latest',
		'fact-water',
		'G1-1',
		'Water storage',
		'facts/water.xml',
		'<p>Water fact</p>'
	);
	sqlite.prepare('insert into facts values (?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:fact:2',
		'snapshot-latest',
		'fact-barn',
		'G2-1',
		'Barn safety',
		'facts/barn.xml',
		'<p>Barn fact</p>'
	);
	sqlite.prepare('insert into facts values (?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:fact:3',
		'snapshot-latest',
		'fact-machines',
		'M1-1',
		'Machine service',
		'facts/machines.xml',
		'<p>Machine fact</p>'
	);

	sqlite.prepare('insert into fact_links values (?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:fact-link:1',
		'snapshot-latest',
		'snapshot-latest:fact:1',
		'G1-1',
		'explicit_node_id',
		'linked'
	);
	sqlite.prepare('insert into fact_links values (?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:fact-link:2',
		'snapshot-latest',
		'snapshot-latest:fact:2',
		'G2-1',
		'explicit_node_id',
		'linked'
	);

	sqlite.prepare('insert into standard_content_blocks values (?, ?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:standard-content:1',
		'snapshot-latest',
		'id-preface1',
		'preface',
		'Preface',
		'section',
		'standard-texts/preface.xml',
		'<section>Preface</section>'
	);
	sqlite.prepare('insert into standard_content_blocks values (?, ?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:standard-content:2',
		'snapshot-latest',
		'id-glossary1',
		'glossary',
		'Glossary',
		'section',
		'standard-texts/glossary.xml',
		'<section>Glossary</section>'
	);
	sqlite.prepare('insert into standard_content_blocks values (?, ?, ?, ?, ?, ?, ?, ?)').run(
		'snapshot-latest:standard-content:3',
		'snapshot-latest',
		'id-regulation1',
		'regulation',
		'Regulation',
		'section',
		'standard-texts/regulation.xml',
		'<section>Regulation</section>'
	);

	sqlite.prepare('insert into standard_content_targets values (?, ?, ?, ?)').run(
		'snapshot-latest:standard-content:1:target:1',
		'snapshot-latest',
		'snapshot-latest:standard-content:1',
		'standard-texts/preface.xml#id-preface1'
	);
	sqlite.prepare('insert into standard_content_targets values (?, ?, ?, ?)').run(
		'snapshot-latest:standard-content:1:target:2',
		'snapshot-latest',
		'snapshot-latest:standard-content:1',
		'standard-texts/preface.xml#id-preface2'
	);
	sqlite.prepare('insert into standard_content_targets values (?, ?, ?, ?)').run(
		'snapshot-latest:standard-content:2:target:1',
		'snapshot-latest',
		'snapshot-latest:standard-content:2',
		'standard-texts/glossary.xml#id-glossary1'
	);
	sqlite.prepare('insert into standard_content_targets values (?, ?, ?, ?)').run(
		'snapshot-latest:standard-content:3:target:1',
		'snapshot-latest',
		'snapshot-latest:standard-content:3',
		'standard-texts/regulation.xml#id-regulation1'
	);

	sqlite.prepare('insert into editorial_drafts values (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
		'draft-fact-water',
		'snapshot-latest',
		'fact',
		'snapshot-latest:fact:1',
		'draft',
		11,
		11,
		'2026-05-19T09:00:00Z',
		'2026-05-19T09:30:00Z'
	);
	sqlite.prepare('insert into editorial_drafts values (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
		'draft-fact-barn',
		'snapshot-latest',
		'fact',
		'snapshot-latest:fact:2',
		'in_review',
		12,
		12,
		'2026-05-19T09:05:00Z',
		'2026-05-19T09:40:00Z'
	);
	sqlite.prepare('insert into editorial_drafts values (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
		'draft-preface',
		'snapshot-latest',
		'standard_content',
		'snapshot-latest:standard-content:1',
		'published',
		13,
		13,
		'2026-05-19T09:10:00Z',
		'2026-05-19T09:50:00Z'
	);

	sqlite.prepare('insert into editorial_draft_revisions values (?, ?, ?, ?, ?, ?, ?)').run(
		'draft-fact-water:rev:1',
		'draft-fact-water',
		1,
		'{"title":"Water storage"}',
		'valid',
		11,
		'2026-05-19T09:30:00Z'
	);
	sqlite.prepare('insert into editorial_draft_revisions values (?, ?, ?, ?, ?, ?, ?)').run(
		'draft-fact-barn:rev:1',
		'draft-fact-barn',
		1,
		'{"title":"Barn safety"}',
		'warning',
		12,
		'2026-05-19T09:40:00Z'
	);
	sqlite.prepare('insert into editorial_draft_revisions values (?, ?, ?, ?, ?, ?, ?)').run(
		'draft-preface:rev:1',
		'draft-preface',
		1,
		'{"title":"Preface"}',
		'valid',
		13,
		'2026-05-19T09:50:00Z'
	);

	sqlite.prepare('insert into editorial_review_requests values (?, ?, ?, ?, ?)').run(
		'review-fact-barn',
		'draft-fact-barn',
		12,
		'2026-05-19T09:41:00Z',
		'pending'
	);
}

function insertSnapshot(sqlite: Database.Database, id: string, sourceLabel: string, importedAt: string) {
	sqlite.prepare('insert into content_snapshots values (?, ?, ?, ?, ?)').run(
		id,
		sourceLabel,
		'xml_import',
		importedAt,
		'imported'
	);
}
