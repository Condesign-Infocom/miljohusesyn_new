<svelte:head>
	<title>Innehållsredaktion</title>
</svelte:head>

<script lang="ts">
	import ContentStudioNav from '$lib/components/admin/ContentStudioNav.svelte';
	let {
		data
	}: {
		data: {
			summary: {
				checklistCount: number;
				factCount: number;
				standardContentCount: number;
				openDraftCount: number;
			};
		};
	} = $props();
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Innehållsredaktion</p>
			<h1>Innehållsredaktion</h1>
			<p class="lead">Modern arbetsyta för strukturerat innehåll. Härifrån kan redaktörer hitta checklistor, fakta, frontend-innehåll och nyheter. Giltiga ändringar publiceras direkt när de sparas.</p>
		</div>
	</header>

	<ContentStudioNav active="overview" />

	<section class="hero-grid">
		<div class="hero-card">
			<span>Checklistor</span>
			<strong>{data.summary.checklistCount}</strong>
			<small>Importerade rötter i senaste snapshot</small>
		</div>
		<div class="hero-card">
			<span>Fakta</span>
			<strong>{data.summary.factCount}</strong>
			<small>Länkbara informationsnoder</small>
		</div>
		<div class="hero-card accent">
			<span>Redaktionella ändringar</span>
			<strong>{data.summary.openDraftCount}</strong>
			<small>Direkt publicering utan separat granskningskö</small>
		</div>
	</section>

	<section class="workspace-grid">
		<section class="workflow-panel workflow-panel-main">
			<div class="section-heading">
				<div>
					<p class="eyebrow">Arbetssätt</p>
					<h2>Så används innehållsredaktionen</h2>
				</div>
			</div>

			<div class="workflow-steps">
				<div class="workflow-step">
					<span>1</span>
					<div>
						<h3>Välj innehållsyta</h3>
						<p>Öppna checklistor, frontend-innehåll eller nyheter beroende på vad som ska uppdateras.</p>
					</div>
				</div>
				<div class="workflow-step">
					<span>2</span>
					<div>
						<h3>Redigera</h3>
						<p>Gör ändringar i den relevanta innehållsytan och kontrollera valideringen innan du sparar.</p>
					</div>
				</div>
				<div class="workflow-step">
					<span>3</span>
					<div>
						<h3>Spara</h3>
						<p>När formuläret sparas blir den giltiga ändringen publicerad direkt.</p>
					</div>
				</div>
			</div>
		</section>

		<section class="workflow-panel">
			<div class="section-heading">
				<div>
					<p class="eyebrow">Flöde</p>
					<h2>Redaktionellt läge</h2>
				</div>
			</div>

			<div class="workflow-metrics">
				<div class="workflow-metric">
					<span>Sparade redaktionella revisioner</span>
					<strong>{data.summary.openDraftCount}</strong>
				</div>
			</div>

			<p class="workflow-note">Ändringar sparas mot innehållslagret och blir publika direkt när valideringen tillåter det. Granskningskön används inte längre.</p>
		</section>
	</section>

	<section class="catalog-section">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Arbetsytor</p>
				<h2>Välj innehåll att arbeta med</h2>
			</div>
		</div>

		<section class="catalog-grid">
			<a class="catalog-card" href="/admin/content-studio/checklists">
				<p class="eyebrow">Överblick</p>
				<h2>Checklistor</h2>
				<p>Se importerade checklistor, omfattning och hur många grupper och frågor varje struktur innehåller.</p>
			</a>

			<a class="catalog-card" href="/admin/content-studio/profile-rules">
				<p class="eyebrow">Urval</p>
				<h2>Profiler</h2>
				<p>Lägg befintliga profiler direkt på checklistgrupper och frågor, och se när en fråga bara täcks av sin grupp.</p>
			</a>

			<a class="catalog-card" href="/admin/content-studio/frontend-content">
				<p class="eyebrow">Publik CMS-yta</p>
				<h2>Frontend-innehåll</h2>
				<p>Samla de publika, redigerbara sidorna i ett eget arbetsflöde där ändringar publiceras direkt.</p>
			</a>

			<a class="catalog-card" href="/admin/content-studio/news">
				<p class="eyebrow">Publik CMS-yta</p>
				<h2>Nyheter</h2>
				<p>Inventera och redigera de aktuella publika nyheterna utan separat publiceringskö.</p>
			</a>
		</section>
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

	.lead {
		max-width: 74ch;
		margin: 12px 0 0;
		line-height: 1.5;
	}




	.hero-grid,
	.catalog-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 14px;
	}

	.hero-grid {
		margin-top: 18px;
	}

	.hero-card,
	.catalog-card,
	.workflow-panel {
		border: 1px solid #d1d7ce;
		border-radius: 6px;
		background: #ffffff;
	}

	.hero-card {
		padding: 16px;
	}

	.hero-card span {
		display: block;
		color: #5d675f;
		font-size: 13px;
	}

	.hero-card strong {
		display: block;
		margin-top: 6px;
		font-size: 30px;
		font-weight: 600;
		color: #14261c;
	}

	.hero-card small {
		display: block;
		margin-top: 8px;
		color: #66736a;
		line-height: 1.45;
	}

	.accent {
		border-color: #edc58f;
		background: #fff9f1;
	}

	.workspace-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.8fr) minmax(280px, 1fr);
		gap: 24px;
		margin-top: 18px;
		align-items: start;
	}

	.workflow-panel {
		padding: 16px;
	}

	.section-heading {
		margin-bottom: 14px;
	}

	.workflow-panel {
		display: grid;
		gap: 14px;
	}

	.workflow-panel-main {
		align-content: start;
	}

	.workflow-metrics {
		display: grid;
		gap: 12px;
	}

	.workflow-metric {
		border: 1px solid #d8ded4;
		border-radius: 5px;
		padding: 14px;
	}

	.workflow-metric span {
		display: block;
		color: #5d675f;
		font-size: 13px;
	}

	.workflow-metric strong {
		display: block;
		margin-top: 6px;
		font-size: 32px;
		font-weight: 600;
		color: #14261c;
	}

	.workflow-note {
		color: #516056;
		line-height: 1.5;
		margin: 16px 0 0;
	}

	.workflow-steps {
		display: grid;
		gap: 14px;
	}

	.workflow-step {
		display: grid;
		gap: 14px;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: start;
	}

	.workflow-step > span {
		align-items: center;
		background: #007a5b;
		border-radius: 999px;
		color: #ffffff;
		display: inline-flex;
		font-size: 15px;
		font-weight: 700;
		height: 32px;
		justify-content: center;
		width: 32px;
	}

	.workflow-step h3 {
		font-size: 22px;
		margin: 0 0 6px;
	}

	.workflow-step p {
		color: #516056;
		line-height: 1.5;
		margin: 0;
	}

	.catalog-section {
		margin-top: 18px;
	}

	.catalog-card {
		padding: 18px;
		color: inherit;
		text-decoration: none;
	}

	.catalog-card p:last-child {
		margin-bottom: 0;
		color: #516056;
		line-height: 1.5;
	}

	@media (max-width: 960px) {
		.workspace-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
