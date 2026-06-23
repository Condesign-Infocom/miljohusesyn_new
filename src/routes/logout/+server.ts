import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, deleteRuntimeSession, sessionCookieName } from '$lib/server/auth';

export const POST = async ({ cookies, locals }) => {
	await deleteRuntimeSession(cookies.get(sessionCookieName));
	clearSessionCookie(cookies);
	locals.user = null;

	redirect(303, '/');
};
