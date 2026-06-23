import { createDb } from '$lib/server/db/client';
import { requireUser } from '$lib/server/auth';
import { getChecklistList } from '$lib/server/services/checklists';

export const load = async ({ locals, url }) => {
	const user = requireUser(locals, url);
	const db = createDb();
	return getChecklistList(db, user.id);
};
