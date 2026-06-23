import { listHomepagePublicNews } from '$lib/server/services/public-news';

export const load = async () => ({
	homepageNews: await listHomepagePublicNews()
});
