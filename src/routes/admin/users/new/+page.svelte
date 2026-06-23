<svelte:head>
	<title>Admin - Skapa användare</title>
</svelte:head>

<script lang="ts">
	import { appRoles } from '$lib/roles';

	type FormState = {
		errors?: Record<string, string>;
		values?: {
			email: string;
			username: string;
			displayName: string;
			role: string;
			phone: string;
			companyName: string;
			companyOrgNum: string;
			companyAddress1: string;
			companyPostcode: string;
			companyCity: string;
		};
	};

	let {
		data,
		form
	}: {
		data: {
			values: FormState['values'];
		};
		form?: FormState;
	} = $props();

	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors ?? {});
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Admin</p>
			<h1>Skapa användare</h1>
			<p class="lead">
				Det nya kontot får lösenordet <strong>demo123</strong> direkt. Efter att kontot är skapat skickar vi dig vidare till gårdsuppgifterna, så att checklistor och profiler kan sättas upp direkt.
			</p>
		</div>
		<a class="back-link" href="/admin/users">Tillbaka till användarlistan</a>
	</header>

	<section class="content-panel">
		{#if errors.form}
			<p class="error-message">{errors.form}</p>
		{/if}

		<form class="editor-form" method="POST">
			<div class="field-grid">
				<label>
					<span>Visningsnamn</span>
					<input name="displayName" type="text" value={values?.displayName ?? ''} />
					{#if errors.displayName}
						<small>{errors.displayName}</small>
					{/if}
				</label>

				<label>
					<span>Roll</span>
					<select name="role">
						{#each appRoles as role (role)}
							<option value={role} selected={(values?.role ?? 'user') === role}>{role}</option>
						{/each}
					</select>
				</label>

				<label>
					<span>Användarnamn</span>
					<input name="username" type="text" value={values?.username ?? ''} />
					{#if errors.username}
						<small>{errors.username}</small>
					{/if}
				</label>

				<label>
					<span>E-post</span>
					<input name="email" type="email" value={values?.email ?? ''} />
					{#if errors.email}
						<small>{errors.email}</small>
					{/if}
				</label>

				<label>
					<span>Telefon</span>
					<input name="phone" type="text" value={values?.phone ?? ''} />
				</label>

				<label class="wide">
					<span>Företagsnamn / Namn</span>
					<input name="companyName" type="text" value={values?.companyName ?? ''} />
					{#if errors.companyName}
						<small>{errors.companyName}</small>
					{/if}
				</label>

				<label>
					<span>Organisationsnummer</span>
					<input name="companyOrgNum" type="text" value={values?.companyOrgNum ?? ''} />
				</label>

				<label class="wide">
					<span>Adress</span>
					<input name="companyAddress1" type="text" value={values?.companyAddress1 ?? ''} />
				</label>

				<label>
					<span>Postnummer</span>
					<input name="companyPostcode" type="text" value={values?.companyPostcode ?? ''} />
				</label>

				<label>
					<span>Postadress</span>
					<input name="companyCity" type="text" value={values?.companyCity ?? ''} />
				</label>
			</div>

			<div class="actions">
				<button type="submit">Skapa användare</button>
			</div>
		</form>
	</section>
</main>

<style>
	:global(body) {
		background: #f4f4ef;
	}

	main {
		max-width: 980px;
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
		max-width: 70ch;
		margin: 12px 0 0;
		line-height: 1.5;
	}

	.back-link {
		color: #00754c;
		font-weight: 700;
		text-decoration: none;
	}

	.content-panel {
		margin-top: 28px;
		padding: 22px;
		background: #fff;
		border: 1px solid #d7ddd6;
		border-radius: 6px;
	}

	.error-message {
		margin: 0 0 18px;
		padding: 12px 14px;
		border: 1px solid #ebccd1;
		background: #f8e8ea;
		color: #8c3040;
	}

	.editor-form {
		display: grid;
		gap: 22px;
	}

	.field-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px 18px;
	}

	.field-grid .wide {
		grid-column: 1 / -1;
	}

	label {
		display: grid;
		gap: 7px;
		font-size: 14px;
	}

	label span {
		color: #445248;
	}

	label small {
		color: #8c3040;
	}

	input,
	select,
	button {
		font: inherit;
	}

	input,
	select {
		box-sizing: border-box;
		width: 100%;
		height: 40px;
		padding: 8px 10px;
		border: 1px solid #c9d1cb;
		border-radius: 4px;
		background: #fff;
	}

	.actions {
		padding-top: 20px;
		border-top: 1px solid #e1e6df;
	}

	button {
		border: 0;
		border-radius: 5px;
		background: #007a5b;
		color: #fff;
		cursor: pointer;
		padding: 11px 18px;
	}

	@media (max-width: 720px) {
		.page-header {
			flex-direction: column;
		}

		.field-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
