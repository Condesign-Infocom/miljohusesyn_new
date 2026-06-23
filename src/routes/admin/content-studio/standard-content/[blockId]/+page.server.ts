import { error, fail } from '@sveltejs/kit';
import { requireContentStudioUser } from '$lib/server/auth';
import { buildStandardContentDisplayRows } from '$lib/server/services/content-studio-display';
import { getFrontendContentMeta } from '$lib/server/services/content-studio-frontend-content';
import {
	loadContentStudioStandardContent,
	loadStandardContentEditor,
	saveStandardContentDraft
} from '$lib/server/services/content-studio';

function readStandardContentValues(formData: FormData) {
	return {
		title: String(formData.get('title') ?? '').trim(),
		bodyHtml: String(formData.get('bodyHtml') ?? '').trim(),
		targets: String(formData.get('targets') ?? '')
			.split(/\r?\n/)
			.map((value) => value.trim())
			.filter(Boolean)
	};
}

export const load = async ({ locals, params, url }) => {
	const user = requireContentStudioUser(locals, url);
	const result = await loadStandardContentEditor(params.blockId, user.id);

	if (!result.item || !result.draft) {
		error(404, 'Standardtexten hittades inte.');
	}

	const catalog = await loadContentStudioStandardContent({ snapshotId: result.latestSnapshot?.id });
	const displayItem =
		buildStandardContentDisplayRows(catalog.items).find(
			(item) =>
				item.id === result.item?.id ||
				item.sourceRowId === result.item?.sourceRowId ||
				item.blockId === result.item?.blockId
		) ?? null;

	return {
		user,
		...result,
		displayItem,
		frontendMeta: result.item ? getFrontendContentMeta(result.item.title) : null
	};
};

export const actions = {
	save: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const values = readStandardContentValues(await request.formData());
		const result = await saveStandardContentDraft({
			blockId: params.blockId,
			userId: user.id,
			values,
			status: 'published'
		});

		if (!result.item || !result.draft) {
			return fail(404, { action: 'save', errors: { form: 'Standardtexten hittades inte.' }, values });
		}

		if (Object.keys(result.validation.errors).length > 0) {
			return fail(400, { action: 'save', errors: result.validation.errors, values, editor: result });
		}

		return { action: 'save', success: 'Texten sparades och publicerades direkt.', editor: result };
	}
};
