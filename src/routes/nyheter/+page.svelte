<svelte:head>
	<title>Nyheter</title>
</svelte:head>

<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PublicNewsItem } from '$lib/public-site';

	let {
		data
	}: {
		data: {
			items: PublicNewsItem[];
		};
	} = $props();

	const route = (path: string) => (resolve as unknown as (pathname: string) => string)(path);
</script>

<main class="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
	<section class="rounded-[2rem] border border-line bg-cream/80 p-6 shadow-xl shadow-bark/5 md:p-8">
		<div class="mb-6 max-w-3xl">
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">Nyheter</p>
			<h1 class="font-display mt-3 text-4xl font-semibold tracking-tight text-bark md:text-6xl">
				Aktuella uppdateringar från Miljöhusesyn.
			</h1>
		</div>

		<div class="divide-y divide-line">
			{#each data.items as item (item.slug)}
				<article class="py-6 md:py-8">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-mute">{item.date}</p>
					<h2 class="font-display mt-3 text-2xl font-medium tracking-tight text-bark md:text-4xl">
						<a href={route(`/nyheter/${item.slug}`)} class="transition hover:text-leaf">{item.title}</a>
					</h2>
					<p class="mt-3 max-w-3xl text-base leading-7 text-ink/75 md:text-lg">{item.excerpt}</p>
					<a
						class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-leaf transition hover:text-leaf-2"
						href={route(`/nyheter/${item.slug}`)}
					>
						Läs mer <span aria-hidden="true">↗</span>
					</a>
				</article>
			{/each}
		</div>
	</section>
</main>
