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

function readPublishStatus(formData: FormData) {
	return String(formData.get('intent') ?? '') === 'publish' ? 'published' : 'in_review';
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
		const formData = await request.formData();
		const values = readFactValues(formData);
		const status = readPublishStatus(formData);
		const result = await saveFactDraft({
			factId: params.factId,
			userId: user.id,
			values,
			status
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

		if (status === 'published') {
			await materializePublishedSnapshot(result.latestSnapshot?.id);
		}

		return {
			action: 'save',
			success:
				status === 'published' ?
					'Faktan sparades och publicerades direkt.'
				:	'Faktan skickades för godkännande.',
			editor: result
		};
	}
};
