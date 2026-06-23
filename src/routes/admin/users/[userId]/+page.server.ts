import { error, fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';
import { createDb } from '$lib/server/db/client';
import {
	loadAdminUserDetail,
	resetRuntimeAdminUserPassword,
	updateRuntimeAdminUserAccount
} from '$lib/server/services/admin-users';

export const load = async ({ locals, params, url }) => {
	const adminUser = requireAdmin(locals, url);
	const userId = Number(params.userId);

	if (!Number.isInteger(userId) || userId < 1) {
		error(404, 'User not found.');
	}

	const db = createDb();
	const user = await loadAdminUserDetail(db, userId);

	if (!user) {
		error(404, 'User not found.');
	}

	return {
		adminUserId: adminUser.id,
		user
	};
};

export const actions = {
	update: async ({ locals, params, request, url }) => {
		const adminUser = requireAdmin(locals, url);
		const targetUserId = Number(params.userId);
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

		if (!Number.isInteger(targetUserId) || targetUserId < 1) {
			errors.form = 'Ogiltig användare.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				action: 'update',
				errors,
				values
			});
		}

		try {
			const db = createDb();
			await updateRuntimeAdminUserAccount(
				{
				editorUserId: adminUser.id,
				targetUserId,
				values
				},
				db
			);

			return {
				action: 'update',
				success: 'Användaruppgifterna är sparade.'
			};
		} catch (error) {
			return fail(400, {
				action: 'update',
				errors: {
					form:
						error instanceof Error ?
							error.message
						:	'Det gick inte att spara användaren. Kontrollera att e-post och användarnamn är unika.'
				},
				values
			});
		}
	},
	resetPassword: async ({ locals, params, url }) => {
		requireAdmin(locals, url);
		const targetUserId = Number(params.userId);

		if (!Number.isInteger(targetUserId) || targetUserId < 1) {
			return fail(400, {
				action: 'resetPassword',
				errors: {
					form: 'Ogiltig användare.'
				}
			});
		}

		const db = createDb();
		await resetRuntimeAdminUserPassword(targetUserId, db);

		return {
			action: 'resetPassword',
			success: 'Lösenordet är återställt till demo123.'
		};
	}
};
