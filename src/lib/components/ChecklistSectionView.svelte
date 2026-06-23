<script lang="ts">
	import { resolve } from '$app/paths';
	import FactModal from '$lib/components/FactModal.svelte';
	import type { ChecklistSectionDetail, ChecklistSectionQuestion } from '$lib/types/checklists';

	let { data }: { data: ChecklistSectionDetail } = $props();

	type QuestionState = {
		responseValue: 'yes' | 'no' | 'na' | 'blank';
		comment: string;
		dueDate: string;
		saving: boolean;
	};

	const headingPrefix = $derived(
		data.checklistTitle === 'Grundvillkor' || data.checklistTitle.startsWith('Nya frågor') ? 'Mina' : 'Min'
	);

	function buildInitialQuestionState(source: ChecklistSectionDetail) {
		return Object.fromEntries(
			source.groups.flatMap((group) =>
				group.questions.map((question) => [
					question.id,
					{
						responseValue: question.answer.responseValue,
						comment: question.answer.comment,
						dueDate: question.answer.dueDate,
						saving: false
					}
				])
			)
		) as Record<number, QuestionState>;
	}

	function createInitialQuestionState() {
		return buildInitialQuestionState(data);
	}

	function closedFactModal() {
		return {
			open: false,
			title: '',
			bodyHtml: ''
		};
	}

	let factModal = $state(closedFactModal());
	let questionState = $state<Record<number, QuestionState>>(createInitialQuestionState());
	let selectedGroupNodeId = $state('');

	$effect(() => {
		questionState = createInitialQuestionState();
		selectedGroupNodeId = data.groups[0]?.nodeId ?? '';
	});

	const selectedGroup = $derived(
		data.groups.find((group) => group.nodeId === selectedGroupNodeId) ?? data.groups[0] ?? null
	);

	const totalQuestions = $derived(data.groups.reduce((sum, group) => sum + group.questions.length, 0));
	const completedQuestions = $derived(
		data.groups.reduce(
			(sum, group) =>
				sum +
				group.questions.filter((question) => questionState[question.id]?.responseValue !== 'blank').length,
			0
		)
	);
	const totalProgress = $derived(
		totalQuestions === 0 ? 0 : Math.round((completedQuestions / totalQuestions) * 100)
	);
	const firstFactNodeId = $derived(
		data.groups
			.flatMap((group) => group.questions)
			.find((question) => question.factNodeId)?.factNodeId ?? null
	);

	async function save(questionId: number) {
		questionState[questionId].saving = true;

		try {
			await fetch(`/api/answers/${questionId}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					responseValue: questionState[questionId].responseValue,
					comment: questionState[questionId].comment,
					dueDate: questionState[questionId].dueDate
				})
			});
		} finally {
			questionState[questionId].saving = false;
		}
	}

	async function openFact(nodeId: string) {
		const response = await fetch(`/api/facts/${nodeId}`);

		if (!response.ok) {
			return;
		}

		const fact = await response.json();
		factModal = {
			open: true,
			title: fact.title,
			bodyHtml: fact.bodyHtml
		};
	}

	function closeFact() {
		factModal.open = false;
	}

	function completedInGroup(group: { questions: ChecklistSectionQuestion[] }) {
		return group.questions.filter((question) => questionState[question.id].responseValue !== 'blank').length;
	}

	function hasNoAnswer(questions: ChecklistSectionQuestion[]) {
		return questions.some((question) => questionState[question.id].responseValue === 'no');
	}

	function shouldShowDetails(question: ChecklistSectionQuestion) {
		const state = questionState[question.id];
		return state.responseValue === 'no' || state.comment !== '' || state.dueDate !== '';
	}

	function isCompleted(group: { questions: ChecklistSectionQuestion[] }) {
		return completedInGroup(group) === group.questions.length && group.questions.length > 0;
	}

	function isActiveArea(section: { nodeId: string }) {
		return section.nodeId === data.section.nodeId;
	}

	function hasNewQuestion(group: { questions: ChecklistSectionQuestion[] }) {
		return group.questions.some((question) => question.newFlag);
	}

	function answerLabel(value: 'yes' | 'no' | 'na') {
		return value === 'yes' ? 'Ja' : value === 'no' ? 'Nej' : 'Ej akt.';
	}
</script>

<main class="checklist-section-page">
	<a class="back-link" href={resolve('/checklists/[checklistId]', { checklistId: data.checklistSlug })}>
		Tillbaka till översikten
	</a>

	<header class="page-header">
		<div class="hero-copy">
			<p class="eyebrow">{headingPrefix} {data.checklistTitle}</p>
			<h1>{data.section.prefix} {data.section.title}</h1>
			{#if data.section.description}
				<p class="lead">{data.section.description}</p>
			{/if}
		</div>

		<div class="progress-panel" aria-label={`Totalt ${totalProgress}%`}>
			<div class="progress-ring" style={`--progress: ${totalProgress * 3.6}deg`}>
				<div>
					<strong>{totalProgress}%</strong>
				</div>
			</div>
			<span>Totalt</span>
			<small>{completedQuestions} av {totalQuestions} frågor besvarade</small>
		</div>
	</header>

	<nav class="section-tabs" aria-label="Navigera i checklistan">
		<a class="tab" href={resolve('/checklists/[checklistId]', { checklistId: data.checklistSlug })}>Översikt</a>
		{#each data.sections as area (area.nodeId)}
			<a
				class="tab"
				class:active-tab={isActiveArea(area)}
				aria-current={isActiveArea(area) ? 'page' : undefined}
				href={resolve('/checklists/[checklistId]/sections/[sectionId]', {
					checklistId: data.checklistSlug,
					sectionId: area.nodeId
				})}
			>
				{area.title}
			</a>
		{/each}
	</nav>

	<section class="instruction-section">
		<div class="section-header">
			<p class="section-kicker">Instruktion</p>
			<h2>Instruktion</h2>
		</div>

		<div class="instruction-grid">
			<div class="instruction-copy">
				<p>Du får nu ett antal frågor om företagets verksamhet. Klicka Ja om du uppfyller regelkravet. Klicka Nej om du inte gör det.</p>
				<p>Klickar du Nej är det möjligt att skriva in egna kommentarer och åtgärder samt lägga in ett datum för när det bör vara utfört.</p>
				<p>
					Vill du veta mer om lagkravet klickar du på informationsikonen
					{#if firstFactNodeId}
						<button class="inline-info" type="button" aria-label="Visa information" onclick={() => openFact(firstFactNodeId)}>
							<span class="fa fa-info-circle" aria-hidden="true"></span>
						</button>
					{/if}
				</p>
				<p>Är frågan inte relevant klickar du på Ej akt.</p>
			</div>

			<div class="instruction-jump">
				{#if data.previousSection}
					<a
						class="jump-link"
						href={resolve('/checklists/[checklistId]/sections/[sectionId]', {
							checklistId: data.checklistSlug,
							sectionId: data.previousSection.nodeId
						})}
					>
						Föregående: {data.previousSection.title}
					</a>
				{/if}
				{#if data.nextSection}
					<a
						class="jump-link"
						href={resolve('/checklists/[checklistId]/sections/[sectionId]', {
							checklistId: data.checklistSlug,
							sectionId: data.nextSection.nodeId
						})}
					>
						Nästa: {data.nextSection.title}
					</a>
				{/if}
			</div>
		</div>
	</section>

	<div class="workspace-grid">
		<aside class="group-panel">
			<div class="group-surface">
				<h2>Välj punkt</h2>
				<div class="group-hint">Delmoment i det här området</div>

				<div class="group-list">
					{#each data.groups as group (group.nodeId)}
						<button
							type="button"
							class="group-item"
							class:active-group={selectedGroup?.nodeId === group.nodeId}
							onclick={() => (selectedGroupNodeId = group.nodeId)}
						>
							<div class="group-status">
								{#if hasNoAnswer(group.questions)}
									<span class="status-dot warning" aria-hidden="true"></span>
								{:else if isCompleted(group)}
									<span class="status-dot success" aria-hidden="true"></span>
								{:else}
									<span class="status-dot neutral" aria-hidden="true"></span>
								{/if}
							</div>
							<div class="group-copy">
								<strong>{group.prefix} {group.title}</strong>
								<div class="group-meta">
									<span>{completedInGroup(group)} / {group.questions.length} besvarade</span>
									{#if hasNewQuestion(group)}
										<span class="new-marker">Ny</span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		</aside>

		<section class="question-panel">
			{#if selectedGroup}
				<header class="question-header">
					<div>
						<h2>
							{selectedGroup.prefix} {selectedGroup.title}
							{#if hasNewQuestion(selectedGroup)}
								<span class="new-marker heading-marker">Ny</span>
							{/if}
							{#if selectedGroup.questions.some((question) => question.factNodeId)}
								<button
									class="header-info"
									type="button"
									aria-label={`Visa information för ${selectedGroup.prefix} ${selectedGroup.title}`}
									onclick={() =>
										openFact(
											selectedGroup.questions.find((question) => question.factNodeId)?.factNodeId ?? ''
										)}
								>
									<span class="fa fa-info-circle" aria-hidden="true"></span>
								</button>
							{/if}
						</h2>
						{#if selectedGroup.introText}
							<p>{selectedGroup.introText}</p>
						{/if}
					</div>
				</header>

				<div class="question-table-head" aria-hidden="true">
					<div></div>
					<div></div>
					<div>Ja</div>
					<div>Nej</div>
					<div>Ej akt.</div>
					<div></div>
				</div>

				<div class="question-list">
					{#each selectedGroup.questions as question (question.id)}
						<article
							class="question-row"
							class:needs-action={questionState[question.id].responseValue === 'no'}
							id={`question-${question.nodeId}`}
						>
							<div class="question-grid">
								<div class="question-prefix">{question.prefix}</div>
								<div class="question-content">
									<p class="question-text">
										{question.questionText}
										{#if question.newFlag}
											<span class="new-marker question-marker">Ny</span>
										{/if}
									</p>
								</div>

								{#each ['yes', 'no', 'na'] as value (value)}
									<label class="answer-cell">
										<input
											type="radio"
											name={`q-${question.id}`}
											value={value}
											aria-label={`${answerLabel(value as 'yes' | 'no' | 'na')} för ${question.prefix}`}
											bind:group={questionState[question.id].responseValue}
											onchange={() => save(question.id)}
										/>
									</label>
								{/each}

								<div class="question-info">
									{#if question.factNodeId}
										<button
											class="info-button"
											type="button"
											aria-label={`Visa information för ${question.prefix}`}
											onclick={() => openFact(question.factNodeId!)}
										>
											<span class="fa fa-info-circle" aria-hidden="true"></span>
										</button>
									{/if}
								</div>
							</div>

							{#if shouldShowDetails(question)}
								<div class="comment-panel">
									<label>
										<span>Kommentarer och åtgärdsförslag</span>
										<textarea rows="3" bind:value={questionState[question.id].comment}></textarea>
									</label>
									<div class="date-save">
										<label>
											<span>Åtgärdas senast datum</span>
											<input type="date" bind:value={questionState[question.id].dueDate} />
										</label>
										<button
											type="button"
											class="save-button"
											onclick={() => save(question.id)}
											disabled={questionState[question.id].saving}
										>
											{questionState[question.id].saving ? 'Sparar...' : 'Spara'}
										</button>
									</div>
								</div>
							{/if}
						</article>
					{/each}
				</div>
			{/if}
		</section>
	</div>

	<FactModal
		open={factModal.open}
		title={factModal.title}
		bodyHtml={factModal.bodyHtml}
		onClose={closeFact}
	/>
</main>

<style>
	.checklist-section-page {
		width: min(1240px, calc(100% - 48px));
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
		display: flex;
		justify-content: space-between;
		gap: 40px;
		align-items: start;
	}

	.hero-copy {
		max-width: 760px;
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
		font-size: clamp(2.4rem, 5vw, 4.1rem);
		line-height: 0.96;
		font-weight: 600;
		letter-spacing: -0.03em;
	}

	h2 {
		margin-top: 10px;
		font-size: clamp(1.65rem, 3vw, 2.3rem);
		line-height: 1.05;
		font-weight: 550;
	}

	.lead,
	.instruction-copy p,
	.question-header p,
	.question-text,
	.group-meta span,
	.comment-panel span {
		color: color-mix(in srgb, var(--color-ink) 78%, white);
	}

	.lead {
		max-width: 50rem;
		margin: 18px 0 0;
		font-size: 1.06rem;
		line-height: 1.72;
	}

	.progress-panel {
		display: grid;
		justify-items: center;
		gap: 10px;
		min-width: 170px;
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

	.tab.active-tab {
		border-color: var(--color-leaf);
		background: var(--color-leaf);
		color: var(--color-cream);
	}

	.instruction-section {
		margin-bottom: 34px;
	}

	.section-header {
		padding-bottom: 10px;
		border-bottom: 1px solid color-mix(in srgb, var(--color-leaf) 68%, white);
	}

	.instruction-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 30px;
		align-items: start;
		padding-top: 24px;
	}

	.instruction-copy {
		display: grid;
		gap: 12px;
		max-width: 54rem;
	}

	.instruction-copy p {
		margin: 0;
		font-size: 1.02rem;
		line-height: 1.72;
	}

	.inline-info,
	.header-info,
	.info-button {
		border: 0;
		background: transparent;
		color: var(--color-leaf);
		cursor: pointer;
	}

	.inline-info {
		padding: 0 0 0 6px;
		font-size: 1rem;
	}

	.instruction-jump {
		display: grid;
		gap: 10px;
		align-content: start;
	}

	.jump-link {
		display: inline-flex;
		align-items: center;
		min-height: 40px;
		padding: 0 16px;
		border: 1px solid color-mix(in srgb, var(--color-leaf) 18%, white);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.7);
		color: var(--color-leaf-2);
		font-size: 0.92rem;
		font-weight: 600;
		text-decoration: none;
	}

	.workspace-grid {
		display: grid;
		grid-template-columns: 320px minmax(0, 1fr);
		gap: 32px;
		align-items: start;
	}

	.group-panel {
		position: sticky;
		top: 120px;
	}

	.group-surface {
		border: 1px solid color-mix(in srgb, var(--color-line) 90%, white);
		border-radius: 1rem;
		background: rgb(255 255 255 / 0.7);
		overflow: hidden;
	}

	.group-surface h2 {
		padding: 18px 18px 0;
	}

	.group-hint {
		padding: 8px 18px 14px;
		color: var(--color-mute);
		font-size: 0.88rem;
	}

	.group-list {
		display: grid;
	}

	.group-item {
		display: grid;
		grid-template-columns: 16px minmax(0, 1fr);
		gap: 12px;
		width: 100%;
		padding: 14px 18px;
		border: 0;
		border-top: 1px solid color-mix(in srgb, var(--color-line) 88%, white);
		background: transparent;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.18s ease;
	}

	.group-item:hover {
		background: rgb(243 247 241 / 0.85);
	}

	.group-item.active-group {
		background: color-mix(in srgb, var(--color-leaf) 90%, white);
	}

	.group-item.active-group strong,
	.group-item.active-group .group-meta span,
	.group-item.active-group .new-marker {
		color: var(--color-cream);
	}

	.group-item.active-group .new-marker {
		background: rgb(255 255 255 / 0.2);
	}

	.group-status {
		padding-top: 4px;
	}

	.status-dot {
		display: block;
		width: 10px;
		height: 10px;
		border-radius: 999px;
	}

	.status-dot.success {
		background: #0f8a60;
	}

	.status-dot.warning {
		background: #d98d00;
	}

	.status-dot.neutral {
		background: #c7d1c8;
	}

	.group-copy strong {
		display: block;
		font-size: 1rem;
		line-height: 1.32;
	}

	.group-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 8px;
	}

	.group-meta span,
	.new-marker {
		font-size: 0.77rem;
		font-weight: 700;
	}

	.new-marker {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 22px;
		padding: 0 8px;
		border-radius: 999px;
		background: rgb(232 245 239);
		color: var(--color-leaf);
		text-transform: uppercase;
	}

	.question-header p {
		max-width: 54rem;
		margin: 14px 0 0;
		font-size: 1rem;
		line-height: 1.72;
	}

	.heading-marker {
		margin-left: 10px;
		vertical-align: middle;
	}

	.header-info {
		padding-left: 6px;
		font-size: 1rem;
	}

	.question-table-head {
		display: grid;
		grid-template-columns: 86px minmax(0, 1fr) 44px 44px 64px 34px;
		gap: 10px;
		align-items: end;
		margin-top: 26px;
		padding-bottom: 8px;
		border-bottom: 1px solid color-mix(in srgb, var(--color-leaf) 68%, white);
		color: var(--color-bark);
		font-size: 0.86rem;
		font-weight: 700;
		text-align: center;
	}

	.question-list {
		display: grid;
	}

	.question-row {
		padding: 18px 0 20px;
		border-bottom: 1px solid color-mix(in srgb, var(--color-line) 85%, white);
	}

	.question-row.needs-action {
		background: linear-gradient(90deg, rgb(250 244 233 / 0.45), transparent 50%);
	}

	.question-grid {
		display: grid;
		grid-template-columns: 86px minmax(0, 1fr) 44px 44px 64px 34px;
		gap: 10px;
		align-items: start;
	}

	.question-prefix {
		color: var(--color-leaf);
		font-family: var(--font-display);
		font-size: 1.45rem;
		font-weight: 600;
		line-height: 1;
	}

	.question-text {
		margin: 0;
		font-size: 1.02rem;
		line-height: 1.72;
	}

	.question-marker {
		margin-left: 10px;
		vertical-align: middle;
	}

	.answer-cell,
	.question-info {
		display: grid;
		place-items: center;
		padding-top: 2px;
	}

	.answer-cell input {
		width: 18px;
		height: 18px;
		margin: 0;
		accent-color: var(--color-leaf);
	}

	.info-button {
		font-size: 1.02rem;
	}

	.comment-panel {
		display: grid;
		gap: 12px;
		margin: 16px 0 0 86px;
		padding: 16px 0 0;
		border-top: 1px dashed color-mix(in srgb, var(--color-line) 85%, white);
	}

	.comment-panel label {
		display: grid;
		gap: 6px;
	}

	.comment-panel span {
		font-size: 0.86rem;
		font-weight: 700;
	}

	textarea,
	input[type='date'] {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid color-mix(in srgb, var(--color-line) 85%, white);
		border-radius: 0.8rem;
		padding: 12px 14px;
		background: rgb(255 255 255 / 0.9);
		color: var(--color-ink);
		font: inherit;
	}

	textarea {
		resize: vertical;
		min-height: 96px;
	}

	.date-save {
		display: grid;
		grid-template-columns: minmax(220px, 1fr) auto;
		gap: 12px;
		align-items: end;
	}

	.save-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 46px;
		padding: 0 20px;
		border: 0;
		border-radius: 999px;
		background: var(--color-leaf);
		color: var(--color-cream);
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			background-color 0.18s ease;
	}

	.save-button:hover {
		transform: translateY(-1px);
		background: var(--color-leaf-2);
	}

	.save-button:disabled {
		cursor: progress;
		opacity: 0.8;
	}

	@media (max-width: 1100px) {
		.workspace-grid {
			grid-template-columns: 1fr;
		}

		.group-panel {
			position: static;
		}
	}

	@media (max-width: 860px) {
		.page-header,
		.instruction-grid {
			grid-template-columns: 1fr;
			display: grid;
		}

		.question-table-head {
			display: none;
		}

		.question-grid {
			grid-template-columns: 1fr;
			gap: 14px;
		}

		.question-prefix {
			font-size: 1.25rem;
		}

		.answer-cell,
		.question-info {
			place-items: start;
			padding-top: 0;
		}

		.comment-panel {
			margin-left: 0;
		}
	}

	@media (max-width: 760px) {
		.checklist-section-page {
			width: min(100% - 28px, 1240px);
			padding: 28px 0 48px;
		}

		.section-tabs {
			margin-bottom: 32px;
		}

		.date-save {
			grid-template-columns: 1fr;
		}
	}
</style>
