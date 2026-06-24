import { error, fail } from '@sveltejs/kit';
import { requireContentStudioUser } from '$lib/server/auth';
import { extractPublicParagraphs } from '$lib/server/services/public-content-format';
import { loadNewsEditor, saveNewsDraft } from '$lib/server/services/content-studio';

function readNewsValues(formData: FormData) {
	return {
		title: String(formData.get('title') ?? '').trim(),
		publishedAt: String(formData.get('publishedAt') ?? '').trim(),
		excerpt: String(formData.get('excerpt') ?? '').trim(),
		bodyHtml: String(formData.get('bodyHtml') ?? '').trim()
	};
}

function toDraftInput(values: ReturnType<typeof readNewsValues>) {
	return {
		title: values.title,
		publishedAt: values.publishedAt,
		excerpt: values.excerpt,
		bodyParagraphs: extractPublicParagraphs(values.bodyHtml)
	};
}

function mapFormErrors(errors: Record<string, string>) {
	return {
		...errors,
		bodyHtml: errors.bodyParagraphs ?? errors.bodyHtml
	};
}

function readPublishStatus(formData: FormData) {
	return String(formData.get('intent') ?? '') === 'publish' ? 'published' : 'in_review';
}

export const load = async ({ locals, params, url }) => {
	const user = requireContentStudioUser(locals, url);
	const result = await loadNewsEditor(params.newsId, user.id);

	if (!result.item || !result.draft) {
		throw error(404, 'Nyheten hittades inte.');
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
		const values = readNewsValues(formData);
		const status = readPublishStatus(formData);
		const result = await saveNewsDraft({
			newsId: params.newsId,
			userId: user.id,
			values: toDraftInput(values),
			status
		});

		if (!result.item || !result.draft) {
			return fail(404, { action: 'save', errors: { form: 'Nyheten hittades inte.' }, values });
		}

		if (Object.keys(result.validation.errors).length > 0) {
			return fail(400, {
				action: 'save',
				errors: mapFormErrors(result.validation.errors),
				values,
				editor: result
			});
		}

		return {
			action: 'save',
			success:
				status === 'published' ? 'Nyheten sparades och publicerades direkt.' : 'Nyheten skickades för godkännande.',
			editor: result
		};
	}
};
