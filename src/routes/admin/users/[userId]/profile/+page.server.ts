import { error, fail, redirect } from '@sveltejs/kit';
import { validateEditableProfileInput } from '$lib/profile-validation';
import { requireAdmin } from '$lib/server/auth';
import { createDb } from '$lib/server/db/client';
import { loadAdminUserDetail } from '$lib/server/services/admin-users';
import { readEditableProfileInput } from '$lib/server/services/profile-form';
import { saveEditableProfile } from '$lib/server/services/profile-editor';

export const load = async ({ locals, params, url }) => {
	requireAdmin(locals, url);
	const userId = Number(params.userId);

	if (!Number.isInteger(userId) || userId < 1) {
		error(404, 'User not found.');
	}

	const db = createDb();
	const user = await loadAdminUserDetail(db, userId);

	if (!user?.profile) {
		error(404, 'User profile not found.');
	}

	return {
		userId,
		user,
		profile: user.profile,
		saved: url.searchParams.get('saved') === '1'
	};
};

export const actions = {
	default: async ({ locals, params, request, url }) => {
		requireAdmin(locals, url);
		const targetUserId = Number(params.userId);

		if (!Number.isInteger(targetUserId) || targetUserId < 1) {
			return fail(400, {
				errors: {
					form: 'Ogiltig anvandare.'
				}
			});
		}

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
		await saveEditableProfile(db, targetUserId, values);
		throw redirect(303, `/admin/users/${targetUserId}/profile?saved=1`);
	}
};
