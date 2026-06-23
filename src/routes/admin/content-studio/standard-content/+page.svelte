<svelte:head>
	<title>Innehållsredaktion - Standardtexter</title>
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
			kind: string;
			availableKinds: string[];
			items: Array<{
				id: string;
				contentType: string;
				contentTypeLabel: string;
				title: string;
				roleLabel: string;
				sourceFile: string;
				targetCount: number;
				outboundReferences: Array<{
					label: string;
					raw: string;
				}>;
				inboundReferences: Array<{
					id: string;
					title: string;
					contentTypeLabel: string;
				}>;
				latestDraft: {
					status: string;
				} | null;
			}>;
		};
	} = $props();

	function statusLabel(status: string | null | undefined) {
		if (status === 'published') return 'Publicerad';
		return 'Importerad';
	}
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Innehållsredaktion</p>
			<h1>Standardtexter</h1>
			<p class="lead">Utforska standardblock, redigera innehållet och publicera giltiga ändringar direkt.</p>
			<p class="lead-note">De publika, redigerbara sidorna har nu också en egen vy under <a href="/admin/content-studio/frontend-content">Frontend-innehåll</a>.</p>
		</div>
	</header>

	<ContentStudioNav active="frontend" />

	<section class="content-panel">
		<form class="filter-form" method="GET">
			<label>
				<span>Typ</span>
				<select name="kind">
					<option value="">Alla typer</option>
					{#each data.availableKinds as kind (kind)}
						<option selected={data.kind === kind} value={kind}>{kind}</option>
					{/each}
				</select>
			</label>
			<button type="submit">Filtrera</button>
		</form>

		<div class="section-bar">
			<div>
				<strong>{data.items.length}</strong>
				<span>standardblock i aktuell vy</span>
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
						<th>Typ</th>
						<th>Roll</th>
						<th>Länkar till</th>
						<th>Arbetsläge</th>
					</tr>
				</thead>
				<tbody>
					{#if data.items.length === 0}
						<tr>
							<td class="empty-row" colspan="5">Inga standardtexter matchar filtret.</td>
						</tr>
					{:else}
						{#each data.items as item (item.id)}
							<tr>
								<td>
									<a class="row-link" href={`/admin/content-studio/standard-content/${item.id}`}>{item.title}</a>
									{#if item.inboundReferences.length}
										<small class="usage-note">
											Används i {item.inboundReferences.map((reference) => reference.title).join(', ')}
										</small>
									{/if}
									<details class="trace-details">
										<summary>Spårning</summary>
										<div>Källfil: {item.sourceFile}</div>
									</details>
								</td>
								<td>{item.contentTypeLabel}</td>
								<td>{item.roleLabel}</td>
								<td>
									<div class="targets-cell">
										<strong>{item.targetCount}</strong>
										{#if item.outboundReferences.length}
											<small>{item.outboundReferences.map((reference) => reference.label).join(', ')}</small>
											<details class="trace-details">
												<summary>Visa tekniska referenser</summary>
												<ul class="trace-list">
													{#each item.outboundReferences as reference (reference.raw)}
														<li>{reference.raw}</li>
													{/each}
												</ul>
											</details>
										{:else}
											<small>Inga vidare länkar</small>
										{/if}
									</div>
								</td>
								<td>{statusLabel(item.latestDraft?.status)}</td>
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

	.lead-note {
		margin: 8px 0 0;
		color: #516056;
	}

	.lead-note a {
		color: #00754c;
		font-weight: 700;
		text-decoration: none;
	}





	.content-panel {
		margin-top: 18px;
		border: 1px solid #d1d7ce;
		border-radius: 6px;
		background: #ffffff;
		padding: 16px;
	}

	.filter-form {
		display: flex;
		gap: 12px;
		align-items: end;
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

	select,
	button {
		font: inherit;
	}

	select {
		width: 100%;
		box-sizing: border-box;
		padding: 10px 12px;
		border: 1px solid #ccd4ca;
		border-radius: 5px;
		background: #fff;
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
	.section-bar small,
	.empty-row {
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

	.targets-cell strong,
	.targets-cell small {
		display: block;
	}

	.trace-details,
	.usage-note,
	.targets-cell small {
		margin-top: 4px;
		color: #66736a;
		line-height: 1.45;
	}

	.usage-note {
		display: block;
	}

	.trace-details {
		margin-top: 6px;
	}

	.trace-details summary {
		cursor: pointer;
		color: #5d675f;
	}

	.trace-list {
		margin: 6px 0 0;
		padding-left: 18px;
	}

	.row-link {
		color: #0f5d45;
		font-weight: 700;
		text-decoration: none;
	}

	@media (max-width: 720px) {
		.filter-form {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
