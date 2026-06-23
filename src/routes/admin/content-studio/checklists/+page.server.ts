import { redirect } from '@sveltejs/kit';
import { requireContentStudioUser } from '$lib/server/auth';
import { loadContentStudioChecklists } from '$lib/server/services/content-studio';

export const load = async ({ locals, url }) => {
	requireContentStudioUser(locals, url);

	const result = await loadContentStudioChecklists();

	if (result.items[0]) {
		redirect(307, `/admin/content-studio/checklists/${encodeURIComponent(result.items[0].id)}`);
	}

	return {
		latestSnapshot: result.latestSnapshot,
		search: '',
		items: result.items
	};
};
