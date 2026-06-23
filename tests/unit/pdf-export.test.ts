import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	buildChecklistPublicationXml,
	buildCompletePublicationXml,
	buildUserPublicationXml,
	generateChecklistPdf,
	generateCompletePdf,
	generatePublicationPdf,
	generateUserPdf
} from '$lib/server/services/pdf-export';
import { saveAnswerState } from '$lib/server/services/answers';
import { createSeededDb, createTestDb } from './test-db';
import {
	appChecklistAssignments,
	appChecklists,
	appFacts,
	appQuestionFactLinks,
	appQuestionGroups,
	appQuestionProfiles,
	appQuestions,
	appSections,
	appUserAnimalTypes,
	appUsers
} from '$lib/server/db/schema';

describe('checklist pdf export', () => {
	it('builds legacy-shaped publication XML from the app database', async () => {
		const db = createSeededDb();
		const question = await db.query.appQuestions.findFirst();

		expect(question).toBeTruthy();

		await saveAnswerState(db, {
			userId: 1,
			questionId: question!.id,
			responseValue: 'no',
			comment: 'Need follow-up',
			dueDate: '2026-05-31'
		});

		const factId = Number(
			db
				.insert(appFacts)
				.values({
					factId: 'fact-1',
					nodeId: 'g1-1',
					title: 'Helpful fact',
					bodyHtml: '<p>Fact body</p>',
					snapshotKey: 'test-snapshot'
				})
				.run().lastInsertRowid
		);

		db.insert(appQuestionFactLinks)
			.values({
				questionId: question!.id,
				factId,
				nodeId: question!.nodeId,
				provenance: 'explicit'
			})
			.run();

		const publication = await buildChecklistPublicationXml(db, 'miljohusesyn-default', 1);

		expect(publication?.metadata.planId).toBe('app-checklist-plan-pdf-miljohusesyn-default-user-1');
		expect(publication?.metadata.publicationType).toBe('uidXYZ-plan');
		expect(publication?.metadata.userContext.operationTypes).toEqual(['common']);
		expect(publication?.metadata.warnings).toContain(
			'App-driven PDF export renders the legacy user plan PDF shape and includes only questions answered no.'
		);

		expect(publication?.userInfoXml).toContain('<operation qa-type="common" />');
		expect(publication?.checklistsXml).toContain('<prefix>G1</prefix>');
		expect(publication?.checklistsXml).toContain('<prefix>G1-1</prefix>');
		expect(publication?.checklistsXml).toContain('<answer value="no">');
		expect(publication?.checklistsXml).toContain('<y>2026-</y>');
		expect(publication?.checklistsXml).toContain('node-id-g1-1');
	});

	it('returns the renderer output paths when PDF generation succeeds', async () => {
		const db = createSeededDb();
		const tempRoot = path.join(process.cwd(), 'data', 'test-pdf-export');
		const pdfPath = path.join(tempRoot, 'out.pdf');
		const reportPath = path.join(tempRoot, 'report.json');

		await fs.mkdir(tempRoot, { recursive: true });
		await fs.writeFile(pdfPath, '%PDF-1.4\n', 'utf8');
		await fs.writeFile(reportPath, '{"status":"rendered"}', 'utf8');

		let rendererMode: string | undefined;
		const artifact = await generateChecklistPdf(db, 'miljohusesyn-default', 1, async (input) => {
			rendererMode = input.mode;
			return {
			ok: true,
			outputPdf: pdfPath,
			reportPath
			};
		});

		expect(artifact?.pdfPath).toBe(pdfPath);
		expect(artifact?.reportPath).toBe(reportPath);
		expect(artifact?.filename).toBe('miljohusesyn-default-plan.pdf');
		expect(rendererMode).toBe('plan');
	});

	it('exposes distinct complete, user, and user plan publication XML bundles', async () => {
		const db = createSeededDb();

		const completePublication = await buildCompletePublicationXml(db, 'miljohusesyn-default');
		const userPublication = await buildUserPublicationXml(db, 'miljohusesyn-default', 1);
		const actionPublication = await buildChecklistPublicationXml(db, 'miljohusesyn-default', 1);

		expect(completePublication?.metadata.publicationType).toBe('uid0');
		expect(completePublication?.metadata.planId).toBe('app-complete-pdf-miljohusesyn-default');
		expect(userPublication?.metadata.publicationType).toBe('uidXYZ');
		expect(userPublication?.metadata.planId).toBe('app-user-pdf-miljohusesyn-default-user-1');
		expect(actionPublication?.metadata.publicationType).toBe('uidXYZ-plan');
		expect(
			completePublication?.metadata.warnings.some((warning) =>
				warning.includes('omits legacy standard-content sections')
			)
		).toBe(true);
		expect(
			userPublication?.metadata.warnings.some((warning) =>
				warning.includes('omits legacy standard-content sections')
			)
		).toBe(true);
		expect(
			actionPublication?.metadata.warnings.some((warning) =>
				warning.includes('fact coverage is not yet at legacy parity')
			)
		).toBe(true);
	});

	it('passes full render mode for complete and user PDF methods', async () => {
		const db = createSeededDb();
		const tempRoot = path.join(process.cwd(), 'data', 'test-pdf-export-full');
		const pdfPath = path.join(tempRoot, 'out.pdf');
		const reportPath = path.join(tempRoot, 'report.json');
		const modes: string[] = [];

		await fs.mkdir(tempRoot, { recursive: true });
		await fs.writeFile(pdfPath, '%PDF-1.4\n', 'utf8');
		await fs.writeFile(reportPath, '{"status":"rendered"}', 'utf8');

		const renderer = async (input: { mode: string }) => {
			modes.push(input.mode);
			return {
				ok: true as const,
				outputPdf: pdfPath,
				reportPath
			};
		};

		const completeArtifact = await generateCompletePdf(db, 'miljohusesyn-default', 1, renderer);
		const userArtifact = await generateUserPdf(db, 'miljohusesyn-default', 1, renderer);

		expect(completeArtifact?.filename).toBe('miljohusesyn-default-complete.pdf');
		expect(userArtifact?.filename).toBe('miljohusesyn-default-user.pdf');
		expect(modes).toEqual(['full', 'full']);
	});

	it('routes publication kinds to the expected artifact variant', async () => {
		const db = createSeededDb();
		const tempRoot = path.join(process.cwd(), 'data', 'test-pdf-export-routing');
		const pdfPath = path.join(tempRoot, 'out.pdf');
		const reportPath = path.join(tempRoot, 'report.json');
		const modes: string[] = [];

		await fs.mkdir(tempRoot, { recursive: true });
		await fs.writeFile(pdfPath, '%PDF-1.4\n', 'utf8');
		await fs.writeFile(reportPath, '{"status":"rendered"}', 'utf8');

		const renderer = async (input: { mode: string }) => {
			modes.push(input.mode);
			return {
				ok: true as const,
				outputPdf: pdfPath,
				reportPath
			};
		};

		const planArtifact = await generatePublicationPdf(db, 'miljohusesyn-default', 1, 'plan', renderer);
		const userArtifact = await generatePublicationPdf(db, 'miljohusesyn-default', 1, 'user-full', renderer);
		const completeArtifact = await generatePublicationPdf(db, 'miljohusesyn-default', 1, 'complete', renderer);

		expect(planArtifact?.filename).toBe('miljohusesyn-default-plan.pdf');
		expect(userArtifact?.filename).toBe('miljohusesyn-default-user.pdf');
		expect(completeArtifact?.filename).toBe('miljohusesyn-default-complete.pdf');
		expect(modes).toEqual(['plan', 'full', 'full']);
	});

	it('filters user PDF content with the same visibility rules as the checklist UI', async () => {
		const db = createTestDb();
		const checklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'miljohusesyn-filtered',
					title: 'Filtered Checklist',
					variantKey: 'default',
					snapshotKey: 'test-snapshot'
				})
				.run().lastInsertRowid
		);
		const sectionId = Number(
			db
				.insert(appSections)
				.values({
					checklistId,
					nodeId: 'sec-animals',
					prefix: 'D1',
					title: 'Animals',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const groupId = Number(
			db
				.insert(appQuestionGroups)
				.values({
					sectionId,
					nodeId: 'sec-animals:group',
					prefix: 'D1',
					title: 'Animal group',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const cattleQuestionId = Number(
			db
				.insert(appQuestions)
				.values({
					groupId,
					nodeId: 'q-cattle',
					prefix: 'D1.1',
					questionText: 'Galler notkreatur och kor i stallet.',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const pigQuestionId = Number(
			db
				.insert(appQuestions)
				.values({
					groupId,
					nodeId: 'q-pigs',
					prefix: 'D1.2',
					questionText: 'Galler grisar och grisstallar.',
					sortOrder: 2
				})
				.run().lastInsertRowid
		);
		db.insert(appQuestionProfiles)
			.values([
				{ questionId: cattleQuestionId, profileKey: 'Har_notkreatur', profileName: 'Har notkreatur' },
				{ questionId: pigQuestionId, profileKey: 'Har_grisar', profileName: 'Har grisar' }
			])
			.run();

		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'animals-filter@miljohusesyn.local',
					username: 'animals-filter',
					passwordHash: 'test-hash',
					displayName: 'animals-filter'
				})
				.run().lastInsertRowid
		);
		db.insert(appChecklistAssignments).values({ userId, checklistId }).run();
		db.insert(appUserAnimalTypes)
			.values({ userId, animalKey: 'cattle', animalName: 'Cattle', amount: 12 })
			.run();

		const publication = await buildChecklistPublicationXml(db, 'miljohusesyn-filtered', userId);

		expect(publication?.checklistsXml).toContain('node-id-q-cattle');
		expect(publication?.checklistsXml).not.toContain('node-id-q-pigs');
	});

	it('builds user exports across all assigned checklists, not only the current checklist page', async () => {
		const db = createTestDb();
		const primaryChecklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'miljohusesyn-primary',
					title: 'Primary Checklist',
					variantKey: 'default',
					snapshotKey: 'test-snapshot'
				})
				.run().lastInsertRowid
		);
		const secondaryChecklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'miljohusesyn-secondary',
					title: 'Secondary Checklist',
					variantKey: 'default',
					snapshotKey: 'test-snapshot'
				})
				.run().lastInsertRowid
		);

		const primarySectionId = Number(
			db
				.insert(appSections)
				.values({
					checklistId: primaryChecklistId,
					nodeId: 'primary-section',
					prefix: 'P1',
					title: 'Primary Section',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const secondarySectionId = Number(
			db
				.insert(appSections)
				.values({
					checklistId: secondaryChecklistId,
					nodeId: 'secondary-section',
					prefix: 'S1',
					title: 'Secondary Section',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);

		const primaryGroupId = Number(
			db
				.insert(appQuestionGroups)
				.values({
					sectionId: primarySectionId,
					nodeId: 'primary-group',
					prefix: 'P1',
					title: 'Primary Group',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const secondaryGroupId = Number(
			db
				.insert(appQuestionGroups)
				.values({
					sectionId: secondarySectionId,
					nodeId: 'secondary-group',
					prefix: 'S1',
					title: 'Secondary Group',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);

		const primaryQuestionId = Number(
			db
				.insert(appQuestions)
				.values({
					groupId: primaryGroupId,
					nodeId: 'primary-question',
					prefix: 'P1.1',
					questionText: 'Primary question',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const secondaryQuestionId = Number(
			db
				.insert(appQuestions)
				.values({
					groupId: secondaryGroupId,
					nodeId: 'secondary-question',
					prefix: 'S1.1',
					questionText: 'Secondary question',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);

		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'multi-export@miljohusesyn.local',
					username: 'multi-export',
					passwordHash: 'test-hash',
					displayName: 'Multi Export User'
				})
				.run().lastInsertRowid
		);
		db.insert(appChecklistAssignments)
			.values([
				{ userId, checklistId: primaryChecklistId },
				{ userId, checklistId: secondaryChecklistId }
			])
			.run();

		await saveAnswerState(db, {
			userId,
			questionId: primaryQuestionId,
			responseValue: 'no',
			comment: '',
			dueDate: null
		});
		await saveAnswerState(db, {
			userId,
			questionId: secondaryQuestionId,
			responseValue: 'no',
			comment: '',
			dueDate: null
		});

		const userPublication = await buildUserPublicationXml(db, 'miljohusesyn-primary', userId);
		const actionPublication = await buildChecklistPublicationXml(db, 'miljohusesyn-primary', userId);

		expect(userPublication?.metadata.userContext.checklistRefs).toEqual([
			'miljohusesyn-primary',
			'miljohusesyn-secondary'
		]);
		expect(userPublication?.metadata.userContext.operationTypes).toEqual(['common']);
		expect(userPublication?.checklistsXml).toContain('Primary Checklist');
		expect(userPublication?.checklistsXml).toContain('Secondary Checklist');
		expect(actionPublication?.checklistsXml).toContain('Primary Checklist');
		expect(actionPublication?.checklistsXml).toContain('Secondary Checklist');
	});

	it('repairs malformed exported prefixes to legacy-style sequential display prefixes', async () => {
		const db = createTestDb();
		db.insert(appUsers)
			.values({
				id: 1,
				email: 'pdf-prefix@miljohusesyn.local',
				username: 'pdf-prefix',
				passwordHash: 'test-hash',
				displayName: 'PDF Prefix User'
			})
			.run();
		const checklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'miljohusesyn-a',
					title: 'Arbetsmiljö',
					variantKey: 'default',
					snapshotKey: 'test-snapshot'
				})
				.run().lastInsertRowid
		);
		const sectionId = Number(
			db
				.insert(appSections)
				.values({
					checklistId,
					nodeId: 'node-id-A-216679-2015-04-20-0200',
					prefix: 'A-216679',
					title: 'Systematiskt arbetsmiljöarbete',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const groupId = Number(
			db
				.insert(appQuestionGroups)
				.values({
					sectionId,
					nodeId: 'group-a1',
					prefix: 'A-216679',
					title: 'Systematiskt arbetsmiljöarbete',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);

		db.insert(appQuestions)
			.values([
				{
					groupId,
					nodeId: 'node-id-A-86757-2021-01-04T190816191-0100',
					prefix: 'A-86757',
					questionText: 'Genomförs kartläggning?',
					sortOrder: 1
				},
				{
					groupId,
					nodeId: 'node-id-A1-2-2015-04-20-0200',
					prefix: 'A1-2',
					questionText: 'Upprättas en åtgärdsplan?',
					sortOrder: 2
				}
			])
			.run();

		const publication = await buildCompletePublicationXml(db, 'miljohusesyn-a');

		expect(publication?.checklistsXml).toContain('<prefix>A1</prefix>');
		expect(publication?.checklistsXml).toContain('<prefix>A1-1</prefix>');
		expect(publication?.checklistsXml).toContain('<prefix>A1-2</prefix>');
		expect(publication?.checklistsXml).not.toContain('<prefix>A-216679</prefix>');
		expect(publication?.checklistsXml).not.toContain('<prefix>A-86757</prefix>');
	});
});
