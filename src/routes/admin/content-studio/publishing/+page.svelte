<svelte:head>
	<title>Innehållsredaktion - Publicering</title>
</svelte:head>

<script lang="ts">
	import ContentStudioNav from '$lib/components/admin/ContentStudioNav.svelte';

	type PublishingItem = {
		draftId: string;
		contentKind: 'fact' | 'standard_content' | 'news';
		sourceRowId: string;
		snapshotId: string;
		title: string;
		identifier: string;
		reviewRequestId: string;
		reviewRequestedAt: string;
		reviewRequestStatus: string;
		draftStatus: string;
		latestRevisionNumber: number | null;
		latestRevisionValidationStatus: string | null;
		publishDecision: {
			state: 'ready' | 'blocked';
			reason: string | null;
		};
		linkedChecklistStates: Array<{
			checklistId: string;
			title: string;
			readiness: {
				state: 'ready' | 'warning' | 'blocked';
				reason: string | null;
			};
		}>;
	};

	type PageData = {
		latestSnapshot: { id: string; sourceLabel: string } | null;
		items: PublishingItem[];
	};

	type FormState = {
		action?: string;
		success?: string;
		errors?: Record<string, string>;
		latestSnapshot?: PageData['latestSnapshot'];
		items?: PublishingItem[];
	};

	let { data, form }: { data: PageData; form?: FormState } = $props();

	const latestSnapshot = $derived(form?.latestSnapshot ?? data.latestSnapshot);
	const items = $derived(form?.items ?? data.items);
	const errors = $derived(form?.errors ?? {});

	function contentKindLabel(kind: PublishingItem['contentKind']) {
		if (kind === 'fact') return 'Fakta';
		if (kind === 'standard_content') return 'Frontend-innehåll';
		return 'Nyhet';
	}

	function statusLabel(status: string | null | undefined) {
		if (status === 'published') return 'Publicerad';
		if (status === 'in_review') return 'Väntar på godkännande';
		if (status === 'draft') return 'Utkast';
		return status ?? 'Okänd';
	}

	function readinessLabel(state: 'ready' | 'warning' | 'blocked') {
		if (state === 'ready') return 'Klar';
		if (state === 'warning') return 'Varning';
		return 'Blockerad';
	}
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Innehållsredaktion</p>
			<h1>Publicering</h1>
			<p class="lead">Granska större ändringar innan de blir publika. Mindre rättningar kan fortfarande publiceras direkt i respektive formulär.</p>
		</div>
	</header>

	<ContentStudioNav active="publishing" />

	{#if form?.success}
		<p class="status-message success">{form.success}</p>
	{/if}
	{#if errors.form}
		<p class="status-message error">{errors.form}</p>
	{/if}

	<section class="summary-card">
		<div>
			<span>Aktiv snapshot</span>
			<strong>{latestSnapshot?.sourceLabel ?? 'Saknas'}</strong>
		</div>
		<div>
			<span>Väntande ärenden</span>
			<strong>{items.length}</strong>
		</div>
	</section>

	{#if items.length === 0}
		<section class="empty-state">
			<h2>Inget väntar på godkännande</h2>
			<p>Redaktionella ändringar som skickas för godkännande visas här när de är redo att granskas.</p>
		</section>
	{:else}
		<section class="queue-list">
			{#each items as item (item.reviewRequestId)}
				<article class="queue-card">
					<div class="queue-header">
						<div>
							<p class="card-eyebrow">{contentKindLabel(item.contentKind)}</p>
							<h2>{item.title}</h2>
							<p class="card-meta">
								{item.identifier} · revision {item.latestRevisionNumber ?? 'okänd'} ·
								{statusLabel(item.draftStatus)}
							</p>
						</div>
						<div class:blocked={item.publishDecision.state === 'blocked'} class="decision-badge">
							{readinessLabel(item.publishDecision.state)}
						</div>
					</div>

					{#if item.publishDecision.reason}
						<p class:blocked-copy={item.publishDecision.state === 'blocked'} class="decision-copy">
							{item.publishDecision.reason}
						</p>
					{/if}

					<div class="metrics">
						<div>
							<span>Begärd</span>
							<strong>{item.reviewRequestedAt}</strong>
						</div>
						<div>
							<span>Validering</span>
							<strong>{item.latestRevisionValidationStatus ?? 'okänd'}</strong>
						</div>
						<div>
							<span>Granskningsstatus</span>
							<strong>{item.reviewRequestStatus}</strong>
						</div>
					</div>

					{#if item.linkedChecklistStates.length > 0}
						<div class="linked-checklists">
							<h3>Påverkade checklistor</h3>
							<ul>
								{#each item.linkedChecklistStates as checklist (checklist.checklistId)}
									<li>
										<strong>{checklist.title}</strong>
										<span>{readinessLabel(checklist.readiness.state)}</span>
										{#if checklist.readiness.reason}
											<p>{checklist.readiness.reason}</p>
										{/if}
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					<div class="actions">
						<form method="POST" action="?/approve">
							<input type="hidden" name="reviewRequestId" value={item.reviewRequestId} />
							<input type="hidden" name="draftId" value={item.draftId} />
							<input type="hidden" name="snapshotId" value={item.snapshotId} />
							<button disabled={item.publishDecision.state === 'blocked'} type="submit">
								Godkänn och publicera
							</button>
						</form>
					</div>
				</article>
			{/each}
		</section>
	{/if}
</main>

<style>
	:global(body) { background: #f4f4ef; }
	main { max-width: 1380px; margin: 0 auto; padding: 34px 22px 60px; font-family: Arial, Helvetica, sans-serif; color: #2f3732; }
	.page-header { padding-bottom: 22px; border-bottom: 1px solid #007a5b; }
	.eyebrow, .card-eyebrow { margin: 0 0 8px; color: #00754c; font-size: 14px; font-weight: 700; text-transform: uppercase; }
	h1, h2, h3, p { margin: 0; }
	h1 { font-size: 34px; font-weight: 500; }
	.lead { max-width: 74ch; margin-top: 12px; line-height: 1.5; }
	.status-message { margin: 18px 0 0; padding: 12px 14px; border-radius: 6px; }
	.status-message.success { border: 1px solid #bcd9cb; background: #edf8f1; color: #27543f; }
	.status-message.error { border: 1px solid #ebccd1; background: #f8e8ea; color: #8c3040; }
	.summary-card { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
	.summary-card div, .empty-state, .queue-card { border: 1px solid #d1d7ce; border-radius: 6px; background: #fff; padding: 18px; }
	.summary-card span, .metrics span { display: block; color: #5d675f; font-size: 13px; }
	.summary-card strong, .metrics strong { display: block; margin-top: 6px; font-size: 24px; font-weight: 600; color: #14261c; }
	.empty-state { margin-top: 18px; display: grid; gap: 8px; }
	.empty-state p { color: #516056; line-height: 1.5; }
	.queue-list { display: grid; gap: 16px; margin-top: 18px; }
	.queue-card { display: grid; gap: 16px; }
	.queue-header { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
	.card-meta, .decision-copy { color: #516056; line-height: 1.5; }
	.decision-badge { border-radius: 999px; background: #edf8f1; color: #27543f; font-size: 12px; font-weight: 700; padding: 8px 12px; }
	.decision-badge.blocked { background: #f8e8ea; color: #8c3040; }
	.blocked-copy { color: #8c3040; }
	.metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
	.metrics div, .linked-checklists { border: 1px solid #d8ded4; border-radius: 5px; padding: 12px; }
	.linked-checklists { background: #fbfcfa; }
	.linked-checklists ul { margin: 12px 0 0; padding-left: 18px; display: grid; gap: 12px; }
	.linked-checklists li { color: #516056; }
	.linked-checklists span { display: inline-block; margin-left: 8px; color: #00754c; font-size: 13px; font-weight: 700; }
	.linked-checklists p { margin-top: 6px; }
	.actions { display: flex; justify-content: flex-end; }
	button { border: 0; border-radius: 5px; background: #007a5b; color: #fff; cursor: pointer; padding: 11px 18px; font: inherit; }
	button:disabled { cursor: not-allowed; opacity: 0.55; }
	@media (max-width: 900px) {
		.summary-card, .metrics { grid-template-columns: 1fr; }
		.queue-header { flex-direction: column; }
	}
</style>
