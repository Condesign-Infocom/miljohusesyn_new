import { error } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { createDb } from '$lib/server/db/client';
import { getChecklistOverview } from '$lib/server/services/checklists';

export const load = async ({ locals, params, url }) => {
	const user = requireUser(locals, url);
	const db = createDb();
	const overview = await getChecklistOverview(db, params.checklistId, user.id);

	if (!overview) {
		error(404, 'Checklist not found');
	}

	return {
		...overview,
		canExportComplete: user.role === 'admin'
	};
};
