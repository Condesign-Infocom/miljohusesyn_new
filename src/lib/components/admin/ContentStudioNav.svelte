<script lang="ts">
	type ActiveNavItem =
		| 'overview'
		| 'profiles'
		| 'checklists'
		| 'validation'
		| 'frontend'
		| 'news';

	type NavItem = {
		id: ActiveNavItem;
		label: string;
		href: string;
	};

	let { active = null }: { active?: ActiveNavItem | null } = $props();

	const items: NavItem[] = [
		{ id: 'overview', label: 'Innehållsredaktion', href: '/admin/content-studio' },
		{ id: 'profiles', label: 'Profiler', href: '/admin/content-studio/profile-rules' },
		{ id: 'frontend', label: 'Frontend-innehåll', href: '/admin/content-studio/frontend-content' },
		{ id: 'news', label: 'Nyheter', href: '/admin/content-studio/news' },
		{ id: 'validation', label: 'Validering', href: '/admin/content-studio/validation' }
	];
</script>

<nav class="admin-nav" aria-label="Navigering för innehållsredaktion">
	{#each items as item (item.id)}
		<a aria-current={active === item.id ? 'page' : undefined} href={item.href}>{item.label}</a>
	{/each}
</nav>

<style>
	.admin-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 12px;
		padding-top: 12px;
	}

	.admin-nav a {
		border: 1px solid #acc6b2;
		border-radius: 999px;
		padding: 7px 14px;
		color: #1f3a2d;
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
	}

	.admin-nav a[aria-current='page'] {
		border-color: #007a5b;
		color: #007a5b;
	}
</style>
