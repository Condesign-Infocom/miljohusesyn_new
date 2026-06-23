<script lang="ts">
	type ChecklistValidation = {
		duplicateNodeIds: Array<unknown>;
		missingFactLinks: Array<{ questionId: string }>;
		unresolvedFactNodeIds: Array<{ questionId: string }>;
		emptyQuestionTexts: Array<{ questionId: string }>;
	};

	type ChecklistGroup = {
		id: string;
		title: string;
		questions: Array<{
			id: string;
			questionText: string;
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
		selectedNodeId,
		validation
	}: {
		groups: ChecklistGroup[];
		selectedNodeId: string | null;
		validation: ChecklistValidation;
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

	const selectedQuestionWarnings = $derived(
		selectedNode?.kind === 'question'
			? {
					missingFacts: validation.missingFactLinks.some(
						(item) => item.questionId === selectedNode.question.id
					),
					unresolvedFacts: validation.unresolvedFactNodeIds.some(
						(item) => item.questionId === selectedNode.question.id
					),
					emptyText: validation.emptyQuestionTexts.some(
						(item) => item.questionId === selectedNode.question.id
					)
				}
			: null
	);
</script>

<aside class="panel">
	<p class="eyebrow">Kontext</p>
	<h2>Validering</h2>

	<div class="metric-list">
		<div>
			<span>Dubbla node-id</span>
			<strong>{validation.duplicateNodeIds.length}</strong>
		</div>
		<div>
			<span>Frågor utan fakta</span>
			<strong>{validation.missingFactLinks.length}</strong>
		</div>
		<div>
			<span>Olösta faktalänkar</span>
			<strong>{validation.unresolvedFactNodeIds.length}</strong>
		</div>
		<div>
			<span>Tomma frågetexter</span>
			<strong>{validation.emptyQuestionTexts.length}</strong>
		</div>
	</div>

	<section class="context-section">
		<h3>Vald nod</h3>

		{#if !selectedNode}
			<p class="empty-state">Välj en nod för att se dess redaktionella kontext.</p>
		{:else if selectedNode.kind === 'group'}
			<p class="context-copy">
				<strong>{selectedNode.group.title}</strong> innehåller {selectedNode.group.questions.length} frågor.
				Välj en fråga i trädet för att se faktakopplingar och varningar på nodnivå.
			</p>
		{:else}
			<div class="context-stack">
				<p class="context-copy">
					Frågan ligger i <strong>{selectedNode.group.title}</strong> och har
					<strong> {selectedNode.question.factLinks.length} </strong>
					faktakopplingar.
				</p>

				{#if selectedNode.question.factLinks.length > 0}
					<ul class="fact-list">
						{#each selectedNode.question.factLinks as factLink (factLink.id)}
							<li>{factLink.title} · {factLink.nodeId} · {factLink.linkStatus}</li>
						{/each}
					</ul>
				{/if}

				<div class="warning-list">
					<span class:active={selectedQuestionWarnings?.missingFacts}>Saknad faktalänk</span>
					<span class:active={selectedQuestionWarnings?.unresolvedFacts}>Olöst node-id</span>
					<span class:active={selectedQuestionWarnings?.emptyText}>Tom frågetext</span>
				</div>
			</div>
		{/if}
	</section>
</aside>

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
	h3 {
		margin: 0;
	}

	h2 {
		font-size: 24px;
	}

	h3 {
		font-size: 18px;
	}

	.metric-list,
	.context-stack {
		display: grid;
		gap: 10px;
	}

	.metric-list {
		margin-top: 16px;
	}

	.metric-list div {
		border: 1px solid #d8ded4;
		border-radius: 6px;
		background: #f8faf8;
		padding: 12px;
	}

	.metric-list span {
		display: block;
		color: #5d675f;
		font-size: 13px;
	}

	.metric-list strong {
		display: block;
		margin-top: 6px;
		color: #14261c;
		font-size: 28px;
	}

	.context-section {
		display: grid;
		gap: 12px;
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid #e3e7e0;
	}

	.context-copy,
	.empty-state {
		margin: 0;
		color: #516056;
		line-height: 1.5;
	}

	.fact-list {
		margin: 0;
		padding-left: 18px;
		color: #516056;
	}

	.warning-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.warning-list span {
		border: 1px solid #d8ded4;
		border-radius: 999px;
		padding: 5px 10px;
		background: #f8faf8;
		color: #5d675f;
		font-size: 12px;
		font-weight: 700;
	}

	.warning-list span.active {
		border-color: #b46914;
		background: #fff2df;
		color: #8a4e08;
	}
</style>
