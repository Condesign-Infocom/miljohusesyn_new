<svelte:head>
	<title>Material för nedladdning</title>
</svelte:head>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { downloadResources } from '$lib/public-site';

	const route = (path: string) => (resolve as unknown as (pathname: string) => string)(path);

	const groupedResources = Object.entries(
		downloadResources.reduce<Record<string, typeof downloadResources>>((groups, resource) => {
			const category = resource.category ?? 'Övrigt';
			(groups[category] ??= []).push(resource);
			return groups;
		}, {})
	);
</script>

<main class="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
	<section class="max-w-4xl">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">Material för nedladdning</p>
			<h2 class="font-display mt-3 text-4xl font-semibold tracking-tight text-bark md:text-6xl">
				Blanketter, vägledningar och dokument samlade i ett bibliotek.
			</h2>
			<p class="mt-4 text-base leading-7 text-ink/75 md:text-lg">
				Filerna kommer från den tidigare webbplatsen och är nu ordnade i den nya applikationens
				statiskfilyta bredvid den publicerade innehållsdelen.
			</p>
		</div>
	</section>

	<div class="mt-8 grid gap-8">
		{#each groupedResources as [category, resources] (category)}
			<section>
				<h2 class="font-display text-3xl font-semibold tracking-tight text-bark md:text-4xl">
					{category}
				</h2>
				<div class="mt-4 grid gap-4 md:grid-cols-2">
					{#each resources as resource (resource.title)}
						<article class="rounded-[1.6rem] border border-line bg-white/70 p-5 shadow-sm shadow-bark/5">
							<h3 class="font-display text-2xl font-semibold tracking-tight text-bark">
								{resource.title}
							</h3>
							<p class="mt-3 text-sm leading-6 text-ink/75 md:text-base">{resource.description}</p>
							{#if resource.external}
								<a
									href={resource.href}
									target="_blank"
									rel="noreferrer"
									class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-leaf transition hover:text-leaf-2"
								>
									Öppna länk <span aria-hidden="true">↗</span>
								</a>
							{:else}
								<a
									href={route(resource.href)}
									target="_blank"
									rel="noreferrer"
									class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-leaf transition hover:text-leaf-2"
								>
									Öppna dokument <span aria-hidden="true">↗</span>
								</a>
							{/if}
						</article>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</main>
