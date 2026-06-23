<script lang="ts">
	import { resolve } from '$app/paths';

	let {
		title,
		image,
		breadcrumbs
	}: {
		title: string;
		image: string;
		breadcrumbs: { label: string; href: string | null }[];
	} = $props();

	const route = (path: string) => (resolve as unknown as (pathname: string) => string)(path);
</script>

<section class="relative overflow-hidden border-b border-line/70">
	<div class="absolute inset-0 bg-cover bg-center" style={`background-image:url('${image}')`}></div>
	<div class="absolute inset-0 bg-gradient-to-br from-cream/95 via-cream/78 to-cream/30"></div>
	<div class="absolute inset-0 grain opacity-50"></div>

	<div class="relative mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
		<ul class="mb-6 flex flex-wrap gap-x-3 gap-y-2 text-sm text-mute">
			{#each breadcrumbs as crumb (crumb.label)}
				<li class="inline-flex items-center gap-3">
					{#if crumb.href}
						<a href={route(crumb.href)} class="transition hover:text-leaf">{crumb.label}</a>
					{:else}
						<span>{crumb.label}</span>
					{/if}
				</li>
			{/each}
		</ul>

		<div class="max-w-3xl">
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">Miljöhusesyn</p>
			<h1 class="font-display mt-3 text-4xl font-semibold tracking-tight text-bark md:text-6xl">
				{title}
			</h1>
		</div>
	</div>
</section>
