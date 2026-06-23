<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { Editor } from '@tiptap/core';
	import Link from '@tiptap/extension-link';
	import StarterKit from '@tiptap/starter-kit';

	let {
		value = '',
		name,
		label = 'Brödtext',
		rows = 16
	}: {
		value?: string;
		name: string;
		label?: string;
		rows?: number;
	} = $props();

	let element = $state<HTMLDivElement | null>(null);
	let editor = $state<Editor | null>(null);
	let toolbarTick = $state(0);
	let codeView = $state(false);
	let htmlValue = $state('');
	let mountedElement: HTMLDivElement | null = null;
	let previousPropValue = $state('');

	const normalizedValue = $derived(value.trim() ? value : '<p></p>');
	const normalizedHtmlValue = $derived(htmlValue.trim() ? htmlValue : '<p></p>');

	onMount(() => {
		htmlValue = normalizedValue;
		previousPropValue = normalizedValue;
		editor = new Editor({
			element: element ?? undefined,
			extensions: [
				StarterKit.configure({
					link: false,
					heading: {
						levels: [2, 3]
					}
				}),
				Link.configure({
					openOnClick: false,
					autolink: true
				})
			],
			content: normalizedValue,
			onUpdate: ({ editor: activeEditor }) => {
				const nextHtml = activeEditor.getHTML();
				htmlValue = nextHtml;
				toolbarTick += 1;
			},
			onSelectionUpdate: () => {
				toolbarTick += 1;
			}
		});
	});

	onDestroy(() => {
		editor?.destroy();
	});

	function mountEditor(target: HTMLDivElement | null) {
		if (!editor || codeView || !target || mountedElement === target) {
			return;
		}

		editor.mount(target);
		mountedElement = target;
		toolbarTick += 1;
	}

	function unmountEditor() {
		if (!editor || !mountedElement) {
			return;
		}

		editor.unmount();
		mountedElement = null;
	}

	$effect(() => {
		if (!editor || codeView) {
			return;
		}

		if (normalizedValue === previousPropValue) {
			return;
		}

		if (editor.getHTML() !== normalizedValue) {
			editor.commands.setContent(normalizedValue, { emitUpdate: false });
			htmlValue = normalizedValue;
			toolbarTick += 1;
		}

		previousPropValue = normalizedValue;
	});

	$effect(() => {
		if (normalizedValue === previousPropValue) {
			return;
		}

		htmlValue = normalizedValue;
	});

	async function toggleCodeView() {
		codeView = !codeView;
		if (codeView) {
			unmountEditor();
			return;
		}

		if (editor && editor.getHTML() !== normalizedHtmlValue) {
			editor.commands.setContent(normalizedHtmlValue, { emitUpdate: false });
			htmlValue = normalizedHtmlValue;
			previousPropValue = normalizedHtmlValue;
			toolbarTick += 1;
		}

		await tick();
		mountEditor(element);
	}

	function attachEditorSurface(nextElement: HTMLDivElement) {
		element = nextElement;
		mountEditor(nextElement);

		return {
			destroy() {
				if (element === nextElement) {
					element = null;
				}
			}
		};
	}

	function setLinkFromPrompt() {
		if (!editor || typeof window === 'undefined') {
			return;
		}

		const currentUrl = editor.getAttributes('link').href ?? '';
		const nextUrl = window.prompt('Ange länkadress', currentUrl);

		if (nextUrl === null) {
			return;
		}

		const trimmedUrl = nextUrl.trim();
		if (!trimmedUrl) {
			editor.chain().focus().unsetLink().run();
			toolbarTick += 1;
			return;
		}

		editor.chain().focus().extendMarkRange('link').setLink({ href: trimmedUrl }).run();
		toolbarTick += 1;
	}
</script>

<div class="editor-shell">
	<div class="toolbar" data-tick={toolbarTick}>
		<button
			type="button"
			class:active={editor?.isActive('paragraph')}
			onclick={() => editor?.chain().focus().setParagraph().run()}
		>
			P
		</button>
		<button
			type="button"
			class:active={editor?.isActive('heading', { level: 2 })}
			onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
		>
			H2
		</button>
		<button
			type="button"
			class:active={editor?.isActive('heading', { level: 3 })}
			onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
		>
			H3
		</button>
		<button
			type="button"
			class:active={editor?.isActive('bold')}
			onclick={() => editor?.chain().focus().toggleBold().run()}
		>
			Fet
		</button>
		<button
			type="button"
			class:active={editor?.isActive('italic')}
			onclick={() => editor?.chain().focus().toggleItalic().run()}
		>
			Kursiv
		</button>
		<button
			type="button"
			class:active={editor?.isActive('blockquote')}
			onclick={() => editor?.chain().focus().toggleBlockquote().run()}
		>
			Citat
		</button>
		<button
			type="button"
			class:active={editor?.isActive('link')}
			onclick={setLinkFromPrompt}
		>
			Länk
		</button>
		<button
			type="button"
			class:active={codeView}
			onclick={toggleCodeView}
		>
			{codeView ? 'Visuell vy' : 'HTML'}
		</button>
	</div>

	<div class="editor-body">
		{#if codeView}
			<textarea bind:value={htmlValue} rows={rows}></textarea>
		{:else}
			<div use:attachEditorSurface class="rich-surface"></div>
		{/if}
	</div>

	<textarea aria-label={label} class="form-value" name={name} readonly>{htmlValue}</textarea>
</div>

<style>
	.editor-shell {
		border: 1px solid #c9d1cb;
		border-radius: 4px;
		background: #ffffff;
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 10px;
		border-bottom: 1px solid #dce2dc;
		background: #f7f9f6;
	}

	.toolbar button {
		border: 1px solid #c9d1cb;
		border-radius: 4px;
		background: #ffffff;
		color: #2f3732;
		cursor: pointer;
		padding: 7px 10px;
		font-size: 13px;
	}

	.toolbar button.active {
		border-color: #007a5b;
		background: #e6f3ee;
		color: #0e4b37;
		font-weight: 700;
	}

	.editor-body textarea,
	.rich-surface {
		box-sizing: border-box;
		width: 100%;
		min-height: 320px;
		padding: 12px 14px;
		border: 0;
		font: inherit;
		background: #ffffff;
		color: #2f3732;
		caret-color: #2f3732;
	}

	.editor-body textarea {
		resize: vertical;
	}

	.rich-surface :global(.ProseMirror) {
		min-height: 320px;
		outline: none;
		line-height: 1.6;
		color: #2f3732;
		caret-color: #2f3732;
	}

	.rich-surface :global(.ProseMirror p) {
		margin: 0 0 1em;
	}

	.rich-surface :global(.ProseMirror h2),
	.rich-surface :global(.ProseMirror h3) {
		margin: 1.2em 0 0.6em;
		line-height: 1.2;
	}

	.rich-surface :global(.ProseMirror ul),
	.rich-surface :global(.ProseMirror ol) {
		padding-left: 1.5rem;
	}

	.rich-surface :global(.ProseMirror blockquote) {
		margin: 1em 0;
		padding-left: 1rem;
		border-left: 3px solid #c6d2c7;
		color: #516056;
	}

	.form-value {
		display: none;
	}
</style>
