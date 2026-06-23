import { eq, ne } from 'drizzle-orm';
import { pathToFileURL } from 'node:url';
import { createBlankEditableProfileInput, deriveProfileNames } from '$lib/profile-logic';
import { createAnimalState, resolveActivityKey, resolveAnimalKey } from '$lib/profile-config';
import { demoPassword, hashPassword } from '$lib/server/auth';
import { createDb, getRuntimeDbEngine, requireRuntimePostgresPool, type AppDb } from './client';
import { resolveRuntimeDbPath } from './migrate';
import {
	appChecklistAssignments,
	appChecklists,
	appUserActivities,
	appUserAnimalTypes,
	appUserProfiles,
	appUsers,
	appUserSettings
} from './schema';

const demoEmail = 'demo@miljohusesyn.local';
const defaultChecklistSlug = 'miljohusesyn-default';
const demoPasswordHash = hashPassword(demoPassword, 'miljohusesyn-demo-salt');
type SeedChecklistRow = { id: number; slug: string; snapshotKey: string };
type SeedUserRow = { id: number };

const fakeUsers = [
	{
		email: demoEmail,
		username: 'demo',
		displayName: 'Demo User',
		role: 'user',
		firstName: 'Demo',
		lastName: 'User',
		phone: '070-100 00 01',
		companyName: 'Demo Garden AB',
		companyOrgNum: '559000-0001',
		companyAddress1: 'Miljovagen 1',
		companyCity: 'Uppsala',
		companyPostcode: '753 10',
		address1: 'Miljovagen 1',
		postcode: '753 10',
		city: 'Uppsala',
		lrfId: 'LRF-DEMO-001',
		checklistSlugs: ['miljohusesyn-a', 'miljohusesyn-g', 'miljohusesyn-v'],
		activities: [{ activityName: 'Tradgardsforetag / Potatisodlare', certified: 1 }],
		settings: [
			{ key: 'RQ1', value: 'true' },
			{ key: 'RQ2', value: 'true' },
			{ key: 'Odlingsarealer', value: '80' }
		],
		animalTypes: []
	},
	{
		email: 'animals@miljohusesyn.local',
		username: 'animals',
		displayName: 'Animal Demo',
		role: 'user',
		firstName: 'Anna',
		lastName: 'Djur',
		phone: '070-100 00 02',
		companyName: 'Djurhuset Gard',
		companyOrgNum: '559000-0002',
		companyAddress1: 'Ladugårdsvägen 4',
		companyCity: 'Skara',
		companyPostcode: '532 30',
		address1: 'Ladugårdsvägen 4',
		postcode: '532 30',
		city: 'Skara',
		lrfId: 'LRF-DEMO-002',
		checklistSlugs: ['miljohusesyn-a', 'miljohusesyn-d', 'miljohusesyn-g'],
		activities: [{ activityName: 'Djurhallning', certified: 2 }],
		settings: [
			{ key: 'AR_cattle', value: 'true' },
			{ key: 'AR_more_than_10_units', value: 'true' },
			{ key: 'RQ1', value: 'true' },
			{ key: 'Betesarealer', value: '35' }
		],
		animalTypes: [{ animalKey: 'Dairy_cattle', animalName: 'Mjolkkor', amount: 42 }]
	},
	{
		email: 'mixed@miljohusesyn.local',
		username: 'mixed',
		displayName: 'Mixed Demo',
		role: 'user',
		firstName: 'Mikael',
		lastName: 'Mix',
		phone: '070-100 00 03',
		companyName: 'Blandad Produktion HB',
		companyOrgNum: '559000-0003',
		companyAddress1: 'Faltvagen 8',
		companyCity: 'Linkoping',
		companyPostcode: '582 20',
		address1: 'Faltvagen 8',
		postcode: '582 20',
		city: 'Linkoping',
		lrfId: 'LRF-DEMO-003',
		checklistSlugs: ['miljohusesyn-a', 'miljohusesyn-d', 'miljohusesyn-g', 'miljohusesyn-v'],
		activities: [
			{ activityName: 'Odling', certified: 1 },
			{ activityName: 'Djurhallning', certified: 1 },
			{ activityName: 'Ovrigt', certified: null },
			{ activityName: 'Livsmedelsforadling', certified: null },
			{ activityName: 'Livsmedelsforadling animaliska produkter', certified: null }
		],
		settings: [
			{ key: 'RQ1', value: 'true' },
			{ key: 'RQ3', value: 'true' },
			{ key: 'AR_pigs', value: 'true' },
			{ key: 'Odlingsarealer', value: '55' },
			{ key: 'Betesarealer', value: '18' },
			{ key: 'foodAnimalProcessing', value: 'true' },
			{ key: 'AP2', value: 'yes' }
		],
		animalTypes: [
			{ animalKey: 'Sow_and_piglets', animalName: 'Suggor inkl. smagrisar', amount: 24 },
			{ animalKey: 'Slaughter_pigs', animalName: 'Slaktsvin', amount: 120 }
		]
	},
	{
		email: 'admin@miljohusesyn.local',
		username: 'admin',
		displayName: 'Admin Demo',
		role: 'admin',
		firstName: 'Admin',
		lastName: 'Demo',
		phone: '070-100 00 04',
		companyName: 'Miljohusesyn Admin',
		companyOrgNum: '559000-0004',
		companyAddress1: 'Adminvagen 1',
		companyCity: 'Stockholm',
		companyPostcode: '111 20',
		address1: 'Adminvagen 1',
		postcode: '111 20',
		city: 'Stockholm',
		lrfId: 'LRF-DEMO-004',
		checklistSlugs: ['miljohusesyn-a', 'miljohusesyn-d', 'miljohusesyn-g', 'miljohusesyn-v'],
		activities: [{ activityName: 'Biodling Foretag', certified: null }],
		settings: [{ key: 'RQ4', value: 'true' }],
		animalTypes: []
	}
];

