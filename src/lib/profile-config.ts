export const certificationOptions = [
	{ value: 0, label: 'Nej' },
	{ value: 1, label: 'KRAV' },
	{ value: 2, label: 'EU' },
	{ value: 3, label: 'KRAV + EU' }
] as const;

export const activityOptions = [
	{
		key: 'odling',
		label: 'Odling',
		activityName: 'Odling',
		certificationKey: 'crop',
		profileName: 'Ar_vaxtodlare',
		checklists: ['miljohusesyn-a', 'miljohusesyn-g', 'miljohusesyn-v'],
		legacyBaseProfile: 'allmanna'
	},
	{
		key: 'djurhallning',
		label: 'Djurhållning',
		activityName: 'Djurhallning',
		certificationKey: 'animal',
		profileName: 'Har_djur',
		checklists: ['miljohusesyn-a', 'miljohusesyn-g', 'miljohusesyn-d'],
		legacyBaseProfile: 'allmanna'
	},
	{
		key: 'tradgardsforetagPotatisodlare',
		label: 'Trädgårdsföretag / Potatisodlare',
		activityName: 'Tradgardsforetag / Potatisodlare',
		certificationKey: 'crop',
		profileName: 'Tradgardsforetag_Potatisodlare',
		checklists: ['miljohusesyn-a', 'miljohusesyn-g', 'miljohusesyn-v'],
		legacyBaseProfile: 'allmanna',
		description: 'Använd samma odlingsuppgifter som i den gamla registreringen.'
	},
	{
		key: 'biodlingForetag',
		label: 'Biodling företag',
		activityName: 'Biodling Foretag',
		certificationKey: null,
		profileName: 'Biodling_Foretag',
		checklists: ['miljohusesyn-a'],
		legacyBaseProfile: 'arbetsmiljo'
	},
	{
		key: 'biodlingHobby',
		label: 'Biodling hobby',
		activityName: 'Biodling Hobby',
		certificationKey: null,
		profileName: 'Biodling_Hobby',
		checklists: [],
		legacyBaseProfile: 'none'
	},
	{
		key: 'ovrigt',
		label: 'Övrigt',
		activityName: 'Ovrigt',
		certificationKey: null,
		profileName: 'Ovrigt',
		checklists: ['miljohusesyn-a', 'miljohusesyn-g'],
		legacyBaseProfile: 'allmanna'
	},
	{
		key: 'livsmedelsforadling',
		label: 'Livsmedelsförädling',
		activityName: 'Livsmedelsforadling',
		certificationKey: null,
		profileName: 'Livsmedelsforadling',
		checklists: ['miljohusesyn-a', 'miljohusesyn-g'],
		legacyBaseProfile: 'allmanna',
		description: 'Välj sedan om verksamheten gäller animaliska eller vegetabiliska produkter.'
	}
] as const;

export const foodProcessingOptions = [
	{
		key: 'animalProducts',
		label: 'Animaliska produkter',
		description: 'Mejeri, slakt, chark, ägg eller annan förädling av animaliska råvaror.',
		activityName: 'Livsmedelsforadling animaliska produkter',
		profileName: 'Livsmedelsforadling_animalier'
	},
	{
		key: 'vegetableProducts',
		label: 'Vegetabiliska produkter och foder',
		description: 'Frukt, bär, grönsaker, spannmål, foder eller annan vegetabilisk förädling.',
		activityName: 'Livsmedelsforadling vegetabiliska produkter och foder',
		profileName: 'Livsmedelsforadling_vegetabilier'
	}
] as const;

export const farmSettingOptions = [
	{ key: 'RQ1', label: 'Har ditt företag anställda / inhyrd personal / praktikanter?' },
	{ key: 'RQ4', label: 'Har företaget 10 arbetstagare eller fler?' },
	{ key: 'RQ2', label: 'Inom vattenskyddsområde?' },
	{ key: 'RQ3', label: 'Kyl, värme eller klimatanläggning?' }
] as const;

