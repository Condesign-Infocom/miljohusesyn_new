import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { createDb } from '$lib/server/db/client';
import {
	loadEditableProfile,
	saveEditableProfile
} from '$lib/server/services/profile-editor';
import { validateEditableProfileInput } from '$lib/profile-validation';
import { readEditableProfileInput } from '$lib/server/services/profile-form';

export const load = async ({ locals, url }) => {
	const user = requireUser(locals, url);
	const db = createDb();
	const profile = await loadEditableProfile(db, user.id);

	if (!profile) {
		throw redirect(303, '/checklists/miljohusesyn');
	}

	return {
		profile,
		saved: url.searchParams.get('saved') === '1'
	};
};

export const actions = {
	default: async ({ locals, request, url }) => {
		const user = requireUser(locals, url);
		const formData = await request.formData();
		const values = readEditableProfileInput(formData);
		const errors = validateEditableProfileInput(values);

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				values
			});
		}

		const db = createDb();
		await saveEditableProfile(db, user.id, values);
		throw redirect(303, '/profile?saved=1');
	}
};
