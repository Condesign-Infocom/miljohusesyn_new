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
	<section class="public-richtext news-story">
		<p class="news-date">{data.item.date}</p>
		<p class="lead">{data.item.excerpt}</p>
		<div>
			{#each data.item.bodyParagraphs as paragraph (paragraph)}
				<p>{paragraph}</p>
			{/each}
		</div>
	</section>
</main>

<style>
	.news-story .news-date {
		color: var(--public-mute);
		font-size: 0.84rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		margin: 0 0 12px;
		text-transform: uppercase;
	}

	.news-story .lead {
		color: rgba(36, 48, 39, 0.9);
		font-size: 1.2rem;
		line-height: 1.7;
		margin-bottom: 24px;
	}
</style>