export async function bootstrapDemoState(
	db: AppDb,
	{ checklistSlug }: { checklistSlug: string }
) {
	if (getRuntimeDbEngine() === 'postgres') {
		await bootstrapDemoStateInPostgres(checklistSlug);
		return;
	}

	const checklist = db.select().from(appChecklists).where(eq(appChecklists.slug, checklistSlug)).get();

	if (!checklist) {
		throw new Error(`Checklist ${checklistSlug} must exist before seeding demo state`);
	}

	const assignedChecklists = db
		.select()
		.from(appChecklists)
		.where(ne(appChecklists.snapshotKey, 'demo-snapshot'))
		.all();
	const assignableChecklists = assignedChecklists.length ? assignedChecklists : [checklist];

	for (const fakeUser of fakeUsers) {
		const existingUser = db.select().from(appUsers).where(eq(appUsers.email, fakeUser.email)).get();
		const userValues = {
			email: fakeUser.email,
			username: fakeUser.username,
			passwordHash: demoPasswordHash,
			displayName: fakeUser.displayName,
			role: fakeUser.role,
			firstName: fakeUser.firstName,
			lastName: fakeUser.lastName,
			phone: fakeUser.phone,
			companyName: fakeUser.companyName,
			companyOrgNum: fakeUser.companyOrgNum,
			companyAddress1: fakeUser.companyAddress1,
			companyAddress2: '',
			companyCity: fakeUser.companyCity,
			companyPostcode: fakeUser.companyPostcode,
			address1: fakeUser.address1,
			address2: '',
			postcode: fakeUser.postcode,
			city: fakeUser.city,
			lrfId: fakeUser.lrfId,
			alertSms: false,
			alertEmail: true
		};

		const userId =
			existingUser?.id ??
			Number(db.insert(appUsers).values(userValues).run().lastInsertRowid);

		if (existingUser) {
			db.update(appUsers).set(userValues).where(eq(appUsers.id, userId)).run();
		}

		db.delete(appChecklistAssignments).where(eq(appChecklistAssignments.userId, userId)).run();
		db.delete(appUserSettings).where(eq(appUserSettings.userId, userId)).run();
		db.delete(appUserProfiles).where(eq(appUserProfiles.userId, userId)).run();
		db.delete(appUserActivities).where(eq(appUserActivities.userId, userId)).run();
		db.delete(appUserAnimalTypes).where(eq(appUserAnimalTypes.userId, userId)).run();

		const matchingChecklists = assignableChecklists.filter((item) =>
			fakeUser.checklistSlugs.includes(item.slug)
		);
		const checklistsToAssign = matchingChecklists.length ? matchingChecklists : [checklist];

		db.insert(appChecklistAssignments)
			.values(checklistsToAssign.map((item) => ({ userId, checklistId: item.id })))
			.onConflictDoNothing()
			.run();

		if (fakeUser.settings.length) {
			db.insert(appUserSettings)
				.values(fakeUser.settings.map((setting) => ({ userId, ...setting })))
				.run();
		}

		if (fakeUser.activities.length) {
			db.insert(appUserActivities)
				.values(fakeUser.activities.map((activity) => ({ userId, ...activity })))
				.run();
		}

		if (fakeUser.animalTypes.length) {
			db.insert(appUserAnimalTypes)
				.values(fakeUser.animalTypes.map((animalType) => ({ userId, ...animalType })))
				.run();
		}

		const profileInput = createBlankEditableProfileInput();
		profileInput.displayName = fakeUser.displayName;
		profileInput.phone = fakeUser.phone;
		profileInput.companyName = fakeUser.companyName;
		profileInput.companyOrgNum = fakeUser.companyOrgNum;
		profileInput.companyAddress1 = fakeUser.companyAddress1;
		profileInput.companyPostcode = fakeUser.companyPostcode;
		profileInput.companyCity = fakeUser.companyCity;
		profileInput.areas.cropHa = valueForSetting(fakeUser.settings, 'Odlingsarealer');
		profileInput.areas.pastureHa = valueForSetting(fakeUser.settings, 'Betesarealer');
		for (const activity of fakeUser.activities) {
			const activityKey = resolveActivityKey(activity.activityName);

			if (activityKey) {
				profileInput.activities[activityKey] = true;
			}
		}
		profileInput.certifications = {
			crop:
				fakeUser.activities.find((activity) => {
					const activityKey = resolveActivityKey(activity.activityName);
					return activityKey === 'odling' || activityKey === 'tradgardsforetagPotatisodlare';
				})?.certified ?? 0,
			animal:
				fakeUser.activities.find((activity) => resolveActivityKey(activity.activityName) === 'djurhallning')
					?.certified ?? 0
		};
		profileInput.foodProcessing = {
			animalProducts:
				hasEnabledSetting(fakeUser.settings, 'foodAnimalProcessing') ||
				fakeUser.activities.some(
					(activity) => activity.activityName === 'Livsmedelsforadling animaliska produkter'
				),
			vegetableProducts:
				hasEnabledSetting(fakeUser.settings, 'foodVegetableProcessing') ||
				fakeUser.activities.some(
					(activity) =>
						activity.activityName === 'Livsmedelsforadling vegetabiliska produkter och foder'
				)
		};
		profileInput.settings = {
			RQ1: hasEnabledSetting(fakeUser.settings, 'RQ1'),
			RQ2: hasEnabledSetting(fakeUser.settings, 'RQ2'),
			RQ3: hasEnabledSetting(fakeUser.settings, 'RQ3'),
			RQ4: hasEnabledSetting(fakeUser.settings, 'RQ4'),
			Anmalningsplikt: hasEnabledSetting(fakeUser.settings, 'Anmalningsplikt'),
			Tillstandsplikt: hasEnabledSetting(fakeUser.settings, 'Tillstandsplikt'),
			AP1: hasEnabledSetting(fakeUser.settings, 'AP1'),
			TP1: hasEnabledSetting(fakeUser.settings, 'TP1'),
			TP3: hasEnabledSetting(fakeUser.settings, 'TP3')
		};
		profileInput.animals = buildSeedAnimalState(fakeUser.animalTypes);
		profileInput.obligationAnswers = {
			AP2: answerValue(fakeUser.settings, 'AP2'),
			AP3: answerValue(fakeUser.settings, 'AP3'),
			AP4: answerValue(fakeUser.settings, 'AP4'),
			AP5: answerValue(fakeUser.settings, 'AP5'),
			AP6: answerValue(fakeUser.settings, 'AP6')
		};

		const derivedProfiles = deriveProfileNames(profileInput);

		if (derivedProfiles.length > 0) {
			db.insert(appUserProfiles)
				.values(
					derivedProfiles.map((profileName) => ({
						userId,
						profileKey: profileName,
						profileName
					}))
				)
				.run();
		}
	}
}

