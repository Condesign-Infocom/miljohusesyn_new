<svelte:head>
	<title>Beräkningar</title>
</svelte:head>

<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PublicCalculatorPage } from '$lib/public-site';

	let {
		data
	}: {
		data: {
			calculators: PublicCalculatorPage[];
		};
	} = $props();

	const route = (path: string) => (resolve as unknown as (pathname: string) => string)(path);
</script>

<main class="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
	<section class="grid gap-8 rounded-[2rem] border border-line bg-gradient-to-br from-leaf via-leaf-2 to-bark p-6 text-cream shadow-xl shadow-bark/10 md:grid-cols-[minmax(0,22rem)_1fr] md:p-8">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-cream/75">Beräkningar</p>
			<h1 class="font-display mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
				Beräkningsverktygen byggs om i nya systemet.
			</h1>
			<p class="mt-4 max-w-xl text-base leading-7 text-cream/75 md:text-lg">
				Den äldre publika sajten hade tre beräkningsytor i huvudmenyn. Här etablerar vi först en
				tydlig publik struktur innan varje verktyg återskapas med modern logik och bättre
				resultatpresentation.
			</p>
		</div>

		<div class="grid gap-4 md:grid-cols-3">
			{#each data.calculators as calculator, index (calculator.slug)}
				<a
					href={route(`/berakningar/${calculator.slug}`)}
					class="flex min-h-64 flex-col justify-between rounded-[1.6rem] border border-cream/15 bg-cream/6 p-5 transition hover:bg-cream/10"
				>
					<span class="font-display text-sm text-cream/60">{`${index + 1}`.padStart(2, '0')}</span>
					<div>
						<h2 class="font-display text-2xl font-semibold tracking-tight text-cream">
							{calculator.title}
						</h2>
						<p class="mt-3 text-sm leading-6 text-cream/70">{calculator.excerpt}</p>
					</div>
				</a>
			{/each}
		</div>
	</section>
</main>
