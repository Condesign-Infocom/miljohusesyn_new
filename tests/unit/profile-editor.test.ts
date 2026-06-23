import { and, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	buildChecklistSlugSet,
	createBlankEditableProfileInput,
	deriveProfileNames,
	loadEditableProfile,
	saveEditableProfile
} from '$lib/server/services/profile-editor';
import {
	appChecklists,
	appProfileUpdateEvents,
	appUserActivities,
	appUserAnimalTypes,
	appUserSettings,
	appUsers
} from '$lib/server/db/schema';
import { createTestDb } from './test-db';

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

describe('profile editor', () => {
	it('saves raw profile inputs and regenerates derived profiles and checklist assignments', async () => {
		const db = createTestDb();

		for (const slug of ['miljohusesyn-a', 'miljohusesyn-g', 'miljohusesyn-d', 'miljohusesyn-v']) {
			db.insert(appChecklists)
				.values({
					slug,
					title: slug,
					variantKey: 'default',
					snapshotKey: 'import-snapshot'
				})
				.run();
		}

		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'profile@miljohusesyn.local',
					username: 'profile-user',
					passwordHash: 'hash',
					displayName: 'Profile User'
				})
				.run().lastInsertRowid
		);

		const input = createBlankEditableProfileInput();
		input.displayName = 'Gard Demo';
		input.phone = '070-123 45 67';
		input.companyName = 'Gard Demo AB';
		input.companyOrgNum = '559000-1234';
		input.companyAddress1 = 'Lantbruksvagen 3';
		input.companyPostcode = '53230';
		input.companyCity = 'Skara';
		input.areas.cropHa = '44';
		input.areas.pastureHa = '18';
		input.activities.odling = true;
		input.activities.livsmedelsforadling = true;
		input.certifications.crop = 1;
		input.foodProcessing.animalProducts = true;
		input.settings.RQ1 = true;
		input.settings.RQ3 = true;
		input.animals.slaughterPigs = 14;
		input.obligationAnswers.AP2 = 'yes';

		await saveEditableProfile(db, userId, input);

		const profile = await loadEditableProfile(db, userId);
		const profileUpdateEvents = db
			.select()
			.from(appProfileUpdateEvents)
			.where(eq(appProfileUpdateEvents.userId, userId))
			.all();

		expect(profile?.displayName).toBe('Gard Demo');
		expect(profile?.areas.cropHa).toBe('44');
		expect(profile?.areas.pastureHa).toBe('18');
		expect(profile?.activities.odling).toBe(true);
		expect(profile?.activities.djurhallning).toBe(true);
		expect(profile?.activities.livsmedelsforadling).toBe(true);
		expect(profile?.foodProcessing.animalProducts).toBe(true);
		expect(profile?.animals.slaughterPigs).toBe(14);
		expect(profile?.computedObligations.animalUnits).toBe(2);
		expect(profile?.computedObligations.moreThan2000SlaughterPigs).toBe(false);
		expect(profile?.computedObligations.anmalningsplikt).toBe(true);
		expect(profile?.assignedChecklistSlugs).toEqual(
			expect.arrayContaining(['miljohusesyn-a', 'miljohusesyn-g', 'miljohusesyn-d', 'miljohusesyn-v'])
		);
		expect(profile?.derivedProfiles).toEqual(
			expect.arrayContaining([
				'Ar_vaxtodlare',
				'Har_djur',
				'Har_grisar',
				'Har_slaktgrisar_eller_obetackta_gyltor_eller_avelsgaltar',
				'Har_anstallda_eller_ovrig_personal',
				'Har_kyl_varme_eller_klimatanlaggning',
				'Ekologisk_odling_KRAV',
				'Anmalningspliktig',
				'Livsmedelsforadling',
				'Livsmedelsforadling_animalier'
			])
		);
		expect(profileUpdateEvents).toHaveLength(1);
	});

	it('loads legacy animal keys into the richer wizard shape', async () => {
		const db = createTestDb();
		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'legacy-animals@miljohusesyn.local',
					username: 'legacy-animals',
					passwordHash: 'hash',
					displayName: 'Legacy Animals'
				})
				.run().lastInsertRowid
		);

		db.insert(appUserAnimalTypes)
			.values([
				{
					userId,
					animalKey: 'Dairy_cattle',
					animalName: 'Mjolkkor',
					amount: 12
				},
				{
					userId,
					animalKey: 'pigs',
					animalName: 'Legacy pigs',
					amount: 25
				}
			])
			.run();

		const profile = await loadEditableProfile(db, userId);

		expect(profile?.animals.dairyCattle).toBe(12);
		expect(profile?.animals.slaughterPigs).toBe(25);
		expect(profile?.animals.otherCattle).toBe(0);
	});

	it('keeps legacy base profiles aligned for garden and beekeeping activities', () => {
		const gardenInput = createBlankEditableProfileInput();
		gardenInput.activities.tradgardsforetagPotatisodlare = true;
		gardenInput.areas.cropHa = '12';

		expect(deriveProfileNames(gardenInput)).toEqual(
			expect.arrayContaining(['Tradgardsforetag_Potatisodlare', 'Allmanna_Gardskrav', 'Arbetsmiljo'])
		);
		expect(Array.from(buildChecklistSlugSet(gardenInput)).sort()).toEqual([
			'miljohusesyn-a',
			'miljohusesyn-g',
			'miljohusesyn-v'
		]);

		const companyBeeInput = createBlankEditableProfileInput();
		companyBeeInput.activities.biodlingForetag = true;

		expect(deriveProfileNames(companyBeeInput)).toEqual(
			expect.arrayContaining(['Biodling_Foretag', 'Arbetsmiljo'])
		);
		expect(deriveProfileNames(companyBeeInput)).not.toContain('Allmanna_Gardskrav');
		expect(Array.from(buildChecklistSlugSet(companyBeeInput))).toEqual(['miljohusesyn-a']);

		const hobbyBeeInput = createBlankEditableProfileInput();
		hobbyBeeInput.activities.biodlingHobby = true;

		expect(deriveProfileNames(hobbyBeeInput)).toContain('Biodling_Hobby');
		expect(deriveProfileNames(hobbyBeeInput)).not.toContain('Arbetsmiljo');
		expect(deriveProfileNames(hobbyBeeInput)).not.toContain('Allmanna_Gardskrav');
		expect(Array.from(buildChecklistSlugSet(hobbyBeeInput))).toEqual([]);
	});

	it('persists food subtype activities and legacy answer values', async () => {
		const db = createTestDb();

		db.insert(appChecklists)
			.values({
				slug: 'miljohusesyn-a',
				title: 'miljohusesyn-a',
				variantKey: 'default',
				snapshotKey: 'import-snapshot'
			})
			.run();

		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'food@miljohusesyn.local',
					username: 'food-user',
					passwordHash: 'hash',
					displayName: 'Food User'
				})
				.run().lastInsertRowid
		);

		const input = createBlankEditableProfileInput();
		input.displayName = 'Food User';
		input.companyName = 'Food Farm';
		input.activities.livsmedelsforadling = true;
		input.foodProcessing.animalProducts = true;
		input.obligationAnswers.AP2 = 'yes';

		await saveEditableProfile(db, userId, input);

		const savedActivities = db
			.select()
			.from(appUserActivities)
			.where(eq(appUserActivities.userId, userId))
			.all()
			.map((row) => row.activityName);
		const savedAp2 = db
			.select()
			.from(appUserSettings)
			.where(and(eq(appUserSettings.userId, userId), eq(appUserSettings.key, 'AP2')))
			.get();
		const profile = await loadEditableProfile(db, userId);

		expect(savedActivities).toEqual(
			expect.arrayContaining([
				'Livsmedelsforadling',
				'Livsmedelsforadling animaliska produkter'
			])
		);
		expect(savedAp2?.value).toBe('1');
		expect(profile?.foodProcessing.animalProducts).toBe(true);
		expect(profile?.obligationAnswers.AP2).toBe('yes');
		expect(profile?.derivedProfiles).toContain('Livsmedelsforadling_animalier');
	});
});
