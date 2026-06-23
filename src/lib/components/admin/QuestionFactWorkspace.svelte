<script lang="ts">
	import RichTextHtmlEditor from '$lib/components/admin/RichTextHtmlEditor.svelte';

	type FactSummary = {
		factRowId: string;
		factId: string | null;
		title: string;
		nodeId: string | null;
		excerpt: string;
		usageCount: number;
	};

	type FactWorkspace = {
		node: {
			kind: 'group' | 'question';
			id: string;
			nodeId: string;
			title: string;
			summaryText: string;
			groupId: string | null;
			groupTitle: string | null;
		};
		linkedFacts: FactSummary[];
		selectedFact: FactSummary | null;
		selectedFactEditor: {
			factRowId: string;
			title: string;
			bodyHtml: string;
			nodeIds: string[];
			status: string;
			updatedAt: string | null;
			reviewStatus: string | null;
			validationStatus: string;
		} | null;
		availableFacts: Array<
			FactSummary & {
				isLinked: boolean;
			}
		>;
	} | null;

	let {
		workspace,
		checklistId,
		selectedNodeId,
		selectedFactId = null,
		openEditFactModal = false,
		openCreateFactModal = false,
		createFactValues = null,
		factFormMode = undefined,
		errors = {}
	}: {
		workspace: FactWorkspace;
		checklistId: string;
		selectedNodeId: string | null;
		selectedFactId?: string | null;
		openEditFactModal?: boolean;
		openCreateFactModal?: boolean;
		createFactValues?: { title: string; bodyHtml: string } | null;
		factFormMode?: 'create' | 'edit';
		errors?: Record<string, string>;
	} = $props();

	let factSearch = $state('');
	let isLinkModalOpen = $state(false);
	let isCreateFactMode = $state(false);
	let dismissedEditFactId = $state<string | null>(null);

	const activeFactId = $derived(workspace?.selectedFact?.factRowId ?? selectedFactId ?? null);
	const editableFactId = $derived(workspace?.selectedFactEditor?.factRowId ?? null);
	const requestedEditFactId = $derived(
		openEditFactModal || factFormMode === 'edit' ? editableFactId : null
	);
	const isEditModalOpen = $derived(
		editableFactId !== null &&
			requestedEditFactId === editableFactId &&
			dismissedEditFactId !== editableFactId
	);
	const normalizedSearch = $derived(factSearch.trim().toLowerCase());
	const hasSearchQuery = $derived(normalizedSearch.length >= 2);
	const visibleAvailableFacts = $derived(
		!hasSearchQuery
			? []
			: (workspace?.availableFacts
					.filter((fact) => {
						const haystack = `${fact.title} ${fact.factId ?? ''} ${fact.excerpt}`.toLowerCase();
						return haystack.includes(normalizedSearch);
					})
					.slice(0, 20) ?? [])
	);

	function factHref(factRowId: string) {
		const params = new URLSearchParams();

		if (selectedNodeId) {
			params.set('selected', selectedNodeId);
		}

		params.set('fact', factRowId);
		return `/admin/content-studio/checklists/${encodeURIComponent(checklistId)}?${params.toString()}`;
	}

	function editFactHref(factRowId: string) {
		return `${factHref(factRowId)}&editFact=1`;
	}

	function openLinkModal() {
		factSearch = '';
		isCreateFactMode = false;
		isLinkModalOpen = true;
	}

	function closeLinkModal() {
		isLinkModalOpen = false;
		isCreateFactMode = false;
	}

	function openCreateFactForm() {
		factSearch = '';
		isLinkModalOpen = true;
		isCreateFactMode = true;
	}

	function closeCreateFactForm() {
		isCreateFactMode = false;
	}

	function closeEditModal() {
		dismissedEditFactId = editableFactId;
	}

	function factIdentifier(fact: FactSummary) {
		return fact.factId?.trim() || fact.nodeId?.trim() || 'internt fakta-id';
	}

	function defaultCreateFactTitle() {
		if (!workspace) {
			return '';
		}

		return workspace.node.kind === 'question' ?
				workspace.node.summaryText || workspace.node.title
			:	workspace.node.title;
	}

	$effect(() => {
		if (!openCreateFactModal) {
			return;
		}

		isLinkModalOpen = true;
		isCreateFactMode = true;
	});
</script>

