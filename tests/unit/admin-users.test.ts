import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createAdminUser,
	createRuntimeAdminUser,
	deleteAdminUser,
	deleteRuntimeAdminUser,
	getAdminUserStats,
	loadAdminUserDetail,
	resetRuntimeAdminUserPassword,
	listAdminUsers,
	resetAdminUserPassword,
	updateAdminUserAccount,
	updateRuntimeAdminUserAccount
} from '$lib/server/services/admin-users';
import { authenticateUser, demoPassword, hashPassword } from '$lib/server/auth';
import {
	createBlankEditableProfileInput,
	saveEditableProfile
} from '$lib/server/services/profile-editor';
import * as runtimePostgresShadow from '$lib/server/db/runtime-postgres-shadow';
import {
	appChecklistAssignments,
	appChecklists,
	appPdfExportEvents,
	appProfileUpdateEvents,
	appPublicationDeliveries,
	appPublicationJobs,
	appUserProfiles,
	appUserSettings,
	appUsers
} from '$lib/server/db/schema';
import { createTestDb } from './test-db';

const originalRuntimeDbEngine = process.env.APP_DB_ENGINE;
const originalRuntimePostgresDsn = process.env.APP_DB_POSTGRES_DSN;

beforeEach(() => {
	process.env.APP_DB_ENGINE = 'sqlite';
	delete process.env.APP_DB_POSTGRES_DSN;
});

afterEach(() => {
	if (originalRuntimeDbEngine === undefined) {
		delete process.env.APP_DB_ENGINE;
	} else {
		process.env.APP_DB_ENGINE = originalRuntimeDbEngine;
	}

	if (originalRuntimePostgresDsn === undefined) {
		delete process.env.APP_DB_POSTGRES_DSN;
	} else {
		process.env.APP_DB_POSTGRES_DSN = originalRuntimePostgresDsn;
	}

	vi.restoreAllMocks();
});

