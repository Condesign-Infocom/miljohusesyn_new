<svelte:head>
	<title>Innehållsredaktion - Redigera fakta</title>
</svelte:head>

<script lang="ts">
	import ContentStudioNav from '$lib/components/admin/ContentStudioNav.svelte';
	import FactEditorForm from '$lib/components/admin/FactEditorForm.svelte';

	type FactEditorData = {
		latestSnapshot: { id: string; sourceLabel: string } | null;
		item: {
			id: string;
			factId: string | null;
			nodeId: string | null;
			title: string;
			sourceFile: string;
		} | null;
		draft: {
			id: string | null;
			status: string;
			reviewStatus: string | null;
			validationStatus: string;
			updatedAt: string | null;
			title: string;
			bodyHtml: string;
			nodeIds: string[];
		} | null;
		linkOptions: Array<{
			id: string;
			linkNodeId: string;
			legacyNodeId: string;
			checklistId: string;
			checklistTitle: string;
			groupId: string;
			groupTitle: string;
			questionId: string;
			questionText: string;
			selected: boolean;
		}>;
		unresolvedNodeIds: string[];
	};

	type FormState = {
		action?: string;
		success?: string;
		errors?: Record<string, string>;
		values?: {
			title: string;
			bodyHtml: string;
			nodeIds: string[];
		};
		editor?: FactEditorData & { validation: { status: string } };
	};

	let { data, form }: { data: { user: { role: string } } & FactEditorData; form?: FormState } = $props();

	const editor = $derived(form?.editor ?? data);
	const values = $derived(
		form?.values ?? {
			title: editor.draft?.title ?? '',
			bodyHtml: editor.draft?.bodyHtml ?? '',
			nodeIds: editor.draft?.nodeIds ?? []
		}
	);
	const errors = $derived(form?.errors ?? {});

	function statusLabel(status: string | null | undefined) {
		if (status === 'published') return 'Publicerad';
		return 'Inte ändrad';
	}
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Innehållsredaktion</p>
			<h1>Redigera fakta</h1>
			<p class="lead">Redigera importerad fakta. Giltiga ändringar sparas och publiceras direkt.</p>
		</div>
		<a class="back-link" href="/admin/content-studio/facts">Tillbaka till faktalistan</a>
	</header>

	<ContentStudioNav />

	{#if form?.success}
		<p class="status-message success">{form.success}</p>
	{/if}
	{#if errors.form}
		<p class="status-message error">{errors.form}</p>
	{/if}

	<div class="layout">
		<section class="content-panel">
			<form class="editor-form" method="POST" action="?/save">
				<FactEditorForm
					{values}
					{errors}
					linkOptions={editor.linkOptions}
					unresolvedNodeIds={editor.unresolvedNodeIds}
				/>
			</form>
		</section>

		<aside class="summary-panel">
			<section>
				<h2>Nuvarande läge</h2>
				<div class="metrics">
					<div><span>Status</span><strong>{statusLabel(editor.draft?.status)}</strong></div>
					<div><span>Validering</span><strong>{editor.draft?.validationStatus ?? 'okänd'}</strong></div>
					<div><span>Fact-id</span><strong>{editor.item?.factId || 'saknas'}</strong></div>
					<div><span>Källa</span><strong>{editor.latestSnapshot?.sourceLabel ?? 'saknas'}</strong></div>
				</div>
			</section>
		</aside>
	</div>
</main>

<style>
	:global(body) { background: #f4f4ef; }
	main { max-width: 1180px; margin: 0 auto; padding: 34px 22px 60px; font-family: Arial, Helvetica, sans-serif; color: #2f3732; }
	.page-header { display: flex; justify-content: space-between; gap: 20px; align-items: start; padding-bottom: 22px; border-bottom: 1px solid #007a5b; }
	.eyebrow { margin: 0 0 8px; color: #00754c; font-size: 14px; font-weight: 700; text-transform: uppercase; }
	h1, h2 { margin: 0; }
	h1 { font-size: 34px; font-weight: 500; }
	.lead { max-width: 70ch; margin: 12px 0 0; line-height: 1.5; }
	.back-link { color: #00754c; font-weight: 700; text-decoration: none; }
	.status-message { margin: 18px 0 0; padding: 12px 14px; border-radius: 6px; }
	.status-message.success { border: 1px solid #bcd9cb; background: #edf8f1; color: #27543f; }
	.status-message.error { border: 1px solid #ebccd1; background: #f8e8ea; color: #8c3040; }
	.layout { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 24px; margin-top: 18px; }
	.content-panel, .summary-panel section { border: 1px solid #d1d7ce; border-radius: 6px; background: #fff; padding: 18px; }
	.editor-form { display: grid; gap: 20px; }
	.metrics { display: grid; gap: 10px; }
	.metrics div { padding: 12px; border: 1px solid #d8ded4; border-radius: 5px; }
	.metrics span { display: block; color: #5d675f; font-size: 13px; }
	.metrics strong { display: block; margin-top: 6px; font-size: 24px; font-weight: 600; color: #14261c; }
	@media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
	@media (max-width: 720px) { .page-header { flex-direction: column; } }
</style>
