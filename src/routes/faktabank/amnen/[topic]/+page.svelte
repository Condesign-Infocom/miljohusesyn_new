<svelte:head>
	<title>{data.topic.title}</title>
</svelte:head>

<script lang="ts">
	import { resolve } from '$app/paths';

	let {
		data
	}: {
		data: {
			topic: {
				slug: string;
				title: string;
				description: string;
				entries: Array<{ title: string; href?: string; description?: string }>;
			};
		};
	} = $props();

	const route = (path: string) => (resolve as unknown as (pathname: string) => string)(path);

</script>

<main class="public-page">
	<section class="public-richtext topic-overview">
		<p class="topic-overview-description">{data.topic.description}</p>
	</section>

	<section class="topic-entry-list" aria-label={data.topic.title}>
		{#each data.topic.entries as entry (entry.title)}
			<article class="topic-entry">
				{#if entry.href}
					<h2><a href={route(entry.href)}>{entry.title}</a></h2>
				{:else}
					<h2 class="topic-entry-muted">{entry.title}</h2>
				{/if}

				{#if entry.description}
					<p>{entry.description}</p>
				{/if}

				{#if !entry.href}
					<p class="topic-entry-status">Kommer i senare publiceringssteg</p>
				{/if}
			</article>
		{/each}
	</section>
</main>

<style>
	.topic-overview {
		margin-top: 40px;
		max-width: 58rem;
	}

	.topic-overview-description {
		color: rgba(36, 48, 39, 0.82);
		font-size: 1.12rem;
		line-height: 1.75;
		margin: 0;
	}

	.topic-entry-list {
		display: grid;
		gap: 2rem;
		margin-top: 2.5rem;
		max-width: 58rem;
	}

	.topic-entry {
		padding: 0 0 1.85rem;
		border-bottom: 1px solid rgba(227, 220, 198, 0.9);
	}

	.topic-entry:last-child {
		border-bottom: 0;
		padding-bottom: 0;
	}

	.topic-entry h2 {
		margin: 0;
		font-size: clamp(1.6rem, 2.4vw, 2.15rem);
		line-height: 1.12;
	}

	.topic-entry h2 a {
		color: var(--public-leaf);
		text-decoration: none;
	}

	.topic-entry h2 a:hover {
		text-decoration: underline;
	}

	.topic-entry-muted {
		color: var(--public-bark);
	}

	.topic-entry p {
		color: rgba(36, 48, 39, 0.78);
		font-size: 1.03rem;
		line-height: 1.7;
		margin: 0.7rem 0 0;
	}

	.topic-entry-status {
		color: #7d5d25;
		font-weight: 700;
	}
</style>
