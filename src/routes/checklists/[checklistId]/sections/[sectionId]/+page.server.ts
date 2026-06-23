import { error } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { createDb } from '$lib/server/db/client';
import { getChecklistSectionDetail } from '$lib/server/services/checklists';

export const load = async ({ locals, params, url }) => {
	const user = requireUser(locals, url);
	const db = createDb();
	const detail = await getChecklistSectionDetail(db, params.checklistId, params.sectionId, user.id);

	if (!detail) {
		error(404, 'Section not found');
	}

	return detail;
};
