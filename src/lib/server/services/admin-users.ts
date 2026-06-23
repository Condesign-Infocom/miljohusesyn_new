import { activityOptions, foodProcessingOptions } from '$lib/profile-config';
import { normalizeAppRole, type AppRole } from '$lib/roles';
import { demoPassword, hashPassword, invalidateRuntimeSessionCacheForUser } from '$lib/server/auth';
import { createDb, type AppDb } from '../db/client';
import { createRuntimeGateway } from '../db/runtime-gateway';
import {
	type NormalizedAdminUserAccountInput,
	deleteRuntimeUserCascade,
	insertRuntimeUserRow,
	updateRuntimeUserAccountRow,
	updateRuntimeUserPasswordHash
} from '../db/runtime-write-repository';
import * as runtimePostgresShadow from '../db/runtime-postgres-shadow';
import { loadEditableProfile } from './profile-editor';

const activityDisplayNameByActivityName = new Map<string, string>([
	...activityOptions.map((option) => [option.activityName, option.label] as const),
	...foodProcessingOptions.map((option) => [option.activityName, option.label] as const)
]);

export type AdminUserListItem = {
	id: number;
	email: string;
	username: string;
	displayName: string;
	role: AppRole;
	companyName: string;
	phone: string;
	createdAt: string;
	checklistCount: number;
	profileCount: number;
};

export type AdminUserDetail = {
	id: number;
	email: string;
	username: string;
	displayName: string;
	role: AppRole;
	firstName: string;
	lastName: string;
	phone: string;
	companyName: string;
	companyOrgNum: string;
	companyAddress1: string;
	companyPostcode: string;
	companyCity: string;
	createdAt: string;
	profile: Awaited<ReturnType<typeof loadEditableProfile>>;
	activityNames: string[];
};

export type AdminUserAccountInput = {
	email: string;
	username: string;
	displayName: string;
	role: string;
	phone: string;
	companyName: string;
	companyOrgNum: string;
	companyAddress1: string;
	companyPostcode: string;
	companyCity: string;
};

export async function listAdminUsers(db: AppDb, search = ''): Promise<AdminUserListItem[]> {
	const normalizedSearch = search.trim().toLowerCase();
	const { users, assignments, profiles } = await createRuntimeGateway(db).loadAdminUserListData();
	const checklistCountByUserId = countByUserId(assignments);
	const profileCountByUserId = countByUserId(profiles);

	return users
		.filter((user) => {
			if (!normalizedSearch) {
				return true;
			}

			return [
				user.email,
				user.username,
				user.displayName,
				user.companyName,
				user.companyOrgNum,
				user.phone
			]
				.filter(Boolean)
				.some((value) => value.toLowerCase().includes(normalizedSearch));
		})
		.sort((left, right) => left.displayName.localeCompare(right.displayName))
		.map((user) => ({
			id: user.id,
			email: user.email,
			username: user.username,
			displayName: user.displayName,
			role: normalizeRole(user.role),
			companyName: user.companyName,
			phone: user.phone,
			createdAt: user.createdAt,
			checklistCount: checklistCountByUserId.get(user.id) ?? 0,
			profileCount: profileCountByUserId.get(user.id) ?? 0
		}));
}

export async function loadAdminUserDetail(db: AppDb, userId: number): Promise<AdminUserDetail | null> {
	const { user, activities } = await createRuntimeGateway(db).loadAdminUserDetailSeedData(userId);

	if (!user) {
		return null;
	}

	const profile = await loadEditableProfile(db, userId);

	return {
		id: user.id,
		email: user.email,
		username: user.username,
		displayName: user.displayName,
		role: normalizeRole(user.role),
		firstName: user.firstName,
		lastName: user.lastName,
		phone: user.phone,
		companyName: user.companyName,
		companyOrgNum: user.companyOrgNum,
		companyAddress1: user.companyAddress1,
		companyPostcode: user.companyPostcode,
		companyCity: user.companyCity,
		createdAt: user.createdAt,
		profile,
		activityNames: activities
			.map((activity) =>
				activityDisplayNameByActivityName.get(activity.activityName) ?? activity.activityName
			)
			.sort((left, right) => left.localeCompare(right))
	};
}

