<svelte:head>
	<title>Innehållsredaktion - Redigera standardtext</title>
</svelte:head>

<script lang="ts">
	import ContentStudioNav from '$lib/components/admin/ContentStudioNav.svelte';
	import RichTextHtmlEditor from '$lib/components/admin/RichTextHtmlEditor.svelte';

	type StandardEditorData = {
		user?: {
			role: string;
		};
		latestSnapshot: { id: string; sourceLabel: string } | null;
		item: {
			id: string;
			contentType: string;
			rootTag: string;
			title: string;
			sourceFile: string;
			targets?: string[];
		} | null;
		draft: {
			id: string | null;
			status: string;
			reviewStatus: string | null;
			validationStatus: string;
			updatedAt: string | null;
			title: string;
			bodyHtml: string;
			targets: string[];
		} | null;
		displayItem?: {
			contentTypeLabel: string;
			roleLabel: string;
			outboundReferences: Array<{
				label: string;
				raw: string;
			}>;
			inboundReferences: Array<{
				id: string;
				title: string;
				contentTypeLabel: string;
			}>;
		} | null;
		frontendMeta?: {
			publicTitle: string;
			publicSlug: string;
			publicHref: string;
		} | null;
	};

	type FormState = {
		action?: string;
		success?: string;
		errors?: Record<string, string>;
		values?: {
			title: string;
			bodyHtml: string;
			targets: string[];
		};
		editor?: StandardEditorData & { validation: { status: string } };
	};

	let { data, form }: { data: StandardEditorData; form?: FormState } = $props();

	const editor = $derived(form?.editor ?? data);
	const values = $derived(
		form?.values ?? {
			title: editor.draft?.title ?? '',
			bodyHtml: editor.draft?.bodyHtml ?? '',
			targets: editor.draft?.targets ?? []
		}
	);
	const errors = $derived(form?.errors ?? {});
	const displayItem = $derived(form?.editor ? (data.displayItem ?? null) : (editor.displayItem ?? null));

	function statusLabel(status: string | null | undefined) {
		if (status === 'published') return 'Publicerad';
		return 'Inte ändrad';
	}
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Innehållsredaktion</p>
			<h1>Redigera standardtext</h1>
			<p class="lead">Redigera standardtexten och se hur blocket används. Giltiga ändringar publiceras direkt.</p>
		</div>
		<a class="back-link" href={data.frontendMeta ? '/admin/content-studio/frontend-content' : '/admin/content-studio/standard-content'}>
			{data.frontendMeta ? 'Tillbaka till frontend-innehåll' : 'Tillbaka till standardtexter'}
		</a>
	</header>

	<ContentStudioNav active="frontend" />

	{#if form?.success}
		<p class="status-message success">{form.success}</p>
	{/if}
	{#if errors.form}
		<p class="status-message error">{errors.form}</p>
	{/if}

	<div class="layout">
		<section class="content-panel">
			<form class="editor-form" method="POST" action="?/save">
				<div class="field-grid">
					<label class="wide">
						<span>Titel</span>
						<input name="title" type="text" value={values.title} />
						{#if errors.title}<small>{errors.title}</small>{/if}
					</label>

					<label class="wide">
						<span>Används för publicering i</span>
						<textarea name="targets" rows="5">{values.targets.join('\n')}</textarea>
						<small class="field-hint">Tillfällig teknisk koppling. I slutversionen bör detta ersättas av en tydlig strukturväljare för var blocket används i publiceringen.</small>
					</label>

					<label class="wide">
						<span>Brödtext</span>
						<RichTextHtmlEditor
							label="Brödtext"
							name="bodyHtml"
							value={values.bodyHtml}
						/>
						<small class="field-hint">Redigera texten visuellt och växla till HTML-läge vid behov. Ändringen publiceras direkt när du sparar.</small>
						{#if errors.bodyHtml}<small>{errors.bodyHtml}</small>{/if}
					</label>
				</div>

				<div class="actions">
					<button type="submit">Spara och publicera</button>
				</div>
			</form>
		</section>

		<aside class="summary-panel">
			<section>
				<h2>Nuvarande läge</h2>
				{#if data.frontendMeta}
					<div class="frontend-card">
						<h3>Publik sida</h3>
						<p>{data.frontendMeta.publicTitle}</p>
						<a href={data.frontendMeta.publicHref} target="_blank" rel="noreferrer">
							Öppna {data.frontendMeta.publicHref}
						</a>
						<small>Ändringar på den här sidan publiceras direkt när formuläret sparas.</small>
					</div>
				{/if}
				<div class="metrics">
					<div><span>Status</span><strong>{statusLabel(editor.draft?.status)}</strong></div>
					<div><span>Validering</span><strong>{editor.draft?.validationStatus ?? 'okänd'}</strong></div>
					<div><span>Typ</span><strong>{displayItem?.contentTypeLabel ?? editor.item?.contentType ?? 'saknas'}</strong></div>
					<div><span>Roll</span><strong>{displayItem?.roleLabel ?? editor.item?.rootTag ?? 'saknas'}</strong></div>
					<div><span>Länkar till</span><strong>{displayItem?.outboundReferences.length ?? values.targets.length}</strong></div>
					<div><span>Används i</span><strong>{displayItem?.inboundReferences.length ?? 0}</strong></div>
				</div>
				{#if displayItem?.outboundReferences.length}
					<div class="reference-card">
						<h3>Länkar till</h3>
						<ul>
							{#each displayItem.outboundReferences as reference (reference.raw)}
								<li>{reference.label}</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if displayItem?.inboundReferences.length}
					<div class="reference-card">
						<h3>Används i</h3>
						<ul>
							{#each displayItem.inboundReferences as reference (reference.id)}
								<li>{reference.title}</li>
							{/each}
						</ul>
					</div>
				{/if}
				<details class="trace-details">
					<summary>Spårning</summary>
					<div>Källfil: {editor.item?.sourceFile ?? 'saknas'}</div>
					{#if displayItem?.outboundReferences.length}
						<div class="trace-group">
							<strong>Tekniska referenser</strong>
							<ul>
								{#each displayItem.outboundReferences as reference (reference.raw)}
									<li>{reference.raw}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</details>
			</section>
		</aside>
	</div>
</main>

<style>
	:global(body) { background: #f4f4ef; }
	main { max-width: 1900px; margin: 0 auto; padding: 34px 22px 60px; font-family: Arial, Helvetica, sans-serif; color: #2f3732; }
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
	.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 18px; }
	.wide { grid-column: 1 / -1; }
	label { display: grid; gap: 7px; font-size: 14px; }
	label span { color: #445248; }
	label small { color: #8c3040; }
	.field-hint { color: #66736a; }
	input, textarea, button { font: inherit; }
	input, textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #c9d1cb; border-radius: 4px; background: #fff; }
	textarea { resize: vertical; }
	.actions { display: flex; flex-wrap: wrap; gap: 10px; padding-top: 18px; border-top: 1px solid #e1e6df; }
	button { border: 0; border-radius: 5px; background: #007a5b; color: #fff; cursor: pointer; padding: 11px 18px; }
	.metrics { display: grid; gap: 10px; }
	.metrics div { padding: 12px; border: 1px solid #d8ded4; border-radius: 5px; }
	.metrics span { display: block; color: #5d675f; font-size: 13px; }
	.metrics strong { display: block; margin-top: 6px; font-size: 24px; font-weight: 600; color: #14261c; }
	.reference-card { margin-top: 16px; padding: 12px; border: 1px solid #d8ded4; border-radius: 5px; }
	.frontend-card { margin-bottom: 16px; padding: 12px; border: 1px solid #d8ded4; border-radius: 5px; background: #f8fbf8; }
	.frontend-card h3, .reference-card h3 { margin: 0 0 10px; font-size: 16px; }
	.frontend-card p { margin: 0 0 8px; font-weight: 700; }
	.frontend-card a { color: #00754c; font-weight: 700; text-decoration: none; }
	.frontend-card small { display: block; margin-top: 10px; color: #5d675f; line-height: 1.4; }
	.reference-card ul, .trace-group ul { margin: 0; padding-left: 18px; }
	.trace-details { margin-top: 16px; color: #5d675f; }
	.trace-details summary { cursor: pointer; }
	.trace-group { margin-top: 10px; }
	@media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
	@media (max-width: 720px) { .page-header { flex-direction: column; } .field-grid { grid-template-columns: 1fr; } }
</style>
