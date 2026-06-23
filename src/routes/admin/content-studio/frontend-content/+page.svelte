<svelte:head>
	<title>Innehållsredaktion - Frontend-innehåll</title>
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
			items: Array<{
				id: string;
				title: string;
				publicTitle: string;
				publicSlug: string;
				publicHref: string;
				contentTypeLabel: string;
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
			<h1>Frontend-innehåll</h1>
			<p class="lead">Här samlas de redigerbara publika sidorna som faktiskt visas i den öppna sajten. Ändringar sparas och publiceras direkt.</p>
		</div>
	</header>

	<ContentStudioNav active="frontend" />

	<section class="role-panel">
		<h2>Arbetsflöde</h2>
		<p>Redigera innehållet här. När formuläret sparas blir ändringen den publicerade versionen direkt.</p>
	</section>

	<section class="content-panel">
		<div class="section-bar">
			<div>
				<strong>{data.items.length}</strong>
				<span>publika innehållssidor i aktuell snapshot</span>
			</div>
			{#if data.latestSnapshot}
				<small>{data.latestSnapshot.sourceLabel} · {data.latestSnapshot.id}</small>
			{/if}
		</div>

		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Publik sida</th>
						<th>Typ</th>
						<th>URL</th>
						<th>Arbetsläge</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#if data.items.length === 0}
						<tr>
							<td class="empty-row" colspan="5">Ingen publik frontendtext hittades i den aktuella snapshoten.</td>
						</tr>
					{:else}
						{#each data.items as item (item.id)}
							<tr>
								<td>
									<strong>{item.publicTitle}</strong>
									<small>{item.title}</small>
								</td>
								<td>{item.contentTypeLabel}</td>
								<td>
									<a class="public-link" href={item.publicHref} target="_blank" rel="noreferrer">
										{item.publicHref}
									</a>
								</td>
								<td>{statusLabel(item.latestDraft?.status)}</td>
								<td>
									<a class="row-link" href={`/admin/content-studio/standard-content/${item.id}`}>Redigera</a>
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
		max-width: 1900px;
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

	h1,
	h2 {
		margin: 0;
	}

	h1 {
		font-size: 34px;
		font-weight: 500;
	}

	h2 {
		font-size: 18px;
	}

	.lead {
		max-width: 74ch;
		margin: 12px 0 0;
		line-height: 1.5;
	}




	.role-panel,
	.content-panel {
		margin-top: 18px;
		border: 1px solid #d1d7ce;
		border-radius: 6px;
		background: #ffffff;
		padding: 16px;
	}

	.role-panel p {
		margin: 10px 0 0;
		line-height: 1.5;
	}

	.public-link,
	.row-link {
		color: #00754c;
		font-weight: 700;
		text-decoration: none;
	}

	.section-bar {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 12px;
		align-items: end;
		margin-bottom: 16px;
	}

	.section-bar strong {
		display: block;
		font-size: 30px;
	}

	.section-bar span,
	.section-bar small,
	.empty-row,
	td small {
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

	td strong,
	td small {
		display: block;
	}
</style>