function hasEnabledSetting(settings: Array<{ key: string; value: string }>, key: string) {
	return settings.some((setting) => setting.key === key && setting.value === 'true');
}

function valueForSetting(settings: Array<{ key: string; value: string }>, key: string) {
	return settings.find((setting) => setting.key === key)?.value ?? '';
}

function answerValue(settings: Array<{ key: string; value: string }>, key: string) {
	const value = valueForSetting(settings, key);
	return value === 'yes' || value === 'no' || value === 'na' ? value : 'na';
}

function buildSeedAnimalState(animals: Array<{ animalKey: string; amount: number }>) {
	const state = createAnimalState();

	for (const animal of animals) {
		const resolvedKey = resolveAnimalKey(animal.animalKey);

		if (!resolvedKey) {
			continue;
		}

		state[resolvedKey] += animal.amount;
	}

	return state;
}

export function ensureDemoChecklist(
	db: AppDb,
	{
		checklistSlug = defaultChecklistSlug,
		title = 'Miljohusesyn',
		variantKey = 'default',
		snapshotKey = 'demo-snapshot'
	}: {
		checklistSlug?: string;
		title?: string;
		variantKey?: string;
		snapshotKey?: string;
	} = {}
) {
	if (getRuntimeDbEngine() === 'postgres') {
		throw new Error('Use ensureDemoChecklistInConfiguredRuntime for PostgreSQL-backed demo setup.');
	}

	const checklist = db.select().from(appChecklists).where(eq(appChecklists.slug, checklistSlug)).get();

	if (checklist) {
		return checklist.slug;
	}

	db.insert(appChecklists)
		.values({
			slug: checklistSlug,
			title,
			variantKey,
			snapshotKey
		})
		.run();

	return checklistSlug;
}

