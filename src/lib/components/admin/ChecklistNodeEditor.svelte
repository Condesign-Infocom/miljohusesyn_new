<script lang="ts">
	type ChecklistGroup = {
		id: string;
		title: string;
		nodeId: string;
		introText: string;
		profiles: Array<{ profileKey: string; profileName: string }>;
		factLinks: Array<{ id: string; title: string; nodeId: string; linkStatus: string }>;
		questions: Array<{
			id: string;
			nodeId: string;
			questionText: string;
			flags: {
				cc: boolean;
				ccExtra: boolean;
				base: boolean;
				annualQuestion: boolean;
				newFlag: boolean;
				recommended: boolean;
			};
			profiles: Array<{ profileKey: string; profileName: string }>;
			factLinks: Array<{ id: string; title: string; nodeId: string; linkStatus: string }>;
		}>;
	};

	type SelectedNode =
		| { kind: 'group'; group: ChecklistGroup }
		| {
				kind: 'question';
				group: ChecklistGroup;
				question: ChecklistGroup['questions'][number];
		  }
		| null;

	let {
		groups,
		selectedNodeId
	}: {
		groups: ChecklistGroup[];
		selectedNodeId: string | null;
	} = $props();

	const selectedNode = $derived.by<SelectedNode>(() => {
		for (const group of groups) {
			if (group.id === selectedNodeId) {
				return { kind: 'group', group };
			}

			const question = group.questions.find((item) => item.id === selectedNodeId);
			if (question) {
				return { kind: 'question', group, question };
			}
		}

		return null;
	});

	const questionAttributeItems = $derived.by(() => {
		if (!selectedNode || selectedNode.kind !== 'question') {
			return [];
		}

		return [
			{
				name: 'cc',
				label: 'Grundvillkor',
				checked: selectedNode.question.flags.cc
			},
			{
				name: 'ccExtra',
				label: 'Grundvillkor extra',
				checked: selectedNode.question.flags.ccExtra
			},
			{
				name: 'annualQuestion',
				label: 'Årlig fråga',
				checked: selectedNode.question.flags.annualQuestion
			},
			{
				name: 'newFlag',
				label: 'Ny fråga',
				checked: selectedNode.question.flags.newFlag
			},
			{
				name: 'recommended',
				label: 'Rekommenderad',
				checked: selectedNode.question.flags.recommended
			},
			{
				name: 'base',
				label: 'Basfråga',
				checked: selectedNode.question.flags.base
			}
		];
	});

	const selectedGroupDeleteDisabled = $derived(
		selectedNode?.kind === 'group' ? selectedNode.group.questions.length > 0 : true
	);

	const selectedQuestionDeleteMessage = $derived.by(() => {
		if (!selectedNode || selectedNode.kind !== 'question') {
			return '';
		}

		if (selectedNode.question.factLinks.length > 0) {
			return `Frågan har ${selectedNode.question.factLinks.length} faktalänkar som också tas bort.`;
		}

		return 'Frågan tas bort direkt.';
	});

	function normalizeTextareaText(value: string) {
		return value.replace(/\s+/g, ' ').trim();
	}

	function confirmDelete(message: string) {
		return window.confirm(message);
	}
</script>

