<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ChecklistOverview, ChecklistOverviewSection } from '$lib/types/checklists';

	let { data }: { data: ChecklistOverview } = $props();

	const sectionCategoryLabels: Record<string, string> = {
		G: 'Allmänna gårdskrav',
		V: 'Växtodling',
		D: 'Djurhållning',
		A: 'Arbetsmiljö'
	};

	let isExporting = $state(false);
	let exportKind = $state<'plan' | 'user-full' | 'complete'>('plan');
	let exportError = $state<string | null>(null);

	function progressPercent(section: Pick<ChecklistOverviewSection, 'completedQuestions' | 'totalQuestions'>) {
		if (section.totalQuestions === 0) {
			return 0;
		}

		return Math.round((section.completedQuestions / section.totalQuestions) * 100);
	}

	const totalQuestions = $derived(data.sections.reduce((sum, section) => sum + section.totalQuestions, 0));
	const completedQuestions = $derived(
		data.sections.reduce((sum, section) => sum + section.completedQuestions, 0)
	);
	const totalProgress = $derived(
		totalQuestions === 0 ? 0 : Math.round((completedQuestions / totalQuestions) * 100)
	);
	const areaTabs = $derived.by(() => {
		const seen = new Set<string>();
		return data.sections.flatMap((section) => {
			const prefixKey = section.prefix.trim().charAt(0).toUpperCase();
			const label = sectionCategoryLabels[prefixKey];
			if (!label || seen.has(prefixKey)) {
				return [];
			}

			seen.add(prefixKey);
			return [{ label, sectionId: section.nodeId }];
		});
	});
	const areaStats = $derived.by(() => {
		const grouped = new Map<
			string,
			{
				label: string;
				sectionId: string;
				completedQuestions: number;
				totalQuestions: number;
			}
		>();

		for (const section of data.sections) {
			const prefixKey = section.prefix.trim().charAt(0).toUpperCase();
			const label = sectionCategoryLabels[prefixKey];
			if (!label) {
				continue;
			}

			const existing = grouped.get(prefixKey) ?? {
				label,
				sectionId: section.nodeId,
				completedQuestions: 0,
				totalQuestions: 0
			};
			existing.completedQuestions += section.completedQuestions;
			existing.totalQuestions += section.totalQuestions;
			grouped.set(prefixKey, existing);
		}

		return Array.from(grouped.entries())
			.sort((left, right) => {
				const leftIndex = Object.keys(sectionCategoryLabels).indexOf(left[0]);
				const rightIndex = Object.keys(sectionCategoryLabels).indexOf(right[0]);
				return leftIndex - rightIndex;
			})
			.map(([, value]) => value);
	});

	async function downloadExport(kind: 'plan' | 'user-full' | 'complete') {
		if (isExporting) {
			return;
		}

		isExporting = true;
		exportKind = kind;
		exportError = null;

		try {
			const formData = new FormData();
			formData.set('kind', kind);

			const response = await fetch(resolve('/checklists/[checklistId]/pdf', { checklistId: data.slug }), {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				exportError =
					kind === 'user-full' ? 'Det gick inte att skapa din fullständiga bok just nu.'
					: kind === 'complete' ? 'Det gick inte att skapa grundboken just nu.'
					: 'Det gick inte att skapa din åtgärdsplan just nu.';
				return;
			}

			const blob = await response.blob();
			const downloadUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			const disposition = response.headers.get('Content-Disposition') ?? '';
			const filenameMatch = disposition.match(/filename="([^"]+)"/i);
			link.href = downloadUrl;
			link.download = filenameMatch?.[1] ?? `${data.slug}.pdf`;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(downloadUrl);
		} catch {
			exportError =
				kind === 'user-full' ? 'Det gick inte att skapa din fullständiga bok just nu.'
				: kind === 'complete' ? 'Det gick inte att skapa grundboken just nu.'
				: 'Det gick inte att skapa din åtgärdsplan just nu.';
		} finally {
			isExporting = false;
		}
	}
</script>

