import {
	activityOptions,
	animalOptions,
	createActivityState,
	createAnimalState,
	createCertificationState,
	createFoodProcessingState,
	createReportObligationAnswerState,
	foodProcessingOptions,
	resolveActivityKey,
	resolveAnimalKey,
	createSettingState,
	type ActivityKey,
	type AnimalKey,
	type ReportObligationQuestionKey
} from '$lib/profile-config';
import type { ComputedObligationSummary, EditableProfileInput } from '$lib/types/profile';

const cropCertificationProfiles = {
	1: 'Ekologisk_odling_KRAV',
	2: 'Ekologisk_odling_EU',
	3: ['Ekologisk_odling_KRAV', 'Ekologisk_odling_EU']
} as const;

const animalCertificationProfiles = {
	1: 'Ekologisk_uppfodning_KRAV',
	2: 'Ekologisk_uppfodning_EU',
	3: ['Ekologisk_uppfodning_KRAV', 'Ekologisk_uppfodning_EU']
} as const;

const settingProfileMap: Record<string, string> = {
	RQ1: 'Har_anstallda_eller_ovrig_personal',
	RQ2: 'Inom_vattenskyddsomrade',
	RQ3: 'Har_kyl_varme_eller_klimatanlaggning',
	RQ4: 'Har_minst_10_arbetstagare',
	AP1: 'Mer_an_100_djurenheter',
	AP2: 'Anlaggning_for_forbranning_med_en_total_installerad_tillford_effekt_av_mer_an_500_kW_av_annat_bransle_an_enbart_eldningsolja_eller_branslegas_t.ex._fl_is_halm',
	AP3: 'Tvattning_och_rensning_av_frukt_bar_rotfrukter_eller_gronsaker_pa_mer_an_2_000_ton_ravara',
	AP4: 'Tillverkning_av_mer_an_5_000_ton_bruksfardigt_spannmalsfoder_till_forsaljning',
	AP5: 'Anlaggning_for_mellanlagring_av_avfall_om_den_totala_avfallsmangden_ar_storre_an_10_ton_vid_nagot_enskilt_tillfalle',
	AP6: 'Uppodling_av_annan_mark_an_jordbruksmark_for_produktion_av_foder_livsmedel_m_m',
	Anmalningsplikt: 'Anmalningspliktig',
	TP1: 'Mer_an_400_djurenheter',
	TP3: '40_000_platser_for_fjaderfa_eller_2_000_platser_for_slaktsvin_tyngre_an_30_kg_eller_750_platser_for_suggor',
	Tillstandsplikt: 'Tillstandspliktig'
};

const animalProfileMap: Record<AnimalKey, string[]> = {
	dairyCattle: ['Har_notkreatur', 'Har_mjolkdjur', 'Har_mjolkkor'],
	calfCattle: ['Har_notkreatur'],
	otherCattle: ['Har_notkreatur', 'Har_ovriga_not'],
	horses: ['Har_hastar'],
	sowAndPiglets: ['Har_grisar', 'Har_suggor_eller_betackta_gyltor'],
	slaughterPigs: ['Har_grisar', 'Har_slaktgrisar_eller_obetackta_gyltor_eller_avelsgaltar'],
	poultry: ['Har_fjaderfa', 'Har_varphons_eller_kycklingmodrar'],
	pullets: ['Har_fjaderfa', 'Har_unghons'],
	broilers: ['Har_fjaderfa', 'Har_slaktkyckling'],
	breederPoultry: ['Har_fjaderfa', 'Har_Avelsdjur_for_slaktkycklingproduktion'],
	turkeys: ['Har_fjaderfa', 'Har_kalkon'],
	ducksGees: ['Har_fjaderfa', 'Har_ankor_eller_gass'],
	ostrich: ['Har_strutsfaglar'],
	sheep: ['Har_far', 'Har_far_eller_getter'],
	lamb: ['Har_far', 'Har_far_eller_getter'],
	goat: ['Har_getter', 'Har_far_eller_getter'],
	kid: ['Har_getter', 'Har_far_eller_getter'],
	dairySheep: ['Har_mjolkdjur', 'Har_mjolkande_far', 'Har_far', 'Har_far_eller_getter'],
	dairyGoat: ['Har_mjolkdjur', 'Har_mjolkande_getter', 'Har_getter', 'Har_far_eller_getter'],
	rabbits: ['Har_kaniner']
};

const animalOptionByKey = Object.fromEntries(
	animalOptions.map((option) => [option.key, option])
) as Record<AnimalKey, (typeof animalOptions)[number]>;
const activityOptionByKey = Object.fromEntries(
	activityOptions.map((option) => [option.key, option])
) as Record<ActivityKey, (typeof activityOptions)[number]>;

const tp1AnimalKeys = new Set<AnimalKey>(['dairyCattle', 'calfCattle', 'otherCattle', 'horses']);
const poultryPlaceAnimalKeys = new Set<AnimalKey>([
	'poultry',
	'pullets',
	'broilers',
	'breederPoultry',
	'turkeys',
	'ducksGees'
]);
const cropActivityKeys = new Set<ActivityKey>(
	activityOptions
		.filter((option) => option.certificationKey === 'crop')
		.map((option) => option.key as ActivityKey)
);