<aside class="panel">
	<p class="eyebrow">Fakta</p>
	<h2>{workspace?.node.kind === 'group' ? 'Grupp och fakta' : 'Fråga och fakta'}</h2>

	{#if !workspace}
		<p class="empty-state">Välj en grupp eller fråga för att se kopplad fakta och hantera länkarna.</p>
	{:else}
		<section class="summary">
			<h3>{workspace.node.title}</h3>
			<p>{workspace.node.summaryText || 'Ingen beskrivning finns ännu.'}</p>
			<div class="summary-meta">
				<span>{workspace.linkedFacts.length} kopplade fakta</span>
				<span>{workspace.node.nodeId}</span>
			</div>
		</section>

		<section class="linked-section">
			<div class="section-header">
				<h3>Kopplade fakta</h3>
				<button type="button" class="secondary-button" onclick={openLinkModal}>
					Lägg till / länka fakta
				</button>
			</div>

			{#if workspace.linkedFacts.length === 0}
				<div class="empty-link-state">
					<p>Frågan saknar kopplad faktatext.</p>
					<div class="action-row">
						<button type="button" class="create-button" onclick={openCreateFactForm}>Skapa ny fakta</button>
						<button type="button" class="secondary-button" onclick={openLinkModal}>
							Länka befintlig fakta
						</button>
					</div>
				</div>
			{:else}
				<div class="linked-fact-list">
					{#each workspace.linkedFacts as fact (fact.factRowId)}
						<article class:active={activeFactId === fact.factRowId} class="fact-card">
							<div class="fact-card-main">
								<a class="fact-select" href={factHref(fact.factRowId)}>
									<strong>{fact.title}</strong>
									<span>{factIdentifier(fact)} · används av {fact.usageCount} frågor</span>
									{#if fact.excerpt}
										<p>{fact.excerpt}</p>
									{/if}
								</a>
							</div>
							<div class="fact-card-actions">
								<a class="secondary-link-button" href={editFactHref(fact.factRowId)}>
									Redigera fakta
								</a>
								<form method="POST" action="?/unlinkFact">
									<input type="hidden" name="nodeId" value={workspace.node.id} />
									<input type="hidden" name="factId" value={fact.factRowId} />
									<button type="submit" class="danger-link">Ta bort länk</button>
								</form>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</aside>

{#if workspace?.node.kind === 'question' && workspace.selectedFact && workspace.selectedFactEditor && isEditModalOpen}
	<div class="modal-backdrop" role="presentation" onclick={closeEditModal}></div>
	<div class="modal-dialog edit-modal-dialog" role="dialog" aria-modal="true" aria-label="Redigera fakta">
		<div class="modal-header">
			<div>
				<p class="modal-eyebrow">Fakta</p>
				<h3>Redigera fakta</h3>
				<p class="modal-copy">{workspace.selectedFact.title}</p>
			</div>
			<button type="button" class="modal-close" aria-label="Stäng dialog" onclick={closeEditModal}>
				Stäng
			</button>
		</div>

		{#key workspace.selectedFactEditor.factRowId}
			<form method="POST" action="?/saveFactInline" class="inline-editor-form modal-editor-form">
				<input type="hidden" name="questionId" value={workspace.node.id} />
				<input type="hidden" name="factId" value={workspace.selectedFactEditor.factRowId} />
				{#each workspace.selectedFactEditor.nodeIds as nodeId (nodeId)}
					<input type="hidden" name="nodeIds" value={nodeId} />
				{/each}

				<label>
					<span>Titel</span>
					<input name="title" type="text" value={workspace.selectedFactEditor.title} />
					{#if errors.title}<small>{errors.title}</small>{/if}
				</label>

				<label>
					<span>Brödtext</span>
					<RichTextHtmlEditor
						label="Brödtext"
						name="bodyHtml"
						value={workspace.selectedFactEditor.bodyHtml}
					/>
					{#if errors.bodyHtml}<small>{errors.bodyHtml}</small>{/if}
				</label>

				<div class="editor-meta">
					<span>Status: {workspace.selectedFactEditor.status}</span>
					{#if workspace.selectedFactEditor.updatedAt}
						<span>Uppdaterad: {workspace.selectedFactEditor.updatedAt}</span>
					{/if}
				</div>

				<div class="editor-actions">
					<button type="submit" class="save-button">Spara och publicera fakta</button>
				</div>
			</form>
		{/key}
	</div>
{/if}

{#if workspace && isLinkModalOpen}
	<div class="modal-backdrop" role="presentation" onclick={closeLinkModal}></div>
	<div
		class="modal-dialog"
		role="dialog"
		aria-modal="true"
		aria-label={isCreateFactMode ? 'Skapa ny fakta' : 'Länka befintlig fakta'}
	>
		<div class="modal-header">
			<div>
				<p class="modal-eyebrow">Fakta</p>
				<h3>{isCreateFactMode ? 'Skapa ny fakta' : 'Lägg till / länka fakta'}</h3>
				<p class="modal-copy">
					{isCreateFactMode
						? 'Fyll i faktatexten och spara den för att koppla den till den valda posten.'
						: 'Sök i faktabanken och koppla en befintlig faktatext till den valda posten.'}
				</p>
			</div>
			<button type="button" class="modal-close" aria-label="Stäng dialog" onclick={closeLinkModal}>
				Stäng
			</button>
		</div>

		{#if isCreateFactMode}
			<form method="POST" action="?/createFact" class="create-fact-form">
				<input type="hidden" name="nodeId" value={workspace.node.id} />
				<label>
					<span>Titel</span>
					<input
						name="title"
						type="text"
						value={createFactValues?.title ?? defaultCreateFactTitle()}
					/>
					{#if errors.title}<small>{errors.title}</small>{/if}
				</label>
				<label>
					<span>Brödtext</span>
					<RichTextHtmlEditor
						label="Brödtext"
						name="bodyHtml"
						value={createFactValues?.bodyHtml ?? '<p></p>'}
					/>
					{#if errors.bodyHtml}<small>{errors.bodyHtml}</small>{/if}
				</label>
				<div class="editor-actions">
					<button type="submit" class="save-button">Spara fakta</button>
					<button type="button" class="secondary-button" onclick={closeCreateFactForm}>
						Tillbaka
					</button>
				</div>
			</form>
		{:else}
			<div class="modal-actions">
				<label class="search-field">
					<span>Sök fakta</span>
					<input bind:value={factSearch} type="search" placeholder="Sök på titel, fact-id eller utdrag" />
				</label>

				<button type="button" class="secondary-button" onclick={openCreateFactForm}>
					Skapa ny fakta
				</button>
			</div>

			<div class="picker-list modal-picker-list">
				{#if !hasSearchQuery}
					<p class="empty-picker">Skriv minst 2 tecken för att söka fram fakta att koppla.</p>
				{:else if visibleAvailableFacts.length === 0}
					<p class="empty-picker">Ingen fakta matchar sökningen.</p>
				{:else}
					<p class="result-count">Visar upp till 20 träffar.</p>
					{#each visibleAvailableFacts as fact (fact.factRowId)}
						<article class:linked={fact.isLinked} class="picker-card">
							<div class="picker-card-main">
								<strong>{fact.title}</strong>
								<span>{factIdentifier(fact)} · används av {fact.usageCount} frågor</span>
								{#if fact.excerpt}
									<p>{fact.excerpt}</p>
								{/if}
							</div>
							<div class="picker-card-actions">
								<a class="text-link" href={factHref(fact.factRowId)}>Öppna fakta</a>
								{#if fact.isLinked}
									<span class="linked-badge">Redan kopplad</span>
								{:else}
									<form method="POST" action="?/linkFact">
										<input type="hidden" name="nodeId" value={workspace.node.id} />
										<input type="hidden" name="factId" value={fact.factRowId} />
										<button type="submit" class="link-button">Koppla</button>
									</form>
								{/if}
							</div>
						</article>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.panel {
		border: 1px solid #d1d7ce;
		border-radius: 6px;
		background: #ffffff;
		padding: 18px;
	}

	.eyebrow {
		margin: 0 0 6px;
		color: #00754c;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
	}

	h2,
	h3,
	p {
		margin: 0;
	}

	h2 {
		font-size: 24px;
	}

	.summary,
	.linked-section {
		margin-top: 24px;
		display: grid;
		gap: 12px;
	}

	.summary {
		margin-top: 16px;
		padding-bottom: 16px;
		border-bottom: 1px solid #e3e7e0;
	}

	.summary h3 {
		font-size: 18px;
	}

	.summary p,
	.empty-state {
		color: #38443b;
		line-height: 1.5;
	}

	.summary-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.summary-meta span,
	.linked-badge {
		border: 1px solid #d8ded4;
		border-radius: 999px;
		padding: 5px 10px;
		background: #f8faf8;
		color: #5d675f;
		font-size: 12px;
		font-weight: 700;
	}

	.inline-editor-form {
		display: grid;
		gap: 14px;
	}

	.inline-editor-form label {
		display: grid;
		gap: 8px;
		font-size: 14px;
	}

	.inline-editor-form input {
		width: 100%;
		box-sizing: border-box;
		padding: 10px 12px;
		border: 1px solid #c9d1cb;
		border-radius: 4px;
		background: #fff;
		font: inherit;
	}

	.inline-editor-form small {
		color: #8c3040;
	}

	.create-fact-form {
		display: grid;
		gap: 14px;
		min-height: 0;
		overflow: auto;
		padding-right: 4px;
	}

	.create-fact-form label {
		display: grid;
		gap: 8px;
		font-size: 14px;
	}

	.create-fact-form input {
		width: 100%;
		box-sizing: border-box;
		padding: 10px 12px;
		border: 1px solid #c9d1cb;
		border-radius: 4px;
		background: #fff;
		font: inherit;
	}

	.create-fact-form small {
		color: #8c3040;
	}

	.editor-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		color: #5d675f;
		font-size: 12px;
	}

	.editor-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.save-button {
		border: 0;
		border-radius: 5px;
		cursor: pointer;
		padding: 11px 18px;
		font: inherit;
	}

	.save-button {
		background: #007a5b;
		color: #fff;
	}

	.secondary-button {
		background: #dbe8e0;
		color: #1f3a2d;
	}

	.secondary-button {
		border: 0;
		border-radius: 5px;
		cursor: pointer;
		padding: 11px 18px;
		font: inherit;
		font-weight: 700;
		white-space: nowrap;
	}

	.secondary-link-button {
		padding: 8px 12px;
		font-size: 13px;
	}

	.secondary-link-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 5px;
		background: #dbe8e0;
		color: #1f3a2d;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
	}

	.linked-section {
		margin-top: 18px;
		padding-top: 18px;
		border-top: 1px solid #e3e7e0;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		gap: 14px;
		align-items: start;
	}

	.danger-link {
		color: #00754c;
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
	}

	.danger-link {
		border: 0;
		background: transparent;
		color: #a13a46;
		cursor: pointer;
		padding: 0;
		font: inherit;
		font-weight: 700;
	}

	.empty-link-state {
		display: grid;
		gap: 10px;
		border: 1px dashed #c7d3cb;
		border-radius: 8px;
		padding: 16px;
		background: #f8faf8;
	}

	.action-row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.create-button,
	.link-button {
		border: 0;
		border-radius: 5px;
		background: #007a5b;
		color: #fff;
		cursor: pointer;
		font: inherit;
		font-weight: 700;
		padding: 10px 16px;
	}

	.linked-fact-list,
	.picker-list {
		display: grid;
		gap: 10px;
	}

	.linked-fact-list {
		max-height: 380px;
		overflow: auto;
	}

	.fact-card,
	.picker-card {
		display: grid;
		gap: 10px;
		border: 1px solid #d8ded4;
		border-radius: 8px;
		background: #fbfcfa;
		padding: 12px;
	}

	.fact-card.active {
		border-color: #00754c;
		background: #eef7f1;
		box-shadow: 0 0 0 2px rgba(0, 117, 76, 0.12);
	}

	.picker-card.linked {
		background: #f3f7f4;
	}

	.fact-select {
		display: grid;
		gap: 6px;
		color: inherit;
		text-decoration: none;
	}

	.fact-card span,
	.fact-card p,
	.picker-card span,
	.picker-card p {
		color: #5d675f;
		font-size: 13px;
	}

	.fact-card-actions,
	.picker-card-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
	}

	.search-field {
		display: grid;
		gap: 6px;
		font-size: 14px;
	}

	.search-field span {
		color: #445248;
	}

	.search-field input {
		width: 100%;
		box-sizing: border-box;
		padding: 10px 12px;
		border: 1px solid #c9d1cb;
		border-radius: 4px;
		background: #fff;
		font: inherit;
	}

	.empty-picker {
		margin: 0;
		color: #66736a;
	}

	.result-count {
		color: #66736a;
		font-size: 13px;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(17, 24, 39, 0.45);
		z-index: 40;
	}

	.modal-dialog {
		position: fixed;
		top: 40px;
		left: 50%;
		width: min(860px, calc(100vw - 32px));
		max-width: 860px;
		max-height: calc(100vh - 80px);
		transform: translateX(-50%);
		display: grid;
		grid-template-rows: auto auto minmax(0, 1fr);
		gap: 18px;
		align-content: start;
		border: 1px solid #d1d7ce;
		border-radius: 10px;
		background: #fbfdf9;
		padding: 22px;
		box-shadow: 0 24px 60px rgba(31, 41, 51, 0.18);
		overflow: auto;
		z-index: 41;
	}

	.edit-modal-dialog {
		grid-template-rows: auto minmax(0, 1fr);
	}

	.modal-editor-form {
		min-height: 0;
		overflow: auto;
		padding-right: 4px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		gap: 18px;
		align-items: start;
	}

	.modal-eyebrow {
		margin: 0 0 6px;
		color: #00754c;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.modal-copy {
		margin-top: 8px;
		color: #516056;
		line-height: 1.5;
	}

	.modal-close {
		border: 0;
		background: transparent;
		color: #445248;
		cursor: pointer;
		font: inherit;
		font-weight: 700;
		padding: 0;
	}

	.modal-actions {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 14px;
		align-items: end;
	}

	.modal-picker-list {
		min-height: 0;
		max-height: min(60vh, 620px);
		overflow: auto;
		padding-right: 4px;
	}

	.text-link {
		color: #00754c;
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
	}

	@media (max-width: 720px) {
		.modal-dialog {
			top: 16px;
			width: calc(100vw - 32px);
			max-height: calc(100vh - 32px);
			padding: 16px;
		}

		.modal-header,
		.modal-actions {
			grid-template-columns: 1fr;
			display: grid;
		}
	}
</style>
