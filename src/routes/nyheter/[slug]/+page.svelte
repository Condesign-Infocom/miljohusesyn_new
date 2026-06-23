<svelte:head>
	<title>{data.item.title}</title>
</svelte:head>

<script lang="ts">
	import type { PublicNewsItem } from '$lib/public-site';

	let {
		data
	}: {
		data: {
			item: PublicNewsItem;
		};
	} = $props();
</script>

<main class="public-page">
	<article class="article">
		<p class="news-date">{data.item.date}</p>
		<h1>{data.item.title}</h1>
		<p class="lead">{data.item.excerpt}</p>

		<div class="article-body">
			{#each data.item.bodyParagraphs as paragraph (paragraph)}
				<p>{paragraph}</p>
			{/each}
		</div>

		<p class="legacy-link">
			<a href={data.item.legacyUrl} target="_blank" rel="noreferrer">Visa ursprunglig publikation</a>
		</p>
	</article>
</main>
