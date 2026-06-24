<svelte:head>
	<title>Faktabank</title>
</svelte:head>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { factTopics } from '$lib/public-site';
	import type { PublicSearchResult, PublicSearchScope } from '$lib/server/services/public-search';

	type PublishedFact = {
		slug: string;
		nodeId: string;
		title: string;
		excerpt: string;
	};

	type PublishedStandardContent = {
		slug: string;
		title: string;
		contentType: string;
		excerpt: string;
	};

	let {
		data
	}: {
		data: {
			query: string;
			scope: PublicSearchScope;
			searchResults: PublicSearchResult[];
			publishedFacts: PublishedFact[];
			publishedStandardContent: PublishedStandardContent[];
		};
	} = $props();

	const route = (path: string) => (resolve as unknown as (pathname: string) => string)(path);
	const scopeLabels: Record<PublicSearchScope, string> = {
		all: 'Överallt',
		wp: 'Endast faktabank',
		exist: 'Endast frågor och fakta'
	};
</script>

<main class="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
	<section class="max-w-4xl">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">Faktabank</p>
			<h2 class="font-display mt-3 text-4xl font-semibold tracking-tight text-bark md:text-6xl">
				Publik ingång till regler, faktatexter och nedladdningar.
			</h2>
			<p class="mt-4 text-base leading-7 text-ink/75 md:text-lg">
				Här möts publicerade faktasidor i databasen, bevarade ämnesöversikter och nedladdningsbart
				material från den tidigare webbplatsen.
			</p>
		</div>
	</section>

	{#if data.query}
		<section class="mt-8">
			<div class="mb-4">
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">Sökresultat</p>
				<h2 class="font-display mt-2 text-3xl font-semibold tracking-tight text-bark md:text-4xl">
					Resultat för "{data.query}"
				</h2>
				<p class="mt-2 text-sm text-mute md:text-base">
					Sökområde: {scopeLabels[data.scope]} · {data.searchResults.length}
					{data.searchResults.length === 1 ? ' träff' : ' träffar'}
				</p>
			</div>

			{#if data.searchResults.length > 0}
				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{#each data.searchResults as result (`${result.kind}:${result.href}`)}
						{#if result.kind === 'download' && !result.href.startsWith('/')}
							<a
								class="rounded-[1.6rem] border border-line bg-white/70 p-5 shadow-sm shadow-bark/5 transition hover:-translate-y-0.5 hover:border-leaf/40"
								href={result.href}
								target="_blank"
								rel="noreferrer"
							>
								<p class="text-xs font-semibold uppercase tracking-[0.16em] text-mute">{result.meta}</p>
								<h3 class="font-display mt-3 text-2xl font-semibold tracking-tight text-bark">
									{result.title}
								</h3>
								<p class="mt-3 text-sm leading-6 text-ink/75 md:text-base">{result.excerpt}</p>
							</a>
						{:else}
							<a
								class="rounded-[1.6rem] border border-line bg-white/70 p-5 shadow-sm shadow-bark/5 transition hover:-translate-y-0.5 hover:border-leaf/40"
								href={route(result.href)}
								target={result.kind === 'download' ? '_blank' : undefined}
								rel={result.kind === 'download' ? 'noreferrer' : undefined}
							>
								<p class="text-xs font-semibold uppercase tracking-[0.16em] text-mute">{result.meta}</p>
								<h3 class="font-display mt-3 text-2xl font-semibold tracking-tight text-bark">
									{result.title}
								</h3>
								<p class="mt-3 text-sm leading-6 text-ink/75 md:text-base">{result.excerpt}</p>
							</a>
						{/if}
					{/each}
				</div>
			{:else}
				<div class="rounded-[1.6rem] border border-line bg-white/70 p-5 shadow-sm shadow-bark/5">
					Inga träffar hittades. Prova ett annat sökord eller byt sökområde i sökfältet.
				</div>
			{/if}
		</section>
	{/if}

	<section class="mt-10">
		<p class="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">Publicerat nu</p>
		<h2 class="font-display mt-2 text-3xl font-semibold tracking-tight text-bark md:text-4xl">
			Fakta som redan finns i den nya publiceringsytan
		</h2>
		<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each data.publishedFacts as fact (fact.slug)}
				<a
					class="rounded-[1.6rem] border border-line/20 bg-gradient-to-br from-leaf to-leaf-2 p-5 shadow-lg shadow-leaf/10"
					href={route(`/faktabank/${fact.slug}`)}
				>
					<p class="text-xs font-semibold uppercase tracking-[0.16em] text-cream/70">{fact.nodeId}</p>
					<h3 class="font-display mt-3 text-2xl font-semibold tracking-tight text-cream">{fact.title}</h3>
					<p class="mt-3 text-sm leading-6 text-cream/80 md:text-base">{fact.excerpt}</p>
				</a>
			{/each}
		</div>
	</section>

	<section class="mt-10">
		<p class="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">Redan importerat</p>
		<h2 class="font-display mt-2 text-3xl font-semibold tracking-tight text-bark md:text-4xl">
			Standardtexter som finns i innehållsdatabasen
		</h2>
		<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each data.publishedStandardContent as item (item.slug)}
				<a
					class="rounded-[1.6rem] border border-line/20 bg-gradient-to-br from-[#7d5d25] to-[#5b6a5f] p-5 shadow-lg shadow-bark/10"
					href={route(`/faktabank/${item.slug}`)}
				>
					<p class="text-xs font-semibold uppercase tracking-[0.16em] text-cream/70">{item.contentType}</p>
					<h3 class="font-display mt-3 text-2xl font-semibold tracking-tight text-cream">{item.title}</h3>
					<p class="mt-3 text-sm leading-6 text-cream/80 md:text-base">{item.excerpt}</p>
				</a>
			{/each}
		</div>
	</section>

	<section class="mt-10">
		<p class="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">Planerad täckning</p>
		<h2 class="font-display mt-2 text-3xl font-semibold tracking-tight text-bark md:text-4xl">
			Områden från legacy-sajten som flyttas in stegvis
		</h2>
		<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each factTopics as topic (topic.slug)}
				<article class="rounded-[1.6rem] border border-line bg-white/70 p-5 shadow-sm shadow-bark/5">
					<h3 class="font-display text-2xl font-semibold tracking-tight text-bark">{topic.title}</h3>
					<p class="mt-3 text-sm leading-6 text-ink/75 md:text-base">{topic.description}</p>
					<ul class="mt-4 space-y-2 text-sm text-ink/75">
						{#each topic.entries.slice(0, 4) as entry (entry.title)}
							<li>
								{#if entry.href}
									<a href={route(entry.href)} class="font-medium text-leaf transition hover:text-leaf-2">
										{entry.title}
									</a>
								{:else}
									{entry.title}
								{/if}
							</li>
						{/each}
					</ul>
					<a
						class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-leaf transition hover:text-leaf-2"
						href={route(`/faktabank/amnen/${topic.slug}`)}
					>
						Öppna ämnesområde <span aria-hidden="true">↗</span>
					</a>
				</article>
			{/each}
		</div>
	</section>
</main>
