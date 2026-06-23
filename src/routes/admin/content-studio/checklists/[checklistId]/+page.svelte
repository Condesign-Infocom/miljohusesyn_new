<svelte:head>
	<title>Innehållsredaktion - Strukturredigerare</title>
</svelte:head>

<script lang="ts">
	import ContentStudioNav from '$lib/components/admin/ContentStudioNav.svelte';
	import ChecklistNodeEditor from '$lib/components/admin/ChecklistNodeEditor.svelte';
	import ChecklistStructureTree from '$lib/components/admin/ChecklistStructureTree.svelte';
	import QuestionFactWorkspace from '$lib/components/admin/QuestionFactWorkspace.svelte';
	import { goto } from '$app/navigation';

	type ChecklistValidation = {
		duplicateNodeIds: Array<{
			nodeId: string;
			occurrences: number;
			rows: Array<{ checklistId: string; kind: 'group' | 'question'; title: string }>;
		}>;
		missingFactLinks: Array<{
			checklistId: string;
			groupTitle: string;
			questionId: string;
			nodeId: string;
			questionText: string;
		}>;
		unresolvedFactNodeIds: Array<{
			checklistId: string;
			questionId: string;
			nodeId: string;
			questionText: string;
			linkStatuses: string[];
		}>;
		emptyQuestionTexts: Array<{
			checklistId: string;
			groupTitle: string;
			questionId: string;
			nodeId: string;
		}>;
	};

	type ChecklistGroup = {
		id: string;
		sourceRowId: string;
		nodeId: string;
		title: string;
		introText: string;
		sortOrder: number;
		profiles: Array<{ profileKey: string; profileName: string }>;
		factLinks: Array<{
			id: string;
			factRowId: string;
			factId: string | null;
			title: string;
			nodeId: string;
			linkSource: string;
			linkStatus: string;
		}>;
		questions: Array<{
			id: string;
			sourceRowId: string;
			nodeId: string;
			questionText: string;
			sortOrder: number;
			flags: {
				cc: boolean;
				ccExtra: boolean;
				base: boolean;
				annualQuestion: boolean;
				newFlag: boolean;
				recommended: boolean;
			};
			profiles: Array<{ profileKey: string; profileName: string }>;
			factLinks: Array<{
				id: string;
				factRowId: string;
				factId: string | null;
				title: string;
				nodeId: string;
				linkSource: string;
				linkStatus: string;
			}>;
		}>;
	};

	let {
		data,
		form
	}: {
		data: {
			checklist: {
				id: string;
				sourceRowId: string;
				snapshotId: string;
				checklistId: string;
				qaType: string;
				title: string;
			};
			checklistList: Array<{
				id: string;
				title: string;
			}>;
			groups: ChecklistGroup[];
			selectedNodeId: string | null;
			selectedFactId: string | null;
			editFactModal: boolean;
			successMessage: string | null;
			validation: ChecklistValidation;
			factWorkspace: {
				node: {
					kind: 'group' | 'question';
					id: string;
					nodeId: string;
					title: string;
					summaryText: string;
					groupId: string | null;
					groupTitle: string | null;
				};
				question: {
					id: string;
					nodeId: string;
					questionText: string;
					groupId: string;
					groupTitle: string;
				} | null;
				linkedFacts: Array<{
					factRowId: string;
					factId: string | null;
					title: string;
					nodeId: string | null;
					excerpt: string;
					usageCount: number;
				}>;
				selectedFact: {
					factRowId: string;
					factId: string | null;
					title: string;
					nodeId: string | null;
					excerpt: string;
					usageCount: number;
				} | null;
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
				availableFacts: Array<{
					factRowId: string;
					factId: string | null;
					title: string;
					nodeId: string | null;
					excerpt: string;
					usageCount: number;
					isLinked: boolean;
				}>;
			} | null;
		};
		form?: {
			errors?: Record<string, string>;
			factFormMode?: 'create' | 'edit';
			createFactValues?: {
				title: string;
				bodyHtml: string;
			};
			factWorkspace?: {
				node: {
					kind: 'group' | 'question';
					id: string;
					nodeId: string;
					title: string;
					summaryText: string;
					groupId: string | null;
					groupTitle: string | null;
				};
				question: {
					id: string;
					nodeId: string;
					questionText: string;
					groupId: string;
					groupTitle: string;
				} | null;
				linkedFacts: Array<{
					factRowId: string;
					factId: string | null;
					title: string;
					nodeId: string | null;
					excerpt: string;
					usageCount: number;
				}>;
				selectedFact: {
					factRowId: string;
					factId: string | null;
					title: string;
					nodeId: string | null;
					excerpt: string;
					usageCount: number;
				} | null;
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
				availableFacts: Array<{
					factRowId: string;
					factId: string | null;
					title: string;
					nodeId: string | null;
					excerpt: string;
					usageCount: number;
					isLinked: boolean;
				}>;
			};
		};
	} = $props();

	let selectedNodeId = $state<string | null>(null);
	let syncingSelection = $state(false);

	const totalQuestionCount = $derived(
		data.groups.reduce((count, group) => count + group.questions.length, 0)
	);
	const selectableNodeIds = $derived(
		data.groups.flatMap((group) => [group.id, ...group.questions.map((question) => question.id)])
	);

	$effect(() => {
		if (selectedNodeId && selectableNodeIds.includes(selectedNodeId)) {
			return;
		}

		selectedNodeId = data.selectedNodeId;
	});

	$effect(() => {
		if (!selectedNodeId || selectedNodeId === data.selectedNodeId || syncingSelection) {
			return;
		}

		syncingSelection = true;
		const params = new URLSearchParams();
		params.set('selected', selectedNodeId);

		void goto(`?${params.toString()}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		}).finally(() => {
			syncingSelection = false;
		});
	});
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Innehållsredaktion</p>
			<h1>Strukturredigerare</h1>
			<p class="lead">Arbeta med grupper och frågor i <strong>{data.checklist.title}</strong>.</p>
			<p class="meta-line">{data.checklist.checklistId} · {data.checklist.qaType}</p>
		</div>
	</header>

	{#if data.successMessage}
		<p class="flash-message">{data.successMessage}</p>
	{/if}
	{#if form?.errors?.form}
		<p class="flash-message error">{form.errors.form}</p>
	{/if}

	<ContentStudioNav active="checklists" />

	<section class="overview-panel">
		<div class="overview-card">
			<span>Grupper</span>
			<strong>{data.groups.length}</strong>
		</div>
		<div class="overview-card">
			<span>Frågor</span>
			<strong>{totalQuestionCount}</strong>
		</div>
		<div class="overview-card">
			<span>Frågor utan fakta</span>
			<strong>{data.validation.missingFactLinks.length}</strong>
		</div>
	</section>

	<section class="checklist-switcher" aria-label="Byt checklista">
		<div class="checklist-switcher-list">
			{#each data.checklistList as item (item.id)}
				<a
					href={`/admin/content-studio/checklists/${item.id}`}
					aria-current={item.id === data.checklist.id ? 'page' : undefined}
				>
					{item.title}
				</a>
			{/each}
		</div>
		<a class="secondary-action pdf-action" href={`/admin/content-studio/checklists/${data.checklist.id}/qa-report?format=pdf`}>
			<span class="pdf-icon" aria-hidden="true">PDF</span>
			<span>Ladda ned QA-PDF</span>
		</a>
	</section>

	<div class="editor-layout">
		<ChecklistStructureTree
			groups={data.groups}
			checklistTitle={data.checklist.title}
			bind:selectedNodeId
		/>
		<ChecklistNodeEditor groups={data.groups} {selectedNodeId} />
		<QuestionFactWorkspace
			workspace={form?.factWorkspace ?? data.factWorkspace}
			checklistId={data.checklist.id}
			{selectedNodeId}
			selectedFactId={data.selectedFactId}
			openEditFactModal={data.editFactModal}
			openCreateFactModal={form?.factFormMode === 'create'}
			createFactValues={form?.createFactValues}
			factFormMode={form?.factFormMode}
			errors={form?.errors}
		/>
	</div>
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
		display: flex;
		justify-content: space-between;
		gap: 20px;
		align-items: start;
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

	h1 {
		margin: 0;
		font-size: 34px;
		font-weight: 500;
	}

	.lead {
		max-width: 76ch;
		margin: 12px 0 0;
		line-height: 1.5;
	}

	.meta-line {
		margin: 10px 0 0;
		color: #516056;
		font-size: 14px;
	}

	.flash-message {
		margin: 18px 0 0;
		border: 1px solid #90c3a5;
		border-radius: 6px;
		background: #eef7f1;
		padding: 12px 14px;
		color: #1f5134;
		font-weight: 700;
	}

	.flash-message.error {
		border-color: #e5bcc2;
		background: #faecee;
		color: #8a3040;
	}




	.overview-panel {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		margin-top: 18px;
	}

	.overview-card {
		border: 1px solid #d1d7ce;
		border-radius: 6px;
		background: #ffffff;
		padding: 18px;
	}

	.overview-card span {
		display: block;
		color: #5d675f;
		font-size: 13px;
	}

	.overview-card strong {
		display: block;
		margin-top: 6px;
		font-size: 32px;
		color: #14261c;
	}

	.checklist-switcher {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		margin-top: 14px;
		padding-top: 2px;
	}

	.checklist-switcher-list {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.checklist-switcher a {
		border: 1px solid #d7ddd8;
		border-radius: 999px;
		padding: 7px 13px;
		background: rgba(255, 255, 255, 0.7);
		color: #5f6b63;
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
	}

	.checklist-switcher a[aria-current='page'] {
		border-color: #007a5b;
		background: #eef7f1;
		color: #007a5b;
		box-shadow: inset 0 0 0 1px rgba(0, 122, 91, 0.08);
	}

	.secondary-action {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		border: 1px solid #c9d3cc;
		border-radius: 999px;
		padding: 8px 14px;
		background: #ffffff;
		color: #1f3a2d;
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
	}

	.pdf-action {
		margin-left: auto;
	}

	.pdf-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 34px;
		height: 26px;
		border-radius: 999px;
		background: #f4e6e4;
		color: #8a3040;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.04em;
	}

	@media (max-width: 720px) {
		.page-header {
			flex-direction: column;
		}

		.overview-panel {
			grid-template-columns: 1fr;
		}

		.checklist-switcher {
			align-items: stretch;
			flex-direction: column;
		}

		.pdf-action {
			margin-left: 0;
			align-self: flex-start;
		}
	}

	.editor-layout {
		display: grid;
		grid-template-columns: 448px minmax(520px, 1fr) minmax(360px, 0.78fr);
		gap: 18px;
		align-items: start;
		margin-top: 14px;
	}

	@media (max-width: 1280px) {
		.editor-layout {
			grid-template-columns: 430px minmax(0, 1fr);
		}
	}

	@media (max-width: 960px) {
		.editor-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
