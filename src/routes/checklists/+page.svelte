<svelte:head>
	<title>Mina checklistor</title>
</svelte:head>

<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ChecklistList } from '$lib/types/checklists';

	let { data }: { data: ChecklistList } = $props();

	const checklistYear = new Date().getFullYear();
</script>

<main class="checklists-page">
	<section class="hero-section">
		<div class="hero-copy">
			<p class="eyebrow">Mina checklistor</p>
			<h1>Checklistor för {checklistYear}</h1>
			<p class="lead">
				Här hittar du dina tilldelade checklistor och kan fortsätta där du slutade.
			</p>
		</div>

		<form method="GET" action="/download/miljohusesyn" data-sveltekit-reload>
			<button class="download-button" type="submit">Ladda ned Miljöhusesyn</button>
		</form>
	</section>

	<section class="list-section" aria-labelledby="checklist-heading">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Översikt</p>
				<h2 id="checklist-heading">Dina checklistor</h2>
			</div>
			<span class="count-pill">{data.items.length} st</span>
		</div>

		{#if data.items.length === 0}
			<div class="empty-state">
				<h3>Inga checklistor ännu</h3>
				<p>När en checklista har tilldelats till ditt konto kommer den att visas här.</p>
			</div>
		{:else}
			<div class="checklist-list">
				{#each data.items as item (item.slug)}
					<a class="checklist-row" href={resolve('/checklists/[checklistId]', { checklistId: item.slug })}>
						<div class="row-copy">
							<p class="card-label">Checklista</p>
							<h3>{item.title}</h3>
						</div>
						<span class="card-link">Öppna checklista</span>
					</a>
				{/each}
			</div>
		{/if}
	</section>
</main>

<style>
	.checklists-page {
		width: min(1180px, calc(100% - 48px));
		margin: 0 auto;
		padding: 48px 0 72px;
		color: var(--color-ink);
	}

	.hero-section {
		display: flex;
		justify-content: space-between;
		gap: 32px;
		align-items: end;
	}

	.hero-copy {
		max-width: 720px;
	}

	.eyebrow,
	.card-label {
		margin: 0;
		color: var(--color-leaf);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	h1,
	h2,
	h3 {
		margin: 0;
		font-family: var(--font-display);
		color: var(--color-bark);
	}

	h1 {
		margin-top: 14px;
		font-size: clamp(2.6rem, 5vw, 4.5rem);
		line-height: 0.95;
		font-weight: 600;
		letter-spacing: -0.03em;
	}

	h2 {
		margin-top: 12px;
		font-size: clamp(2rem, 4vw, 3.25rem);
		line-height: 1;
		font-weight: 600;
		letter-spacing: -0.03em;
	}

	h3 {
		font-size: clamp(1.7rem, 3vw, 2.4rem);
		line-height: 1.05;
		font-weight: 550;
	}

	.lead {
		max-width: 44rem;
		margin: 20px 0 0;
		font-size: 1.08rem;
		line-height: 1.7;
		color: color-mix(in srgb, var(--color-ink) 78%, white);
	}

	.download-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		min-height: 56px;
		padding: 0 26px;
		border: 0;
		border-radius: 999px;
		background: var(--color-leaf);
		color: var(--color-cream);
		font-size: 0.95rem;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			background-color 0.18s ease;
	}

	.download-button:hover {
		background: var(--color-leaf-2);
		transform: translateY(-1px);
	}

	.list-section {
		margin-top: 44px;
	}

	.section-heading {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: end;
		padding-bottom: 20px;
		border-bottom: 1px solid color-mix(in srgb, var(--color-line) 82%, white);
	}

	.count-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 42px;
		padding: 0 16px;
		border: 1px solid color-mix(in srgb, var(--color-leaf) 20%, white);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-sage-2) 45%, white);
		color: var(--color-leaf-2);
		font-size: 0.9rem;
		font-weight: 700;
	}

	.checklist-list {
		display: grid;
		margin-top: 12px;
	}

	.checklist-row {
		display: flex;
		justify-content: space-between;
		gap: 18px;
		align-items: end;
		padding: 24px 0;
		border-bottom: 1px solid color-mix(in srgb, var(--color-line) 82%, white);
		text-decoration: none;
		transition: color 0.18s ease;
	}

	.checklist-row:hover h3,
	.checklist-row:hover .card-link {
		color: var(--color-leaf);
	}

	.row-copy {
		max-width: 760px;
	}

	.card-label {
		margin-bottom: 12px;
	}

	.card-link {
		flex-shrink: 0;
		color: var(--color-leaf-2);
		font-size: 0.95rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.empty-state {
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid color-mix(in srgb, var(--color-line) 82%, white);
	}

	.empty-state h3 {
		font-size: 1.8rem;
	}

	.empty-state p {
		max-width: 42rem;
		margin: 14px 0 0;
		line-height: 1.7;
		color: var(--color-mute);
	}

	@media (max-width: 760px) {
		.checklists-page {
			width: min(100% - 28px, 1180px);
			padding: 28px 0 48px;
		}

		.hero-section,
		.section-heading,
		.checklist-row {
			flex-direction: column;
			align-items: start;
		}

		.list-section {
			margin-top: 32px;
		}
	}
</style>
