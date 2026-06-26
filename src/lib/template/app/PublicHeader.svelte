<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '../primitives/Icon.svelte';
	import SearchBar from '../primitives/SearchBar.svelte';
	import PublicNavMenu from './PublicNavMenu.svelte';
	import type { PublicNavItem } from '$lib/public-site';

	let {
		user,
		publicNavItems,
		searchScopeOptions,
		selectedSearchScope,
		publicSearchQuery,
		loginRedirectHref,
		downloadHref,
		showChecklistLinks,
		canAccessContentStudio,
		canManageUsers
	}: {
		user: App.Locals['user'] | undefined | null;
		publicNavItems: PublicNavItem[];
		searchScopeOptions: { value: string; label: string }[];
		selectedSearchScope: string;
		publicSearchQuery: string;
		loginRedirectHref: string;
		downloadHref: string;
		showChecklistLinks: boolean;
		canAccessContentStudio: boolean;
		canManageUsers: boolean;
	} = $props();

	let mobileOpen = $state(false);
	let accountOpen = $state(false);
	let searchOpen = $state(false);

	const route = (path: string) => (resolve as unknown as (pathname: string) => string)(path);
	const navItems = $derived(
		publicNavItems.filter((item) => item.label !== 'Hem' && item.label !== 'Beräkningar')
	);
</script>

