<script lang="ts">
	export let open = false;
	export let title = '';
	export let bodyHtml = '';
	export let onClose: () => void;
</script>

{#if open}
	<div class="backdrop" role="presentation"></div>
	<div class="dialog" role="dialog" aria-modal="true" aria-label={title}>
		<button class="close" on:click={onClose}>Close</button>
		<h2>{title}</h2>
		<div class="content">{@html bodyHtml}</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgb(17 24 39 / 0.45);
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
</style>
