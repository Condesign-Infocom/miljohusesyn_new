import type { AppDb } from '$lib/server/db/client';
import { loadRuntimeVisibilitySeedData } from '$lib/server/db/runtime-read-repository';

type VisibilityContext = {
	isAdmin: boolean;
	profileKeys: Set<string>;
	trustedProfileKeys: Set<string>;
};

const directProfileAliases: Record<string, string[]> = {
	djurhallning: ['Har_djur'],
	odling: ['Ar_vaxtodlare'],
	tradgardsforetagpotatisodlare: [
		'Tradgardsforetag_Potatisodlare',
		'Odling',
		'Ar_vaxtodlare'
	],
	biodlingforetag: ['Biodling_Foretag'],
	biodlinghobby: ['Biodling_Hobby'],
	ovrigt: ['Ovrigt'],
	livsmedelsforadling: ['Livsmedelsforadling'],
	livsmedelsforadlinganimaliskaprodukter: ['Livsmedelsforadling_animalier'],
	livsmedelsforadlingvegetabiliskaprodukterochfoder: ['Livsmedelsforadling_vegetabilier'],
	gris: ['Har_grisar'],
	grisar: ['Har_grisar'],
	cattle: ['Har_notkreatur'],
	notboskap: ['Har_notkreatur'],
	notkreatur: ['Har_notkreatur'],
	anstalldaellerovrigpersonal: ['Har_anstallda_eller_ovrig_personal'],
	kylvarmeellerklimatanlaggning: ['Har_kyl_varme_eller_klimatanlaggning'],
	minst10arbetstagare: ['Har_minst_10_arbetstagare'],
	fleran10djurenheter: ['Har_fler_an_10_djurenheter'],
	meran500djur: ['Har_mer_an_500_djur'],
	mjolkdjur: ['Har_mjolkdjur'],
	pigs: ['Har_grisar'],
	horses: ['Har_hastar'],
	hastar: ['Har_hastar'],
	poultry: ['Har_fjaderfa'],
	fjaderfa: ['Har_fjaderfa'],
	sheep: ['Har_far'],
	goat: ['Har_getter']
};

const settingProfileAliases: Record<string, string[]> = {
	rq1: ['Har_anstallda_eller_ovrig_personal'],
	rq2: ['Inom_vattenskyddsomrade'],
	rq3: ['Har_kyl_varme_eller_klimatanlaggning'],
	rq4: ['Har_minst_10_arbetstagare'],
	ap1: ['Mer_an_100_djurenheter'],
	ap2: [
		'Anlaggning_for_forbranning_med_en_total_installerad_tillford_effekt_av_mer_an_500_kW_av_annat_bransle_an_enbart_eldningsolja_eller_branslegas_t.ex._fl_is_halm'
	],
	ap3: ['Tvattning_och_rensning_av_frukt_bar_rotfrukter_eller_gronsaker_pa_mer_an_2_000_ton_ravara'],
	ap4: ['Tillverkning_av_mer_an_5_000_ton_bruksfardigt_spannmalsfoder_till_forsaljning'],
	ap5: [
		'Anlaggning_for_mellanlagring_av_avfall_om_den_totala_avfallsmangden_ar_storre_an_10_ton_vid_nagot_enskilt_tillfalle'
	],
	ap6: ['Uppodling_av_annan_mark_an_jordbruksmark_for_produktion_av_foder_livsmedel_m_m'],
	anmalningsplikt: ['Anmalningspliktig'],
	tp1: ['Mer_an_400_djurenheter'],
	tp2: ['Platser_for_mer_an_200_djurenheter_av_fjaderfa_slaktsvin_eller_suggor_ihopraknat'],
	tp3: [
		'40_000_platser_for_fjaderfa_eller_2_000_platser_for_slaktsvin_tyngre_an_30_kg_eller_750_platser_for_suggor'
	],
	tillstandsplikt: ['Tillstandspliktig'],
	ar1: ['Har_grisar'],
	ar2: ['Har_notkreatur'],
	ar3: ['Har_mjolkdjur'],
	ar4: ['Har_far_eller_getter'],
	ar5: ['Har_fjaderfa'],
	ar6: ['Har_varphons_eller_unghons'],
	ar7: ['Har_hastar'],
	ar8: ['Har_fler_an_10_djurenheter'],
	ar9: ['Har_mer_an_500_djur'],
	arpigs: ['Har_grisar'],
	arcattle: ['Har_notkreatur'],
	ardairycattle: ['Har_mjolkdjur'],
	arsheepgoats: ['Har_far_eller_getter'],
	arpoultry: ['Har_fjaderfa'],
	arlayinghenpullet: ['Har_varphons_eller_unghons'],
	arhorses: ['Har_hastar'],
	armorethan10units: ['Har_fler_an_10_djurenheter'],
	armorethan500animals: ['Har_mer_an_500_djur']
};

