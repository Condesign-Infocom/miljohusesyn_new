import type { AppRole } from '$lib/roles';

export type AuthUser = {
	id: number;
	email: string;
	username: string;
	displayName: string;
	role: AppRole;
};
