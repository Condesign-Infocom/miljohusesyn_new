import { requireContentStudioUser } from '$lib/server/auth';
import { buildStandardContentDisplayRows } from '$lib/server/services/content-studio-display';
import { loadContentStudioStandardContent } from '$lib/server/services/content-studio';

export const load = async ({ locals, url }) => {
	requireContentStudioUser(locals, url);

	const kind = url.searchParams.get('kind')?.trim() ?? '';
	const result = await loadContentStudioStandardContent();
	const displayItems = buildStandardContentDisplayRows(result.items);
	const availableKinds = Array.from(new Set(displayItems.map((item) => item.contentType))).sort((left, right) =>
		left.localeCompare(right)
	);

	return {
		latestSnapshot: result.latestSnapshot,
		kind,
		availableKinds,
		items: kind ? displayItems.filter((item) => item.contentType === kind) : displayItems
	};
};
