import { activityOptions, animalOptions, reportObligationQuestionOptions } from '$lib/profile-config';
import { createBlankEditableProfileInput, hasCropActivity } from '$lib/profile-logic';
import { validateEditableProfileInput } from '$lib/profile-validation';
import type { EditableProfileInput } from '$lib/types/profile';

export function readEditableProfileInput(formData: FormData): EditableProfileInput {
	const values = createBlankEditableProfileInput();

	values.displayName = String(formData.get('displayName') ?? '');
	values.phone = String(formData.get('phone') ?? '');
	values.companyName = String(formData.get('companyName') ?? '');
	values.companyOrgNum = String(formData.get('companyOrgNum') ?? '');
	values.companyAddress1 = String(formData.get('companyAddress1') ?? '');
	values.companyPostcode = String(formData.get('companyPostcode') ?? '');
	values.companyCity = String(formData.get('companyCity') ?? '');
	values.areas = {
		cropHa: String(formData.get('cropHa') ?? ''),
		pastureHa: String(formData.get('pastureHa') ?? '')
	};
	values.activities = Object.fromEntries(
		activityOptions.map((option) => [option.key, formData.get(option.key) === 'on'])
	) as EditableProfileInput['activities'];
	values.certifications = {
		crop: numberValue(formData.get('cropCertification')),
		animal: numberValue(formData.get('animalCertification'))
	};
	values.foodProcessing = {
		animalProducts: formData.get('foodAnimalProcessing') === 'on',
		vegetableProducts: formData.get('foodVegetableProcessing') === 'on'
	};
	values.settings = {
		RQ1: formData.get('RQ1') === 'on',
		RQ2: formData.get('RQ2') === 'on',
		RQ3: formData.get('RQ3') === 'on',
		RQ4: formData.get('RQ4') === 'on',
		Anmalningsplikt: false,
		Tillstandsplikt: false,
		AP1: false,
		TP1: false,
		TP3: false
	};
	values.animals = Object.fromEntries(
		animalOptions.map((option) => [option.key, numberValue(formData.get(option.formKey))])
	) as EditableProfileInput['animals'];
	values.obligationAnswers = Object.fromEntries(
		reportObligationQuestionOptions.map((question) => [
			question.key,
			String(formData.get(question.key) ?? 'na')
		])
	) as EditableProfileInput['obligationAnswers'];

	return values;
}

function numberValue(value: FormDataEntryValue | null) {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}
