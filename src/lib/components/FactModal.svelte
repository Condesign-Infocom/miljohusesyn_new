<script lang="ts">
	import { tick } from 'svelte';

	export let open = false;
	export let title = '';
	export let bodyHtml = '';
	export let message = '';
	export let onClose: () => void;

	let closeButton: HTMLButtonElement;
	let previouslyFocused: HTMLElement | null = null;

	$: if (open) {
		previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		tick().then(() => closeButton?.focus());
	}

	function close() {
		onClose();
		previouslyFocused?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			event.preventDefault();
			close();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<button class="backdrop" type="button" aria-label="Stäng faktarutan" on:click={close}></button>
	<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="fact-modal-title">
		<button class="close" type="button" bind:this={closeButton} on:click={close}>Stäng</button>
		<h2 id="fact-modal-title">{title}</h2>
		{#if message}
			<p class="message" role="status">{message}</p>
		{:else}
			<div class="content">{@html bodyHtml}</div>
		{/if}
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		background: rgb(17 24 39 / 0.45);
		cursor: default;
	}

	.dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		width: min(720px, calc(100vw - 32px));
		max-height: calc(100vh - 48px);
		overflow: auto;
		transform: translate(-50%, -50%);
		padding: 24px;
		border: 1px solid #d4ddd5;
		border-radius: 6px;
		background: #fbfdf9;
		box-shadow: 0 24px 60px rgb(31 41 51 / 0.18);
	}

	.close {
		float: right;
		margin-left: 12px;
	}

	h2 {
		margin-top: 0;
	}

	.content {
		white-space: pre-wrap;
		line-height: 1.55;
	}

	.message {
		margin: 1rem 0 0;
		color: #465049;
		line-height: 1.55;
	}
</style>