<section class="editor-shell">
	<div class="panel">
		<p class="eyebrow">{selectedNode?.kind === 'question' ? 'Fråga' : 'Grupp'}</p>
		<h2>{selectedNode?.kind === 'question' ? 'Redigera fråga' : 'Redigera grupp'}</h2>

		{#if !selectedNode}
			<p class="empty-state">Välj en grupp eller fråga i trädet för att se detaljer här.</p>
		{:else if selectedNode.kind === 'group'}
			<div class="content-stack">
				<div class="badge-row">
					<span class="badge">Grupp</span>
					<span class="badge subtle">{selectedNode.group.nodeId}</span>
				</div>

				<label>
					<span>Gruppnamn</span>
					<input form="group-editor-form" name="title" value={selectedNode.group.title} />
				</label>

				<label>
					<span>Inledning</span>
					<textarea form="group-editor-form" name="introText" rows="6">{selectedNode.group.introText}</textarea>
				</label>

				<form id="group-editor-form" method="POST" action="?/saveGroup" class="save-form">
					<input type="hidden" name="groupId" value={selectedNode.group.id} />
					<div class="editor-actions">
						<button type="submit" class="solid">Spara grupp</button>
						<button
							type="submit"
							class="danger-text"
							form="group-delete-form"
							disabled={selectedGroupDeleteDisabled}
							aria-label={`Ta bort grupp ${selectedNode.group.title}`}
							title={
								selectedGroupDeleteDisabled ?
									'Gruppen kan bara tas bort när den inte innehåller några frågor.'
								:	`Ta bort gruppen ${selectedNode.group.title}`
							}
							onclick={(event) => {
								if (
									selectedGroupDeleteDisabled ||
									confirmDelete(`Ta bort gruppen ${selectedNode.group.title}?`)
								) {
									return;
								}

								event.preventDefault();
							}}
						>
							Ta bort
						</button>
					</div>
				</form>
				<form id="group-delete-form" method="POST" action="?/deleteGroup">
					<input type="hidden" name="groupId" value={selectedNode.group.id} />
				</form>

				<div class="meta-grid">
					<div>
						<span>Profiler</span>
						<strong>{selectedNode.group.profiles.length ? selectedNode.group.profiles.map((profile) => profile.profileName).join(', ') : 'Saknas'}</strong>
					</div>
					<div>
						<span>Frågor</span>
						<strong>{selectedNode.group.questions.length}</strong>
					</div>
					<div>
						<span>Faktalänkar</span>
						<strong>{selectedNode.group.factLinks.length}</strong>
					</div>
				</div>
			</div>
		{:else}
			<div class="question-layout">
				<form id="question-editor-form" method="POST" action="?/saveQuestion" class="hidden-form">
					<input type="hidden" name="questionId" value={selectedNode.question.id} />
				</form>
				<form id="question-delete-form" method="POST" action="?/deleteQuestion" class="hidden-form">
					<input type="hidden" name="questionId" value={selectedNode.question.id} />
				</form>
				<form id="question-reset-form" method="POST" action="?/resetQuestion" class="hidden-form">
					<input type="hidden" name="questionId" value={selectedNode.question.id} />
				</form>

				<div class="question-main">
					<div class="question-heading">
						<p class="question-group-title">{selectedNode.group.title}</p>
						<p class="question-node-id">{selectedNode.question.nodeId}</p>
					</div>

					<label>
						<span>Frågetext</span>
						<textarea
							form="question-editor-form"
							name="questionText"
							rows="6"
							value={normalizeTextareaText(selectedNode.question.questionText)}
						></textarea>
					</label>

					<div class="editor-actions">
						<button type="submit" form="question-editor-form" class="solid">Spara fråga</button>
						<button
							type="submit"
							form="question-reset-form"
							class="secondary"
							aria-label={`Nollställ fråga ${selectedNode.question.questionText}`}
						>
							Nollställ fråga
						</button>
						<button
							type="submit"
							form="question-delete-form"
							class="danger-text"
							aria-label={`Ta bort fråga ${selectedNode.question.questionText}`}
							title={
								selectedNode.question.factLinks.length > 0 ?
									selectedQuestionDeleteMessage
								:	`Ta bort frågan ${selectedNode.question.questionText}`
							}
							onclick={(event) => {
								if (
									confirmDelete(
										selectedNode.question.factLinks.length > 0 ?
											`Ta bort frågan och ${selectedNode.question.factLinks.length} faktalänkar?`
										:	'Ta bort frågan?'
									)
								) {
									return;
								}

								event.preventDefault();
							}}
						>
							Ta bort
						</button>
					</div>

					<div class="meta-grid">
						<div>
							<span>Profiler</span>
							<strong>{selectedNode.question.profiles.length ? selectedNode.question.profiles.map((profile) => profile.profileName).join(', ') : 'Saknas'}</strong>
						</div>
						<div>
							<span>Faktalänkar</span>
							<strong>{selectedNode.question.factLinks.length}</strong>
						</div>
					</div>
				</div>

				<aside class="attribute-panel">
					<h3>Attribut</h3>

					<div class="attribute-list">
						{#each questionAttributeItems as attribute (attribute.name)}
							<label class="attribute-row">
								<input
									form="question-editor-form"
									type="checkbox"
									name={attribute.name}
									checked={attribute.checked}
								/>
								<span>{attribute.label}</span>
							</label>
						{/each}
					</div>
				</aside>
			</div>
		{/if}
	</div>
</section>

<style>
	.editor-shell {
		display: grid;
		gap: 12px;
	}

	.panel {
		border: 1px solid #d1d7ce;
		border-radius: 6px;
		background: #ffffff;
		padding: 18px;
		min-width: 0;
	}

	.eyebrow {
		margin: 0 0 6px;
		color: #00754c;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
	}

	h2 {
		margin: 0;
		font-size: 24px;
	}

	.content-stack {
		display: grid;
		gap: 16px;
		margin-top: 16px;
	}

	.question-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(180px, 220px);
		gap: 24px;
		margin-top: 16px;
		align-items: start;
		min-width: 0;
	}

	.question-main {
		display: grid;
		gap: 16px;
		min-width: 0;
	}

	.question-heading {
		display: grid;
		gap: 4px;
		padding-bottom: 12px;
		border-bottom: 1px solid #e1e7de;
	}

	.question-group-title,
	.question-node-id {
		margin: 0;
	}

	.question-group-title {
		font-size: 18px;
		font-weight: 700;
		color: #14261c;
	}

	.question-node-id {
		font-size: 13px;
		color: #5d675f;
	}

	.save-form {
		display: grid;
		gap: 14px;
	}

	.hidden-form {
		display: none;
	}

	.editor-actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
	}

	.badge-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.badge,
	.badge.subtle {
		border-radius: 999px;
		padding: 5px 10px;
		font-size: 12px;
		font-weight: 700;
	}

	.badge {
		background: #eef7f1;
		color: #00754c;
	}

	.badge.subtle {
		border: 1px solid #d8ded4;
		background: #f8faf8;
		color: #516056;
	}

	label {
		display: grid;
		gap: 7px;
	}

	label span,
	.meta-grid span {
		color: #445248;
		font-size: 14px;
	}

	input,
	textarea {
		width: 100%;
		box-sizing: border-box;
		padding: 10px 12px;
		border: 1px solid #c9d1cb;
		border-radius: 4px;
		background: #f8faf8;
		font: inherit;
		color: inherit;
		text-align: left;
	}

	textarea {
		resize: vertical;
	}

	button.solid {
		border: 1px solid #00754c;
		border-radius: 999px;
		padding: 8px 14px;
		background: #00754c;
		color: #ffffff;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	button.secondary,
	button.danger-text {
		border: 1px solid #c9d3cc;
		border-radius: 999px;
		padding: 8px 14px;
		background: #ffffff;
		color: #1f3a2d;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	button.secondary:hover {
		background: #eef7f1;
	}

	button.danger-text {
		border-color: transparent;
		color: #8f3030;
	}

	button.danger-text:hover {
		background: #faeeee;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.meta-grid div {
		border: 1px solid #d8ded4;
		border-radius: 6px;
		padding: 12px;
		background: #f8faf8;
	}

	.meta-grid strong {
		display: block;
		margin-top: 6px;
		color: #14261c;
	}

	.attribute-panel {
		padding-left: 4px;
		min-width: 0;
	}

	.attribute-panel h3 {
		margin: 0 0 16px;
		font-size: 18px;
		color: #14261c;
	}

	.attribute-list {
		display: grid;
		gap: 10px;
	}

	.attribute-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.attribute-row input {
		width: auto;
	}

	.empty-state {
		color: #5d675f;
	}

	.empty-state {
		margin: 16px 0 0;
	}

	@media (max-width: 1180px) {
		.question-layout {
			grid-template-columns: minmax(0, 1fr);
		}

		.attribute-panel {
			padding-left: 0;
			padding-top: 8px;
			border-top: 1px solid #e1e7de;
		}
	}
</style>
