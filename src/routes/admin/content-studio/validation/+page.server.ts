import { requireContentStudioUser } from '$lib/server/auth';
import { loadContentStudioValidation } from '$lib/server/services/content-studio';

export const load = async ({ locals, url }) => {
	requireContentStudioUser(locals, url);
	return await loadContentStudioValidation();
};
