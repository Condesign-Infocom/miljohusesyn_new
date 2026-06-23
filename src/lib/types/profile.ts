import type {
	ActivityKey,
	AnimalKey,
	CertificationKey,
	FoodProcessingKey,
	FarmSettingKey,
	ObligationSettingKey,
	ReportObligationAnswer,
	ReportObligationQuestionKey
} from '$lib/profile-config';

export type ComputedObligationSummary = {
	animalUnits: number;
	totalAnimals: number;
	cattleUnits: number;
	poultryPlaces: number;
	ap1: boolean;
	tp1: boolean;
	tp3: boolean;
	moreThan40000Poultries: boolean;
	moreThan2000SlaughterPigs: boolean;
	moreThan750Sows: boolean;
	anmalningsplikt: boolean;
	tillstandsplikt: boolean;
};

export type EditableProfileData = {
	username: string;
	displayName: string;
	email: string;
	phone: string;
	companyName: string;
	companyOrgNum: string;
	companyAddress1: string;
	companyPostcode: string;
	companyCity: string;
	areas: {
		cropHa: string;
		pastureHa: string;
	};
	activities: Record<ActivityKey, boolean>;
	certifications: Record<CertificationKey, number>;
	foodProcessing: Record<FoodProcessingKey, boolean>;
	settings: Record<FarmSettingKey | ObligationSettingKey, boolean>;
	animals: Record<AnimalKey, number>;
	obligationAnswers: Record<ReportObligationQuestionKey, ReportObligationAnswer>;
	computedObligations: ComputedObligationSummary;
	derivedProfiles: string[];
	assignedChecklistSlugs: string[];
};

export type EditableProfileInput = Omit<
	EditableProfileData,
	'username' | 'email' | 'computedObligations' | 'derivedProfiles' | 'assignedChecklistSlugs'
>;