const activityProfileAliases: Record<string, string[]> = {
	odling: ['Ar_vaxtodlare', 'Allmanna_Gardskrav', 'Arbetsmiljo'],
	djurhallning: ['Har_djur', 'Allmanna_Gardskrav', 'Arbetsmiljo'],
	tradgardsforetagpotatisodlare: [
		'Tradgardsforetag_Potatisodlare',
		'Odling',
		'Ar_vaxtodlare',
		'Allmanna_Gardskrav',
		'Arbetsmiljo'
	],
	biodlingforetag: ['Biodling_Foretag', 'Arbetsmiljo'],
	biodlinghobby: ['Biodling_Hobby'],
	ovrigt: ['Ovrigt', 'Allmanna_Gardskrav', 'Arbetsmiljo'],
	livsmedelsforadling: ['Livsmedelsforadling', 'Allmanna_Gardskrav', 'Arbetsmiljo'],
	livsmedelsforadlinganimaliskaprodukter: ['Livsmedelsforadling_animalier'],
	livsmedelsforadlingvegetabiliskaprodukterochfoder: ['Livsmedelsforadling_vegetabilier']
};

const animalProfileAliases: Record<string, string[]> = {
	pigs: ['Har_grisar'],
	pig: ['Har_grisar'],
	cattle: ['Har_notkreatur'],
	cow: ['Har_notkreatur'],
	cows: ['Har_notkreatur'],
	dairycattle: ['Har_notkreatur', 'Har_mjolkdjur'],
	horse: ['Har_hastar'],
	horses: ['Har_hastar'],
	poultry: ['Har_fjaderfa'],
	chicken: ['Har_fjaderfa'],
	sheep: ['Har_far'],
	goat: ['Har_getter'],
	rabbits: ['Har_kaniner']
};

const defaultTrustedProfileKeys = new Set(
	[
		...Object.keys(directProfileAliases),
		...Object.keys(settingProfileAliases),
		...Object.keys(activityProfileAliases),
		...Object.keys(animalProfileAliases),
		...Object.values(directProfileAliases).flat(),
		...Object.values(settingProfileAliases).flat(),
		...Object.values(activityProfileAliases).flat(),
		...Object.values(animalProfileAliases).flat(),
		'Har_djur'
	].map((value) => normalizeKey(value))
);

const questionRules: Array<{
	requiredProfiles: string[];
	test: (value: string) => boolean;
}> = [
	{
		requiredProfiles: ['Har_minst_10_arbetstagare'],
		test: (value) => value.includes('10 arbetstagare')
	},
	{
		requiredProfiles: ['Har_anstallda_eller_ovrig_personal'],
		test: (value) =>
			value.includes('anstallda') ||
			value.includes('inhyrd personal') ||
			value.includes('arbetstagare')
	},
	{
		requiredProfiles: ['Inom_vattenskyddsomrade'],
		test: (value) => value.includes('vattenskyddsomrade')
	},
	{
		requiredProfiles: ['Har_kyl_varme_eller_klimatanlaggning'],
		test: (value) =>
			value.includes('kylanlaggning') ||
			value.includes('klimatanlaggning') ||
			value.includes('kyl') ||
			value.includes('varme')
	},
	{
		requiredProfiles: ['Har_grisar'],
		test: (value) => hasWord(value, 'gris')
	},
	{
		requiredProfiles: ['Har_notkreatur'],
		test: (value) =>
			hasWord(value, 'not') ||
			hasWord(value, 'notkreatur') ||
			hasWord(value, 'ko') ||
			hasWord(value, 'kor') ||
			hasWord(value, 'kalv')
	},
	{
		requiredProfiles: ['Har_mjolkdjur'],
		test: (value) => hasWord(value, 'mjolk')
	},
	{
		requiredProfiles: ['Har_fjaderfa'],
		test: (value) =>
			hasWord(value, 'fjaderfa') ||
			hasWord(value, 'hons') ||
			hasWord(value, 'kyckling') ||
			hasWord(value, 'anka') ||
			hasWord(value, 'gass') ||
			hasWord(value, 'kalkon')
	},
	{
		requiredProfiles: ['Har_hastar'],
		test: (value) => hasWord(value, 'hast')
	},
	{
		requiredProfiles: ['Har_far_eller_getter'],
		test: (value) => hasWord(value, 'far') || hasWord(value, 'getter')
	}
];

