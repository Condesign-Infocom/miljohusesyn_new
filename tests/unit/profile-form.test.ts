import { describe, expect, it } from 'vitest';
import { readEditableProfileInput } from '$lib/server/services/profile-form';
import { validateEditableProfileInput } from '$lib/profile-validation';

describe('profile form helpers', () => {
	it('reads editable profile values from form data', () => {
		const formData = new FormData();
		formData.set('displayName', 'Demo User');
		formData.set('companyName', 'Demo Farm');
		formData.set('odling', 'on');
		formData.set('cropHa', '14');
		formData.set('foodAnimalProcessing', 'on');
		formData.set('animal-dairycattle', '7');
		formData.set('AP2', 'yes');

		const values = readEditableProfileInput(formData);

		expect(values.displayName).toBe('Demo User');
		expect(values.companyName).toBe('Demo Farm');
		expect(values.activities.odling).toBe(true);
		expect(values.areas.cropHa).toBe('14');
		expect(values.foodProcessing.animalProducts).toBe(true);
		expect(values.animals.dairyCattle).toBe(7);
		expect(values.obligationAnswers.AP2).toBe('yes');
	});

	it('validates the same legacy-style requirements used by profile editing', () => {
		const formData = new FormData();
		formData.set('displayName', ' ');
		formData.set('companyName', '');

		const values = readEditableProfileInput(formData);
		const errors = validateEditableProfileInput(values);

		expect(errors.displayName).toBeTruthy();
		expect(errors.companyName).toBeTruthy();
		expect(errors.activities).toBeTruthy();
	});

	it('requires a food processing subtype when legacy food activity is selected', () => {
		const formData = new FormData();
		formData.set('displayName', 'Food User');
		formData.set('companyName', 'Food Farm');
		formData.set('livsmedelsforadling', 'on');

		const values = readEditableProfileInput(formData);
		const errors = validateEditableProfileInput(values);

		expect(errors.foodProcessing).toBeTruthy();
	});
});