export function createBlankEditableProfileInput(): EditableProfileInput {
	return {
		displayName: '',
		phone: '',
		companyName: '',
		companyOrgNum: '',
		companyAddress1: '',
		companyPostcode: '',
		companyCity: '',
		areas: {
			cropHa: '',
			pastureHa: ''
		},
		activities: createActivityState(),
		certifications: createCertificationState(),
		foodProcessing: createFoodProcessingState(),
		settings: createSettingState(),
		animals: createAnimalState(),
		obligationAnswers: createReportObligationAnswerState()
	};
}

export function normalizeEditableProfileInput(input: EditableProfileInput): EditableProfileInput {
	const output = createBlankEditableProfileInput();

	output.displayName = input.displayName.trim();
	output.phone = input.phone.trim();
	output.companyName = input.companyName.trim();
	output.companyOrgNum = input.companyOrgNum.trim();
	output.companyAddress1 = input.companyAddress1.trim();
	output.companyPostcode = input.companyPostcode.trim();
	output.companyCity = input.companyCity.trim();
	output.areas.cropHa = input.areas.cropHa.trim();
	output.areas.pastureHa = input.areas.pastureHa.trim();

	output.activities = {
		...output.activities
	};
	for (const [key, value] of Object.entries(input.activities)) {
		const resolvedKey = resolveActivityKey(key);

		if (resolvedKey) {
			output.activities[resolvedKey] = Boolean(value);
		}
	}
	output.certifications = {
		crop: normalizeCertificationValue(input.certifications.crop),
		animal: normalizeCertificationValue(input.certifications.animal)
	};
	output.foodProcessing = {
		...output.foodProcessing,
		...input.foodProcessing
	};
	output.settings = {
		...output.settings,
		...input.settings
	};
	const nextAnimals = createAnimalState();

	for (const [key, value] of Object.entries({
		...output.animals,
		...input.animals
	})) {
		const resolvedKey = resolveAnimalKey(key);

		if (!resolvedKey) {
			continue;
		}

		nextAnimals[resolvedKey] += Math.max(0, Math.trunc(value));
	}

	output.animals = nextAnimals;
	output.obligationAnswers = normalizeObligationAnswers(input.obligationAnswers);

	const hasAnimals = Object.values(output.animals).some((amount) => amount > 0);

	if (hasAnimals) {
		output.activities.djurhallning = true;
	}

	if (!hasCropActivity(output.activities)) {
		output.areas.cropHa = '';
		output.certifications.crop = 0;
	}

	if (!output.activities.djurhallning) {
		output.areas.pastureHa = '';
		output.certifications.animal = 0;
	}

	if (!output.activities.livsmedelsforadling) {
		output.foodProcessing.animalProducts = false;
		output.foodProcessing.vegetableProducts = false;
		output.obligationAnswers = createReportObligationAnswerState();
	}

	if (output.settings.RQ4) {
		output.settings.RQ1 = true;
	}

	return output;
}

export function computeObligationSummary(input: EditableProfileInput): ComputedObligationSummary {
	const normalizedInput = normalizeEditableProfileInput(input);
	const totalAnimals = Object.values(normalizedInput.animals).reduce((sum, amount) => sum + amount, 0);
	const animalUnits = sumAnimalUnits(normalizedInput.animals);
	const cattleUnits = sumAnimalUnits(normalizedInput.animals, tp1AnimalKeys);
	const poultryPlaces = sumAnimalAmounts(normalizedInput.animals, poultryPlaceAnimalKeys);
	const foodAnswerYes = Object.values(normalizedInput.obligationAnswers).some((value) => value === 'yes');
	const moreThan40000Poultries = poultryPlaces > 40000;
	const moreThan2000SlaughterPigs = normalizedInput.animals.slaughterPigs > 2000;
	const moreThan750Sows = normalizedInput.animals.sowAndPiglets > 750;
	const tp1 = cattleUnits > 400;
	const tp3 = moreThan40000Poultries || moreThan2000SlaughterPigs || moreThan750Sows;
	const tillstandsplikt = tp1 || tp3;
	const ap1 = !tillstandsplikt && animalUnits > 100;
	const anmalningsplikt = !tillstandsplikt && (ap1 || foodAnswerYes);

	return {
		animalUnits,
		totalAnimals,
		cattleUnits,
		poultryPlaces,
		ap1,
		tp1,
		tp3,
		moreThan40000Poultries,
		moreThan2000SlaughterPigs,
		moreThan750Sows,
		anmalningsplikt,
		tillstandsplikt
	};
}

