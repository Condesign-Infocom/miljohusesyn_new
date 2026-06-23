import { error } from '@sveltejs/kit';
import { getDownloadResourcesByTitle, getStaticFactPageBySlug } from '$lib/public-site';
import { getPublishedPublicFactBySlug } from '$lib/server/services/public-facts';
import { getPublishedPublicStandardContentBySlug } from '$lib/server/services/public-standard-content';

export const load = async ({ params }) => {
	const fact = await getPublishedPublicFactBySlug(params.slug);

	if (fact) {
		return {
			item: {
				...fact,
				kind: 'fact' as const
			}
		};
	}

	const standardContent = await getPublishedPublicStandardContentBySlug(params.slug);

	if (standardContent) {
		return {
			item: {
				...standardContent,
				kind: 'standard' as const
			}
		};
	}

	const staticPage = getStaticFactPageBySlug(params.slug);

	if (staticPage) {
		return {
			item: {
				...staticPage,
				relatedDownloads: getDownloadResourcesByTitle(staticPage.relatedDownloads ?? []),
				kind: 'static' as const
			}
		};
	}

	throw error(404, 'Faktasidan hittades inte.');
};
