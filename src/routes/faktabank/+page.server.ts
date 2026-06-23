import { listPublishedPublicFacts } from '$lib/server/services/public-facts';
import { searchPublicContent, type PublicSearchScope } from '$lib/server/services/public-search';
import { listPublishedPublicStandardContent } from '$lib/server/services/public-standard-content';

export const load = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	const rawScope = url.searchParams.get('scope')?.trim();
	const scope: PublicSearchScope =
		rawScope === 'wp' || rawScope === 'exist' || rawScope === 'all' ? rawScope : 'all';

	return {
		query,
		scope,
		searchResults: query ? await searchPublicContent(query, scope) : [],
		publishedFacts: await listPublishedPublicFacts(),
		publishedStandardContent: await listPublishedPublicStandardContent()
	};
};