export async function seedDemoState(filename = process.env.APP_DB_PATH ?? 'data/checklist.sqlite') {
	if (getRuntimeDbEngine() === 'postgres') {
		const existingChecklist = process.env.DEMO_CHECKLIST_SLUG ? null : await findConfiguredRuntimeChecklistInPostgres();
		const checklistSlug = process.env.DEMO_CHECKLIST_SLUG ?? existingChecklist?.slug ?? defaultChecklistSlug;

		if (!existingChecklist && !process.env.DEMO_CHECKLIST_SLUG) {
			await ensureDemoChecklistInConfiguredRuntime({
				checklistSlug,
				title: process.env.DEMO_CHECKLIST_TITLE ?? 'Miljohusesyn',
				variantKey: process.env.DEMO_CHECKLIST_VARIANT_KEY ?? 'default',
				snapshotKey: process.env.DEMO_CHECKLIST_SNAPSHOT_KEY ?? 'demo-snapshot'
			});
		}

		await bootstrapDemoState(createDb(filename), { checklistSlug });

		return {
			dbPath: process.env.APP_DB_POSTGRES_DSN ?? 'postgres-runtime',
			checklistSlug
		};
	}

	const db = createDb(filename);
	const existingChecklist =
		process.env.DEMO_CHECKLIST_SLUG ?
			null
		:	db
				.select()
				.from(appChecklists)
				.where(ne(appChecklists.snapshotKey, 'demo-snapshot'))
				.orderBy(appChecklists.id)
				.limit(1)
				.get();
	const checklistSlug = process.env.DEMO_CHECKLIST_SLUG ?? existingChecklist?.slug ?? defaultChecklistSlug;

	if (!existingChecklist && !process.env.DEMO_CHECKLIST_SLUG) {
		ensureDemoChecklist(db, {
			checklistSlug,
			title: process.env.DEMO_CHECKLIST_TITLE ?? 'Miljohusesyn',
			variantKey: process.env.DEMO_CHECKLIST_VARIANT_KEY ?? 'default',
			snapshotKey: process.env.DEMO_CHECKLIST_SNAPSHOT_KEY ?? 'demo-snapshot'
		});
	}

	await bootstrapDemoState(db, { checklistSlug });

	return {
		dbPath: resolveRuntimeDbPath(filename),
		checklistSlug
	};
}

