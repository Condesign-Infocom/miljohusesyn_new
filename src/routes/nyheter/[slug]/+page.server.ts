import { error } from '@sveltejs/kit';
import { getPublishedPublicNewsBySlug } from '$lib/server/services/public-news';

export const load = async ({ params }) => {
	const item = await getPublishedPublicNewsBySlug(params.slug);

	if (!item) {
		throw error(404, 'Nyheten hittades inte.');
	}

	return { item };
};
