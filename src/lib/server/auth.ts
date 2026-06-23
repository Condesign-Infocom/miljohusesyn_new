import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { redirect, type Cookies } from '@sveltejs/kit';
import { canAccessAdmin, canManageUsers, canPublishContent, normalizeAppRole } from '$lib/roles';
import { createDb, type AppDb } from '$lib/server/db/client';
import { createRuntimeGateway } from '$lib/server/db/runtime-gateway';
import {
	deleteMirroredSessionFromRuntimePostgres,
	mirrorSessionToRuntimePostgres,
	mirrorUserToRuntimePostgres
} from '$lib/server/db/runtime-postgres-shadow';
import { appUsers } from '$lib/server/db/schema';
import type { AuthUser } from '$lib/types/auth';

export const sessionCookieName = 'mhs_session';
export const demoPassword = 'demo123';

const passwordKeyLength = 64;
const sessionTtlMs = 7 * 24 * 60 * 60 * 1000;
const sessionUserCacheTtlMs = 60 * 1000;
const missingSessionCacheTtlMs = 10 * 1000;

type CachedSessionUser = {
	user: AuthUser | null;
	expiresAt: number;
};

const sessionUserCache = new Map<string, CachedSessionUser>();

function pruneSessionUserCache(nowMs = Date.now()) {
	for (const [tokenHash, entry] of sessionUserCache) {
		if (entry.expiresAt <= nowMs) {
			sessionUserCache.delete(tokenHash);
		}
	}
}

function cacheSessionUser(tokenHash: string, user: AuthUser | null, expiresAtMs: number) {
	sessionUserCache.set(tokenHash, {
		user,
		expiresAt: Math.min(Date.now() + sessionUserCacheTtlMs, expiresAtMs)
	});
}

export function invalidateRuntimeSessionCache(token: string | undefined) {
	if (!token) {
		return;
	}

	sessionUserCache.delete(hashSessionToken(token));
}

export function invalidateRuntimeSessionCacheForUser(userId: number) {
	for (const [tokenHash, entry] of sessionUserCache) {
		if (entry.user?.id === userId) {
			sessionUserCache.delete(tokenHash);
		}
	}
}

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
	const hash = scryptSync(password, salt, passwordKeyLength).toString('hex');
	return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
	const [salt, hash] = storedHash.split(':');

	if (!salt || !hash) {
		return false;
	}

	const expected = Buffer.from(hash, 'hex');
	const actual = scryptSync(password, salt, expected.length);

	return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashSessionToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export function toAuthUser(user: typeof appUsers.$inferSelect): AuthUser {
	return {
		id: user.id,
		email: user.email,
		username: user.username,
		displayName: user.displayName,
		role: normalizeAppRole(user.role)
	};
}

export async function authenticateUser(db: AppDb, login: string, password: string) {
	const normalizedLogin = login.trim().toLowerCase();

	if (!normalizedLogin || !password) {
		return null;
	}

	const user = await createRuntimeGateway(db).findUserByLogin(normalizedLogin);

	if (!user || !verifyPassword(password, user.passwordHash)) {
		return null;
	}

	return toAuthUser(user);
}

export async function createSession(db: AppDb, userId: number, now = new Date()) {
	const token = randomBytes(32).toString('hex');
	const tokenHash = hashSessionToken(token);
	const expiresAt = new Date(now.getTime() + sessionTtlMs).toISOString();

	await createRuntimeGateway(db).insertSession({
		userId,
		tokenHash,
		expiresAt,
		createdAt: now.toISOString()
	});

	return { token, expiresAt };
}

export async function readSessionUser(db: AppDb, token: string | undefined, now = new Date()) {
	if (!token) {
		return null;
	}

	const gateway = createRuntimeGateway(db);
	const session = await gateway.findActiveSessionByTokenHash(hashSessionToken(token), now.toISOString());

	if (!session) {
		return null;
	}

	const user = await gateway.findUserById(session.userId);
	return user ? toAuthUser(user) : null;
}

export async function deleteSession(db: AppDb, token: string | undefined) {
	if (!token) {
		return;
	}

	await createRuntimeGateway(db).deleteSessionByTokenHash(hashSessionToken(token));
}

export async function authenticateRuntimeUser(login: string, password: string, db = createDb()) {
	return await authenticateUser(db, login, password);
}

export async function createRuntimeSession(userId: number, now = new Date(), db = createDb()) {
	const gateway = createRuntimeGateway(db);
	const session = await createSession(db, userId, now);
	const storedSession = await gateway.findActiveSessionByTokenHash(
		hashSessionToken(session.token),
		new Date(0).toISOString()
	);
	const user = await gateway.findUserById(userId);

	if (storedSession && user) {
		await mirrorUserToRuntimePostgres(user);
		await mirrorSessionToRuntimePostgres(storedSession);
	}

	return session;
}

export async function readRuntimeSessionUser(
	token: string | undefined,
	now = new Date(),
	db = createDb()
) {
	if (!token) {
		return null;
	}

	const tokenHash = hashSessionToken(token);
	const nowMs = now.getTime();
	const cached = sessionUserCache.get(tokenHash);

	if (cached && cached.expiresAt > nowMs) {
		return cached.user;
	}

	pruneSessionUserCache(nowMs);

	const gateway = createRuntimeGateway(db);
	const session = await gateway.findActiveSessionByTokenHash(tokenHash, now.toISOString());

	if (!session) {
		sessionUserCache.set(tokenHash, {
			user: null,
			expiresAt: nowMs + missingSessionCacheTtlMs
		});
		return null;
	}

	const userRow = await gateway.findUserById(session.userId);
	const user = userRow ? toAuthUser(userRow) : null;
	cacheSessionUser(tokenHash, user, new Date(session.expiresAt).getTime());
	return user;
}

export async function deleteRuntimeSession(token: string | undefined, db = createDb()) {
	if (!token) {
		return;
	}

	invalidateRuntimeSessionCache(token);
	await deleteSession(db, token);
	await deleteMirroredSessionFromRuntimePostgres(hashSessionToken(token));
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: string) {
	cookies.set(sessionCookieName, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		expires: new Date(expiresAt)
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(sessionCookieName, { path: '/' });
}

export function requireUser(locals: App.Locals, url: URL) {
	if (!locals.user) {
		const redirectTo = `${url.pathname}${url.search}`;
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	return locals.user;
}

export function requireAdmin(locals: App.Locals, url: URL) {
	const user = requireUser(locals, url);

	if (!canManageUsers(user.role)) {
		throw redirect(303, '/checklists/miljohusesyn');
	}

	return user;
}

export function requireContentStudioUser(locals: App.Locals, url: URL) {
	const user = requireUser(locals, url);

	if (!canAccessAdmin(user.role)) {
		throw redirect(303, '/checklists/miljohusesyn');
	}

	return user;
}

export function requirePublisher(locals: App.Locals, url: URL) {
	const user = requireUser(locals, url);

	if (!canPublishContent(user.role)) {
		throw redirect(303, '/admin/content-studio');
	}

	return user;
}
