import { requireContentStudioUser } from '$lib/server/auth';
import { loadContentStudioNews } from '$lib/server/services/content-studio';

export const load = async ({ locals, url }) => {
	const user = requireContentStudioUser(locals, url);

	return {
		user,
		...(await loadContentStudioNews())
	};
};