export async function updateAdminUserAccount(
	db: AppDb,
	{
		editorUserId,
		targetUserId,
		values
	}: {
		editorUserId: number;
		targetUserId: number;
		values: AdminUserAccountInput;
	}
) {
	const normalizedValues = normalizeAdminUserAccountInput(values);

	if (editorUserId === targetUserId && normalizedValues.role !== 'admin') {
		throw new Error('You cannot remove your own admin role.');
	}

	await updateRuntimeUserAccountRow(db, targetUserId, normalizedValues);
}

export async function createAdminUser(
	db: AppDb,
	values: AdminUserAccountInput & { password?: string }
) {
	const normalizedValues = normalizeAdminUserAccountInput(values);
	const password = values.password?.trim() || demoPassword;
	return await insertRuntimeUserRow(db, {
		...normalizedValues,
		passwordHash: hashPassword(password)
	});
}

export async function deleteAdminUser(db: AppDb, editorUserId: number, targetUserId: number) {
	if (editorUserId === targetUserId) {
		throw new Error('You cannot delete your own admin account.');
	}

	await deleteRuntimeUserCascade(db, targetUserId);
}

export async function resetAdminUserPassword(db: AppDb, targetUserId: number) {
	await updateRuntimeUserPasswordHash(db, targetUserId, hashPassword(demoPassword));
}

export async function getAdminUserStats(db: AppDb) {
	const { users, profiles, assignments, activities } = await createRuntimeGateway(db).loadAdminUserStatsData();

	return {
		userCount: users.length,
		adminCount: users.filter((user) => normalizeRole(user.role) === 'admin').length,
		profileCount: profiles.length,
		checklistAssignmentCount: assignments.length,
		activityCount: activities.length
	};
}

export async function updateRuntimeAdminUserAccount(
	{
		editorUserId,
		targetUserId,
		values
	}: {
		editorUserId: number;
		targetUserId: number;
		values: AdminUserAccountInput;
	},
	db = createDb()
) {
	await updateAdminUserAccount(db, {
		editorUserId,
		targetUserId,
		values
	});
	invalidateRuntimeSessionCacheForUser(targetUserId);

	const user = await createRuntimeGateway(db).findUserById(targetUserId);
	if (user) {
		await runBestEffortShadowSync('mirror updated runtime user', () =>
			runtimePostgresShadow.mirrorUserToRuntimePostgres(user)
		);
	}
}

export async function createRuntimeAdminUser(
	values: AdminUserAccountInput & { password?: string },
	db = createDb()
) {
	const userId = await createAdminUser(db, values);
	const user = await createRuntimeGateway(db).findUserById(userId);

	if (user) {
		await runBestEffortShadowSync('mirror created runtime user', () =>
			runtimePostgresShadow.mirrorUserToRuntimePostgres(user)
		);
	}

	return userId;
}

export async function deleteRuntimeAdminUser(
	editorUserId: number,
	targetUserId: number,
	db = createDb()
) {
	await deleteAdminUser(db, editorUserId, targetUserId);
	invalidateRuntimeSessionCacheForUser(targetUserId);
	await runBestEffortShadowSync('delete mirrored runtime user', () =>
		runtimePostgresShadow.deleteUserFromRuntimePostgres(targetUserId)
	);
}

export async function resetRuntimeAdminUserPassword(targetUserId: number, db = createDb()) {
	await resetAdminUserPassword(db, targetUserId);
	invalidateRuntimeSessionCacheForUser(targetUserId);
	const user = await createRuntimeGateway(db).findUserById(targetUserId);

	if (user) {
		await runBestEffortShadowSync('mirror password-reset runtime user', () =>
			runtimePostgresShadow.mirrorUserToRuntimePostgres(user)
		);
	}
}

function countByUserId(rows: Array<{ userId: number }>) {
	const counts = new Map<number, number>();

	for (const row of rows) {
		counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
	}

	return counts;
}

function normalizeRole(role: string): AppRole {
	return normalizeAppRole(role.trim().toLowerCase());
}

function normalizeAdminUserAccountInput(values: AdminUserAccountInput): NormalizedAdminUserAccountInput {
	return {
		...values,
		role: normalizeRole(values.role)
	};
}

async function runBestEffortShadowSync(action: string, callback: () => Promise<void>) {
	try {
		await callback();
	} catch (error) {
		console.warn(`Best-effort shadow sync failed: ${action}`, error);
	}
}
