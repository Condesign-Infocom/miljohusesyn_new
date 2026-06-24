<svelte:head>
	<title>Innehållsredaktion - Frontend-innehåll</title>
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
				title: string;
				publicTitle: string;
				publicSlug: string;
				publicHref: string;
				contentTypeLabel: string;
				latestDraft: {
					status: string;
				} | null;
			}>;
			availablePages: Array<{
				sourceTitle: string;
				publicTitle: string;
				publicHref: string;
			}>;
		};
		form?: {
			success?: string;
			errors?: Record<string, string>;
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
				<p>Redigera innehållet här. Du kan också ta bort publika sidor eller lägga tillbaka fördefinierade sidor som saknas i snapshoten.</p>
			</div>

			<form class="workflow-create-form" method="POST" action="?/create">
				<label class="sr-only" for="frontend-sourceTitle">Lägg till publik sida</label>
				<select
					id="frontend-sourceTitle"
					name="sourceTitle"
					disabled={data.availablePages.length === 0}
				>
					<option value="">Lägg till publik sida</option>
					{#each data.availablePages as page (page.sourceTitle)}
						<option value={page.sourceTitle}>{page.publicTitle}</option>
					{/each}
				</select>
				<button
					type="submit"
					class="primary-action-button"
					disabled={data.availablePages.length === 0}
				>
					Lägg till
				</button>
			</form>
		</div>
	</section>

	<section class="content-panel">
		<div class="section-bar">
			<div>
				<strong>{data.items.length}</strong>
				<span>publika innehållssidor i aktuell snapshot</span>
			</div>
			<div class="section-actions">
				{#if data.latestSnapshot}
					<small>{data.latestSnapshot.sourceLabel} · {data.latestSnapshot.id}</small>
				{/if}
			</div>
		</div>

		{#if data.availablePages.length === 0}
			<p class="helper-text">Alla fördefinierade publika frontend-sidor finns redan i den aktuella snapshoten.</p>
		{/if}

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
									<a class="public-link" href={resolve(item.publicHref, {})} target="_blank" rel="noreferrer">
										{item.publicHref}
									</a>
								</td>
								<td>{statusLabel(item.latestDraft?.status)}</td>
								<td>
									<a class="row-link" href={resolve('/admin/content-studio/standard-content/[blockId]', { blockId: item.id })}>Redigera</a>
									<form class="inline-form" method="POST" action="?/delete">
										<input type="hidden" name="blockId" value={item.id} />
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

	.workflow-create-form {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		justify-content: flex-end;
	}

	.workflow-create-form select,
	.workflow-create-form button {
		font: inherit;
	}

	.workflow-create-form select {
		min-width: min(22rem, 100%);
		padding: 12px 14px;
		border: 1px solid #c9d1cb;
		border-radius: 999px;
		background: #ffffff;
		color: #2f3732;
	}

	.primary-action-button {
		border: 0;
		border-radius: 999px;
		background: #007a5b;
		color: #ffffff;
		font-weight: 700;
		cursor: pointer;
		padding: 12px 18px;
		white-space: nowrap;
		box-shadow: 0 10px 24px rgba(0, 122, 91, 0.18);
	}

	.primary-action-button:hover:not(:disabled) {
		background: #006b4f;
	}

	.primary-action-button:disabled,
	.workflow-create-form select:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.public-link,
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
	.section-bar small,
	.empty-row,
	td small,
	.helper-text {
		color: #5d675f;
	}

	.helper-text {
		margin: 0 0 16px;
		line-height: 1.5;
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

	.inline-form {
		display: inline;
		margin-left: 14px;
	}

	.row-link.danger {
		border: 0;
		background: transparent;
		padding: 0;
		color: #a13a49;
		cursor: pointer;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (max-width: 720px) {
		.panel-header-row {
			flex-direction: column;
			align-items: stretch;
		}

		.workflow-create-form {
			justify-content: stretch;
		}

		.workflow-create-form select,
		.primary-action-button {
			width: 100%;
		}
	}
</style>
