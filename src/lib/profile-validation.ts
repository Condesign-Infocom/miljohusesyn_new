import { hasCropActivity } from '$lib/profile-logic';
import type { EditableProfileInput } from '$lib/types/profile';

export function validateEditableProfileInput(values: EditableProfileInput) {
	const errors: Record<string, string> = {};

	if (!values.displayName.trim()) {
		errors.displayName = 'Ange ett namn att visa i systemet.';
	}

	if (!values.companyName.trim()) {
		errors.companyName = 'Ange företagsnamn eller namn.';
	}

	if (
		!Object.values(values.activities).some(Boolean) &&
		!Object.values(values.animals).some((amount) => amount > 0)
	) {
		errors.activities = 'Välj minst en verksamhet eller ange djuruppgifter.';
	}

	if (hasCropActivity(values.activities) && !values.areas.cropHa.trim()) {
		errors.cropHa = 'Ange antal hektar åker för odling.';
	}

	if (
		(values.activities.djurhallning ||
			Object.values(values.animals).some((amount) => amount > 0)) &&
		!values.areas.pastureHa.trim()
	) {
		errors.pastureHa = 'Ange antal hektar bete för djurhållning.';
	}

	if (values.activities.livsmedelsforadling && !Object.values(values.foodProcessing).some(Boolean)) {
		errors.foodProcessing =
			'Välj om förädlingen gäller animaliska eller vegetabiliska produkter.';
	}

	return errors;
}
