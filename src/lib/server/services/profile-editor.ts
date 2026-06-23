import {
	createActivityState,
	createAnimalState,
	createCertificationState,
	createFoodProcessingState,
	createReportObligationAnswerState,
	foodProcessingOptions,
	resolveActivityKey,
	resolveAnimalKey,
	createSettingState
} from '$lib/profile-config';
import {
	buildChecklistSlugSet,
	computeObligationSummary,
	createBlankEditableProfileInput,
	deriveProfileNames,
	hasCropActivity,
	normalizeEditableProfileInput,
	normalizeProfileKey
} from '$lib/profile-logic';
import type { EditableProfileData, EditableProfileInput } from '$lib/types/profile';
import { getRuntimeDbEngine, type AppDb } from '../db/client';
import { createRuntimeGateway } from '../db/runtime-gateway';
import {
	mirrorChecklistToRuntimePostgres,
	mirrorProfileUpdateEventToRuntimePostgres,
	mirrorUserToRuntimePostgres,
	replaceChecklistAssignmentsInRuntimePostgres,
	replaceUserActivitiesInRuntimePostgres,
	replaceUserAnimalTypesInRuntimePostgres,
	replaceUserProfilesInRuntimePostgres,
	replaceUserSettingsInRuntimePostgres
} from '../db/runtime-postgres-shadow';
import { replaceRuntimeEditableProfileState } from '../db/runtime-write-repository';

const cropAreaKey = 'Odlingsarealer';
const pastureAreaKey = 'Betesarealer';
const foodAnimalKey = 'foodAnimalProcessing';
const foodVegetableKey = 'foodVegetableProcessing';
const foodProcessingActivityMap = new Map(
	foodProcessingOptions.map((option) => [normalizeProfileKey(option.activityName), option.key])
);

export async function loadEditableProfile(db: AppDb, userId: number): Promise<EditableProfileData | null> {
	const { user } = await createRuntimeGateway(db).loadEditableProfileSeedData(userId);

	if (!user) {
		return null;
	}

	const settings = createSettingState();
	const activities = createActivityState();
	const certifications = createCertificationState();
	const foodProcessing = createFoodProcessingState();
	const animals = createAnimalState();
	const obligationAnswers = createReportObligationAnswerState();
	const areas = {
		cropHa: '',
		pastureHa: ''
	};

	for (const setting of user.settings) {
		if (setting.key in settings) {
			settings[setting.key as keyof typeof settings] = isTruthy(setting.value);
			continue;
		}

		if (setting.key === cropAreaKey) {
			areas.cropHa = setting.value;
			continue;
		}

		if (setting.key === pastureAreaKey) {
			areas.pastureHa = setting.value;
			continue;
		}

		if (setting.key === foodAnimalKey) {
			foodProcessing.animalProducts = isTruthy(setting.value);
			continue;
		}

		if (setting.key === foodVegetableKey) {
			foodProcessing.vegetableProducts = isTruthy(setting.value);
			continue;
		}

		if (setting.key in obligationAnswers) {
			obligationAnswers[setting.key as keyof typeof obligationAnswers] = normalizeAnswerValue(setting.value);
		}
	}

	for (const activity of user.activities) {
		const key = resolveActivityKey(activity.activityName) ?? resolveActivityKey(normalizeProfileKey(activity.activityName));

		if (!key) {
			const foodProcessingKey = foodProcessingActivityMap.get(normalizeProfileKey(activity.activityName));

			if (foodProcessingKey) {
				foodProcessing[foodProcessingKey] = true;
			}

			continue;
		}

		activities[key] = true;

		if (key === 'odling' || key === 'tradgardsforetagPotatisodlare') {
			certifications.crop = Math.max(certifications.crop, activity.certified ?? 0);
		}

		if (key === 'djurhallning') {
			certifications.animal = activity.certified ?? 0;
		}
	}

	for (const animal of user.animalTypes) {
		const key = resolveAnimalKey(animal.animalKey) ?? resolveAnimalKey(normalizeProfileKey(animal.animalKey));

		if (key) {
			animals[key] += animal.amount;
		}
	}

	const input = normalizeEditableProfileInput({
		...createBlankEditableProfileInput(),
		displayName: user.displayName,
		phone: user.phone,
		companyName: user.companyName,
		companyOrgNum: user.companyOrgNum,
		companyAddress1: user.companyAddress1,
		companyPostcode: user.companyPostcode,
		companyCity: user.companyCity,
		areas,
		activities,
		certifications,
		foodProcessing,
		settings,
		animals,
		obligationAnswers
	});

	return {
		username: user.username,
		displayName: input.displayName,
		email: user.email,
		phone: input.phone,
		companyName: input.companyName,
		companyOrgNum: input.companyOrgNum,
		companyAddress1: input.companyAddress1,
		companyPostcode: input.companyPostcode,
		companyCity: input.companyCity,
		areas: input.areas,
		activities: input.activities,
		certifications: input.certifications,
		foodProcessing: input.foodProcessing,
		settings: input.settings,
		animals: input.animals,
		obligationAnswers: input.obligationAnswers,
		computedObligations: computeObligationSummary(input),
		derivedProfiles: user.profiles.map((profile) => profile.profileName).sort((left, right) => left.localeCompare(right)),
		assignedChecklistSlugs: user.checklistAssignments.map((assignment) => assignment.checklist.slug).sort()
	};
}

export {
	buildChecklistSlugSet,
	computeObligationSummary,
	createBlankEditableProfileInput,
	deriveProfileNames,
	hasCropActivity
};

export async function saveEditableProfile(db: AppDb, userId: number, input: EditableProfileInput) {
	const normalizedInput = normalizeEditableProfileInput(input);
	const profileUpdateEventId = await replaceRuntimeEditableProfileState(db, {
		userId,
		input: normalizedInput,
		isAdmin: false
	});

	if (getRuntimeDbEngine() === 'postgres') {
		return profileUpdateEventId;
	}

	const {
		user,
		settings,
		activities,
		animalTypes,
		profiles,
		assignments,
		checklistsById,
		profileUpdateEvent
	} = await createRuntimeGateway(db).loadProfileMirrorData(userId, profileUpdateEventId);

	if (!user) {
		return;
	}

	await mirrorUserToRuntimePostgres(user);
	await replaceUserSettingsInRuntimePostgres(userId, settings);
	await replaceUserActivitiesInRuntimePostgres(userId, activities);
	await replaceUserAnimalTypesInRuntimePostgres(userId, animalTypes);
	await replaceUserProfilesInRuntimePostgres(userId, profiles);
	for (const assignment of assignments) {
		const checklist = checklistsById.get(assignment.checklistId);

		if (checklist) {
			await mirrorChecklistToRuntimePostgres(checklist);
		}
	}
	await replaceChecklistAssignmentsInRuntimePostgres(userId, assignments);

	if (profileUpdateEvent) {
		await mirrorProfileUpdateEventToRuntimePostgres(profileUpdateEvent);
	}
}

function normalizeAnswerValue(value: string) {
	if (value === 'yes' || value === '1') {
		return 'yes';
	}

	if (value === 'no' || value === '2') {
		return 'no';
	}

	if (value === 'na' || value === '3') {
		return 'na';
	}

	return 'na';
}

function isTruthy(value: string) {
	return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}
