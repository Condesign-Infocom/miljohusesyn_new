<script lang="ts">
	import '../app.css';
	import '$lib/styles/public-theme.css';

	import { page } from '$app/state';
	import {
		PublicFooter,
		PublicHeader,
		PublicPageMasthead
	} from '$lib/template';
	import {
		getPublicHeroImage,
		isAppShellRoute,
		publicNavigation,
		type PublicNavItem
	} from '$lib/public-site';
	import { canAccessAdmin, canManageUsers } from '$lib/roles';

	let {
		data,
		children
	}: {
		data: {
			user: App.Locals['user'];
			item?: { title?: string } | null;
			importedContent?: { title?: string } | null;
		};
		children: import('svelte').Snippet;
	} = $props();

	let isAppRoute = $derived(isAppShellRoute(page.url.pathname));
	const isHomeRoute = $derived(page.url.pathname === '/');
	const publicSearchQuery = $derived(page.url.searchParams.get('q') ?? '');
	const publicSearchScope = $derived(page.url.searchParams.get('scope') ?? 'all');
	const nestedLoginRedirectTarget = $derived(
		page.url.pathname === '/login' ?
			page.url.searchParams.get('redirectTo') ?? '/'
		:	`${page.url.pathname}${page.url.search}${page.url.hash}` || '/'
	);
	const downloadRedirectHref = '/login?redirectTo=%2Fdownload%2Fmiljohusesyn';
	const defaultChecklistHref = '/checklists/miljohusesyn';
	const defaultChecklistLoginHref = '/login?redirectTo=%2Fchecklists%2Fmiljohusesyn';
	const loginRedirectHref = $derived(
		`/login?redirectTo=${encodeURIComponent(nestedLoginRedirectTarget)}`
	);
	const showChecklistLinks = $derived(data.user?.role === 'user');
	const showPublicShell = $derived(
		!isAppRoute &&
			!page.url.pathname.startsWith('/admin')
	);
	const showPageMasthead = $derived(
		showPublicShell &&
		!isHomeRoute &&
		!page.url.pathname.startsWith('/checklists') &&
		!page.url.pathname.startsWith('/profile')
	);
	const publicHeroImage = $derived(getPublicHeroImage(page.url.pathname));
	const searchScopeOptions = [
		{ value: 'all', label: 'Sök överallt' },
		{ value: 'wp', label: 'Endast faktabank' },
		{ value: 'exist', label: 'Endast frågor och fakta' }
	];

	const publicNavItems = $derived.by(() => {
		const baseItems = publicNavigation;
		if (!showChecklistLinks) {
			return baseItems;
		}

		const insertIndex = baseItems.findIndex((item) => item.label === 'Kontakt');
		const userItems: PublicNavItem[] = [
			{ label: 'Mina checklistor', href: defaultChecklistHref, matchPrefix: '/checklists' }
		];

		if (insertIndex === -1) {
			return [...baseItems, ...userItems];
		}

		return [
			...baseItems.slice(0, insertIndex),
			...userItems,
			...baseItems.slice(insertIndex)
		];
	});

	const currentBreadcrumbLabel = $derived.by(() => {
		const routeData = page.data as {
			item?: { title?: string } | null;
			importedContent?: { title?: string } | null;
		};
		const explicitTitle =
			routeData?.item?.title ??
			routeData?.importedContent?.title ??
			data.item?.title ??
			data.importedContent?.title;
		if (explicitTitle?.trim()) {
			return explicitTitle.trim();
		}

		const segments = page.url.pathname.split('/').filter(Boolean);
		const lastSegment = segments.at(-1);
		if (!lastSegment) {
			return 'Hem';
		}

		return lastSegment
			.replace(/-/g, ' ')
			.replace(/\b\w/g, (char) => char.toUpperCase());
	});

	const breadcrumbItems = $derived.by(() => {
		if (page.url.pathname === '/') {
			return [{ label: 'Hem', href: null }];
		}

		return [
			{ label: 'Hem', href: '/' },
			{ label: currentBreadcrumbLabel, href: null }
		];
	});

	const canAccessContentStudio = $derived(data.user ? canAccessAdmin(data.user.role) : false);
	const canManageUsersRole = $derived(data.user ? canManageUsers(data.user.role) : false);
</script>

<div class="min-h-screen">
	{#if showPublicShell}
		<PublicHeader
			user={data.user}
			publicNavItems={publicNavItems}
			searchScopeOptions={searchScopeOptions}
			selectedSearchScope={publicSearchScope}
			publicSearchQuery={publicSearchQuery}
			loginRedirectHref={loginRedirectHref}
			downloadHref={data.user ? '/download/miljohusesyn' : downloadRedirectHref}
			showChecklistLinks={showChecklistLinks}
			canAccessContentStudio={canAccessContentStudio}
			canManageUsers={canManageUsersRole}
		/>
	{/if}

	{#if showPageMasthead}
		<PublicPageMasthead
			title={currentBreadcrumbLabel}
			image={publicHeroImage}
			breadcrumbs={breadcrumbItems}
		/>
	{/if}

	<div class:public-content={showPublicShell}>
		{@render children()}
	</div>

	{#if showPublicShell}
		<PublicFooter
			downloadHref={data.user ? '/download/miljohusesyn' : downloadRedirectHref}
			checklistsHref={data.user ? defaultChecklistHref : defaultChecklistLoginHref}
		/>
	{/if}
</div>
