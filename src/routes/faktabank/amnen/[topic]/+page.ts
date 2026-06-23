import { error } from '@sveltejs/kit';
import { getFactTopicBySlug } from '$lib/public-site';

export const load = ({ params }) => {
	const topic = getFactTopicBySlug(params.topic);

	if (!topic) {
		throw error(404, 'Ämnesområdet hittades inte.');
	}

	return { topic };
};
