import { requireContentStudioUser } from '$lib/server/auth';
import { buildStandardContentDisplayRows } from '$lib/server/services/content-studio-display';
import { buildFrontendContentDisplayRows } from '$lib/server/services/content-studio-frontend-content';
import { loadContentStudioStandardContent } from '$lib/server/services/content-studio';

export const load = async ({ locals, url }) => {
	const user = requireContentStudioUser(locals, url);
	const result = await loadContentStudioStandardContent();
	const items = buildFrontendContentDisplayRows(buildStandardContentDisplayRows(result.items));

	return {
		user,
		latestSnapshot: result.latestSnapshot,
		items
	};
};
