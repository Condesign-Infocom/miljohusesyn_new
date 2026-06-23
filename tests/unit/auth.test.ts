import { describe, expect, it } from 'vitest';
import {
	authenticateUser,
	authenticateRuntimeUser,
	createSession,
	demoPassword,
	requireAdmin,
	requireContentStudioUser,
	requirePublisher,
	requireUser,
	readRuntimeSessionUser,
	readSessionUser,
	toAuthUser
} from '$lib/server/auth';
import { createSeededDb } from './test-db';

function createAuthUserRowFixture(
	overrides: Partial<Parameters<typeof toAuthUser>[0]> = {}
): Parameters<typeof toAuthUser>[0] {
	return {
		id: 1,
		email: 'user@example.com',
		username: 'user',
		passwordHash: 'salt:hash',
		displayName: 'User',
		role: 'user',
		firstName: '',
		lastName: '',
		phone: '',
		website: '',
		companyName: '',
		companyOrgNum: '',
		companyAddress1: '',
		companyAddress2: '',
		companyCity: '',
		companyPostcode: '',
		address1: '',
		address2: '',
		postcode: '',
		city: '',
		lrfId: '',
		alertSms: false,
		alertEmail: true,
		createdAt: '2026-05-19T00:00:00.000Z',
		...overrides
	};
}

function expectRedirect(fn: () => unknown, status: number, location: string) {
	try {
		fn();
		throw new Error(`Expected redirect to ${location}`);
	} catch (error) {
		expect(error).toMatchObject({ status, location });
	}
}

describe('auth helpers', () => {
	it('authenticates a seeded fake user by username and password', async () => {
		const db = createSeededDb();
		const user = await authenticateUser(db, 'demo', demoPassword);

		expect(user?.email).toBe('demo@miljohusesyn.local');
		expect(user?.displayName).toBe('Demo User');
	});

	it('rejects invalid fake user credentials', async () => {
		const db = createSeededDb();

		expect(await authenticateUser(db, 'demo', 'wrong-password')).toBeNull();
		expect(await authenticateUser(db, 'missing', demoPassword)).toBeNull();
	});

	it('reads valid sessions and ignores expired sessions', async () => {
		const db = createSeededDb();
		const now = new Date('2026-05-15T12:00:00.000Z');
		const session = await createSession(db, 1, now);

		expect((await readSessionUser(db, session.token, now))?.id).toBe(1);
		expect(await readSessionUser(db, session.token, new Date('2026-05-23T12:00:00.000Z'))).toBeNull();
		expect(await readSessionUser(db, undefined, now)).toBeNull();
	});

	it('supports runtime auth helpers against the current sqlite runtime store without mirroring', async () => {
		const db = createSeededDb();
		const now = new Date('2026-05-15T12:00:00.000Z');
		const user = await authenticateRuntimeUser('demo', demoPassword, db);
		const session = await createSession(db, 1, now);

		expect(user?.username).toBe('demo');
		expect((await readRuntimeSessionUser(session.token, now, db))?.id).toBe(1);
	});

	it('normalizes unknown stored roles back to user at the auth boundary', () => {
		const user = toAuthUser(createAuthUserRowFixture({
			id: 10,
			email: 'legacy-role@example.com',
			username: 'legacy-role',
			displayName: 'Legacy Role',
			role: 'legacy-admin'
		}));

		expect(user.role).toBe('user');
	});
});

describe('auth guards', () => {
	const url = new URL('https://example.com/admin/content-studio');

	it('redirects anonymous users to login', () => {
		expectRedirect(
			() => requireUser({ user: null } as App.Locals, new URL('https://example.com/checklists')),
			303,
			'/login?redirectTo=%2Fchecklists'
		);
	});

	it('keeps requireAdmin admin-only', () => {
		const adminUser = {
			id: 1,
			email: 'admin@example.com',
			username: 'admin',
			displayName: 'Admin User',
			role: 'admin'
		} as const;
		const editorUser = {
			id: 2,
			email: 'editor@example.com',
			username: 'editor',
			displayName: 'Editor User',
			role: 'editor'
		} as const;

		expect(requireAdmin({ user: adminUser } as App.Locals, url)).toEqual(adminUser);
		expectRedirect(() => requireAdmin({ user: editorUser } as App.Locals, url), 303, '/checklists');
	});

	it('allows editorial staff into content studio pages', () => {
		const editorUser = {
			id: 2,
			email: 'editor@example.com',
			username: 'editor',
			displayName: 'Editor User',
			role: 'editor'
		} as const;
		const publisherUser = {
			id: 3,
			email: 'publisher@example.com',
			username: 'publisher',
			displayName: 'Publisher User',
			role: 'publisher'
		} as const;
		const plainUser = {
			id: 4,
			email: 'user@example.com',
			username: 'user',
			displayName: 'Plain User',
			role: 'user'
		} as const;

		expect(requireContentStudioUser({ user: editorUser } as App.Locals, url)).toEqual(editorUser);
		expect(requireContentStudioUser({ user: publisherUser } as App.Locals, url)).toEqual(
			publisherUser
		);
		expectRedirect(
			() => requireContentStudioUser({ user: plainUser } as App.Locals, url),
			303,
			'/checklists'
		);
	});

	it('requires publisher access for publishing flows', () => {
		const adminUser = {
			id: 1,
			email: 'admin@example.com',
			username: 'admin',
			displayName: 'Admin User',
			role: 'admin'
		} as const;
		const publisherUser = {
			id: 3,
			email: 'publisher@example.com',
			username: 'publisher',
			displayName: 'Publisher User',
			role: 'publisher'
		} as const;
		const editorUser = {
			id: 2,
			email: 'editor@example.com',
			username: 'editor',
			displayName: 'Editor User',
			role: 'editor'
		} as const;

		expect(requirePublisher({ user: publisherUser } as App.Locals, url)).toEqual(publisherUser);
		expect(requirePublisher({ user: adminUser } as App.Locals, url)).toEqual(adminUser);
		expectRedirect(
			() => requirePublisher({ user: editorUser } as App.Locals, url),
			303,
			'/admin/content-studio'
		);
	});
});