export const obligationSettingOptions = [
	{ key: 'Anmalningsplikt', label: 'Anmälningspliktig verksamhet' },
	{ key: 'Tillstandsplikt', label: 'Tillståndspliktig verksamhet' },
	{ key: 'AP1', label: 'Mer än 100 djurenheter' },
	{ key: 'TP1', label: 'Mer än 400 djurenheter' },
	{
		key: 'TP3',
		label: '40 000 platser för fjäderfä eller 2 000 platser för slaktsvin eller 750 platser för suggor'
	}
] as const;

export const reportObligationQuestionOptions = [
	{
		key: 'AP2',
		label:
			'Anläggning för förbränning med en total installerad tillförd effekt över 500 kW av annat bränsle än enbart eldningsolja eller bränslegas',
		audience: ['animalProducts', 'vegetableProducts'],
		legacyIndex: 1,
		scope: 'both'
	},
	{
		key: 'AP3',
		label: 'Tvättning och rensning av frukt, bär, rotfrukter eller grönsaker över 2 000 ton råvara',
		audience: ['vegetableProducts'],
		legacyIndex: 2,
		scope: 'vegetable'
	},
	{
		key: 'AP4',
		label: 'Tillverkning av mer än 5 000 ton bruksfärdigt spannmålsfoder till försäljning',
		audience: ['vegetableProducts'],
		legacyIndex: 3,
		scope: 'vegetable'
	},
	{
		key: 'AP5',
		label: 'Anläggning för mellanlagring av avfall över 10 ton vid något enskilt tillfälle',
		audience: ['animalProducts', 'vegetableProducts'],
		legacyIndex: 4,
		scope: 'both'
	},
	{
		key: 'AP6',
		label: 'Uppodling av annan mark än jordbruksmark för produktion av foder eller livsmedel',
		audience: ['vegetableProducts'],
		legacyIndex: 5,
		scope: 'vegetable'
	}
] as const;

export const reportObligationAnswerOptions = [
	{ value: 'yes', label: 'Ja' },
	{ value: 'no', label: 'Nej' },
	{ value: 'na', label: 'Ej akt.' }
] as const;

export const animalGroupOptions = [
	{ key: 'cattle', label: 'Nötkreatur och häst' },
	{ key: 'pigs', label: 'Grisar' },
	{ key: 'poultry', label: 'Fjäderfä' },
	{ key: 'smallLivestock', label: 'Får, getter och kaniner' }
] as const;

