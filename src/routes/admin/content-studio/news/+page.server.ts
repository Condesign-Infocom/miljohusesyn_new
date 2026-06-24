import { fail, redirect } from '@sveltejs/kit';
import { requireContentStudioUser } from '$lib/server/auth';
import {
	createNewsItem,
	deleteNewsItem,
	loadContentStudioNews
} from '$lib/server/services/content-studio';

export const load = async ({ locals, url }) => {
	const user = requireContentStudioUser(locals, url);

	return {
		user,
		...(await loadContentStudioNews())
	};
};

export const actions = {
	create: async ({ locals, url }) => {
		requireContentStudioUser(locals, url);
		const item = await createNewsItem({});
		throw redirect(303, `/admin/content-studio/news/${item.id}`);
	},
	delete: async ({ locals, request, url }) => {
		requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const newsId = String(formData.get('newsId') ?? '').trim();

		if (!newsId) {
			return fail(400, { success: '', errors: { form: 'Välj en nyhet att ta bort.' } });
		}

		await deleteNewsItem({ newsId });

		return {
			success: 'Nyheten togs bort.',
			errors: {}
		};
	}
};
