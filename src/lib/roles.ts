export const appRoles = ['user', 'editor', 'publisher', 'admin'] as const;

export type AppRole = (typeof appRoles)[number];

export function isAppRole(role: string): role is AppRole {
	return appRoles.includes(role as AppRole);
}

export function normalizeAppRole(role: string): AppRole {
	return isAppRole(role) ? role : 'user';
}

export function canAccessAdmin(role: AppRole) {
	return role === 'editor' || role === 'publisher' || role === 'admin';
}

export function canPublishContent(role: AppRole) {
	return role === 'publisher' || role === 'admin';
}

export function canManageUsers(role: AppRole) {
	return role === 'admin';
}
