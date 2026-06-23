import { requireContentStudioUser } from '$lib/server/auth';
import { createDb } from '$lib/server/db/client';
import { getAdminReportingSummary } from '$lib/server/services/admin-reporting';

export const load = async ({ locals, url }) => {
	requireContentStudioUser(locals, url);

	const db = createDb();
	const reporting = await getAdminReportingSummary(db);

	return {
		reporting
	};
};
