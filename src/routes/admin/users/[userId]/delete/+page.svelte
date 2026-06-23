<svelte:head>
	<title>Admin - Ta bort användare</title>
</svelte:head>

<script lang="ts">
	let {
		data,
		form
	}: {
		data: {
			adminUserId: number;
			user: {
				id: number;
				displayName: string;
				username: string;
				email: string;
				companyName: string;
			};
		};
		form?: {
			errors?: Record<string, string>;
		};
	} = $props();

	const errors = $derived(form?.errors ?? {});
</script>

<main class="delete-page">
	<section class="panel">
		<p class="eyebrow">Admin</p>
		<h1>Ta bort användare</h1>
		<p class="lead">
			Det här motsvarar den gamla adminfunktionen: användaren och tillhörande svar,
			profiler, aktiviteter, sessioner och kopplingar tas bort permanent.
		</p>

		<div class="summary">
			<div>
				<span>Namn</span>
				<strong>{data.user.displayName}</strong>
			</div>
			<div>
				<span>Användarnamn</span>
				<strong>{data.user.username}</strong>
			</div>
			<div>
				<span>E-post</span>
				<strong>{data.user.email}</strong>
			</div>
			<div>
				<span>Företag</span>
				<strong>{data.user.companyName || 'Saknas'}</strong>
			</div>
		</div>

		{#if errors.form}
			<p class="error-message">{errors.form}</p>
		{/if}

		<form method="POST" class="actions">
			<a class="secondary-link" href={`/admin/users/${data.user.id}`}>Avbryt</a>
			<button type="submit" class="danger" disabled={data.adminUserId === data.user.id}>
				Ta bort användare
			</button>
		</form>

		{#if data.adminUserId === data.user.id}
			<p class="hint">Du kan inte ta bort ditt eget adminkonto.</p>
		{/if}
	</section>
</main>

<style>
	:global(body) {
		background: #f4f4ef;
	}

	main {
		max-width: 760px;
		margin: 0 auto;
		padding: 40px 22px 64px;
		font-family: Arial, Helvetica, sans-serif;
		color: #2f3732;
	}

	.panel {
		padding: 24px;
		background: #fff;
		border: 1px solid #d7ddd6;
		border-radius: 6px;
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
		font-size: 32px;
		font-weight: 500;
	}

	.lead {
		margin: 12px 0 0;
		line-height: 1.5;
	}

	.summary {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		margin-top: 24px;
	}

	.summary div {
		padding: 14px 16px;
		border: 1px solid #dce2dc;
		border-radius: 6px;
		background: #fafcf9;
	}

	.summary span {
		display: block;
		color: #617066;
		font-size: 13px;
	}

	.summary strong {
		display: block;
		margin-top: 6px;
		font-size: 17px;
	}

	.error-message {
		margin: 18px 0 0;
		padding: 12px 14px;
		border: 1px solid #ebccd1;
		background: #f8e8ea;
		color: #8c3040;
	}

	.actions {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin-top: 24px;
		padding-top: 20px;
		border-top: 1px solid #e1e6df;
	}

	button,
	.secondary-link {
		font: inherit;
	}

	.secondary-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 40px;
		padding: 0 16px;
		border: 1px solid #c9d1cb;
		border-radius: 5px;
		color: #324038;
		background: #f8faf7;
		font-weight: 700;
		text-decoration: none;
	}

	button {
		border: 0;
		border-radius: 5px;
		color: #fff;
		cursor: pointer;
		padding: 11px 18px;
	}

	button.danger {
		background: #9f2d2d;
	}

	button:disabled {
		opacity: 0.55;
		cursor: default;
	}

	.hint {
		margin: 14px 0 0;
		color: #8c3040;
		font-size: 14px;
	}

	@media (max-width: 720px) {
		.summary {
			grid-template-columns: 1fr;
		}

		.actions {
			flex-direction: column;
		}
	}
</style>
