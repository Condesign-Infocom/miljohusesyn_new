import { error } from '@sveltejs/kit';
import { getPublicCalculatorBySlug } from '$lib/public-site';

export const load = ({ params }) => {
	const calculator = getPublicCalculatorBySlug(params.tool);

	if (!calculator) {
		throw error(404, 'Beräkningen hittades inte.');
	}

	return { calculator };
};
