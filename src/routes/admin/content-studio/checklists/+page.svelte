<svelte:head>
	<title>Innehållsredaktion - Checklistor</title>
</svelte:head>

<script lang="ts">
	import ContentStudioNav from '$lib/components/admin/ContentStudioNav.svelte';
	let {
		data
	}: {
		data: {
			latestSnapshot: {
				id: string;
				sourceLabel: string;
				importedAt: string;
			} | null;
			search: string;
			items: Array<{
				id: string;
				checklistId: string;
				qaType: string;
				title: string;
				groupCount: number;
				questionCount: number;
				missingFactLinkCount: number;
				duplicateNodeIdCount: number;
				readiness: {
					state: 'ready' | 'warning' | 'blocking';
					blockerCount: number;
					warningCount: number;
				};
			}>;
		};
	} = $props();

	const checklistCountLabel = $derived(
		data.items.length === 1 ? 'checklista i urvalet' : 'checklistor i urvalet'
	);

	function validationLabel(count: number, singular: string, plural: string) {
		return `${count} ${count === 1 ? singular : plural}`;
	}

	function nextStepLabel(item: (typeof data.items)[number]) {
		if (item.readiness.state === 'blocking') {
			return 'Redigera struktur';
		}

		if (item.readiness.state === 'warning') {
			return 'Granska kopplingar';
		}

		return 'Redo för nästa steg';
	}

	function readinessLabel(item: (typeof data.items)[number]) {
		if (item.readiness.state === 'blocking') {
			return `Blockerar (${item.readiness.blockerCount})`;
		}

		if (item.readiness.state === 'warning') {
			return `Varning (${item.readiness.warningCount})`;
		}

		return 'Redo';
	}
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Innehållsredaktion</p>
			<h1>Checklistor</h1>
			<p class="lead">Översikt över importerade checklistor. Den här sidan är främst till för att hitta rätt checklista och hoppa vidare till strukturgranskning eller validering.</p>
		</div>
	</header>

	<ContentStudioNav active="checklists" />

	<section class="content-panel">
		<section class="intro-panel">
			<div>
				<p class="eyebrow">Syfte</p>
				<h2>Vad kan du göra här?</h2>
				<p>Hitta rätt checklista utifrån titel, QA-typ eller checklist-id. Varje rad visar omfattning, kvalitetssignaler och vilket nästa steg som är mest relevant just nu.</p>
			</div>
			<div class="intro-actions">
				<a class="secondary-action" href="/admin/content-studio/validation">Öppna validering</a>
			</div>
		</section>

		<form class="search-bar" method="GET">
			<label>
				<span>Sök</span>
				<input name="q" type="search" value={data.search} placeholder="checklist-id, QA-typ eller titel" />
			</label>
			<button type="submit">Sök</button>
		</form>

		<div class="section-bar">
			<div>
				<strong>{data.items.length}</strong>
				<span>{checklistCountLabel}</span>
			</div>
			{#if data.latestSnapshot}
				<small>{data.latestSnapshot.sourceLabel} · {data.latestSnapshot.id}</small>
			{/if}
		</div>

		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Titel</th>
						<th>Omfattning</th>
						<th>Validering</th>
						<th>Nästa steg</th>
						<th>Åtgärder</th>
					</tr>
				</thead>
				<tbody>
					{#if data.items.length === 0}
						<tr>
							<td class="empty-row" colspan="5">Inga checklistor matchar sökningen.</td>
						</tr>
					{:else}
						{#each data.items as item (item.id)}
							<tr>
								<td>
									<div class="title-cell">
										<a class="row-link" href={`/admin/content-studio/checklists/${item.id}`}>{item.title}</a>
										<small>{item.checklistId} · {item.qaType}</small>
									</div>
								</td>
								<td>
									<div class="metric-stack">
										<span>{validationLabel(item.groupCount, 'grupp', 'grupper')}</span>
										<span>{validationLabel(item.questionCount, 'fråga', 'frågor')}</span>
									</div>
								</td>
								<td>
									<div class="metric-stack">
										<span>{validationLabel(item.missingFactLinkCount, 'fråga utan fakta', 'frågor utan fakta')}</span>
										<span>{validationLabel(item.duplicateNodeIdCount, 'dubbelt node-id', 'dubbla node-id')}</span>
										<span class:warning-state={item.readiness.state === 'warning'} class:blocking-state={item.readiness.state === 'blocking'}>
											{readinessLabel(item)}
										</span>
									</div>
								</td>
								<td>
									<strong class="next-step">{nextStepLabel(item)}</strong>
								</td>
								<td>
									<div class="action-stack">
										<a class="action-link" href={`/admin/content-studio/checklists/${item.id}`}>Redigera struktur</a>
										<a class="action-link" href={`/admin/content-studio/validation?checklist=${item.id}`}>Öppna validering</a>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</section>
</main>

<style>
	:global(body) {
		background: #f4f4ef;
	}

	main {
		max-width: 1100px;
		margin: 0 auto;
		padding: 34px 22px 60px;
		font-family: Arial, Helvetica, sans-serif;
		color: #2f3732;
	}

	.page-header {
		padding-bottom: 22px;
		border-bottom: 1px solid #007a5b;
	}

	.eyebrow {
		margin: 0 0 8px;
		color: #00754c;
		font-size: 14px;
		font-weight: 700;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-size: 34px;
		font-weight: 500;
	}

	.lead {
		max-width: 68ch;
		margin: 12px 0 0;
		line-height: 1.5;
	}




	.content-panel {
		margin-top: 18px;
		border: 1px solid #d1d7ce;
		border-radius: 6px;
		background: #ffffff;
		padding: 16px;
	}

	.intro-panel {
		display: flex;
		justify-content: space-between;
		gap: 18px;
		padding-bottom: 16px;
		margin-bottom: 16px;
		border-bottom: 1px solid #e3e7e0;
	}

	.intro-panel h2 {
		font-size: 28px;
		margin: 0 0 8px;
	}

	.intro-panel p {
		color: #516056;
		line-height: 1.5;
		margin: 0;
		max-width: 72ch;
	}

	.intro-panel a {
		color: #007a5b;
		font-weight: 700;
		text-decoration: none;
	}

	.intro-panel a:hover {
		text-decoration: underline;
	}

	.intro-actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 220px;
	}

	.secondary-action {
		border: 1px solid #c9d3cc;
		border-radius: 6px;
		color: #1f3a2d;
		font-weight: 700;
		padding: 12px 14px;
		text-decoration: none;
		background: #f8faf8;
	}

	.search-bar {
		display: flex;
		gap: 12px;
		margin-bottom: 16px;
	}

	label {
		flex: 1;
	}

	label span {
		display: block;
		margin-bottom: 6px;
		font-size: 13px;
		color: #516056;
	}

	input,
	button {
		font: inherit;
	}

	input {
		width: 100%;
		box-sizing: border-box;
		padding: 10px 12px;
		border: 1px solid #ccd4ca;
		border-radius: 5px;
	}

	button {
		align-self: end;
		border: 0;
		border-radius: 5px;
		background: #007a5b;
		color: #ffffff;
		cursor: pointer;
		padding: 10px 16px;
	}

	.section-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 16px;
	}

	.section-bar strong {
		display: block;
		font-size: 30px;
	}

	.section-bar span,
	.section-bar small {
		color: #5d675f;
	}

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 14px 10px;
		border-bottom: 1px solid #e3e7e0;
		text-align: left;
		vertical-align: top;
	}

	th {
		color: #516056;
		font-size: 13px;
		text-transform: uppercase;
	}

	.empty-row {
		color: #66736a;
	}

	.row-link {
		color: #0f5d45;
		font-weight: 700;
		text-decoration: none;
	}

	.title-cell,
	.metric-stack,
	.action-stack {
		display: grid;
		gap: 6px;
	}

	.title-cell small,
	.metric-stack span {
		color: #5d675f;
	}

	.metric-stack span.warning-state {
		color: #9a6700;
		font-weight: 700;
	}

	.metric-stack span.blocking-state {
		color: #9a2f2f;
		font-weight: 700;
	}

	.next-step {
		color: #1f3a2d;
	}

	.action-link {
		color: #0f5d45;
		font-weight: 700;
		text-decoration: none;
	}

	.action-link:hover,
	.row-link:hover {
		text-decoration: underline;
	}

	@media (max-width: 720px) {
		.intro-panel,
		.search-bar {
			flex-direction: column;
		}

		.intro-actions {
			min-width: 0;
		}
	}
</style>