describe('admin user services', () => {
	it('lists users with derived counts and filters by search', async () => {
		const db = createTestDb();
		const checklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'miljohusesyn-a',
					title: 'A',
					variantKey: 'default',
					snapshotKey: 'import-snapshot'
				})
				.run().lastInsertRowid
		);
		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'alpha@example.com',
					username: 'alpha',
					passwordHash: hashPassword('secret', 'alpha-salt'),
					displayName: 'Alpha User',
					companyName: 'Alpha Farm'
				})
				.run().lastInsertRowid
		);

		db.insert(appChecklistAssignments).values({ userId, checklistId }).run();
		db.insert(appUserProfiles)
			.values([
				{ userId, profileKey: 'One', profileName: 'One' },
				{ userId, profileKey: 'Two', profileName: 'Two' }
			])
			.run();

		const users = await listAdminUsers(db, 'alpha');

		expect(users).toHaveLength(1);
		expect(users[0]).toMatchObject({
			username: 'alpha',
			checklistCount: 1,
			profileCount: 2
		});
	});

	it('loads full profile detail for admin editing routes', async () => {
		const db = createTestDb();

		for (const slug of ['miljohusesyn-a', 'miljohusesyn-g', 'miljohusesyn-v']) {
			db.insert(appChecklists)
				.values({
					slug,
					title: slug,
					variantKey: 'default',
					snapshotKey: 'import-snapshot'
				})
				.run();
		}

		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'detail@example.com',
					username: 'detail-user',
					passwordHash: hashPassword('secret', 'detail-salt'),
					displayName: 'Detail User',
					companyName: 'Detail Farm'
				})
				.run().lastInsertRowid
		);

		const input = createBlankEditableProfileInput();
		input.displayName = 'Detail User';
		input.companyName = 'Detail Farm';
		input.activities.odling = true;
		input.areas.cropHa = '22';

		await saveEditableProfile(db, userId, input);

		const user = await loadAdminUserDetail(db, userId);

		expect(user?.activityNames).toContain('Odling');
		expect(user?.profile?.areas.cropHa).toBe('22');
		expect(user?.profile?.assignedChecklistSlugs).toEqual(
			expect.arrayContaining(['miljohusesyn-a', 'miljohusesyn-g', 'miljohusesyn-v'])
		);
	});

	it('prevents an admin from removing their own admin role', async () => {
		const db = createTestDb();
		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'admin@example.com',
					username: 'admin-user',
					passwordHash: hashPassword('secret', 'admin-salt'),
					displayName: 'Admin User',
					role: 'admin',
					companyName: 'Admin Farm'
				})
				.run().lastInsertRowid
		);

		await expect(
			updateAdminUserAccount(db, {
				editorUserId: userId,
				targetUserId: userId,
				values: {
					email: 'admin@example.com',
					username: 'admin-user',
					displayName: 'Admin User',
					role: 'publisher',
					phone: '',
					companyName: 'Admin Farm',
					companyOrgNum: '',
					companyAddress1: '',
					companyPostcode: '',
					companyCity: ''
				}
			})
		).rejects.toThrow('You cannot remove your own admin role.');
	});

	it('stores normalized editor and publisher roles across create and update flows', async () => {
		const db = createTestDb();
		const adminId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'role-admin@example.com',
					username: 'role-admin',
					passwordHash: hashPassword('secret', 'role-admin-salt'),
					displayName: 'Role Admin',
					role: 'admin',
					companyName: 'Role Admin Farm'
				})
				.run().lastInsertRowid
		);

		const userId = await createAdminUser(db, {
			email: 'editor@example.com',
			username: 'editor-user',
			displayName: 'Editor User',
			role: 'editor',
			phone: '',
			companyName: 'Editor Farm',
			companyOrgNum: '',
			companyAddress1: '',
			companyPostcode: '',
			companyCity: ''
		});

		const createdUser = db
			.select()
			.from(appUsers)
			.where(eq(appUsers.id, userId))
			.get();

		expect(createdUser?.role).toBe('editor');

		await updateAdminUserAccount(db, {
			editorUserId: adminId,
			targetUserId: userId,
			values: {
				email: 'publisher@example.com',
				username: 'publisher-user',
				displayName: 'Publisher User',
				role: 'publisher',
				phone: '',
				companyName: 'Publisher Farm',
				companyOrgNum: '',
				companyAddress1: '',
				companyPostcode: '',
				companyCity: ''
			}
		});

		const updatedUser = db
			.select()
			.from(appUsers)
			.where(eq(appUsers.id, userId))
			.get();

		expect(updatedUser?.role).toBe('publisher');

		await updateAdminUserAccount(db, {
			editorUserId: adminId,
			targetUserId: userId,
			values: {
				email: 'fallback@example.com',
				username: 'fallback-user',
				displayName: 'Fallback User',
				role: 'owner',
				phone: '',
				companyName: 'Fallback Farm',
				companyOrgNum: '',
				companyAddress1: '',
				companyPostcode: '',
				companyCity: ''
			}
		});

		const fallbackUser = db
			.select()
			.from(appUsers)
			.where(eq(appUsers.id, userId))
			.get();

		expect(fallbackUser?.role).toBe('user');
	});

	it('resets a password to the shared demo password and reports stats', async () => {
		const db = createTestDb();
		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'reset@example.com',
					username: 'reset-user',
					passwordHash: hashPassword('oldpass', 'old-salt'),
					displayName: 'Reset User',
					role: 'user',
					companyName: 'Reset Farm'
				})
				.run().lastInsertRowid
		);

		await resetAdminUserPassword(db, userId);

		const user = db
			.select()
			.from(appUsers)
			.where(eq(appUsers.id, userId))
			.get();
		const authUser = await authenticateUser(db, 'reset-user', demoPassword);
		const stats = await getAdminUserStats(db);

		expect(user?.passwordHash).toContain(':');
		expect(authUser?.id).toBe(userId);
		expect(stats.userCount).toBe(1);
		expect(stats.adminCount).toBe(0);
	});

	it('creates a new admin-managed user with the shared demo password by default', async () => {
		const db = createTestDb();

		const userId = await createAdminUser(db, {
			email: 'new@example.com',
			username: 'new-user',
			displayName: 'New User',
			role: 'user',
			phone: '070-123 12 12',
			companyName: 'New Farm',
			companyOrgNum: '',
			companyAddress1: '',
			companyPostcode: '',
			companyCity: ''
		});

		const authUser = await authenticateUser(db, 'new-user', demoPassword);

		expect(userId).toBeGreaterThan(0);
		expect(authUser?.id).toBe(userId);
	});

	it('deletes a user and related rows while preventing self-delete', async () => {
		const db = createTestDb();
		const checklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'delete-checklist',
					title: 'Delete Checklist',
					variantKey: 'default',
					snapshotKey: 'import-snapshot'
				})
				.run().lastInsertRowid
		);
		const adminId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'admin@example.com',
					username: 'admin-user',
					passwordHash: hashPassword('secret', 'admin-salt'),
					displayName: 'Admin User',
					role: 'admin',
					companyName: 'Admin Farm'
				})
				.run().lastInsertRowid
		);
		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'delete@example.com',
					username: 'delete-user',
					passwordHash: hashPassword('secret', 'delete-salt'),
					displayName: 'Delete User',
					companyName: 'Delete Farm'
				})
				.run().lastInsertRowid
		);

		db.insert(appUserProfiles)
			.values({ userId, profileKey: 'One', profileName: 'One' })
			.run();
		db.insert(appUserSettings)
			.values({ userId, key: 'RQ1', value: 'true' })
			.run();
		db.insert(appPdfExportEvents)
			.values({ userId, checklistId, exportKind: 'plan', filename: 'user.pdf' })
			.run();
		const publicationJobId = Number(
			db
				.insert(appPublicationJobs)
				.values({
					userId,
					checklistId,
					publicationKind: 'user-plan',
					status: 'queued',
					maxAttempts: 3
				})
				.run().lastInsertRowid
		);
		db.insert(appPublicationDeliveries)
			.values({
				publicationJobId,
				userId,
				checklistId,
				deliveryKind: 'download',
				filename: 'delivery.pdf',
				byteCount: 128
			})
			.run();
		db.insert(appProfileUpdateEvents).values({ userId }).run();

		await deleteAdminUser(db, adminId, userId);

		expect(
			db
				.select()
				.from(appUsers)
				.where(eq(appUsers.id, userId))
				.get()
		).toBeUndefined();
		expect(db.select().from(appUserProfiles).all()).toHaveLength(0);
		expect(db.select().from(appUserSettings).all()).toHaveLength(0);
		expect(db.select().from(appPdfExportEvents).all()).toHaveLength(0);
		expect(db.select().from(appProfileUpdateEvents).all()).toHaveLength(0);
		expect(db.select().from(appPublicationJobs).all()).toHaveLength(0);
		expect(db.select().from(appPublicationDeliveries).all()).toHaveLength(0);
		await expect(deleteAdminUser(db, adminId, adminId)).rejects.toThrow(
			'You cannot delete your own admin account.'
		);
	});

	it('supports runtime admin wrappers against the current sqlite runtime store', async () => {
		const db = createTestDb();
		const adminId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'runtime-admin@example.com',
					username: 'runtime-admin',
					passwordHash: hashPassword('secret', 'runtime-admin-salt'),
					displayName: 'Runtime Admin',
					role: 'admin',
					companyName: 'Runtime Admin Farm'
				})
				.run().lastInsertRowid
		);

		const createdUserId = await createRuntimeAdminUser(
			{
				email: 'runtime-user@example.com',
				username: 'runtime-user',
				displayName: 'Runtime User',
				role: 'user',
				phone: '',
				companyName: 'Runtime Farm',
				companyOrgNum: '',
				companyAddress1: '',
				companyPostcode: '',
				companyCity: ''
			},
			db
		);

		await updateRuntimeAdminUserAccount(
			{
				editorUserId: adminId,
				targetUserId: createdUserId,
				values: {
					email: 'runtime-user@example.com',
					username: 'runtime-user',
					displayName: 'Runtime User Updated',
					role: 'user',
					phone: '070-555 55 55',
					companyName: 'Runtime Farm Updated',
					companyOrgNum: '',
					companyAddress1: '',
					companyPostcode: '',
					companyCity: ''
				}
			},
			db
		);
		await resetRuntimeAdminUserPassword(createdUserId, db);

		expect((await authenticateUser(db, 'runtime-user', demoPassword))?.id).toBe(createdUserId);

		await deleteRuntimeAdminUser(adminId, createdUserId, db);
		expect(db.select().from(appUsers).where(eq(appUsers.id, createdUserId)).get()).toBeUndefined();
	});

	it('keeps wrapper operations successful when shadow sync fails after the runtime mutation', async () => {
		const db = createTestDb();
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const mirrorSpy = vi
			.spyOn(runtimePostgresShadow, 'mirrorUserToRuntimePostgres')
			.mockRejectedValue(new Error('shadow mirror failed'));
		const deleteSpy = vi
			.spyOn(runtimePostgresShadow, 'deleteUserFromRuntimePostgres')
			.mockRejectedValue(new Error('shadow delete failed'));
		const adminId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'wrapper-admin@example.com',
					username: 'wrapper-admin',
					passwordHash: hashPassword('secret', 'wrapper-admin-salt'),
					displayName: 'Wrapper Admin',
					role: 'admin',
					companyName: 'Wrapper Admin Farm'
				})
				.run().lastInsertRowid
		);

		const createdUserId = await createRuntimeAdminUser(
			{
				email: 'wrapper-user@example.com',
				username: 'wrapper-user',
				displayName: 'Wrapper User',
				role: 'editor',
				phone: '',
				companyName: 'Wrapper Farm',
				companyOrgNum: '',
				companyAddress1: '',
				companyPostcode: '',
				companyCity: ''
			},
			db
		);

		expect(db.select().from(appUsers).where(eq(appUsers.id, createdUserId)).get()?.role).toBe('editor');

		await updateRuntimeAdminUserAccount(
			{
				editorUserId: adminId,
				targetUserId: createdUserId,
				values: {
					email: 'wrapper-user@example.com',
					username: 'wrapper-user',
					displayName: 'Wrapper Publisher',
					role: 'publisher',
					phone: '',
					companyName: 'Wrapper Farm',
					companyOrgNum: '',
					companyAddress1: '',
					companyPostcode: '',
					companyCity: ''
				}
			},
			db
		);
		await resetRuntimeAdminUserPassword(createdUserId, db);
		await deleteRuntimeAdminUser(adminId, createdUserId, db);

		expect(mirrorSpy).toHaveBeenCalled();
		expect(deleteSpy).toHaveBeenCalledWith(createdUserId);
		expect(warnSpy).toHaveBeenCalled();
		expect(await authenticateUser(db, 'wrapper-user', demoPassword)).toBeNull();
		expect(db.select().from(appUsers).where(eq(appUsers.id, createdUserId)).get()).toBeUndefined();
	});
});
