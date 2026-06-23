import { json } from '@sveltejs/kit';
import { createDb } from '$lib/server/db/client';
import { getFactDetail } from '$lib/server/services/facts';

export const GET = async ({ params }) => {
	const db = createDb();
	const fact = await getFactDetail(db, params.nodeId);

	if (!fact) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	return json(fact);
};
