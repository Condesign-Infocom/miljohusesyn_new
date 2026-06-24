import { fail } from '@sveltejs/kit';
import { requireContentStudioUser } from '$lib/server/auth';
import { approvePublishingReview, loadPublishingQueue } from '$lib/server/services/content-studio';

export const load = async ({ locals, url }) => {
	const user = requireContentStudioUser(locals, url);
	const queue = await loadPublishingQueue();

	return {
		user,
		...queue
	};
};

export const actions = {
	approve: async ({ locals, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const reviewRequestId = String(formData.get('reviewRequestId') ?? '').trim();
		const draftId = String(formData.get('draftId') ?? '').trim();
		const snapshotId = String(formData.get('snapshotId') ?? '').trim() || undefined;

		if (!reviewRequestId || !draftId) {
			return fail(400, { action: 'approve', errors: { form: 'Granskningsärendet saknas.' } });
		}

		try {
			const queue = await approvePublishingReview({
				reviewRequestId,
				draftId,
				userId: user.id,
				snapshotId
			});

			return {
				action: 'approve',
				success: 'Ändringen godkändes och publicerades.',
				...queue
			};
		} catch (error) {
			return fail(400, {
				action: 'approve',
				errors: {
					form: error instanceof Error ? error.message : 'Ändringen kunde inte godkännas.'
				}
			});
		}
	}
};
