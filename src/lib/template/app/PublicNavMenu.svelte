<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PublicNavChild } from '$lib/public-site';
	import PublicNavMenu from './PublicNavMenu.svelte';

	let { items, nested = false }: { items: PublicNavChild[]; nested?: boolean } = $props();

	const route = (path: string) => (resolve as unknown as (pathname: string) => string)(path);
</script>

<div
	class={`min-w-72 rounded-3xl border border-line bg-cream p-2 shadow-xl shadow-bark/10 ${
		nested ? 'lg:absolute lg:left-full lg:top-0 lg:hidden lg:group-hover:block' : 'lg:absolute lg:left-0 lg:top-full lg:hidden lg:group-hover:block'
	}`}
>
	{#each items as item, index (`${item.label}-${item.href ?? 'group'}-${index}`)}
		<div class="group/menuitem relative">
			{#if item.href}
				<a
					href={route(item.href)}
					class="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-ink transition hover:bg-sage-2/40 hover:text-leaf-2"
				>
					<span>{item.label}</span>
					{#if item.children?.length}
						<span class="text-mute">›</span>
					{/if}
				</a>
			{:else}
				<span
					class="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-ink"
				>
					<span>{item.label}</span>
					{#if item.children?.length}
						<span class="text-mute">›</span>
					{/if}
				</span>
			{/if}

			{#if item.children?.length}
				<div class="hidden pl-4 lg:absolute lg:left-full lg:top-0 lg:pl-0 lg:group-hover/menuitem:block">
					<PublicNavMenu items={item.children} nested />
				</div>

				<div class="grid gap-1 pl-4 pt-1 lg:hidden">
					{#each item.children as child, childIndex (`${child.label}-${child.href ?? 'group'}-${childIndex}`)}
						{#if child.href}
							<a
								href={route(child.href)}
								class="rounded-2xl px-4 py-2 text-sm text-ink/80 transition hover:bg-sage-2/40 hover:text-leaf-2"
							>
								{child.label}
							</a>
						{:else}
							<span class="rounded-2xl px-4 py-2 text-sm text-ink/70">{child.label}</span>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>