<main class="checklist-overview-page">
	<a class="back-link" href={resolve('/checklists', {})}>Tillbaka till Mina checklistor</a>

	<header class="page-header">
		<p class="eyebrow">Checklista</p>
		<h1>Min {data.title}</h1>
	</header>

	<nav class="section-tabs" aria-label="Navigera i checklistan">
		<span class="tab active">Översikt</span>
		{#each areaTabs as area (area.label)}
			<a
				class="tab"
				href={resolve('/checklists/[checklistId]/sections/[sectionId]', {
					checklistId: data.slug,
					sectionId: area.sectionId
				})}
			>
				{area.label}
			</a>
		{/each}
	</nav>

	<section class="overview-section" aria-labelledby="overview-heading">
		<div class="section-header">
			<p class="section-kicker">Översikt</p>
			<h2 id="overview-heading">Översikt</h2>
		</div>

		<div class="overview-grid">
			<div class="overview-copy">
				<p>
					Här kan du se hur långt du har kommit i din checklista och vad du bör ta itu med så
					snart som möjligt.
				</p>

				<div class="action-list">
					<div class="action-row">
						<button
							type="button"
							class="action-button primary"
							disabled={isExporting}
							onclick={() => downloadExport('plan')}
						>
							{#if isExporting && exportKind === 'plan'}
								Skapar åtgärdsplan...
							{:else}
								Min åtgärdsplan
							{/if}
						</button>
						<span>Här kan du ladda ned din åtgärdsplan som underlag för genomförd Miljöhusesyn.</span>
					</div>

					<div class="action-row">
						<a class="action-button secondary" href={resolve('/kontakt', {})}>Lämna feedback</a>
						<span>Här kan du lämna feedback så att vi kan förbättra Miljöhusesyn.</span>
					</div>
				</div>

				{#if exportError}
					<p class="export-error">{exportError}</p>
				{/if}
			</div>

			<div class="progress-panel" aria-label={`Dina framsteg ${totalProgress}%`}>
				<div class="progress-ring" style={`--progress: ${totalProgress * 3.6}deg`}>
					<div>
						<strong>{totalProgress}%</strong>
					</div>
				</div>
				<span>Dina framsteg</span>
				<small>{completedQuestions} av {totalQuestions} frågor besvarade</small>
			</div>
		</div>
	</section>

	<section class="statistics-section" aria-labelledby="statistics-heading">
		<div class="section-header">
			<p class="section-kicker">Sammanfattning</p>
			<h2 id="statistics-heading">Statistik</h2>
		</div>

		<div class="statistics-list">
			{#each areaStats as area (area.label)}
				<a
					class="stat-row"
					href={resolve('/checklists/[checklistId]/sections/[sectionId]', {
						checklistId: data.slug,
						sectionId: area.sectionId
					})}
				>
					<div class="stat-main">
						<strong>{area.label}</strong>
						<div class="progress-bar" aria-hidden="true">
							<span style={`width: ${progressPercent(area)}%`}></span>
						</div>
					</div>
					<span class="stat-meta">
						Du har svarat på {area.completedQuestions} av {area.totalQuestions} frågor
					</span>
				</a>
			{/each}
		</div>
	</section>
</main>

<style>
	.checklist-overview-page {
		width: min(1180px, calc(100% - 48px));
		margin: 0 auto;
		padding: 40px 0 72px;
		color: var(--color-ink);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		margin-bottom: 18px;
		color: var(--color-leaf);
		font-size: 0.95rem;
		font-weight: 700;
		text-decoration: none;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	.page-header {
		max-width: 44rem;
	}

	.eyebrow,
	.section-kicker {
		margin: 0;
		color: var(--color-leaf);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	h1,
	h2,
	strong {
		margin: 0;
		color: var(--color-bark);
		font-family: var(--font-display);
	}

	h1 {
		margin-top: 12px;
		font-size: clamp(2.5rem, 5vw, 4.2rem);
		line-height: 0.96;
		font-weight: 600;
		letter-spacing: -0.03em;
	}

	h2 {
		margin-top: 10px;
		font-size: clamp(1.6rem, 3vw, 2.2rem);
		line-height: 1.05;
		font-weight: 550;
	}

	.section-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin: 20px 0 48px;
	}

	.tab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 42px;
		padding: 0 18px;
		border: 1px solid color-mix(in srgb, var(--color-leaf) 18%, white);
		border-radius: 0.4rem;
		background: rgb(255 255 255 / 0.75);
		color: var(--color-bark);
		font-size: 0.95rem;
		font-weight: 600;
		text-decoration: none;
	}

	.tab.active {
		border-color: var(--color-leaf);
		background: var(--color-leaf);
		color: var(--color-cream);
	}

	.overview-section,
	.statistics-section {
		margin-top: 26px;
	}

	.section-header {
		padding-bottom: 10px;
		border-bottom: 1px solid color-mix(in srgb, var(--color-leaf) 68%, white);
	}

	.overview-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 260px;
		gap: 42px;
		align-items: start;
		padding-top: 26px;
	}

	.overview-copy > p {
		max-width: 24rem;
		margin: 0;
		font-size: 1.12rem;
		line-height: 1.7;
		color: color-mix(in srgb, var(--color-ink) 80%, white);
	}

	.action-list {
		display: grid;
		gap: 18px;
		margin-top: 26px;
	}

	.action-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 14px;
		align-items: center;
	}

	.action-row span {
		color: color-mix(in srgb, var(--color-ink) 74%, white);
		font-size: 0.96rem;
		line-height: 1.65;
	}

	.action-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0 18px;
		border: 1px solid transparent;
		border-radius: 0.45rem;
		font-size: 0.95rem;
		font-weight: 700;
		text-decoration: none;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			background-color 0.18s ease,
			border-color 0.18s ease;
	}

	.action-button:hover {
		transform: translateY(-1px);
	}

	.action-button.primary {
		background: var(--color-leaf);
		color: var(--color-cream);
	}

	.action-button.primary:hover {
		background: var(--color-leaf-2);
	}

	.action-button.primary:disabled {
		cursor: progress;
		opacity: 0.8;
	}

	.action-button.secondary {
		background: #2d73c7;
		color: #fff;
	}

	.action-button.secondary:hover {
		background: #215ea8;
	}

	.export-error {
		margin: 16px 0 0;
		color: #8e2d2d;
		font-size: 0.95rem;
		font-weight: 700;
	}

	.progress-panel {
		display: grid;
		justify-items: center;
		gap: 10px;
		padding-top: 2px;
		text-align: center;
	}

	.progress-ring {
		display: grid;
		place-items: center;
		width: 110px;
		height: 110px;
		border-radius: 999px;
		background: conic-gradient(var(--color-leaf) var(--progress), rgb(229 233 227) 0);
	}

	.progress-ring div {
		display: grid;
		place-items: center;
		width: 76px;
		height: 76px;
		border-radius: 999px;
		background: var(--color-cream);
	}

	.progress-ring strong {
		font-size: 1.55rem;
		line-height: 1;
	}

	.progress-panel span {
		color: var(--color-bark);
		font-size: 1rem;
		font-weight: 700;
	}

	.progress-panel small {
		color: var(--color-mute);
		font-size: 0.92rem;
		line-height: 1.5;
	}

	.statistics-list {
		display: grid;
		gap: 18px;
		padding-top: 26px;
	}

	.stat-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(290px, 0.95fr);
		gap: 24px;
		align-items: center;
		color: inherit;
		text-decoration: none;
	}

	.stat-main {
		display: grid;
		gap: 10px;
	}

	.stat-main strong {
		font-size: 1.02rem;
		font-weight: 550;
	}

	.progress-bar {
		height: 8px;
		overflow: hidden;
		background: rgb(233 235 232);
	}

	.progress-bar span {
		display: block;
		height: 100%;
		background: var(--color-leaf);
	}

	.stat-meta {
		color: var(--color-leaf);
		font-size: 0.96rem;
		line-height: 1.55;
	}

	@media (max-width: 860px) {
		.overview-grid,
		.stat-row {
			grid-template-columns: 1fr;
		}

		.progress-panel {
			justify-items: start;
			text-align: left;
		}
	}

	@media (max-width: 760px) {
		.checklist-overview-page {
			width: min(100% - 28px, 1180px);
			padding: 28px 0 48px;
		}

		.action-row {
			grid-template-columns: 1fr;
			align-items: start;
		}
	}
</style>
