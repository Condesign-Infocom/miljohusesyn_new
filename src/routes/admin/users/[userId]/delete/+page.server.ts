import { error, fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';
import { createDb } from '$lib/server/db/client';
import { deleteRuntimeAdminUser, loadAdminUserDetail } from '$lib/server/services/admin-users';

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
	default: async ({ locals, params, url }) => {
		const adminUser = requireAdmin(locals, url);
		const targetUserId = Number(params.userId);

		if (!Number.isInteger(targetUserId) || targetUserId < 1) {
			return fail(400, {
				errors: {
					form: 'Ogiltig användare.'
				}
			});
		}

		try {
			const db = createDb();
			await deleteRuntimeAdminUser(adminUser.id, targetUserId, db);
		} catch (error) {
			return fail(400, {
				errors: {
					form:
						error instanceof Error ? error.message : 'Det gick inte att ta bort användaren.'
				}
			});
		}

		throw redirect(303, '/admin/users?deleted=1');
	}
};
