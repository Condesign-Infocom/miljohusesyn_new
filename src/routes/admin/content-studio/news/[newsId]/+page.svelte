<svelte:head>
	<title>Innehållsredaktion - Redigera nyhet</title>
</svelte:head>

<script lang="ts">
	import { resolve } from '$app/paths';
	import ContentStudioNav from '$lib/components/admin/ContentStudioNav.svelte';
	import RichTextHtmlEditor from '$lib/components/admin/RichTextHtmlEditor.svelte';

	type NewsEditorData = {
		user?: {
			role: string;
		};
		item: {
			id: string;
			slug: string;
			title: string;
			publishedAt: string;
			excerpt: string;
			bodyHtml: string;
			sourceFile: string;
		} | null;
		draft: {
			id: string | null;
			status: string;
			reviewStatus: string | null;
			validationStatus: string;
			updatedAt: string | null;
			title: string;
			publishedAt: string;
			excerpt: string;
			bodyHtml: string;
		} | null;
	};

	type FormState = {
		action?: string;
		success?: string;
		errors?: Record<string, string>;
		values?: {
			title: string;
			publishedAt: string;
			excerpt: string;
			bodyHtml: string;
		};
		editor?: NewsEditorData;
	};

	let { data, form }: { data: NewsEditorData; form?: FormState } = $props();

	const editor = $derived(form?.editor ?? data);
	const values = $derived(
		form?.values ?? {
			title: editor.draft?.title ?? '',
			publishedAt: editor.draft?.publishedAt ?? '',
			excerpt: editor.draft?.excerpt ?? '',
			bodyHtml: editor.draft?.bodyHtml ?? ''
		}
	);
	const errors = $derived(form?.errors ?? {});

	function statusLabel(status: string | null | undefined) {
		if (status === 'published') return 'Publicerad';
		if (status === 'in_review') return 'Väntar på godkännande';
		if (status === 'draft') return 'Utkast';
		return 'Inte ändrad';
	}
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Innehållsredaktion</p>
			<h1>Redigera nyhet</h1>
			<p class="lead">Redigera publika nyheter. Större ändringar kan skickas för godkännande, medan mindre rättningar fortfarande kan publiceras direkt.</p>
		</div>
		<a class="back-link" href={resolve('/admin/content-studio/news', {})}>Tillbaka till nyheter</a>
	</header>

	<ContentStudioNav active="news" />

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

					<label>
						<span>Publiceringsdatum</span>
						<input name="publishedAt" type="text" value={values.publishedAt} />
						{#if errors.publishedAt}<small>{errors.publishedAt}</small>{/if}
					</label>

					<label class="wide">
						<span>Ingress</span>
						<textarea name="excerpt" rows="4">{values.excerpt}</textarea>
						{#if errors.excerpt}<small>{errors.excerpt}</small>{/if}
					</label>

					<label class="wide">
						<span>Brödtext</span>
						<RichTextHtmlEditor
							label="Brödtext"
							name="bodyHtml"
							value={values.bodyHtml}
						/>
						<small class="field-hint">Redigera artikeln visuellt och växla till HTML-läge vid behov. Skicka större ändringar för godkännande eller publicera mindre rättningar direkt.</small>
						{#if errors.bodyHtml}<small>{errors.bodyHtml}</small>{/if}
					</label>
				</div>

				<div class="actions">
					<button type="submit" name="intent" value="review">Skicka för godkännande</button>
					<button type="submit" class="secondary-button" name="intent" value="publish">
						Publicera direkt
					</button>
				</div>
			</form>
		</section>

		<aside class="summary-panel">
			<section>
				<h2>Nuvarande läge</h2>
				<div class="reference-card">
					<h3>Publik sida</h3>
					<p>{editor.item?.title || 'Rubrik saknas'}</p>
					<a
						href={resolve('/nyheter/[slug]', { slug: editor.item?.slug ?? '' })}
						target="_blank"
						rel="noreferrer"
					>
						Öppna /nyheter/{editor.item?.slug}
					</a>
				</div>

				<div class="metrics">
					<div><span>Status</span><strong>{statusLabel(editor.draft?.status)}</strong></div>
					<div><span>Validering</span><strong>{editor.draft?.validationStatus ?? 'okänd'}</strong></div>
					<div><span>Slug</span><strong>{editor.item?.slug ?? 'saknas'}</strong></div>
				</div>

				<p class="role-note">Här kan du välja mellan att skicka ändringen för godkännande eller publicera direkt.</p>

				<details class="trace-details">
					<summary>Spårning och genererat HTML</summary>
					<div>Källfil: {editor.item?.sourceFile ?? 'saknas'}</div>
					<pre>{editor.draft?.bodyHtml ?? ''}</pre>
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
	.secondary-button { background: #dbe8e0; color: #1f3a2d; font-weight: 700; }
	.metrics { display: grid; gap: 10px; margin-top: 16px; }
	.metrics div { padding: 12px; border: 1px solid #d8ded4; border-radius: 5px; }
	.metrics span { display: block; color: #5d675f; font-size: 13px; }
	.metrics strong { display: block; margin-top: 6px; font-size: 20px; font-weight: 600; color: #14261c; }
	.reference-card { padding: 12px; border: 1px solid #d8ded4; border-radius: 5px; background: #f8fbf8; }
	.reference-card h3 { margin: 0 0 10px; font-size: 16px; }
	.reference-card p { margin: 0 0 8px; font-weight: 700; }
	.reference-card a { color: #00754c; font-weight: 700; text-decoration: none; }
	.role-note { margin: 16px 0 0; color: #5d675f; line-height: 1.5; }
	.trace-details { margin-top: 16px; color: #5d675f; }
	.trace-details summary { cursor: pointer; }
	pre { margin: 12px 0 0; padding: 12px; overflow-x: auto; border-radius: 4px; background: #f0f2ee; white-space: pre-wrap; word-break: break-word; }
	@media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
	@media (max-width: 720px) { .page-header { flex-direction: column; } .field-grid { grid-template-columns: 1fr; } }
</style>
