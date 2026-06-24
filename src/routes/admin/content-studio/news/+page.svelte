<svelte:head>
	<title>Innehållsredaktion - Nyheter</title>
</svelte:head>

<script lang="ts">
	import { resolve } from '$app/paths';
	import ContentStudioNav from '$lib/components/admin/ContentStudioNav.svelte';
	let {
		data,
		form
	}: {
		data: {
			latestSnapshot: {
				id: string;
				sourceLabel: string;
			} | null;
			items: Array<{
				id: string;
				slug: string;
				title: string;
				publishedAt: string;
				excerpt: string;
				bodyHtml: string;
				sourceFile: string;
				latestDraft: {
					status: string;
				} | null;
			}>;
		};
		form?: {
			success?: string;
			errors?: Record<string, string>;
		};
	} = $props();

	function draftStatusLabel(status: string | null | undefined) {
		if (status === 'published') return 'Publicerad';
		return 'Importerad';
	}

	function displayTitle(item: { title: string }) {
		return item.title.trim() || 'Rubrik saknas';
	}
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Innehållsredaktion</p>
			<h1>Nyheter</h1>
			<p class="lead">Det här är nyhetsytan för den publika sajten. Nyheterna ligger i det uthålliga innehållslagret och ändringar publiceras direkt när de sparas.</p>
		</div>
	</header>

	<ContentStudioNav active="news" />

	{#if form?.success}
		<p class="status-message success">{form.success}</p>
	{/if}
	{#if form?.errors?.form}
		<p class="status-message error">{form.errors.form}</p>
	{/if}

	<section class="role-panel">
		<div class="panel-header-row">
			<div>
				<h2>Arbetsflöde</h2>
				<p>Redigera de publika nyheterna här. Du kan också lägga till nya poster eller ta bort befintliga direkt från listan.</p>
			</div>
			<form method="POST" action="?/create">
				<button type="submit" class="primary-action-button">Ny nyhet</button>
			</form>
		</div>
	</section>

	<section class="content-panel">
		<div class="section-bar">
			<div>
				<strong>{data.items.length}</strong>
				<span>publika nyheter i aktuell inventering</span>
			</div>
			<div class="section-actions">
				{#if data.latestSnapshot}
					<small>{data.latestSnapshot.sourceLabel} · {data.latestSnapshot.id}</small>
				{/if}
			</div>
		</div>

		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Nyhet</th>
						<th>Datum</th>
						<th>Redaktionellt läge</th>
						<th>Länkar</th>
					</tr>
				</thead>
				<tbody>
					{#if data.items.length === 0}
						<tr>
							<td class="empty-row" colspan="4">Inga publika nyheter hittades.</td>
						</tr>
					{:else}
						{#each data.items as item (item.id)}
							<tr>
								<td>
									<strong>{displayTitle(item)}</strong>
									<small>{item.excerpt}</small>
								</td>
								<td>{item.publishedAt}</td>
								<td>{draftStatusLabel(item.latestDraft?.status)}</td>
								<td>
									<a class="row-link" href={resolve('/admin/content-studio/news/[newsId]', { newsId: item.id })}>Redigera</a>
									<a class="row-link secondary" href={resolve('/nyheter/[slug]', { slug: item.slug })} target="_blank" rel="noreferrer">Publik sida</a>
									<form class="inline-form" method="POST" action="?/delete">
										<input type="hidden" name="newsId" value={item.id} />
										<button type="submit" class="row-link danger">Ta bort</button>
									</form>
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

	.panel-header-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 16px;
		align-items: end;
	}

	.primary-action-button {
		border: 0;
		border-radius: 999px;
		background: #007a5b;
		color: #ffffff;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		padding: 12px 18px;
		white-space: nowrap;
		box-shadow: 0 10px 24px rgba(0, 122, 91, 0.18);
	}

	.primary-action-button:hover {
		background: #006b4f;
	}

	.row-link {
		color: #00754c;
		font-weight: 700;
		text-decoration: none;
	}

	.status-message {
		margin: 18px 0 0;
		padding: 12px 14px;
		border-radius: 6px;
	}

	.status-message.success {
		border: 1px solid #bcd9cb;
		background: #edf8f1;
		color: #27543f;
	}

	.status-message.error {
		border: 1px solid #ebccd1;
		background: #f8e8ea;
		color: #8c3040;
	}

	.section-bar {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 12px;
		align-items: end;
		margin-bottom: 16px;
	}

	.section-actions {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
	}

	.section-bar strong {
		display: block;
		font-size: 30px;
	}

	.section-bar span,
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

	td a + a,
	td a + form {
		margin-left: 14px;
	}

	.inline-form {
		display: inline;
	}

	.row-link.secondary {
		color: #5d675f;
	}

	.row-link.danger {
		border: 0;
		background: transparent;
		padding: 0;
		color: #a13a49;
		cursor: pointer;
	}

	@media (max-width: 720px) {
		.panel-header-row {
			flex-direction: column;
			align-items: stretch;
		}

		.primary-action-button {
			width: 100%;
		}
	}
</style>