export async function loadVisibilityContext(
	db: AppDb,
	userId: number
): Promise<VisibilityContext | null> {
	const seed = await loadRuntimeVisibilitySeedData(db, userId);

	if (!seed.user) {
		return null;
	}

	const profileKeys = new Set<string>();
	const trustedProfileKeys = new Set(defaultTrustedProfileKeys);
	const totalAnimals = seed.animalTypes.reduce((sum, animalType) => sum + animalType.amount, 0);

	for (const profile of seed.profileCatalog) {
		addTrustedKeyVariants(trustedProfileKeys, profile.profileKey);
		addTrustedKeyVariants(trustedProfileKeys, profile.profileName);
	}

	for (const profile of seed.profiles) {
		addKeyVariants(profileKeys, profile.profileKey);
		addKeyVariants(profileKeys, profile.profileName);
	}

	for (const setting of seed.settings) {
		if (!isTruthy(setting.value)) {
			continue;
		}

		addKeyVariants(profileKeys, setting.key);
		for (const alias of settingProfileAliases[normalizeKey(setting.key)] ?? []) {
			addKeyVariants(profileKeys, alias);
		}
	}

	for (const activity of seed.activities) {
		addKeyVariants(profileKeys, activity.activityName);
		for (const alias of activityProfileAliases[normalizeKey(activity.activityName)] ?? []) {
			addKeyVariants(profileKeys, alias);
		}
	}

	for (const animalType of seed.animalTypes) {
		addKeyVariants(profileKeys, animalType.animalKey);
		addKeyVariants(profileKeys, animalType.animalName);
		addKeyVariants(profileKeys, 'Har_djur');

		const aliases = [
			...(animalProfileAliases[normalizeKey(animalType.animalKey)] ?? []),
			...(animalProfileAliases[normalizeKey(animalType.animalName)] ?? [])
		];

		for (const alias of aliases) {
			addKeyVariants(profileKeys, alias);
		}
	}

	if (totalAnimals > 10) {
		addKeyVariants(profileKeys, 'Har_fler_an_10_djurenheter');
	}

	if (totalAnimals > 500) {
		addKeyVariants(profileKeys, 'Har_mer_an_500_djur');
	}

	return {
		isAdmin: seed.user.role === 'admin',
		profileKeys,
		trustedProfileKeys
	};
}

export function canViewSection(context: VisibilityContext | null, profileKeys: string[]) {
	if (!context) {
		return false;
	}

	if (context.isAdmin || profileKeys.length === 0 || hasUnknownProfile(context, profileKeys)) {
		return true;
	}

	return profileKeys.some((profileKey) => hasProfile(context, profileKey));
}

export function canViewQuestion(
	context: VisibilityContext | null,
	profileKeys: string[],
	questionText: string
) {
	if (!context) {
		return false;
	}

	if (context.isAdmin) {
		return true;
	}

	if (
		profileKeys.length > 0 &&
		!hasUnknownProfile(context, profileKeys) &&
		!profileKeys.some((profileKey) => hasProfile(context, profileKey))
	) {
		return false;
	}

	const normalizedText = normalizeText(questionText);

	for (const rule of questionRules) {
		if (rule.test(normalizedText) && !rule.requiredProfiles.some((profile) => hasProfile(context, profile))) {
			return false;
		}
	}

	return true;
}

function hasProfile(context: VisibilityContext, profileKey: string) {
	for (const candidate of expandProfileCandidates(profileKey)) {
		if (context.profileKeys.has(candidate)) {
			return true;
		}
	}

	return false;
}

function hasUnknownProfile(context: VisibilityContext, profileKeys: string[]) {
	return profileKeys.some((profileKey) => !context.trustedProfileKeys.has(normalizeKey(profileKey)));
}

function addKeyVariants(target: Set<string>, value: string) {
	const normalized = normalizeKey(value);

	if (!normalized) {
		return;
	}

	target.add(normalized);

	for (const alias of directProfileAliases[normalized] ?? []) {
		const normalizedAlias = normalizeKey(alias);

		if (normalizedAlias) {
			target.add(normalizedAlias);
		}
	}
}

function addTrustedKeyVariants(target: Set<string>, value: string) {
	const normalized = normalizeKey(value);

	if (!normalized) {
		return;
	}

	target.add(normalized);

	for (const alias of directProfileAliases[normalized] ?? []) {
		const normalizedAlias = normalizeKey(alias);

		if (normalizedAlias) {
			target.add(normalizedAlias);
		}
	}
}

function expandProfileCandidates(profileKey: string) {
	const normalized = normalizeKey(profileKey);

	if (!normalized) {
		return [];
	}

	return Array.from(
		new Set([normalized, ...(directProfileAliases[normalized] ?? []).map((value) => normalizeKey(value))])
	).filter(Boolean) as string[];
}

function normalizeKey(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '')
		.toLowerCase();
}

function normalizeText(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

function isTruthy(value: string) {
	return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function hasWord(value: string, word: string) {
	return new RegExp(`(^|[^a-z])${word}([^a-z]|$)`).test(value);
}