export function deriveProfileNames(input: EditableProfileInput) {
	const normalizedInput = normalizeEditableProfileInput(input);
	const computed = computeObligationSummary(normalizedInput);
	const profiles = new Map<string, string>();

	for (const [key, enabled] of Object.entries(normalizedInput.activities) as Array<[ActivityKey, boolean]>) {
		if (!enabled) {
			continue;
		}

		const option = activityOptionByKey[key];
		addProfile(profiles, option.profileName);

		if (option.legacyBaseProfile !== 'none') {
			addProfile(profiles, 'Arbetsmiljo');
		}

		if (option.legacyBaseProfile === 'allmanna') {
			addProfile(profiles, 'Allmanna_Gardskrav');
		}

		if (option.certificationKey === 'crop') {
			addCertificationProfiles(profiles, cropCertificationProfiles, normalizedInput.certifications.crop);
		}

		if (option.certificationKey === 'animal') {
			addCertificationProfiles(profiles, animalCertificationProfiles, normalizedInput.certifications.animal);
		}
	}

	for (const option of foodProcessingOptions) {
		if (normalizedInput.foodProcessing[option.key]) {
			addProfile(profiles, option.profileName);
		}
	}

	for (const [key, enabled] of Object.entries(normalizedInput.settings)) {
		if (enabled && key in settingProfileMap) {
			addProfile(profiles, settingProfileMap[key]);
		}
	}

	for (const [key, value] of Object.entries(normalizedInput.obligationAnswers) as Array<
		[ReportObligationQuestionKey, string]
	>) {
		if (value === 'yes' && key in settingProfileMap) {
			addProfile(profiles, settingProfileMap[key]);
		}
	}

	for (const [key, amount] of Object.entries(normalizedInput.animals) as Array<[AnimalKey, number]>) {
		if (amount <= 0) {
			continue;
		}

		for (const profileName of animalProfileMap[key] ?? []) {
			addProfile(profiles, profileName);
		}
	}

	if (computed.animalUnits > 10) {
		addProfile(profiles, 'Har_fler_an_10_djurenheter');
	}

	if (computed.totalAnimals > 500) {
		addProfile(profiles, 'Har_mer_an_500_djur');
	}

	if (computed.ap1) {
		addProfile(profiles, settingProfileMap.AP1);
	}

	if (computed.tp1) {
		addProfile(profiles, settingProfileMap.TP1);
	}

	if (computed.tp3) {
		addProfile(profiles, settingProfileMap.TP3);
	}

	if (computed.anmalningsplikt) {
		addProfile(profiles, settingProfileMap.Anmalningsplikt);
	}

	if (computed.tillstandsplikt) {
		addProfile(profiles, settingProfileMap.Tillstandsplikt);
	}

	return Array.from(profiles.values()).sort((left, right) => left.localeCompare(right));
}

export function buildChecklistSlugSet(input: EditableProfileInput) {
	const normalizedInput = normalizeEditableProfileInput(input);
	const slugs = new Set<string>();

	for (const [key, enabled] of Object.entries(normalizedInput.activities) as Array<[ActivityKey, boolean]>) {
		if (!enabled) {
			continue;
		}

		for (const checklistSlug of activityOptionByKey[key].checklists) {
			slugs.add(checklistSlug);
		}
	}

	return slugs;
}

export function hasCropActivity(activities: EditableProfileInput['activities']) {
	return Array.from(cropActivityKeys).some((key) => activities[key]);
}

function normalizeObligationAnswers(input: EditableProfileInput['obligationAnswers']) {
	return Object.fromEntries(
		Object.entries({
			...createReportObligationAnswerState(),
			...input
		}).map(([key, value]) => [key, normalizeObligationAnswer(value)])
	) as EditableProfileInput['obligationAnswers'];
}

function sumAnimalUnits(
	animals: EditableProfileInput['animals'],
	filterKeys?: ReadonlySet<AnimalKey>
) {
	return (Object.entries(animals) as Array<[AnimalKey, number]>).reduce((sum, [key, amount]) => {
		if (amount <= 0 || (filterKeys && !filterKeys.has(key))) {
			return sum;
		}

		const option = animalOptionByKey[key];
		return sum + Math.ceil(amount / option.unitDivisor);
	}, 0);
}

function sumAnimalAmounts(
	animals: EditableProfileInput['animals'],
	filterKeys: ReadonlySet<AnimalKey>
) {
	return (Object.entries(animals) as Array<[AnimalKey, number]>).reduce(
		(sum, [key, amount]) => (filterKeys.has(key) ? sum + amount : sum),
		0
	);
}

function normalizeObligationAnswer(value: string) {
	return value === 'yes' || value === 'no' || value === 'na' ? value : 'na';
}

function addCertificationProfiles(
	target: Map<string, string>,
	profileMap: Record<number, string | readonly string[]>,
	value: number
) {
	const profiles = profileMap[value];

	if (!profiles) {
		return;
	}

	for (const profile of Array.isArray(profiles) ? profiles : [profiles]) {
		addProfile(target, profile);
	}
}

function addProfile(target: Map<string, string>, profileName: string) {
	target.set(normalizeProfileKey(profileName), profileName);
}

function normalizeCertificationValue(value: number) {
	const parsed = Number(value);
	return [0, 1, 2, 3].includes(parsed) ? parsed : 0;
}

export function normalizeProfileKey(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '')
		.toLowerCase();
}
