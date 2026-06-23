<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { tick } from 'svelte';

	type ChecklistGroup = {
		id: string;
		title: string;
		nodeId: string;
		questions: Array<{
			id: string;
			nodeId: string;
			questionText: string;
			factLinks: Array<unknown>;
		}>;
	};

	type DragState =
		| { kind: 'group'; id: string }
		| { kind: 'question'; groupId: string; id: string }
		| null;

	type DropTarget =
		| { kind: 'group'; id: string; position: 'before' | 'after' }
		| { kind: 'question'; groupId: string; id: string; position: 'before' | 'after' }
		| null;

	let {
		groups,
		checklistTitle,
		selectedNodeId = $bindable<string | null>()
	}: {
		groups: ChecklistGroup[];
		checklistTitle: string;
		selectedNodeId?: string | null;
	} = $props();

	let expandedGroupIds = $state<string[]>([]);
	let openCreateMenuId = $state<string | null>(null);
	let dragState = $state<DragState>(null);
	let dropTarget = $state<DropTarget>(null);
	let pendingGroupIds = $state<string[]>([]);
	let pendingQuestionGroupId = $state('');
	let pendingQuestionIds = $state<string[]>([]);
	let pendingSelectedNodeId = $state('');
	let groupReorderForm = $state<HTMLFormElement | null>(null);
	let questionReorderForm = $state<HTMLFormElement | null>(null);
	let orderedGroups = $derived(
		groups.map((group) => ({
			...group,
			questions: [...group.questions]
		}))
	);

	const quietReorder: SubmitFunction = () => {
		return async ({ result }) => {
			if (result.type === 'failure' || result.type === 'error') {
				await applyAction(result);
			}
		};
	};

	const selectedQuestionGroupId = $derived.by(() => {
		for (const group of orderedGroups) {
			if (group.questions.some((question) => question.id === selectedNodeId)) {
				return group.id;
			}
		}

		return null;
	});

	function selectNode(nodeId: string) {
		selectedNodeId = nodeId;
		openCreateMenuId = null;
	}

	function toggleGroup(groupId: string) {
		if (expandedGroupIds.includes(groupId)) {
			expandedGroupIds = expandedGroupIds.filter((id) => id !== groupId);
			return;
		}

		expandedGroupIds = [...expandedGroupIds, groupId];
	}

	function isExpanded(groupId: string) {
		return expandedGroupIds.includes(groupId) || selectedQuestionGroupId === groupId;
	}

	function getGroupIndex(groupId: string) {
		return orderedGroups.findIndex((group) => group.id === groupId);
	}

	function getQuestionIndex(groupId: string, questionId: string) {
		const group = orderedGroups.find((item) => item.id === groupId);
		return group?.questions.findIndex((question) => question.id === questionId) ?? -1;
	}

	function toggleCreateMenu(menuId: string) {
		openCreateMenuId = openCreateMenuId === menuId ? null : menuId;
	}

	function startGroupDrag(event: DragEvent, groupId: string) {
		dragState = { kind: 'group', id: groupId };
		dropTarget = null;
		event.dataTransfer?.setData('text/plain', groupId);
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function startQuestionDrag(event: DragEvent, groupId: string, questionId: string) {
		dragState = { kind: 'question', groupId, id: questionId };
		dropTarget = null;
		event.dataTransfer?.setData('text/plain', questionId);
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function dragPosition(event: DragEvent) {
		const target = event.currentTarget as HTMLElement;
		const bounds = target.getBoundingClientRect();
		return event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
	}

	function handleGroupDragOver(event: DragEvent, groupId: string) {
		if (!dragState || dragState.kind !== 'group') {
			return;
		}

		event.preventDefault();
		dropTarget = { kind: 'group', id: groupId, position: dragPosition(event) };
	}

	function handleQuestionDragOver(event: DragEvent, groupId: string, questionId: string) {
		if (!dragState || dragState.kind !== 'question' || dragState.groupId !== groupId) {
			return;
		}

		event.preventDefault();
		dropTarget = { kind: 'question', groupId, id: questionId, position: dragPosition(event) };
	}

	function clearDragState() {
		dragState = null;
		dropTarget = null;
	}

	function reorderIds(ids: string[], draggedId: string, targetId: string, position: 'before' | 'after') {
		if (draggedId === targetId) {
			return ids;
		}

		const withoutDragged = ids.filter((id) => id !== draggedId);
		const targetIndex = withoutDragged.indexOf(targetId);
		if (targetIndex < 0) {
			return ids;
		}

		const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
		return [
			...withoutDragged.slice(0, insertIndex),
			draggedId,
			...withoutDragged.slice(insertIndex)
		];
	}

	function hasOrderChanged(before: string[], after: string[]) {
		return before.length !== after.length || before.some((id, index) => id !== after[index]);
	}

	async function dropGroup(event: DragEvent, targetGroupId: string) {
		if (!dragState || dragState.kind !== 'group') {
			return;
		}

		event.preventDefault();
		const position =
			dropTarget?.kind === 'group' && dropTarget.id === targetGroupId ?
				dropTarget.position
			:	dragPosition(event);
		const currentOrder = orderedGroups.map((group) => group.id);
		const nextOrder = reorderIds(currentOrder, dragState.id, targetGroupId, position);
		const draggedId = dragState.id;
		clearDragState();

		if (!hasOrderChanged(currentOrder, nextOrder)) {
			return;
		}

		const groupsById = new Map(orderedGroups.map((group) => [group.id, group]));
		orderedGroups = nextOrder
			.map((groupId) => groupsById.get(groupId))
			.filter((group): group is ChecklistGroup => Boolean(group));
		pendingGroupIds = nextOrder;
		pendingSelectedNodeId = draggedId;
		await tick();
		groupReorderForm?.requestSubmit();
	}

	async function dropQuestion(event: DragEvent, groupId: string, targetQuestionId: string) {
		if (!dragState || dragState.kind !== 'question' || dragState.groupId !== groupId) {
			return;
		}

		event.preventDefault();
		const group = orderedGroups.find((item) => item.id === groupId);
		if (!group) {
			clearDragState();
			return;
		}

		const position =
			dropTarget?.kind === 'question' && dropTarget.id === targetQuestionId ?
				dropTarget.position
			:	dragPosition(event);
		const currentOrder = group.questions.map((question) => question.id);
		const nextOrder = reorderIds(currentOrder, dragState.id, targetQuestionId, position);
		const draggedId = dragState.id;
		clearDragState();

		if (!hasOrderChanged(currentOrder, nextOrder)) {
			return;
		}

		const questionsById = new Map(group.questions.map((question) => [question.id, question]));
		const reorderedQuestions = nextOrder
			.map((questionId) => questionsById.get(questionId))
			.filter((question): question is ChecklistGroup['questions'][number] => Boolean(question));
		orderedGroups = orderedGroups.map((item) =>
			item.id === groupId ? { ...item, questions: reorderedQuestions } : item
		);
		pendingQuestionGroupId = groupId;
		pendingQuestionIds = nextOrder;
		pendingSelectedNodeId = draggedId;
		await tick();
		questionReorderForm?.requestSubmit();
	}

	function isGroupDropTarget(groupId: string, position: 'before' | 'after') {
		return dropTarget?.kind === 'group' && dropTarget.id === groupId && dropTarget.position === position;
	}

	function isQuestionDropTarget(questionId: string, position: 'before' | 'after') {
		return (
			dropTarget?.kind === 'question' &&
			dropTarget.id === questionId &&
			dropTarget.position === position
		);
	}
</script>

<section class="panel">
	<div class="panel-header">
		<h2>{checklistTitle}</h2>
	</div>

	{#if groups.length === 0}
		<p class="empty-state">Checklistan har inga grupper ännu.</p>
	{:else}
		<form
			method="POST"
			action="?/reorderGroups"
			class="hidden-reorder-form"
			aria-hidden="true"
			bind:this={groupReorderForm}
			use:enhance={quietReorder}
		>
			<input type="hidden" name="selectedNodeId" value={pendingSelectedNodeId} />
			{#each pendingGroupIds as groupId (groupId)}
				<input type="hidden" name="groupIds" value={groupId} />
			{/each}
		</form>
		<form
			method="POST"
			action="?/reorderQuestions"
			class="hidden-reorder-form"
			aria-hidden="true"
			bind:this={questionReorderForm}
			use:enhance={quietReorder}
		>
			<input type="hidden" name="selectedNodeId" value={pendingSelectedNodeId} />
			<input type="hidden" name="groupId" value={pendingQuestionGroupId} />
			{#each pendingQuestionIds as questionId (questionId)}
				<input type="hidden" name="questionIds" value={questionId} />
			{/each}
		</form>

		<ul class="tree-list">
			{#each orderedGroups as group (group.id)}
				<li
					class="tree-group"
					class:expanded={isExpanded(group.id)}
					class:dragging={dragState?.kind === 'group' && dragState.id === group.id}
					class:drop-before={isGroupDropTarget(group.id, 'before')}
					class:drop-after={isGroupDropTarget(group.id, 'after')}
					data-testid={`group-row-${getGroupIndex(group.id)}`}
					ondragover={(event) => handleGroupDragOver(event, group.id)}
					ondrop={(event) => dropGroup(event, group.id)}
					ondragend={clearDragState}
				>
					<div class="group-row">
						<button
							type="button"
							class="drag-handle"
							draggable="true"
							aria-label={`Dra för att flytta gruppen ${group.title}`}
							title="Dra för att flytta"
							ondragstart={(event) => startGroupDrag(event, group.id)}
							ondragend={clearDragState}
						>
							<span aria-hidden="true">↕</span>
						</button>
						<button
							type="button"
							class="group-button"
							class:selected={selectedNodeId === group.id}
							onclick={() => selectNode(group.id)}
						>
							<span>{group.title}</span>
							<small>{group.questions.length} frågor</small>
						</button>
						<div class="row-actions">
							<div class="menu-shell">
								<button
									type="button"
									class="menu-button"
									aria-expanded={openCreateMenuId === `group-create-${group.id}`}
									aria-haspopup="menu"
									aria-label={`Skapa nära ${group.title}`}
									onclick={() => toggleCreateMenu(`group-create-${group.id}`)}
								>
									+
								</button>

								{#if openCreateMenuId === `group-create-${group.id}`}
									<div class="menu-panel create-menu" role="menu">
										<form method="POST" action="?/createGroup">
											<input type="hidden" name="groupId" value={group.id} />
											<input type="hidden" name="position" value="after" />
											<button type="submit" class="menu-item">Ny grupp efter</button>
										</form>
										<form method="POST" action="?/createQuestion">
											<input type="hidden" name="groupId" value={group.id} />
											<input type="hidden" name="position" value="end" />
											<button type="submit" class="menu-item">Ny fråga i grupp</button>
										</form>
									</div>
								{/if}
							</div>

							{#if group.questions.length > 0}
								<button
									type="button"
									class="toggle-button"
									aria-expanded={isExpanded(group.id)}
									aria-label={isExpanded(group.id) ? `Dölj frågor för ${group.title}` : `Visa frågor för ${group.title}`}
									onclick={() => toggleGroup(group.id)}
								>
									<span class="toggle-chevron" aria-hidden="true">
										{isExpanded(group.id) ? '▾' : '▸'}
									</span>
								</button>
							{/if}
						</div>
					</div>

					{#if group.questions.length > 0 && isExpanded(group.id)}
						<ul class="question-list">
							{#each group.questions as question (question.id)}
								<li
									class:dragging={dragState?.kind === 'question' && dragState.id === question.id}
									class:drop-before={isQuestionDropTarget(question.id, 'before')}
									class:drop-after={isQuestionDropTarget(question.id, 'after')}
									data-testid={`question-row-${getGroupIndex(group.id)}-${getQuestionIndex(group.id, question.id)}`}
									ondragover={(event) => handleQuestionDragOver(event, group.id, question.id)}
									ondrop={(event) => dropQuestion(event, group.id, question.id)}
									ondragend={clearDragState}
								>
									<div class="question-row">
										<button
											type="button"
											class="drag-handle compact"
											draggable="true"
											aria-label={`Dra för att flytta frågan ${question.questionText}`}
											title="Dra för att flytta"
											ondragstart={(event) => startQuestionDrag(event, group.id, question.id)}
											ondragend={clearDragState}
										>
											<span aria-hidden="true">↕</span>
										</button>
										<button
											type="button"
											class="question-button"
											class:selected={selectedNodeId === question.id}
											onclick={() => selectNode(question.id)}
										>
											<span>{question.questionText}</span>
											<small>{question.factLinks.length} fakta</small>
										</button>
										<div class="row-actions row-actions-compact">
											<div class="menu-shell">
												<button
													type="button"
													class="menu-button compact"
													aria-expanded={openCreateMenuId === `question-create-${question.id}`}
													aria-haspopup="menu"
													aria-label={`Skapa nära frågan ${question.questionText}`}
													onclick={() => toggleCreateMenu(`question-create-${question.id}`)}
												>
													+
												</button>

												{#if openCreateMenuId === `question-create-${question.id}`}
													<div class="menu-panel create-menu" role="menu">
														<form method="POST" action="?/createQuestion">
															<input type="hidden" name="groupId" value={group.id} />
															<input type="hidden" name="questionId" value={question.id} />
															<input type="hidden" name="position" value="after" />
															<button type="submit" class="menu-item">Ny fråga efter</button>
														</form>
													</div>
												{/if}
											</div>
										</div>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.panel {
		border: 1px solid #d1d7ce;
		border-radius: 6px;
		background: #ffffff;
		padding: 18px;
	}

	.panel-header {
		display: grid;
		gap: 12px;
	}

	.hidden-reorder-form {
		display: none;
	}

	h2 {
		margin: 0;
		font-size: 28px;
	}

	.tree-list,
	.question-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.tree-list {
		display: grid;
		gap: 14px;
		margin-top: 16px;
	}

	.tree-group {
		position: relative;
		border-radius: 0;
		background: transparent;
		padding: 4px 0 0 0;
	}

	.tree-group.expanded {
		background: transparent;
	}

	.group-row {
		display: grid;
		grid-template-columns: 26px minmax(0, 1fr) auto;
		gap: 10px;
		align-items: center;
		padding: 0 4px 0 0;
	}

	.question-row {
		display: grid;
		grid-template-columns: 24px minmax(0, 1fr) auto;
		gap: 8px;
		align-items: start;
	}

	.question-list {
		display: grid;
		gap: 6px;
		margin-top: 10px;
		padding: 8px 0 8px 18px;
		position: relative;
	}

	.question-list li {
		position: relative;
	}

	.group-button,
	.question-button {
		width: 100%;
		text-align: left;
		border: 1px solid rgba(169, 183, 171, 0.7);
		cursor: pointer;
		transition:
			background 140ms ease,
			border-color 140ms ease,
			transform 140ms ease,
			box-shadow 140ms ease;
	}

	.group-button {
		border: 0;
		border-radius: 0;
		background: transparent;
		padding: 6px 4px 8px 4px;
		box-shadow: none;
	}

	.question-button {
		position: relative;
		border-width: 1px 1px 1px 0;
		border-color: transparent transparent transparent #d7ddd5;
		border-radius: 0 10px 10px 0;
		background: transparent;
		padding: 10px 12px 10px 16px;
	}

	.question-button::before {
		content: '';
		position: absolute;
		left: -14px;
		top: 50%;
		width: 10px;
		height: 1px;
		background: #d7ddd5;
		transform: translateY(-50%);
	}

	.question-list::before {
		content: '';
		position: absolute;
		left: 4px;
		top: 2px;
		bottom: 10px;
		width: 1px;
		background: linear-gradient(180deg, #d7ddd5 0%, rgba(215, 221, 213, 0.15) 100%);
	}

	.toggle-button {
		width: 34px;
		height: 34px;
		border: 1px solid #d9dfd7;
		border-radius: 999px;
		background: #f5f7f4;
		color: #445248;
		font: inherit;
		font-size: 16px;
		line-height: 1;
		cursor: pointer;
	}

	.toggle-chevron {
		display: inline-block;
		transform: translateX(1px);
	}

	.drag-handle {
		width: 26px;
		height: 34px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: #7c8981;
		font: inherit;
		font-size: 15px;
		line-height: 1;
		cursor: grab;
	}

	.drag-handle.compact {
		width: 24px;
		height: 34px;
		margin-top: 8px;
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.drag-handle:hover,
	.drag-handle:focus-visible {
		background: #eef7f1;
		color: #00754c;
		outline: none;
	}

	.tree-group.dragging,
	.question-list li.dragging {
		opacity: 0.52;
	}

	.tree-group.drop-before::before,
	.tree-group.drop-after::after,
	.question-list li.drop-before::before,
	.question-list li.drop-after::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		border-radius: 999px;
		background: #00754c;
		box-shadow: 0 0 0 2px rgba(0, 117, 76, 0.12);
	}

	.tree-group.drop-before::before,
	.question-list li.drop-before::before {
		top: -4px;
	}

	.tree-group.drop-after::after,
	.question-list li.drop-after::after {
		bottom: -4px;
	}

	.row-actions {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		position: relative;
	}

	.row-actions-compact {
		padding-top: 8px;
	}

	.menu-shell {
		position: relative;
	}

	.menu-button {
		width: 34px;
		height: 34px;
		border: 1px solid #d9dfd7;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.85);
		color: #445248;
		font: inherit;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
	}

	.menu-button.compact {
		width: 30px;
		height: 30px;
		font-size: 18px;
	}

	.menu-panel {
		position: absolute;
		right: 0;
		top: calc(100% + 6px);
		z-index: 10;
		min-width: 170px;
		border: 1px solid #d1d7ce;
		border-radius: 10px;
		background: #ffffff;
		box-shadow: 0 16px 28px rgba(24, 41, 31, 0.12);
		padding: 8px;
		display: grid;
		gap: 6px;
		max-height: min(420px, 70vh);
		overflow: auto;
	}

	.create-menu {
		min-width: 190px;
	}

	.menu-panel form {
		margin: 0;
	}

	.menu-item {
		width: 100%;
		border: 0;
		border-radius: 8px;
		background: transparent;
		padding: 9px 10px;
		color: #1f3a2d;
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		text-align: left;
		cursor: pointer;
	}

	.menu-item:hover {
		background: #f2f7f3;
	}

	.group-button span,
	.group-button small,
	.question-button span,
	.question-button small {
		display: block;
	}

	.group-button span,
	.question-button span {
		font-weight: 700;
		color: #1f3a2d;
	}

	.group-button span {
		font-size: 16px;
		line-height: 1.25;
	}

	.question-button span {
		font-size: 14px;
		line-height: 1.3;
	}

	.group-button small,
	.question-button small {
		margin-top: 4px;
		color: #5d675f;
		font-size: 12px;
	}

	.question-button.selected {
		border-color: #00754c;
		background: #eef7f1;
		box-shadow: 0 0 0 2px rgba(0, 117, 76, 0.1);
	}

	.group-button.selected span {
		color: #00754c;
	}

	.group-button:hover,
	.question-button:hover,
	.toggle-button:hover,
	.menu-button:hover {
		border-color: #95b8a1;
		background: #f7fbf8;
	}

	.question-button:hover {
		transform: translateX(1px);
	}

	.group-button:hover {
		background: transparent;
		box-shadow: inset 0 -1px 0 #d9e0d8;
	}

	.empty-state {
		margin: 16px 0 0;
		color: #5d675f;
	}
</style>