export const animalOptions = [
	{
		key: 'dairyCattle',
		label: 'Mjölkkor',
		group: 'cattle',
		formKey: 'animal-dairycattle',
		unitDivisor: 1,
		unitLabel: '1 mjölkko'
	},
	{
		key: 'calfCattle',
		label: 'Kalvar, 1+ månad',
		group: 'cattle',
		formKey: 'animal-calfcattle',
		unitDivisor: 6,
		unitLabel: '6 kalvar'
	},
	{
		key: 'otherCattle',
		label: 'Övriga nöt, 6+ månader',
		group: 'cattle',
		formKey: 'animal-othercattle',
		unitDivisor: 3,
		unitLabel: '3 övriga nöt'
	},
	{
		key: 'horses',
		label: 'Hästar',
		group: 'cattle',
		formKey: 'animal-horses',
		unitDivisor: 1,
		unitLabel: '1 häst'
	},
	{
		key: 'sowAndPiglets',
		label: 'Suggor inkl. smågrisar',
		group: 'pigs',
		formKey: 'animal-sowandpiglets',
		unitDivisor: 3,
		unitLabel: '3 suggor'
	},
	{
		key: 'slaughterPigs',
		label: 'Slaktsvin och avelsgaltar',
		group: 'pigs',
		formKey: 'animal-slaughterpigs',
		unitDivisor: 10,
		unitLabel: '10 slaktsvin'
	},
	{
		key: 'poultry',
		label: 'Värphöns eller kycklingmödrar',
		group: 'poultry',
		formKey: 'animal-poultry',
		unitDivisor: 100,
		unitLabel: '100 värphöns'
	},
	{
		key: 'pullets',
		label: 'Unghöns',
		group: 'poultry',
		formKey: 'animal-pullets',
		unitDivisor: 200,
		unitLabel: '200 unghöns'
	},
	{
		key: 'broilers',
		label: 'Slaktkyckling',
		group: 'poultry',
		formKey: 'animal-broilers',
		unitDivisor: 200,
		unitLabel: '200 slaktkycklingar'
	},
	{
		key: 'breederPoultry',
		label: 'Avelsdjur för slaktkycklingproduktion',
		group: 'poultry',
		formKey: 'animal-breederpoultry',
		unitDivisor: 100,
		unitLabel: '100 avelsdjur'
	},
	{
		key: 'turkeys',
		label: 'Kalkoner',
		group: 'poultry',
		formKey: 'animal-turkeys',
		unitDivisor: 100,
		unitLabel: '100 kalkoner'
	},
	{
		key: 'ducksGees',
		label: 'Ankor eller gäss',
		group: 'poultry',
		formKey: 'animal-ducksgees',
		unitDivisor: 100,
		unitLabel: '100 ankor eller gäss'
	},
	{
		key: 'ostrich',
		label: 'Strutsfåglar',
		group: 'poultry',
		formKey: 'animal-ostrich',
		unitDivisor: 15,
		unitLabel: '15 strutsfåglar'
	},
	{
		key: 'sheep',
		label: 'Får, 6+ månader',
		group: 'smallLivestock',
		formKey: 'animal-sheep',
		unitDivisor: 10,
		unitLabel: '10 får eller getter'
	},
	{
		key: 'lamb',
		label: 'Lamm, upp till 6 månader',
		group: 'smallLivestock',
		formKey: 'animal-lamb',
		unitDivisor: 40,
		unitLabel: '40 lamm eller killingar'
	},
	{
		key: 'goat',
		label: 'Getter, 6+ månader',
		group: 'smallLivestock',
		formKey: 'animal-goat',
		unitDivisor: 10,
		unitLabel: '10 får eller getter'
	},
	{
		key: 'kid',
		label: 'Killingar, upp till 6 månader',
		group: 'smallLivestock',
		formKey: 'animal-kid',
		unitDivisor: 40,
		unitLabel: '40 lamm eller killingar'
	},
	{
		key: 'dairySheep',
		label: 'Mjölkande får',
		group: 'smallLivestock',
		formKey: 'animal-dairysheep',
		unitDivisor: 10,
		unitLabel: '10 får eller getter'
	},
	{
		key: 'dairyGoat',
		label: 'Mjölkande getter',
		group: 'smallLivestock',
		formKey: 'animal-dairygoat',
		unitDivisor: 10,
		unitLabel: '10 får eller getter'
	},
	{
		key: 'rabbits',
		label: 'Kaniner',
		group: 'smallLivestock',
		formKey: 'animal-rabbits',
		unitDivisor: 100,
		unitLabel: '100 kaniner'
	}
] as const;

const animalAliasEntries = [
	['Dairy_cattle', 'dairyCattle'],
	['Calf_cattle', 'calfCattle'],
	['Other_cattle', 'otherCattle'],
	['Sow_and_piglets', 'sowAndPiglets'],
	['Slaughter_pigs', 'slaughterPigs'],
	['Horse', 'horses'],
	['Poultry', 'poultry'],
	['Pullets', 'pullets'],
	['Broilers', 'broilers'],
	['Breeder_Poultry', 'breederPoultry'],
	['Turkeys', 'turkeys'],
	['Ducks_Gees', 'ducksGees'],
	['Ostrich', 'ostrich'],
	['Sheep', 'sheep'],
	['Lamb', 'lamb'],
	['Goat', 'goat'],
	['Kid', 'kid'],
	['Dairy_sheep', 'dairySheep'],
	['Dairy_goat', 'dairyGoat'],
	['Sheep_and_goat', 'sheep'],
	['Dairy_sheep_and_goat', 'dairySheep'],
	['cattle', 'otherCattle'],
	['dairycattle', 'dairyCattle'],
	['pigs', 'slaughterPigs'],
	['goats', 'goat']
] as const;