async function bootstrapDemoStateInPostgres(checklistSlug: string) {
	const pool = requireRuntimePostgresPool();
	const checklist = await findChecklistBySlugInPostgres(checklistSlug);

	if (!checklist) {
		throw new Error(`Checklist ${checklistSlug} must exist before seeding demo state`);
	}

	const assignableChecklists = await listAssignableChecklistsInPostgres();
	const availableChecklists = assignableChecklists.length ? assignableChecklists : [checklist];

	for (const fakeUser of fakeUsers) {
		const userId = await upsertSeedUserInPostgres(fakeUser);

		await pool.query('delete from app_checklist_assignments where user_id = $1', [userId]);
		await pool.query('delete from app_user_settings where user_id = $1', [userId]);
		await pool.query('delete from app_user_profiles where user_id = $1', [userId]);
		await pool.query('delete from app_user_activities where user_id = $1', [userId]);
		await pool.query('delete from app_user_animal_types where user_id = $1', [userId]);

		const matchingChecklists = availableChecklists.filter((item) => fakeUser.checklistSlugs.includes(item.slug));
		const checklistsToAssign = matchingChecklists.length ? matchingChecklists : [checklist];

		for (const item of checklistsToAssign) {
			await pool.query(
				'insert into app_checklist_assignments (user_id, checklist_id) values ($1, $2) on conflict do nothing',
				[userId, item.id]
			);
		}

		for (const setting of fakeUser.settings) {
			await pool.query(
				'insert into app_user_settings (user_id, key, value) values ($1, $2, $3)',
				[userId, setting.key, setting.value]
			);
		}

		for (const activity of fakeUser.activities) {
			await pool.query(
				'insert into app_user_activities (user_id, activity_name, certified) values ($1, $2, $3)',
				[userId, activity.activityName, activity.certified]
			);
		}

		for (const animalType of fakeUser.animalTypes) {
			await pool.query(
				'insert into app_user_animal_types (user_id, animal_key, animal_name, amount) values ($1, $2, $3, $4)',
				[userId, animalType.animalKey, animalType.animalName, animalType.amount]
			);
		}

		const derivedProfiles = deriveSeedProfiles(fakeUser);
		for (const profileName of derivedProfiles) {
			await pool.query(
				'insert into app_user_profiles (user_id, profile_key, profile_name) values ($1, $2, $3)',
				[userId, profileName, profileName]
			);
		}
	}
}

async function ensureDemoChecklistInConfiguredRuntime({
	checklistSlug = defaultChecklistSlug,
	title = 'Miljohusesyn',
	variantKey = 'default',
	snapshotKey = 'demo-snapshot'
}: {
	checklistSlug?: string;
	title?: string;
	variantKey?: string;
	snapshotKey?: string;
}) {
	const existingChecklist = await findChecklistBySlugInPostgres(checklistSlug);

	if (existingChecklist) {
		return existingChecklist.slug;
	}

	const result = await requireRuntimePostgresPool().query<{ slug: string }>(
		`insert into app_checklists (slug, title, variant_key, snapshot_key)
		values ($1, $2, $3, $4)
		returning slug`,
		[checklistSlug, title, variantKey, snapshotKey]
	);

	return result.rows[0]?.slug ?? checklistSlug;
}

async function findConfiguredRuntimeChecklistInPostgres() {
	const result = await requireRuntimePostgresPool().query<SeedChecklistRow>(
		"select id, slug, snapshot_key as \"snapshotKey\" from app_checklists where snapshot_key <> 'demo-snapshot' order by id limit 1"
	);

	return result.rows[0] ?? null;
}

async function findChecklistBySlugInPostgres(checklistSlug: string) {
	const result = await requireRuntimePostgresPool().query<SeedChecklistRow>(
		'select id, slug, snapshot_key as "snapshotKey" from app_checklists where slug = $1 limit 1',
		[checklistSlug]
	);

	return result.rows[0] ?? null;
}

async function listAssignableChecklistsInPostgres() {
	const result = await requireRuntimePostgresPool().query<SeedChecklistRow>(
		"select id, slug, snapshot_key as \"snapshotKey\" from app_checklists where snapshot_key <> 'demo-snapshot' order by id"
	);

	return result.rows;
}

async function upsertSeedUserInPostgres(fakeUser: (typeof fakeUsers)[number]) {
	const pool = requireRuntimePostgresPool();
	const existingUser = await pool.query<SeedUserRow>('select id from app_users where email = $1 limit 1', [
		fakeUser.email
	]);

	const values = [
		fakeUser.email,
		fakeUser.username,
		demoPasswordHash,
		fakeUser.displayName,
		fakeUser.role,
		fakeUser.firstName,
		fakeUser.lastName,
		fakeUser.phone,
		fakeUser.companyName,
		fakeUser.companyOrgNum,
		fakeUser.companyAddress1,
		fakeUser.companyCity,
		fakeUser.companyPostcode,
		fakeUser.address1,
		fakeUser.postcode,
		fakeUser.city,
		fakeUser.lrfId
	];

	if (existingUser.rows[0]) {
		await pool.query(
			`update app_users set
				email = $2,
				username = $3,
				password_hash = $4,
				display_name = $5,
				role = $6,
				first_name = $7,
				last_name = $8,
				phone = $9,
				company_name = $10,
				company_org_num = $11,
				company_address_1 = $12,
				company_address_2 = '',
				company_city = $13,
				company_postcode = $14,
				address_1 = $15,
				address_2 = '',
				postcode = $16,
				city = $17,
				lrf_id = $18,
				alert_sms = false,
				alert_email = true
			where id = $1`,
			[existingUser.rows[0].id, ...values]
		);
		return existingUser.rows[0].id;
	}

	const insertedUser = await pool.query<SeedUserRow>(
		`insert into app_users (
			email, username, password_hash, display_name, role, first_name, last_name, phone,
			company_name, company_org_num, company_address_1, company_address_2, company_city,
			company_postcode, address_1, address_2, postcode, city, lrf_id, alert_sms, alert_email
		) values (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, '', $12,
			$13, $14, '', $15, $16, $17, false, true
		)
		returning id`,
		values
	);

	return insertedUser.rows[0]?.id ?? 0;
}

