<svelte:head>
	<title>Innehållsredaktion - Validering</title>
</svelte:head>

<script lang="ts">
	import ContentStudioNav from '$lib/components/admin/ContentStudioNav.svelte';
	type DuplicateNodeIdIssue = {
		nodeId: string;
		occurrences: number;
		rows: Array<{ checklistId: string; kind: string; title: string }>;
	};

	type MissingFactIssue = {
		checklistId: string;
		groupTitle: string;
		questionId: string;
		nodeId: string;
		questionText: string;
	};

	type UnresolvedFactIssue = {
		checklistId: string;
		questionId: string;
		nodeId: string;
		questionText: string;
		linkStatuses: string[];
	};

	type EmptyQuestionIssue = {
		checklistId: string;
		groupTitle: string;
		questionId: string;
		nodeId: string;
	};

	type MissingStandardTargetIssue = {
		blockId: string;
		contentType: string;
		title: string;
	};

	let {
		data
	}: {
		data: {
			latestSnapshot: { id: string; sourceLabel: string } | null;
			checklists: Array<{ id: string; checklistId: string; title: string }>;
			validation: {
				duplicateNodeIds: DuplicateNodeIdIssue[];
				missingFactLinks: MissingFactIssue[];
				unresolvedFactNodeIds: UnresolvedFactIssue[];
				emptyQuestionTexts: EmptyQuestionIssue[];
				missingStandardTargets: MissingStandardTargetIssue[];
				readiness: {
					state: 'ready' | 'warning' | 'blocking';
					blockerCount: number;
					warningCount: number;
				};
			};
		};
	} = $props();

	const previewLimit = 20;
	let selectedChecklist = $state('');

	const checklistOptions = $derived(
		data.checklists
			.map((item) => ({
				id: item.checklistId,
				label: `${item.title} (${item.checklistId})`
			}))
			.sort((left, right) => left.label.localeCompare(right.label, 'sv'))
	);

	const filteredDuplicateNodeIds = $derived(
		selectedChecklist ?
			data.validation.duplicateNodeIds.filter((issue) =>
				issue.rows.some((row) => row.checklistId === selectedChecklist)
			)
		:	data.validation.duplicateNodeIds
	);
	const filteredMissingFactLinks = $derived(
		selectedChecklist ?
			data.validation.missingFactLinks.filter((issue) => issue.checklistId === selectedChecklist)
		:	data.validation.missingFactLinks
	);
	const filteredUnresolvedFactNodeIds = $derived(
		selectedChecklist ?
			data.validation.unresolvedFactNodeIds.filter((issue) => issue.checklistId === selectedChecklist)
		:	data.validation.unresolvedFactNodeIds
	);
	const filteredEmptyQuestionTexts = $derived(
		selectedChecklist ?
			data.validation.emptyQuestionTexts.filter((issue) => issue.checklistId === selectedChecklist)
		:	data.validation.emptyQuestionTexts
	);
	const filteredMissingStandardTargets = $derived(data.validation.missingStandardTargets);

	const duplicateChecklistCounts = $derived(buildDuplicateChecklistCounts(filteredDuplicateNodeIds));
	const missingFactChecklistCounts = $derived(buildChecklistCounts(filteredMissingFactLinks));
	const unresolvedChecklistCounts = $derived(buildChecklistCounts(filteredUnresolvedFactNodeIds));
	const emptyTextChecklistCounts = $derived(buildChecklistCounts(filteredEmptyQuestionTexts));

	function buildChecklistCounts(items: Array<{ checklistId: string }>) {
		const counts = new Map<string, number>();

		for (const item of items) {
			counts.set(item.checklistId, (counts.get(item.checklistId) ?? 0) + 1);
		}

		return Array.from(counts.entries())
			.map(([checklistId, count]) => ({ checklistId, count }))
			.sort((left, right) => right.count - left.count || left.checklistId.localeCompare(right.checklistId, 'sv'));
	}

	function buildDuplicateChecklistCounts(items: DuplicateNodeIdIssue[]) {
		const counts = new Map<string, number>();

		for (const issue of items) {
			for (const checklistId of new Set(issue.rows.map((row) => row.checklistId))) {
				counts.set(checklistId, (counts.get(checklistId) ?? 0) + 1);
			}
		}

		return Array.from(counts.entries())
			.map(([checklistId, count]) => ({ checklistId, count }))
			.sort((left, right) => right.count - left.count || left.checklistId.localeCompare(right.checklistId, 'sv'));
	}

	function buildPreview<T>(items: T[]) {
		return items.slice(0, previewLimit);
	}

	function remainingCount<T>(items: T[]) {
		return Math.max(items.length - previewLimit, 0);
	}

	function checklistLabel(checklistId: string) {
		return checklistOptions.find((item) => item.id === checklistId)?.label ?? checklistId;
	}

	function checklistQuestionHref(checklistId: string, questionId: string) {
		return `/admin/content-studio/checklists/${checklistId}?selected=${encodeURIComponent(questionId)}`;
	}
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Innehållsredaktion</p>
			<h1>Validering</h1>
			<p class="lead">Arbetsytan för att skilja blockerande strukturproblem från varningar. Frågor utan fakta ska fortfarande synas tydligt, men de räknas inte som hårda stopp för publicering.</p>
		</div>
	</header>

	<ContentStudioNav active="validation" />

	<section class="toolbar-panel">
		<label>
			<span>Fokusera på checklista</span>
			<select bind:value={selectedChecklist}>
				<option value="">Alla checklistor</option>
				{#each checklistOptions as checklist (checklist.id)}
					<option value={checklist.id}>{checklist.label}</option>
				{/each}
			</select>
		</label>

		<div class="scope-note">
			<strong>{selectedChecklist ? checklistLabel(selectedChecklist) : 'Alla checklistor'}</strong>
			<span>Standardtextproblem visas alltid för hela innehållsbasen.</span>
		</div>
	</section>

	<section class="hero-grid">
		<div class="hero-card blocker">
			<span>Blockerande problem</span>
			<strong>{data.validation.readiness.blockerCount}</strong>
		</div>
		<div class="hero-card warning">
			<span>Varningar</span>
			<strong>{data.validation.readiness.warningCount}</strong>
		</div>
		<div class="hero-card">
			<span>Dubbla node-id</span>
			<strong>{filteredDuplicateNodeIds.length}</strong>
		</div>
		<div class="hero-card">
			<span>Frågor utan fakta</span>
			<strong>{filteredMissingFactLinks.length}</strong>
		</div>
		<div class="hero-card">
			<span>Olösta faktalänkar</span>
			<strong>{filteredUnresolvedFactNodeIds.length}</strong>
		</div>
		<div class="hero-card">
			<span>Tomma frågetexter</span>
			<strong>{filteredEmptyQuestionTexts.length}</strong>
		</div>
		<div class="hero-card accent">
			<span>Standardblock utan länkar</span>
			<strong>{filteredMissingStandardTargets.length}</strong>
		</div>
	</section>

	<div class="validation-stack">
		<section class="panel">
			<div class="panel-header">
				<div>
					<h2>Varningar: frågor utan fakta</h2>
					<p>Visar frågor som saknar kopplad faktatext. De behöver åtgärdas för bättre täckning, men de blockerar inte publicering på egen hand.</p>
				</div>
				<strong>{filteredMissingFactLinks.length}</strong>
			</div>

			{#if filteredMissingFactLinks.length === 0}
				<p class="empty">Alla frågor i den valda omfattningen har minst en faktakoppling.</p>
			{:else}
				<div class="summary-chips">
					{#each missingFactChecklistCounts as item (item.checklistId)}
						<span>{checklistLabel(item.checklistId)}: {item.count}</span>
					{/each}
				</div>

				<ul class="issue-list">
					{#each buildPreview(filteredMissingFactLinks) as issue, index (`${issue.checklistId}-${issue.nodeId}-${index}`)}
						<li>
							<strong>{checklistLabel(issue.checklistId)}</strong>
							<span>{issue.groupTitle}</span>
							<span>{issue.questionText || 'Tom frågetext'}</span>
							<small>{issue.nodeId}</small>
							<a class="issue-link" href={checklistQuestionHref(issue.checklistId, issue.questionId)}>Öppna frågan</a>
						</li>
					{/each}
				</ul>

				{#if remainingCount(filteredMissingFactLinks) > 0}
					<p class="overflow-note">Visar {previewLimit} av {filteredMissingFactLinks.length}. Filtrera på en checklista för att arbeta vidare i mindre steg.</p>
				{/if}
			{/if}
		</section>

		<div class="two-column">
			<section class="panel">
				<div class="panel-header">
					<div>
						<h2>Olösta faktalänkar</h2>
						<p>Här finns länkningar som inte kunde bindas rent mot faktabasen i snapshoten och därför ska behandlas som blockerande.</p>
					</div>
					<strong>{filteredUnresolvedFactNodeIds.length}</strong>
				</div>

				{#if filteredUnresolvedFactNodeIds.length === 0}
					<p class="empty">Inga olösta faktalänkar hittades.</p>
				{:else}
					<div class="summary-chips">
						{#each unresolvedChecklistCounts as item (item.checklistId)}
							<span>{checklistLabel(item.checklistId)}: {item.count}</span>
						{/each}
					</div>

					<ul class="issue-list compact">
						{#each buildPreview(filteredUnresolvedFactNodeIds) as issue, index (`${issue.checklistId}-${issue.nodeId}-${index}`)}
						<li>
							<strong>{checklistLabel(issue.checklistId)}</strong>
							<span>{issue.questionText}</span>
							<small>{issue.nodeId} · {issue.linkStatuses.join(', ')}</small>
							<a class="issue-link" href={checklistQuestionHref(issue.checklistId, issue.questionId)}>Öppna frågan</a>
						</li>
					{/each}
				</ul>

					{#if remainingCount(filteredUnresolvedFactNodeIds) > 0}
						<p class="overflow-note">Visar {previewLimit} av {filteredUnresolvedFactNodeIds.length} träffar.</p>
					{/if}
				{/if}
			</section>

			<section class="panel">
				<div class="panel-header">
					<div>
						<h2>Dubbla node-id</h2>
						<p>Dubbletter behöver lösas innan innehållet kan bli en stabil källa för publicering och redigering.</p>
					</div>
					<strong>{filteredDuplicateNodeIds.length}</strong>
				</div>

				{#if filteredDuplicateNodeIds.length === 0}
					<p class="empty">Inga dubbletter hittades.</p>
				{:else}
					<div class="summary-chips">
						{#each duplicateChecklistCounts as item (item.checklistId)}
							<span>{checklistLabel(item.checklistId)}: {item.count}</span>
						{/each}
					</div>

					<ul class="issue-list compact">
						{#each buildPreview(filteredDuplicateNodeIds) as issue (issue.nodeId)}
							<li>
								<strong>{issue.nodeId}</strong>
								<span>{issue.rows.map((row) => `${row.checklistId}: ${row.title}`).join(' | ')}</span>
								<div class="issue-actions">
									{#each Array.from(new Set(issue.rows.map((row) => row.checklistId))) as checklistId (checklistId)}
										<a class="issue-link" href={`/admin/content-studio/checklists/${checklistId}`}>{checklistLabel(checklistId)}</a>
									{/each}
								</div>
							</li>
						{/each}
					</ul>

					{#if remainingCount(filteredDuplicateNodeIds) > 0}
						<p class="overflow-note">Visar {previewLimit} av {filteredDuplicateNodeIds.length} träffar.</p>
					{/if}
				{/if}
			</section>
		</div>

		<div class="two-column">
			<section class="panel">
				<div class="panel-header">
					<div>
						<h2>Tomma frågetexter</h2>
						<p>Tomma frågor behöver fyllas eller tas bort innan de blir redaktionellt begripliga.</p>
					</div>
					<strong>{filteredEmptyQuestionTexts.length}</strong>
				</div>

				{#if filteredEmptyQuestionTexts.length === 0}
					<p class="empty">Inga tomma frågetexter hittades.</p>
				{:else}
					<div class="summary-chips">
						{#each emptyTextChecklistCounts as item (item.checklistId)}
							<span>{checklistLabel(item.checklistId)}: {item.count}</span>
						{/each}
					</div>

					<ul class="issue-list compact">
						{#each buildPreview(filteredEmptyQuestionTexts) as issue, index (`${issue.checklistId}-${issue.nodeId}-${index}`)}
						<li>
							<strong>{checklistLabel(issue.checklistId)}</strong>
							<span>{issue.groupTitle}</span>
							<small>{issue.nodeId}</small>
							<a class="issue-link" href={checklistQuestionHref(issue.checklistId, issue.questionId)}>Öppna frågan</a>
						</li>
					{/each}
				</ul>

					{#if remainingCount(filteredEmptyQuestionTexts) > 0}
						<p class="overflow-note">Visar {previewLimit} av {filteredEmptyQuestionTexts.length} träffar.</p>
					{/if}
				{/if}
			</section>

			<section class="panel">
				<div class="panel-header">
					<div>
						<h2>Standardblock utan länkar</h2>
						<p>Block som inte länkar vidare i publiceringsstrukturen behöver kontrolleras innan release.</p>
					</div>
					<strong>{filteredMissingStandardTargets.length}</strong>
				</div>

				{#if filteredMissingStandardTargets.length === 0}
					<p class="empty">Alla standardblock har minst en vidare länk.</p>
				{:else}
					<ul class="issue-list compact">
						{#each buildPreview(filteredMissingStandardTargets) as issue (issue.blockId)}
							<li>
								<strong>{issue.title}</strong>
								<span>{issue.contentType}</span>
								<a class="issue-link" href={`/admin/content-studio/standard-content/${issue.blockId}`}>Öppna standardtext</a>
							</li>
						{/each}
					</ul>

					{#if remainingCount(filteredMissingStandardTargets) > 0}
						<p class="overflow-note">Visar {previewLimit} av {filteredMissingStandardTargets.length} träffar.</p>
					{/if}
				{/if}
			</section>
		</div>
	</div>
</main>

<style>
	:global(body) { background:#f4f4ef; }
	main { max-width:1900px; margin:0 auto; padding:34px 22px 60px; font-family:Arial, Helvetica, sans-serif; color:#2f3732; }
	.page-header { padding-bottom:22px; border-bottom:1px solid #007a5b; }
	.eyebrow { margin:0 0 8px; color:#00754c; font-size:14px; font-weight:700; text-transform:uppercase; }
	h1,h2 { margin:0; }
	h1 { font-size:34px; font-weight:500; }
	.lead { max-width:74ch; margin:12px 0 0; line-height:1.5; }
	.toolbar-panel,.hero-card,.panel { border:1px solid #d1d7ce; border-radius:6px; background:#fff; }
	.toolbar-panel { display:flex; flex-wrap:wrap; gap:18px; align-items:end; justify-content:space-between; margin-top:18px; padding:16px; }
	.toolbar-panel label { min-width:280px; flex:1; }
	.toolbar-panel span { display:block; margin-bottom:6px; color:#5d675f; font-size:13px; }
	select { width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #ccd4ca; border-radius:5px; background:#fff; font:inherit; }
	.scope-note { display:grid; gap:4px; min-width:280px; color:#5d675f; }
	.scope-note strong { color:#14261c; }
	.hero-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; margin-top:18px; }
	.hero-card { padding:16px; }
	.hero-card span { display:block; color:#5d675f; font-size:13px; }
	.hero-card strong { display:block; margin-top:6px; font-size:30px; font-weight:600; color:#14261c; }
	.hero-card.blocker strong { color:#8d2f2f; }
	.hero-card.warning strong { color:#9a6700; }
	.accent { border-color:#edc58f; background:#fff9f1; }
	.validation-stack { display:grid; gap:18px; margin-top:18px; }
	.two-column { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
	.panel { padding:18px; }
	.panel-header { display:flex; justify-content:space-between; gap:16px; align-items:start; }
	.panel-header p { margin:8px 0 0; color:#66736a; line-height:1.5; }
	.panel-header strong { font-size:32px; color:#14261c; }
	.summary-chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
	.summary-chips span { border-radius:999px; background:#eef4ef; color:#355344; padding:6px 10px; font-size:12px; font-weight:700; }
	.issue-list { margin:14px 0 0; padding:0; list-style:none; display:grid; gap:10px; }
	.issue-list li { border:1px solid #e2e7e0; border-radius:6px; padding:12px; background:#fbfcfa; }
	.issue-list strong, .issue-list span, .issue-list small { display:block; }
	.issue-list span { margin-top:4px; line-height:1.45; }
	.issue-list small { margin-top:4px; color:#66736a; }
	.issue-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
	.issue-link { display:inline-flex; margin-top:8px; color:#00754c; font-weight:700; text-decoration:none; }
	.compact li { background:#fff; }
	.empty,.overflow-note { margin-top:14px; color:#66736a; }
	@media (max-width: 900px) { .two-column { grid-template-columns:1fr; } }
</style>
