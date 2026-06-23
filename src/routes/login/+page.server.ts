import { fail, redirect } from '@sveltejs/kit';
import {
	authenticateRuntimeUser,
	createRuntimeSession,
	setSessionCookie
} from '$lib/server/auth';

function safeRedirectTarget(value: string | null) {
	return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export const load = ({ locals, url }) => {
	if (locals.user) {
		throw redirect(303, safeRedirectTarget(url.searchParams.get('redirectTo')));
	}

	return {
		redirectTo: safeRedirectTarget(url.searchParams.get('redirectTo'))
	};
};

export const actions = {
	default: async ({ cookies, locals, request, url }) => {
		const formData = await request.formData();
		const login = String(formData.get('login') ?? '');
		const password = String(formData.get('password') ?? '');
		const user = await authenticateRuntimeUser(login, password);

		if (!user) {
			return fail(400, {
				login,
				incorrect: true
			});
		}

		const session = await createRuntimeSession(user.id);
		setSessionCookie(cookies, session.token, session.expiresAt);
		locals.user = user;

		throw redirect(303, safeRedirectTarget(url.searchParams.get('redirectTo')));
	}
};