const activityAliasEntries = [
	['Odling', 'odling'],
	['Djurhallning', 'djurhallning'],
	['Livsmedelsforadling', 'livsmedelsforadling'],
	['Tradgardsforetag / Potatisodlare', 'tradgardsforetagPotatisodlare'],
	['Trädgårdsföretag / Potatisodlare', 'tradgardsforetagPotatisodlare'],
	['Biodling Foretag', 'biodlingForetag'],
	['Biodling Företag', 'biodlingForetag'],
	['Biodling Hobby', 'biodlingHobby'],
	['Ovrigt', 'ovrigt'],
	['Övrigt', 'ovrigt']
] as const;

export type ActivityKey = (typeof activityOptions)[number]['key'];
export type CertificationKey = NonNullable<(typeof activityOptions)[number]['certificationKey']>;
export type FoodProcessingKey = (typeof foodProcessingOptions)[number]['key'];
export type FarmSettingKey = (typeof farmSettingOptions)[number]['key'];
export type ObligationSettingKey = (typeof obligationSettingOptions)[number]['key'];
export type AnimalGroupKey = (typeof animalGroupOptions)[number]['key'];
export type AnimalKey = (typeof animalOptions)[number]['key'];
export type ReportObligationQuestionKey = (typeof reportObligationQuestionOptions)[number]['key'];
export type ReportObligationAnswer = (typeof reportObligationAnswerOptions)[number]['value'];

export function createActivityState() {
	return Object.fromEntries(activityOptions.map((option) => [option.key, false])) as Record<ActivityKey, boolean>;
}

export function createCertificationState() {
	return {
		crop: 0,
		animal: 0
	} as Record<CertificationKey, number>;
}

export function createFoodProcessingState() {
	return Object.fromEntries(foodProcessingOptions.map((option) => [option.key, false])) as Record<
		FoodProcessingKey,
		boolean
	>;
}

export function createSettingState() {
	return Object.fromEntries(
		[...farmSettingOptions, ...obligationSettingOptions].map((option) => [option.key, false])
	) as Record<FarmSettingKey | ObligationSettingKey, boolean>;
}

export function createAnimalState() {
	return Object.fromEntries(animalOptions.map((option) => [option.key, 0])) as Record<AnimalKey, number>;
}

export function createReportObligationAnswerState() {
	return Object.fromEntries(
		reportObligationQuestionOptions.map((option) => [option.key, 'na'])
	) as Record<ReportObligationQuestionKey, ReportObligationAnswer>;
}

const animalKeyAliasMap = new Map<string, AnimalKey>(
	animalOptions.map((option) => [normalizeConfigKey(option.key), option.key as AnimalKey])
);

const activityKeyAliasMap = new Map<string, ActivityKey>(
	activityOptions.map((option) => [normalizeConfigKey(option.key), option.key as ActivityKey])
);

for (const [alias, key] of animalAliasEntries) {
	animalKeyAliasMap.set(normalizeConfigKey(alias), key);
}

for (const [alias, key] of activityAliasEntries) {
	activityKeyAliasMap.set(normalizeConfigKey(alias), key);
}

export function resolveAnimalKey(value: string) {
	return animalKeyAliasMap.get(normalizeConfigKey(value)) ?? null;
}

export function resolveActivityKey(value: string) {
	return activityKeyAliasMap.get(normalizeConfigKey(value)) ?? null;
}

function normalizeConfigKey(value: string) {
	return value.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
}
