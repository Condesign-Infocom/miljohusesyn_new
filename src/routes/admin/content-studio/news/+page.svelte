<svelte:head>
	<title>Innehållsredaktion - Nyheter</title>
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
				slug: string;
				title: string;
				publishedAt: string;
				excerpt: string;
				bodyHtml: string;
				legacyUrl: string;
				sourceFile: string;
				latestDraft: {
					status: string;
				} | null;
			}>;
		};
	} = $props();

	function draftStatusLabel(status: string | null | undefined) {
		if (status === 'published') return 'Publicerad';
		return 'Importerad';
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

	<section class="role-panel">
		<h2>Arbetsflöde</h2>
		<p>Redigera de publika nyheterna här. När formuläret sparas blir ändringen publicerad direkt.</p>
	</section>

	<section class="migration-panel">
		<h2>Nuvarande läge</h2>
		<p>Nyheterna ligger nu i det uthålliga innehållslagret och kan redigeras utan att röra kodlagret.</p>
		<p>Det här är fortfarande en första version: själva redigeringen sker i ett enkelt formulär, men innehållet är inte längre låst till <code>public-site.ts</code>.</p>
	</section>

	<section class="content-panel">
		<div class="section-bar">
			<div>
				<strong>{data.items.length}</strong>
				<span>publika nyheter i aktuell inventering</span>
			</div>
			{#if data.latestSnapshot}
				<small>{data.latestSnapshot.sourceLabel} · {data.latestSnapshot.id}</small>
			{/if}
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
									<strong>{item.title}</strong>
									<small>{item.excerpt}</small>
								</td>
								<td>{item.publishedAt}</td>
								<td>{draftStatusLabel(item.latestDraft?.status)}</td>
								<td>
									<a class="row-link" href={`/admin/content-studio/news/${item.id}`}>Redigera</a>
									<a class="row-link secondary" href={`/nyheter/${item.slug}`} target="_blank" rel="noreferrer">Publik sida</a>
									<a class="row-link secondary" href={item.legacyUrl} target="_blank" rel="noreferrer">Legacy-källa</a>
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
	.migration-panel,
	.content-panel {
		margin-top: 18px;
		border: 1px solid #d1d7ce;
		border-radius: 6px;
		background: #ffffff;
		padding: 16px;
	}

	.role-panel p,
	.migration-panel p {
		margin: 10px 0 0;
		line-height: 1.5;
	}

	.row-link {
		color: #00754c;
		font-weight: 700;
		text-decoration: none;
	}

	code {
		font-family: Consolas, 'Courier New', monospace;
		font-size: 0.95em;
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

	td a + a {
		margin-left: 14px;
	}

	.row-link.secondary {
		color: #5d675f;
	}
</style>
