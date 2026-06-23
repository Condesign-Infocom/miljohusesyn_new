<script lang="ts">
	import RichTextHtmlEditor from '$lib/components/admin/RichTextHtmlEditor.svelte';

	type LinkOption = {
		id: string;
		linkNodeId: string;
		legacyNodeId?: string;
		checklistId: string;
		checklistTitle: string;
		groupTitle: string;
		questionText: string;
		selected: boolean;
	};

	let {
		values,
		errors = {},
		linkOptions = [],
		unresolvedNodeIds = [],
		submitLabel = 'Spara och publicera'
	}: {
		values: {
			title: string;
			bodyHtml: string;
			nodeIds: string[];
		};
		errors?: Record<string, string>;
		linkOptions: LinkOption[];
		unresolvedNodeIds?: string[];
		submitLabel?: string;
	} = $props();

	let selectedChecklist = $state('');
	let questionSearch = $state('');

	const visibleLinkOptions = $derived(
		linkOptions.filter((option) => {
			const matchesChecklist = !selectedChecklist || option.checklistId === selectedChecklist;
			const normalizedSearch = questionSearch.trim().toLowerCase();
			const haystack = `${option.checklistTitle} ${option.groupTitle} ${option.questionText}`.toLowerCase();
			const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
			return matchesChecklist && matchesSearch;
		})
	);

	const checklistOptions = $derived(
		Array.from(new Map(linkOptions.map((option) => [option.checklistId, option.checklistTitle])).entries())
			.map(([checklistId, checklistTitle]) => ({ checklistId, checklistTitle }))
			.sort((left, right) => left.checklistTitle.localeCompare(right.checklistTitle, 'sv'))
	);

	const selectedCount = $derived(linkOptions.filter((option) => option.selected).length);
</script>

<div class="field-grid">
	<label class="wide">
		<span>Titel</span>
		<input name="title" type="text" value={values.title} />
		{#if errors.title}<small>{errors.title}</small>{/if}
	</label>

	<input name="unresolvedNodeIds" type="hidden" value={unresolvedNodeIds.join('\n')} />

	<div class="wide link-picker">
		<div class="picker-header">
			<div>
				<span class="field-label">Koppla till frågor</span>
				<p>Välj vilka checklistfrågor som ska kunna hänvisa till den här faktatexten.</p>
			</div>
			<strong>{selectedCount} valda</strong>
		</div>

		<div class="picker-toolbar">
			<label>
				<span>Checklista</span>
				<select bind:value={selectedChecklist}>
					<option value="">Alla checklistor</option>
					{#each checklistOptions as checklist (checklist.checklistId)}
						<option value={checklist.checklistId}>{checklist.checklistTitle}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>Sök fråga</span>
				<input bind:value={questionSearch} placeholder="Sök i frågetext eller grupp" type="search" />
			</label>
		</div>

		<div class="picker-list">
			{#if visibleLinkOptions.length === 0}
				<p class="empty-picker">Inga frågor matchar filtret.</p>
			{:else}
				{#each visibleLinkOptions as option (option.id)}
					<label class="picker-option">
						<input checked={option.selected} name="linkNodeIds" type="checkbox" value={option.linkNodeId} />
						<div>
							<strong>{option.questionText}</strong>
							<span>{option.checklistTitle} · {option.groupTitle}</span>
						</div>
					</label>
				{/each}
			{/if}
		</div>

		{#if unresolvedNodeIds.length}
			<details class="trace-details">
				<summary>Bevara tekniska kopplingar som ännu inte kan mappas</summary>
				<ul>
					{#each unresolvedNodeIds as nodeId (nodeId)}
						<li>{nodeId}</li>
					{/each}
				</ul>
			</details>
		{/if}
	</div>

	<label class="wide">
		<span>Brödtext</span>
		<RichTextHtmlEditor
			label="Brödtext"
			name="bodyHtml"
			value={values.bodyHtml}
		/>
		<small class="field-hint">Redigera faktatexten visuellt och växla till HTML-läge vid behov. Ändringen publiceras direkt när du sparar.</small>
		{#if errors.bodyHtml}<small>{errors.bodyHtml}</small>{/if}
	</label>
</div>

<div class="actions">
	<button type="submit">{submitLabel}</button>
</div>

<style>
	.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 18px; }
	.wide { grid-column: 1 / -1; }
	label { display: grid; gap: 7px; font-size: 14px; }
	.field-label,
	label span { color: #445248; }
	label small { color: #8c3040; }
	.field-hint { color: #66736a; }
	input, button, select { font: inherit; }
	input, select { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #c9d1cb; border-radius: 4px; background: #fff; }
	.link-picker { display:grid; gap:14px; }
	.picker-header { display:flex; justify-content:space-between; gap:16px; align-items:start; }
	.picker-header p { margin: 6px 0 0; color:#66736a; }
	.picker-header strong { font-size:24px; color:#14261c; }
	.picker-toolbar { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:12px; }
	.picker-list { display:grid; gap:10px; max-height:360px; overflow:auto; padding-right:4px; }
	.picker-option { display:flex; gap:12px; align-items:start; border:1px solid #d8ded4; border-radius:6px; padding:12px; background:#fbfcfa; }
	.picker-option input { width:auto; margin-top:3px; }
	.picker-option strong, .picker-option span { display:block; }
	.picker-option span { margin-top:4px; color:#66736a; }
	.empty-picker { margin:0; color:#66736a; }
	.trace-details summary { cursor:pointer; color:#5d675f; }
	.actions { display: flex; flex-wrap: wrap; gap: 10px; padding-top: 18px; border-top: 1px solid #e1e6df; }
	button { border: 0; border-radius: 5px; background: #007a5b; color: #fff; cursor: pointer; padding: 11px 18px; }
	@media (max-width: 720px) { .field-grid, .picker-toolbar { grid-template-columns: 1fr; } }
</style>
