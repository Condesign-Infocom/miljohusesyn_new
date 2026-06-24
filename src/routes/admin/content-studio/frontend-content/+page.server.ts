import { fail, redirect } from '@sveltejs/kit';
import { requireContentStudioUser } from '$lib/server/auth';
import { buildStandardContentDisplayRows } from '$lib/server/services/content-studio-display';
import {
	buildFrontendContentDisplayRows,
	listMissingFrontendContentPresets
} from '$lib/server/services/content-studio-frontend-content';
import {
	createFrontendContentItem,
	deleteFrontendContentItem,
	loadContentStudioStandardContent
} from '$lib/server/services/content-studio';

export const load = async ({ locals, url }) => {
	requireContentStudioUser(locals, url);
	const result = await loadContentStudioStandardContent();
	const items = buildFrontendContentDisplayRows(buildStandardContentDisplayRows(result.items));

	return {
		latestSnapshot: result.latestSnapshot,
		items,
		availablePages: listMissingFrontendContentPresets(result.items)
	};
};

export const actions = {
	create: async ({ locals, request, url }) => {
		requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const sourceTitle = String(formData.get('sourceTitle') ?? '').trim();

		if (!sourceTitle) {
			return fail(400, { success: '', errors: { form: 'Välj en publik sida att lägga till.' } });
		}

		const item = await createFrontendContentItem({ sourceTitle });
		throw redirect(303, `/admin/content-studio/standard-content/${item.id}`);
	},
	delete: async ({ locals, request, url }) => {
		requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const blockId = String(formData.get('blockId') ?? '').trim();

		if (!blockId) {
			return fail(400, { success: '', errors: { form: 'Välj en publik sida att ta bort.' } });
		}

		await deleteFrontendContentItem({ blockId });

		return {
			success: 'Den publika sidan togs bort.',
			errors: {}
		};
	}
};