<header class="sticky top-0 z-40 border-b border-line/70 bg-cream/85 backdrop-blur">
	<div class="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
		<a href={route('/')} class="flex min-w-0 items-center gap-2">
			<span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-leaf text-cream">
				<Icon name="wheat" class="h-5 w-5" />
			</span>
			<span class="font-display truncate text-xl font-semibold tracking-tight text-leaf-2">
				Miljöhusesyn
			</span>
		</a>

		<nav class="hidden items-center gap-7 text-sm text-ink/80 lg:flex" aria-label="Publik huvudmeny">
			{#each navItems as item (item.label)}
				<div class="group relative">
					{#if item.href}
						<a href={route(item.href)} class="inline-flex items-center gap-1.5 py-2 transition hover:text-leaf">
							{item.label}
							{#if item.children?.length}
								<span class="text-[10px]">▾</span>
							{/if}
						</a>
					{:else}
						<span class="inline-flex items-center gap-1.5 py-2">
							{item.label}
							{#if item.children?.length}
								<span class="text-[10px]">▾</span>
							{/if}
						</span>
					{/if}

					{#if item.children?.length}
						<PublicNavMenu items={item.children} />
					{/if}
				</div>
			{/each}
		</nav>

		<div class="flex items-center gap-2">
			<button
				type="button"
				class="hidden h-10 w-10 items-center justify-center rounded-full border border-line text-ink/70 transition hover:border-leaf hover:text-leaf md:inline-flex"
				aria-expanded={searchOpen}
				aria-label="Öppna sök"
				onclick={() => {
					searchOpen = !searchOpen;
					mobileOpen = false;
				}}
			>
				<Icon name="search" class="h-4 w-4" />
			</button>

			{#if user}
				<div class="relative hidden lg:block">
					<button
						type="button"
						class="inline-flex items-center gap-2 rounded-full bg-leaf px-4 py-2.5 text-sm font-medium text-cream shadow-sm transition hover:bg-leaf-2"
						aria-expanded={accountOpen}
						onclick={() => {
							accountOpen = !accountOpen;
							searchOpen = false;
						}}
					>
						<Icon name="log-in" class="h-4 w-4" />
						{user.displayName}
					</button>

					{#if accountOpen}
						<div class="absolute right-0 top-full z-50 mt-2 min-w-60 rounded-3xl border border-line bg-cream p-2 shadow-xl shadow-bark/10">
							{#if showChecklistLinks}
								<a href={route('/profile')} class="block rounded-2xl px-4 py-3 text-sm font-semibold text-ink transition hover:bg-sage-2/40 hover:text-leaf-2">
									Mina uppgifter
								</a>
							{/if}
							{#if canAccessContentStudio}
								<a href={route('/admin/content-studio')} class="block rounded-2xl px-4 py-3 text-sm font-semibold text-ink transition hover:bg-sage-2/40 hover:text-leaf-2">
									Innehållsredaktion
								</a>
							{/if}
							{#if canManageUsers}
								<a href={route('/admin/users')} class="block rounded-2xl px-4 py-3 text-sm font-semibold text-ink transition hover:bg-sage-2/40 hover:text-leaf-2">
									Admin
								</a>
							{/if}
							<form method="POST" action="/logout">
								<button type="submit" class="block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-ink transition hover:bg-sage-2/40 hover:text-leaf-2">
									Logga ut
								</button>
							</form>
						</div>
					{/if}
				</div>
			{:else}
				<a
					href={route(loginRedirectHref)}
					class="hidden items-center gap-2 rounded-full bg-leaf px-4 py-2.5 text-sm font-medium text-cream shadow-sm transition hover:bg-leaf-2 md:inline-flex"
				>
					<Icon name="log-in" class="h-4 w-4" />
					Logga in
				</a>
			{/if}

			<button
				type="button"
				class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink/70 transition hover:border-leaf hover:text-leaf lg:hidden"
				aria-expanded={searchOpen}
				aria-label="Öppna sök"
				onclick={() => {
					searchOpen = !searchOpen;
				}}
			>
				<Icon name="search" class="h-4 w-4" />
			</button>

			<button
				type="button"
				class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink/70 lg:hidden"
				aria-expanded={mobileOpen}
				aria-label="Öppna meny"
				onclick={() => {
					mobileOpen = !mobileOpen;
					searchOpen = false;
				}}
			>
				<Icon name="menu" class="h-5 w-5" />
			</button>
		</div>
	</div>

	{#if searchOpen}
		<div class="pointer-events-none absolute inset-x-0 top-full hidden lg:block">
			<div class="mx-auto max-w-7xl px-6">
				<div class="pointer-events-auto ml-auto mt-3 w-full max-w-xl rounded-[1.7rem] border border-line bg-white/95 p-3 shadow-2xl shadow-bark/12 backdrop-blur">
					<SearchBar
						action={route('/faktabank')}
						scope={selectedSearchScope}
						value={publicSearchQuery}
						placeholder="Sök i faktabanken, t.ex. stallgödsel eller köldmedia"
					/>
				</div>
			</div>
		</div>

		<div class="border-t border-line/60 bg-cream/70 lg:hidden">
			<div class="mx-auto max-w-7xl px-6 py-4">
				<div class="rounded-[1.7rem] border border-line bg-white/95 p-3 shadow-xl shadow-bark/10 backdrop-blur">
					<SearchBar
						action={route('/faktabank')}
						scope={selectedSearchScope}
						value={publicSearchQuery}
						placeholder="Sök i faktabanken, t.ex. stallgödsel eller köldmedia"
					/>
				</div>
			</div>
		</div>
	{/if}

	{#if mobileOpen}
		<nav class="mx-auto mt-4 grid max-w-7xl gap-2 rounded-[1.8rem] border border-line bg-white/85 p-3 shadow-lg shadow-bark/5 lg:hidden" aria-label="Mobil huvudmeny">
			{#each navItems as item (item.label)}
				<div class="rounded-[1.4rem] border border-line/65 bg-cream/80 p-1">
					{#if item.href}
						<a href={route(item.href)} class="block rounded-[1rem] px-4 py-3 text-sm font-semibold text-ink">
							{item.label}
						</a>
					{:else}
						<span class="block rounded-[1rem] px-4 py-3 text-sm font-semibold text-ink">{item.label}</span>
					{/if}

					{#if item.children?.length}
						<div class="mt-1 grid gap-1">
							{#each item.children as child, childIndex (`${child.label}-${child.href ?? 'group'}-${childIndex}`)}
								{#if child.href}
									<a
										href={route(child.href)}
										class="rounded-[1rem] px-4 py-2 text-sm text-ink/80 transition hover:bg-sage-2/40 hover:text-leaf-2"
									>
										{child.label}
									</a>
								{:else}
									<span class="rounded-[1rem] px-4 py-2 text-sm text-ink/70">{child.label}</span>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/each}

			<div class="grid gap-2 pt-2 lg:hidden">
				{#if user}
					{#if showChecklistLinks}
						<a href={route('/profile')} class="rounded-full border border-line bg-cream px-4 py-3 text-center text-sm font-semibold text-leaf-2">
							Mina uppgifter
						</a>
					{/if}
					<form method="POST" action="/logout">
						<button type="submit" class="w-full rounded-full bg-leaf px-4 py-3 text-sm font-semibold text-cream">
							Logga ut
						</button>
					</form>
				{:else}
					<a href={route(loginRedirectHref)} class="rounded-full bg-leaf px-4 py-3 text-center text-sm font-semibold text-cream">
						Logga in
					</a>
				{/if}
				<a
					href={route(downloadHref)}
					data-sveltekit-reload
					class="rounded-full border border-line bg-cream px-4 py-3 text-center text-sm font-semibold text-leaf-2"
				>
					Ladda ned grundbok
				</a>
			</div>
		</nav>
	{/if}
</header>
