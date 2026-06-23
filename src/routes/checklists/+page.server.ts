import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';

export const load = async ({ locals, url }) => {
	requireUser(locals, url);
	throw redirect(303, '/checklists/miljohusesyn');
};
