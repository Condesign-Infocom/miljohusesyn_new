import { requireAdmin } from '$lib/server/auth';
import { createDb } from '$lib/server/db/client';
import { getAdminReportingSummary } from '$lib/server/services/admin-reporting';
import { getAdminUserStats, listAdminUsers } from '$lib/server/services/admin-users';

export const load = async ({ locals, url }) => {
	requireAdmin(locals, url);

	const db = createDb();
	const search = url.searchParams.get('q')?.trim() ?? '';
	const [users, stats, reporting] = await Promise.all([
		listAdminUsers(db, search),
		getAdminUserStats(db),
		getAdminReportingSummary(db)
	]);

	return {
		deleted: url.searchParams.get('deleted') === '1',
		search,
		users,
		stats,
		reporting
	};
};
