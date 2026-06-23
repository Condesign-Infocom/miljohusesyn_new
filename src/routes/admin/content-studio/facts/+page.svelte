<svelte:head>
	<title>Innehållsredaktion - Fakta</title>
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
			} | null;
			search: string;
			selectedChecklist: {
				id: string;
				checklistId: string;
				title: string;
				qaType: string;
				questionCount: number;
				missingFactLinkCount: number;
			} | null;
			items: Array<{
				id: string;
				sourceRowId: string;
				factId: string | null;
				nodeId: string | null;
				title: string;
				sourceFile: string;
				latestDraft: {
					status: string;
					latestRevisionValidationStatus: string | null;
				} | null;
			}>;
		};
	} = $props();

	function labelForStatus(status: string | null | undefined) {
		if (status === 'published') {
			return 'Publicerad';
		}

		return 'Importerad';
	}
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Innehållsredaktion</p>
			<h1>Fakta</h1>
			<p class="lead">Sök bland faktanoder och öppna dem för direktpublicerad redigering.</p>
		</div>
	</header>

	<ContentStudioNav />

	<section class="content-panel">
		{#if data.selectedChecklist}
			<section class="context-panel">
				<div>
					<p class="eyebrow">Checklistfilter</p>
					<h2>{data.selectedChecklist.title}</h2>
					<p>
						Visar fakta med node-id från checklistan {data.selectedChecklist.checklistId}. Om du behöver
						fånga upp frågor utan faktalänk är valideringen fortfarande snabbaste vägen vidare.
					</p>
					<small>
						{data.selectedChecklist.questionCount} frågor · {data.selectedChecklist.missingFactLinkCount}
						utan fakta
					</small>
				</div>
				<div class="context-actions">
					<a class="secondary-action" href={`/admin/content-studio/validation?checklist=${data.selectedChecklist.id}`}>Öppna validering</a>
					<a class="secondary-action" href="/admin/content-studio/facts">Rensa filter</a>
				</div>
			</section>
		{/if}

		<form class="search-bar" method="GET">
			{#if data.selectedChecklist}
				<input type="hidden" name="checklist" value={data.selectedChecklist.id} />
			{/if}
			<label>
				<span>Sök</span>
				<input name="q" type="search" value={data.search} placeholder="fact-id, node-id, titel eller källfil" />
			</label>
			<button type="submit">Sök</button>
		</form>

		<div class="section-bar">
			<div>
				<strong>{data.items.length}</strong>
				<span>{data.selectedChecklist ? 'fakta för vald checklista' : 'fakta i aktuell vy'}</span>
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
						<th>Fact-ID</th>
						<th>Node-ID</th>
						<th>Källfil</th>
						<th>Arbetsläge</th>
					</tr>
				</thead>
				<tbody>
					{#if data.items.length === 0}
						<tr>
							<td class="empty-row" colspan="5">Inga fakta matchar sökningen.</td>
						</tr>
					{:else}
						{#each data.items as item (item.sourceRowId)}
							<tr>
								<td><a class="row-link" href={`/admin/content-studio/facts/${item.sourceRowId}`}>{item.title}</a></td>
								<td>{item.factId || 'Saknas'}</td>
								<td>{item.nodeId || 'Saknas'}</td>
								<td>{item.sourceFile}</td>
								<td>
									<div class="draft-state">
										<strong>{labelForStatus(item.latestDraft?.status)}</strong>
										<small>{item.latestDraft?.latestRevisionValidationStatus || 'Ingen validering ännu'}</small>
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
		max-width: 1180px;
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

	.context-panel {
		display: flex;
		justify-content: space-between;
		gap: 18px;
		padding-bottom: 16px;
		margin-bottom: 16px;
		border-bottom: 1px solid #e3e7e0;
	}

	.context-panel h2 {
		font-size: 24px;
		margin: 0 0 8px;
	}

	.context-panel p {
		color: #516056;
		line-height: 1.5;
		margin: 0;
		max-width: 72ch;
	}

	.context-panel small {
		display: block;
		margin-top: 8px;
		color: #5d675f;
	}

	.context-actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 220px;
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
	.section-bar small,
	.empty-row {
		color: #5d675f;
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

	.secondary-action {
		border: 1px solid #c9d3cc;
		border-radius: 6px;
		color: #1f3a2d;
		font-weight: 700;
		padding: 12px 14px;
		text-decoration: none;
		background: #f8faf8;
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
		padding: 12px 10px;
		border-bottom: 1px solid #e3e7e0;
		text-align: left;
		vertical-align: top;
	}

	th {
		color: #516056;
		font-size: 13px;
		text-transform: uppercase;
	}

	.draft-state strong,
	.draft-state small {
		display: block;
	}

	.draft-state small {
		margin-top: 4px;
		color: #66736a;
	}

	.row-link {
		color: #0f5d45;
		font-weight: 700;
		text-decoration: none;
	}

	@media (max-width: 720px) {
		.context-panel,
		.search-bar {
			flex-direction: column;
		}

		.context-actions {
			min-width: 0;
		}
	}
</style>