function deriveSeedProfiles(fakeUser: (typeof fakeUsers)[number]) {
	const profileInput = createBlankEditableProfileInput();
	profileInput.displayName = fakeUser.displayName;
	profileInput.phone = fakeUser.phone;
	profileInput.companyName = fakeUser.companyName;
	profileInput.companyOrgNum = fakeUser.companyOrgNum;
	profileInput.companyAddress1 = fakeUser.companyAddress1;
	profileInput.companyPostcode = fakeUser.companyPostcode;
	profileInput.companyCity = fakeUser.companyCity;
	profileInput.areas.cropHa = valueForSetting(fakeUser.settings, 'Odlingsarealer');
	profileInput.areas.pastureHa = valueForSetting(fakeUser.settings, 'Betesarealer');

	for (const activity of fakeUser.activities) {
		const activityKey = resolveActivityKey(activity.activityName);

		if (activityKey) {
			profileInput.activities[activityKey] = true;
		}
	}

	profileInput.certifications = {
		crop:
			fakeUser.activities.find((activity) => {
				const activityKey = resolveActivityKey(activity.activityName);
				return activityKey === 'odling' || activityKey === 'tradgardsforetagPotatisodlare';
			})?.certified ?? 0,
		animal:
			fakeUser.activities.find((activity) => resolveActivityKey(activity.activityName) === 'djurhallning')
				?.certified ?? 0
	};
	profileInput.foodProcessing = {
		animalProducts:
			hasEnabledSetting(fakeUser.settings, 'foodAnimalProcessing') ||
			fakeUser.activities.some(
				(activity) => activity.activityName === 'Livsmedelsforadling animaliska produkter'
			),
		vegetableProducts:
			hasEnabledSetting(fakeUser.settings, 'foodVegetableProcessing') ||
			fakeUser.activities.some(
				(activity) => activity.activityName === 'Livsmedelsforadling vegetabiliska produkter och foder'
			)
	};
	profileInput.settings = {
		RQ1: hasEnabledSetting(fakeUser.settings, 'RQ1'),
		RQ2: hasEnabledSetting(fakeUser.settings, 'RQ2'),
		RQ3: hasEnabledSetting(fakeUser.settings, 'RQ3'),
		RQ4: hasEnabledSetting(fakeUser.settings, 'RQ4'),
		Anmalningsplikt: hasEnabledSetting(fakeUser.settings, 'Anmalningsplikt'),
		Tillstandsplikt: hasEnabledSetting(fakeUser.settings, 'Tillstandsplikt'),
		AP1: hasEnabledSetting(fakeUser.settings, 'AP1'),
		TP1: hasEnabledSetting(fakeUser.settings, 'TP1'),
		TP3: hasEnabledSetting(fakeUser.settings, 'TP3')
	};
	profileInput.animals = buildSeedAnimalState(fakeUser.animalTypes);
	profileInput.obligationAnswers = {
		AP2: answerValue(fakeUser.settings, 'AP2'),
		AP3: answerValue(fakeUser.settings, 'AP3'),
		AP4: answerValue(fakeUser.settings, 'AP4'),
		AP5: answerValue(fakeUser.settings, 'AP5'),
		AP6: answerValue(fakeUser.settings, 'AP6')
	};

	return deriveProfileNames(profileInput);
}

function isDirectExecution(metaUrl: string) {
	const entryPath = process.argv[1];
	return Boolean(entryPath) && metaUrl === pathToFileURL(entryPath).href;
}

if (isDirectExecution(import.meta.url)) {
	void seedDemoState()
		.then(({ dbPath, checklistSlug }) => {
			console.log(`Seeded demo state for ${checklistSlug} in ${dbPath}`);
		})
		.catch((error) => {
			console.error(error);
			process.exitCode = 1;
		});
}
