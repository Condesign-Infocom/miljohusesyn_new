import { describe, expect, it } from 'vitest';
import {
	appRoles,
	canAccessAdmin,
	canManageUsers,
	canPublishContent,
	normalizeAppRole
} from '$lib/roles';

describe('role helpers', () => {
	it('defines the supported app roles', () => {
		expect(appRoles).toEqual(['user', 'editor', 'publisher', 'admin']);
	});

	it('allows editorial staff into admin surfaces', () => {
		expect(canAccessAdmin('user')).toBe(false);
		expect(canAccessAdmin('editor')).toBe(true);
		expect(canAccessAdmin('publisher')).toBe(true);
		expect(canAccessAdmin('admin')).toBe(true);
	});

	it('limits publishing to publishers and admins', () => {
		expect(canPublishContent('user')).toBe(false);
		expect(canPublishContent('editor')).toBe(false);
		expect(canPublishContent('publisher')).toBe(true);
		expect(canPublishContent('admin')).toBe(true);
	});

	it('keeps user management admin-only', () => {
		expect(canManageUsers('user')).toBe(false);
		expect(canManageUsers('editor')).toBe(false);
		expect(canManageUsers('publisher')).toBe(false);
		expect(canManageUsers('admin')).toBe(true);
	});

	it('normalizes unknown roles to user', () => {
		expect(normalizeAppRole('editor')).toBe('editor');
		expect(normalizeAppRole('publisher')).toBe('publisher');
		expect(normalizeAppRole('admin')).toBe('admin');
		expect(normalizeAppRole('legacy-role')).toBe('user');
	});
});
