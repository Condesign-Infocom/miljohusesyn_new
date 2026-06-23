import type { Handle } from '@sveltejs/kit';
import { readRuntimeSessionUser, sessionCookieName } from '$lib/server/auth';
import { ensureRuntimePostgresQuestionColumns } from '$lib/server/db/migrate';
import { resolveRuntimeDbConfig } from '$lib/server/db/runtime-db-config';

let runtimeSchemaReady: Promise<void> | null = null;

async function ensureRuntimeSchemaReady() {
	if (resolveRuntimeDbConfig().engine !== 'postgres') {
		return;
	}

	runtimeSchemaReady ??= ensureRuntimePostgresQuestionColumns();
	await runtimeSchemaReady;
}

export const handle: Handle = async ({ event, resolve }) => {
	await ensureRuntimeSchemaReady();
	event.locals.user = await readRuntimeSessionUser(event.cookies.get(sessionCookieName));

	return resolve(event);
};
