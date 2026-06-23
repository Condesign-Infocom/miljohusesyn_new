import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';
import { createDb } from '$lib/server/db/client';
import { createRuntimeAdminUser } from '$lib/server/services/admin-users';

const blankValues = {
	email: '',
	username: '',
	displayName: '',
	role: 'user',
	phone: '',
	companyName: '',
	companyOrgNum: '',
	companyAddress1: '',
	companyPostcode: '',
	companyCity: ''
};

export const load = ({ locals, url }) => {
	requireAdmin(locals, url);

	return {
		values: blankValues
	};
};

export const actions = {
	default: async ({ locals, request, url }) => {
		requireAdmin(locals, url);
		const formData = await request.formData();
		const values = {
			email: String(formData.get('email') ?? '').trim(),
			username: String(formData.get('username') ?? '').trim(),
			displayName: String(formData.get('displayName') ?? '').trim(),
			role: String(formData.get('role') ?? 'user').trim(),
			phone: String(formData.get('phone') ?? '').trim(),
			companyName: String(formData.get('companyName') ?? '').trim(),
			companyOrgNum: String(formData.get('companyOrgNum') ?? '').trim(),
			companyAddress1: String(formData.get('companyAddress1') ?? '').trim(),
			companyPostcode: String(formData.get('companyPostcode') ?? '').trim(),
			companyCity: String(formData.get('companyCity') ?? '').trim()
		};
		const errors: Record<string, string> = {};

		if (!values.email || !values.email.includes('@')) {
			errors.email = 'Ange en giltig e-postadress.';
		}

		if (!values.username || values.username.length < 3) {
			errors.username = 'Användarnamn måste vara minst 3 tecken.';
		}

		if (!values.displayName) {
			errors.displayName = 'Ange ett visningsnamn.';
		}

		if (!values.companyName) {
			errors.companyName = 'Ange företagsnamn eller namn.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				values
			});
		}

		let userId: number;

		try {
			const db = createDb();
			userId = await createRuntimeAdminUser(values, db);
		} catch (error) {
			return fail(400, {
				errors: {
					form:
						error instanceof Error ?
							error.message
						:	'Det gick inte att skapa användaren. Kontrollera att e-post och användarnamn är unika.'
				},
				values
			});
		}

		throw redirect(303, `/admin/users/${userId}/profile`);
	}
};
