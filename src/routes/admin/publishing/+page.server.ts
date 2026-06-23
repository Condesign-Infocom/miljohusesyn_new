import { redirect } from '@sveltejs/kit';
import { requireContentStudioUser } from '$lib/server/auth';

export const load = async ({ locals, url }) => {
	requireContentStudioUser(locals, url);
	redirect(307, '/admin/content-studio');
};
