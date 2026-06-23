import { listPublishedPublicNews } from '$lib/server/services/public-news';

export const load = async () => ({
	items: await listPublishedPublicNews()
});
