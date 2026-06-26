import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import {
	getChecklistList,
	getChecklistOverview,
	getChecklistSectionDetail
} from '$lib/server/services/checklists';
import { createSeededDb, createTestDb } from './test-db';
import {
	appChecklistAssignments,
	appChecklists,
	appProfileCatalog,
	appQuestionGroups,
	appQuestionProfiles,
	appQuestions,
	appSectionProfiles,
	appSections,
	appUserActivities,
	appUserAnimalTypes,
	appUsers,
	appUserSettings
} from '$lib/server/db/schema';

const originalRuntimeDbEngine = process.env.APP_DB_ENGINE;
const originalRuntimePostgresDsn = process.env.APP_DB_POSTGRES_DSN;

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

describe('checklist services', () => {
	it('returns the demo user checklist list', async () => {
		const seededDb = createSeededDb();
		const data = await getChecklistList(seededDb, 1);

		expect(data.items.length).toBeGreaterThan(0);
		expect(data.items[0]?.title).toBe('Miljöhusesyn 2026');
	});

	it('returns section progress for one checklist overview', async () => {
		const seededDb = createSeededDb();
		const firstChecklist = (await getChecklistList(seededDb, 1)).items[0];
		const data = firstChecklist ? await getChecklistOverview(seededDb, firstChecklist.slug, 1) : null;

		expect(data?.sections.length).toBeGreaterThan(0);
		expect(data?.sections[0]?.totalQuestions).toBeGreaterThan(0);
	});

	it('does not expose checklist details to an unassigned user', async () => {
		const seededDb = createSeededDb();
		const data = await getChecklistOverview(seededDb, 'miljohusesyn-default', 999);

		expect(data).toBeNull();
	});

	it('filters sections and questions by legacy-style profile applicability', async () => {
		const fixture = createVisibilityFixtureDb();
		const { db, demoUserId, animalUserId, mixedUserId } = fixture;

		const demoOverview = await getChecklistOverview(db, 'miljohusesyn-filtered', demoUserId);
		const animalOverview = await getChecklistOverview(db, 'miljohusesyn-filtered', animalUserId);
		const mixedOverview = await getChecklistOverview(db, 'miljohusesyn-filtered', mixedUserId);

		expect(demoOverview?.sections.map((section) => section.nodeId)).toEqual([
			'sec-general',
			'sec-obligation'
		]);
		expect(animalOverview?.sections.map((section) => section.nodeId)).toEqual([
			'sec-general',
			'sec-animals'
		]);
		expect(mixedOverview?.sections.map((section) => section.nodeId)).toEqual([
			'sec-general',
			'sec-animals'
		]);

		const demoSection = await getChecklistSectionDetail(
			db,
			'miljohusesyn-filtered',
			'sec-general',
			demoUserId
		);
		const demoObligationSection = await getChecklistSectionDetail(
			db,
			'miljohusesyn-filtered',
			'sec-obligation',
			demoUserId
		);
		const animalSection = await getChecklistSectionDetail(
			db,
			'miljohusesyn-filtered',
			'sec-animals',
			animalUserId
		);
		const mixedSection = await getChecklistSectionDetail(
			db,
			'miljohusesyn-filtered',
			'sec-animals',
			mixedUserId
		);

		expect(demoSection?.groups[0]?.questions.map((question) => question.nodeId)).toEqual(['q-general']);
		expect(demoObligationSection?.groups[0]?.questions.map((question) => question.nodeId)).toEqual([
			'q-obligation'
		]);
		expect(animalSection?.groups[0]?.questions.map((question) => question.nodeId)).toEqual([
			'q-cattle'
		]);
		expect(mixedSection?.groups[0]?.questions.map((question) => question.nodeId)).toEqual(['q-pigs']);
	});

	it('treats trädgårdsföretag / potatisodlare as odling for checklist visibility', async () => {
		const fixture = createVisibilityFixtureDb();
		const { db } = fixture;
		const growerUserId = insertUser(db, 'grower-filter', 'grower-filter@miljohusesyn.local');
		const checklistId = db
			.select({ id: appChecklists.id })
			.from(appChecklists)
			.where(eq(appChecklists.slug, 'miljohusesyn-filtered'))
			.get()?.id;

		if (!checklistId) {
			throw new Error('Expected filtered checklist fixture to exist');
		}

		db.insert(appChecklistAssignments).values({ userId: growerUserId, checklistId }).run();
		db.insert(appUserActivities)
			.values({
				userId: growerUserId,
				activityName: 'Tradgardsforetag / Potatisodlare',
				certified: 1
			})
			.run();

		const overview = await getChecklistOverview(db, 'miljohusesyn-filtered', growerUserId);
		expect(overview?.sections.map((section) => section.nodeId)).toContain('sec-general');
		expect(overview?.sections.map((section) => section.nodeId)).toContain('sec-odling');
	});

	it('repairs malformed imported question prefixes from the group order on section pages', async () => {
		const db = createTestDb();
		const checklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'miljohusesyn-prefix-fallback',
					title: 'Prefix Fallback',
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
					nodeId: 'node-id-V20-2015-04-20-0200',
					prefix: 'V20',
					title: 'Fornlamningar',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const groupId = Number(
			db
				.insert(appQuestionGroups)
				.values({
					sectionId,
					nodeId: 'node-id-V20-2015-04-20-0200:group',
					prefix: 'V20',
					title: 'Fornlamningar',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const userId = insertUser(db, 'prefix-user', 'prefix-user@miljohusesyn.local');

		db.insert(appChecklistAssignments).values({ userId, checklistId }).run();
		db.insert(appQuestions)
			.values([
				{
					groupId,
					nodeId: 'node-id-V20-1-2015-04-20-0200',
					prefix: 'V20-1',
					questionText: 'Question 1',
					sortOrder: 1,
					newFlag: true
				},
				{
					groupId,
					nodeId: 'node-id-V20-2-2015-04-20-0200',
					prefix: 'V20-2',
					questionText: 'Question 2',
					sortOrder: 2
				},
				{
					groupId,
					nodeId: 'node-id-V-427216-2017-03-30T154231545-0200',
					prefix: 'V-427216',
					questionText: 'Question 3',
					sortOrder: 3
				}
			])
			.run();

		const detail = await getChecklistSectionDetail(
			db,
			'miljohusesyn-prefix-fallback',
			'node-id-V20-2015-04-20-0200',
			userId
		);

		expect(detail?.groups[0]?.questions.map((question) => question.prefix)).toEqual([
			'V20-1',
			'V20-2',
			'V20-3'
		]);
		expect(detail?.groups[0]?.questions[0]?.newFlag).toBe(true);
	});

	it('repairs malformed imported group prefixes on section pages', async () => {
		const db = createTestDb();
		const checklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'miljohusesyn-group-prefix-fallback',
					title: 'Group Prefix Fallback',
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
					nodeId: 'node-id-A-216679-2020-12-04T155044127-0100',
					prefix: 'A-216679',
					title: 'Systematiskt arbetsmiljoarbete',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const groupId = Number(
			db
				.insert(appQuestionGroups)
				.values({
					sectionId,
					nodeId: 'node-id-A-216679-2020-12-04T155044127-0100:group',
					prefix: 'A-216679',
					title: 'Systematiskt arbetsmiljoarbete',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const userId = insertUser(db, 'group-prefix-user', 'group-prefix-user@miljohusesyn.local');

		db.insert(appChecklistAssignments).values({ userId, checklistId }).run();
		db.insert(appQuestions)
			.values([
				{
					groupId,
					nodeId: 'node-id-A-86757-2021-01-04T190816191-0100',
					prefix: 'A-86757',
					questionText: 'Question 1',
					sortOrder: 1
				},
				{
					groupId,
					nodeId: 'node-id-A1-2-2015-04-20-0200',
					prefix: 'A1-2',
					questionText: 'Question 2',
					sortOrder: 2
				},
				{
					groupId,
					nodeId: 'node-id-A-606547-2016-02-02T131851424-0100',
					prefix: 'A-606547',
					questionText: 'Question 3',
					sortOrder: 3
				},
				{
					groupId,
					nodeId: 'node-id-A1-3-2015-04-20-0200',
					prefix: 'A1-3',
					questionText: 'Question 4',
					sortOrder: 4
				},
				{
					groupId,
					nodeId: 'node-id-A1-4-2015-04-20-0200',
					prefix: 'A1-4',
					questionText: 'Question 5',
					sortOrder: 5
				}
			])
			.run();

		const detail = await getChecklistSectionDetail(
			db,
			'miljohusesyn-group-prefix-fallback',
			'node-id-A-216679-2020-12-04T155044127-0100',
			userId
		);

		expect(detail?.groups[0]?.prefix).toBe('A1');
		expect(detail?.groups[0]?.questions.map((question) => question.prefix)).toEqual([
			'A1-1',
			'A1-2',
			'A1-3',
			'A1-4',
			'A1-5'
		]);
	});

	it('keeps composite area tabs scoped to their checklist bundle instead of mixing same-letter sections', async () => {
		const db = createTestDb();
		const userId = insertUser(db, 'composite-user', 'composite-user@miljohusesyn.local');

		const gChecklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'miljohusesyn-g',
					title: 'Allmanna Gardskrav',
					variantKey: 'default',
					snapshotKey: 'test-snapshot'
				})
				.run().lastInsertRowid
		);
		const vChecklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'miljohusesyn-v',
					title: 'Vaxtodling',
					variantKey: 'default',
					snapshotKey: 'test-snapshot'
				})
				.run().lastInsertRowid
		);

		const crossAreaSectionId = Number(
			db
				.insert(appSections)
				.values({
					checklistId: gChecklistId,
					nodeId: 'sec-cross-v20',
					prefix: 'V20',
					title: 'Cross area section',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const actualVSectionId = Number(
			db
				.insert(appSections)
				.values({
					checklistId: vChecklistId,
					nodeId: 'sec-v1',
					prefix: 'V1',
					title: 'Actual V section',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);

		const crossAreaGroupId = Number(
			db
				.insert(appQuestionGroups)
				.values({
					sectionId: crossAreaSectionId,
					nodeId: 'sec-cross-v20:group',
					prefix: 'V20',
					title: 'Fornlamningar',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const actualVGroupId = Number(
			db
				.insert(appQuestionGroups)
				.values({
					sectionId: actualVSectionId,
					nodeId: 'sec-v1:group',
					prefix: 'V1',
					title: 'Registrering',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);

		db.insert(appQuestions)
			.values([
				{
					groupId: crossAreaGroupId,
					nodeId: 'q-cross-v20-1',
					prefix: 'V20-1',
					questionText: 'Cross area question',
					sortOrder: 1
				},
				{
					groupId: actualVGroupId,
					nodeId: 'q-v1-1',
					prefix: 'V1-1',
					questionText: 'Actual V question',
					sortOrder: 1
				}
			])
			.run();

		db.insert(appChecklistAssignments)
			.values([
				{ userId, checklistId: gChecklistId },
				{ userId, checklistId: vChecklistId }
			])
			.run();

		const detail = await getChecklistSectionDetail(db, 'miljohusesyn', 'sec-v1', userId);

		expect(detail?.section.title).toBe('Växtodling');
		expect(detail?.groups.map((group) => group.prefix)).toEqual(['V1']);
		expect(detail?.groups.map((group) => group.title)).toEqual(['Registrering']);
	});

	it('maps composite filter links by area when switching between grundvillkor and nya fragor', async () => {
		const db = createTestDb();
		const userId = insertUser(db, 'composite-filter-user', 'composite-filter-user@miljohusesyn.local');

		const gChecklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'miljohusesyn-g',
					title: 'Allmanna Gardskrav',
					variantKey: 'default',
					snapshotKey: 'test-snapshot'
				})
				.run().lastInsertRowid
		);

		const ccSectionId = Number(
			db
				.insert(appSections)
				.values({
					checklistId: gChecklistId,
					nodeId: 'sec-cc-g',
					prefix: 'G1',
					title: 'CC section',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const newSectionId = Number(
			db
				.insert(appSections)
				.values({
					checklistId: gChecklistId,
					nodeId: 'sec-new-g',
					prefix: 'G2',
					title: 'New section',
					sortOrder: 2
				})
				.run().lastInsertRowid
		);

		const ccGroupId = Number(
			db
				.insert(appQuestionGroups)
				.values({
					sectionId: ccSectionId,
					nodeId: 'sec-cc-g:group',
					prefix: 'G1',
					title: 'CC group',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const newGroupId = Number(
			db
				.insert(appQuestionGroups)
				.values({
					sectionId: newSectionId,
					nodeId: 'sec-new-g:group',
					prefix: 'G2',
					title: 'New group',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);

		db.insert(appQuestions)
			.values([
				{
					groupId: ccGroupId,
					nodeId: 'q-cc-g-1',
					prefix: 'G1-1',
					questionText: 'CC question',
					sortOrder: 1,
					cc: true
				},
				{
					groupId: newGroupId,
					nodeId: 'q-new-g-1',
					prefix: 'G2-1',
					questionText: 'New question',
					sortOrder: 1,
					newFlag: true
				}
			])
			.run();

		db.insert(appChecklistAssignments).values({ userId, checklistId: gChecklistId }).run();

		const detail = await getChecklistSectionDetail(db, 'grundvillkor', 'sec-cc-g', userId);
		const nyaFragorFilter = detail?.filters.find((filter) => filter.slug === 'nya-fragor');

		expect(nyaFragorFilter?.sectionId).toBe('sec-new-g');
		expect(nyaFragorFilter?.sectionId).not.toBe('sec-cc-g');
	});
});

function createVisibilityFixtureDb() {
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
	const generalSectionId = Number(
		db
			.insert(appSections)
			.values({
				checklistId,
				nodeId: 'sec-general',
				prefix: 'G1',
				title: 'General',
				sortOrder: 1
			})
			.run().lastInsertRowid
	);
	const animalSectionId = Number(
		db
			.insert(appSections)
			.values({
				checklistId,
				nodeId: 'sec-animals',
				prefix: 'D1',
				title: 'Animals',
				sortOrder: 2
			})
			.run().lastInsertRowid
	);
	const obligationSectionId = Number(
		db
			.insert(appSections)
			.values({
				checklistId,
				nodeId: 'sec-obligation',
				prefix: 'G2',
				title: 'Obligation',
				sortOrder: 3
			})
			.run().lastInsertRowid
	);
	const odlingSectionId = Number(
		db
			.insert(appSections)
			.values({
				checklistId,
				nodeId: 'sec-odling',
				prefix: 'V1',
				title: 'Odling',
				sortOrder: 4
			})
			.run().lastInsertRowid
	);

	db.insert(appSectionProfiles)
		.values([
			{
				sectionId: animalSectionId,
				profileKey: 'Har_djur',
				profileName: 'Har djur'
			},
			{
				sectionId: obligationSectionId,
				profileKey: 'Anmalningspliktig',
				profileName: 'Anmalningspliktig'
			},
			{
				sectionId: odlingSectionId,
				profileKey: 'Odling',
				profileName: 'Odling'
			}
		])
		.run();

	db.insert(appProfileCatalog)
		.values({
			sectionTitle: 'Anmalningsplikt',
			profileKey: 'Anmalningspliktig',
			profileName: 'Anmalningspliktig'
		})
		.run();

	const generalGroupId = Number(
		db
			.insert(appQuestionGroups)
			.values({
				sectionId: generalSectionId,
				nodeId: 'sec-general:group',
				prefix: 'G1',
				title: 'General group',
				sortOrder: 1
			})
			.run().lastInsertRowid
	);
	const animalGroupId = Number(
		db
			.insert(appQuestionGroups)
			.values({
				sectionId: animalSectionId,
				nodeId: 'sec-animals:group',
				prefix: 'D1',
				title: 'Animal group',
				sortOrder: 1
			})
			.run().lastInsertRowid
	);
	const obligationGroupId = Number(
		db
			.insert(appQuestionGroups)
			.values({
				sectionId: obligationSectionId,
				nodeId: 'sec-obligation:group',
				prefix: 'G2',
				title: 'Obligation group',
				sortOrder: 1
			})
			.run().lastInsertRowid
	);
	const odlingGroupId = Number(
		db
			.insert(appQuestionGroups)
			.values({
				sectionId: odlingSectionId,
				nodeId: 'sec-odling:group',
				prefix: 'V1',
				title: 'Odling group',
				sortOrder: 1
			})
			.run().lastInsertRowid
	);

	const generalQuestionId = Number(
		db
			.insert(appQuestions)
			.values({
				groupId: generalGroupId,
				nodeId: 'q-general',
				prefix: 'G1.1',
				questionText: 'All users can see this question.',
				sortOrder: 1
			})
			.run().lastInsertRowid
	);
	const cattleQuestionId = Number(
		db
			.insert(appQuestions)
			.values({
				groupId: animalGroupId,
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
				groupId: animalGroupId,
				nodeId: 'q-pigs',
				prefix: 'D1.2',
				questionText: 'Galler grisar och grisstallar.',
				sortOrder: 2
			})
			.run().lastInsertRowid
	);
	db.insert(appQuestions)
		.values({
			groupId: obligationGroupId,
			nodeId: 'q-obligation',
			prefix: 'G2.1',
			questionText: 'Galler anmalningspliktiga verksamheter.',
			sortOrder: 1
		})
		.run();
	db.insert(appQuestions)
		.values({
			groupId: odlingGroupId,
			nodeId: 'q-odling',
			prefix: 'V1.1',
			questionText: 'Galler odling och vaxtodling.',
			sortOrder: 1
		})
		.run();

	db.insert(appQuestionProfiles)
		.values([
			{
				questionId: cattleQuestionId,
				profileKey: 'Har_notkreatur',
				profileName: 'Har notkreatur'
			},
			{
				questionId: pigQuestionId,
				profileKey: 'Har_grisar',
				profileName: 'Har grisar'
			}
		])
		.run();

	const demoUserId = insertUser(db, 'demo-filter', 'demo-filter@miljohusesyn.local');
	const animalUserId = insertUser(db, 'animals-filter', 'animals-filter@miljohusesyn.local');
	const mixedUserId = insertUser(db, 'mixed-filter', 'mixed-filter@miljohusesyn.local');

	db.insert(appChecklistAssignments)
		.values([
			{ userId: demoUserId, checklistId },
			{ userId: animalUserId, checklistId },
			{ userId: mixedUserId, checklistId }
		])
		.run();

	db.insert(appUserSettings)
		.values([
			{ userId: demoUserId, key: 'RQ1', value: 'true' },
			{ userId: demoUserId, key: 'Anmalningsplikt', value: 'true' }
		])
		.run();
	db.insert(appUserAnimalTypes)
		.values([
			{ userId: animalUserId, animalKey: 'cattle', animalName: 'Cattle', amount: 12 },
			{ userId: mixedUserId, animalKey: 'pigs', animalName: 'Pigs', amount: 120 }
		])
		.run();

	return { db, demoUserId, animalUserId, mixedUserId };
}

function insertUser(db: ReturnType<typeof createSeededDb>, username: string, email: string) {
	return Number(
		db
			.insert(appUsers)
			.values({
				email,
				username,
				passwordHash: 'test-hash',
				displayName: username
			})
			.run().lastInsertRowid
	);
}
