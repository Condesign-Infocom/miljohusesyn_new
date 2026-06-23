import { error, fail } from '@sveltejs/kit';
import { requireContentStudioUser } from '$lib/server/auth';
import {
	loadFactEditor,
	materializePublishedSnapshot,
	saveFactDraft
} from '$lib/server/services/content-studio';

function readFactValues(formData: FormData) {
	const selectedNodeIds = formData
		.getAll('linkNodeIds')
		.map((value) => String(value).trim())
		.filter(Boolean);
	const unresolvedNodeIds = String(formData.get('unresolvedNodeIds') ?? '')
		.split(/\r?\n/)
		.map((value) => value.trim())
		.filter(Boolean);

	return {
		title: String(formData.get('title') ?? '').trim(),
		bodyHtml: String(formData.get('bodyHtml') ?? '').trim(),
		nodeIds: [...selectedNodeIds, ...unresolvedNodeIds]
	};
}

export const load = async ({ locals, params, url }) => {
	const user = requireContentStudioUser(locals, url);
	const result = await loadFactEditor(params.factId, user.id);

	if (!result.item || !result.draft) {
		error(404, 'Faktan hittades inte.');
	}

	return {
		user,
		...result
	};
};

export const actions = {
	save: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const values = readFactValues(await request.formData());
		const result = await saveFactDraft({
			factId: params.factId,
			userId: user.id,
			values,
			status: 'published'
		});

		if (!result.item || !result.draft) {
			return fail(404, {
				action: 'save',
				errors: { form: 'Faktan hittades inte.' },
				values
			});
		}

		if (Object.keys(result.validation.errors).length > 0) {
			return fail(400, {
				action: 'save',
				errors: result.validation.errors,
				values,
				editor: result
			});
		}

		await materializePublishedSnapshot(result.latestSnapshot?.id);

		return {
			action: 'save',
			success: 'Faktan sparades och publicerades direkt.',
			editor: result
		};
	}
};
