<svelte:head>
	<title>{data.item.title}</title>
</svelte:head>

<script lang="ts">
	let {
		data
	}: {
		data: {
			item: {
				slug: string;
				title: string;
				excerpt: string;
				bodyHtml: string;
				bodyParagraphs: string[];
				glossaryEntries?: Array<{ term: string; description: string }>;
				kind: 'fact' | 'standard' | 'static';
				nodeId?: string;
				contentType?: string;
				relatedDownloads?: Array<{ title: string; description: string; href: string }>;
			};
		};
	} = $props();

	const renderedBodyHtml = $derived.by(() => {
		if (data.item.bodyHtml.trim()) {
			return data.item.bodyHtml.replace(/<h1[\s\S]*?<\/h1>/i, '').trim();
		}

		const paragraphs = data.item.bodyParagraphs
			.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
			.join('');

		return paragraphs;
	});

	function escapeHtml(value: string) {
		return value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
</script>

<main class="public-page">
	<div class:with-sidebar={Boolean(data.item.relatedDownloads?.length)} class="content-layout">
		<section class="public-richtext">
			{#if data.item.kind === 'standard' && data.item.contentType === 'glossary' && data.item.glossaryEntries?.length}
				<div class="glossary-list" aria-label="Ordlista">
					<div class="glossary-head" aria-hidden="true">
						<span>Ord</span>
						<span>Beskrivning</span>
					</div>

					{#each data.item.glossaryEntries ?? [] as entry (entry.term)}
						<div class="glossary-row">
							<h2>{entry.term}</h2>
							<p>{entry.description}</p>
						</div>
					{/each}
				</div>
			{:else}
				<div>{@html renderedBodyHtml}</div>
			{/if}
		</section>

		{#if data.item.relatedDownloads?.length}
			<aside class="legacy-sidebar">
				<h3>Relaterade dokument</h3>
				<ul>
					{#each data.item.relatedDownloads as resource (resource.title)}
						<li>
							<a href={resource.href} target="_blank" rel="noreferrer">{resource.title}</a>
							<p>{resource.description}</p>
						</li>
					{/each}
				</ul>
			</aside>
		{/if}
	</div>
</main>

<style>
	.glossary-list {
		display: grid;
		gap: 0.625rem;
	}

	.glossary-head,
	.glossary-row {
		display: grid;
		grid-template-columns: minmax(0, 16rem) minmax(0, 1fr);
		gap: 1.5rem;
		align-items: start;
	}

	.glossary-head {
		padding: 0 0.875rem;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.glossary-row {
		padding: 0.875rem;
		background: color-mix(in srgb, var(--color-line) 30%, white);
	}

	.glossary-row h2,
	.glossary-row p {
		margin: 0;
	}

	.glossary-row h2 {
		font-family: inherit;
		font-size: 1.05rem;
		font-weight: 700;
		line-height: 1.35;
		color: var(--color-bark);
	}

	.glossary-row p {
		font-size: 1rem;
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-ink) 88%, white);
	}

	@media (max-width: 760px) {
		.glossary-head {
			display: none;
		}

		.glossary-row {
			grid-template-columns: minmax(0, 1fr);
			gap: 0.5rem;
		}
	}
</style>
