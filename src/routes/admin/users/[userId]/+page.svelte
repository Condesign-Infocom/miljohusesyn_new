<svelte:head>
	<title>Admin - Användare</title>
</svelte:head>

<script lang="ts">
	import { appRoles } from '$lib/roles';

	type FormState = {
		action?: 'update' | 'resetPassword';
		success?: string;
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
			adminUserId: number;
			user: {
				id: number;
				email: string;
				username: string;
				displayName: string;
				role: string;
				firstName: string;
				lastName: string;
				phone: string;
				companyName: string;
				companyOrgNum: string;
				companyAddress1: string;
				companyPostcode: string;
				companyCity: string;
				createdAt: string;
				profile: {
					areas: { cropHa: string; pastureHa: string };
					derivedProfiles: string[];
					assignedChecklistSlugs: string[];
					activities: Record<string, boolean>;
				} | null;
				activityNames: string[];
			};
		};
		form?: FormState;
	} = $props();

	const values = $derived(form?.values ?? data.user);
	const errors = $derived(form?.errors ?? {});
	const success = $derived(form?.success ?? '');
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Admin</p>
			<h1>{data.user.displayName}</h1>
			<p class="lead">Redigera konto, roll och kontaktuppgifter. Profil- och checklistsammanfattningen till höger kommer direkt från samma moderna profilmotor som resten av appen.</p>
		</div>
		<a class="back-link" href="/admin/users">Tillbaka till användarlistan</a>
	</header>

	<div class="layout">
		<section class="content-panel">
			{#if success}
				<p class="status-message">{success}</p>
			{/if}

			{#if errors.form}
				<p class="error-message">{errors.form}</p>
			{/if}

			<form class="editor-form" method="POST" action="?/update">
				<div class="field-grid">
					<label>
						<span>Visningsnamn</span>
						<input name="displayName" type="text" value={values.displayName} />
						{#if errors.displayName}
							<small>{errors.displayName}</small>
						{/if}
					</label>

					<label>
						<span>Roll</span>
						<select name="role" disabled={data.adminUserId === data.user.id}>
							{#each appRoles as role (role)}
								<option value={role} selected={values.role === role}>{role}</option>
							{/each}
						</select>
						{#if data.adminUserId === data.user.id}
							<input name="role" type="hidden" value={values.role} />
						{/if}
					</label>

					<label>
						<span>Användarnamn</span>
						<input name="username" type="text" value={values.username} />
						{#if errors.username}
							<small>{errors.username}</small>
						{/if}
					</label>

					<label>
						<span>E-post</span>
						<input name="email" type="email" value={values.email} />
						{#if errors.email}
							<small>{errors.email}</small>
						{/if}
					</label>

					<label>
						<span>Telefon</span>
						<input name="phone" type="text" value={values.phone} />
					</label>

					<label>
						<span>Skapad</span>
						<input type="text" value={data.user.createdAt} disabled />
					</label>

					<label class="wide">
						<span>Företagsnamn / Namn</span>
						<input name="companyName" type="text" value={values.companyName} />
						{#if errors.companyName}
							<small>{errors.companyName}</small>
						{/if}
					</label>

					<label>
						<span>Organisationsnummer</span>
						<input name="companyOrgNum" type="text" value={values.companyOrgNum} />
					</label>

					<label class="wide">
						<span>Adress</span>
						<input name="companyAddress1" type="text" value={values.companyAddress1} />
					</label>

					<label>
						<span>Postnummer</span>
						<input name="companyPostcode" type="text" value={values.companyPostcode} />
					</label>

					<label>
						<span>Postadress</span>
						<input name="companyCity" type="text" value={values.companyCity} />
					</label>
				</div>

				<div class="actions">
					<button type="submit">Spara konto</button>
					<a class="secondary-link" href={`/admin/users/${data.user.id}/profile`}>Redigera gårdsuppgifter</a>
					<a class="danger-link" href={`/admin/users/${data.user.id}/delete`}>Ta bort användare</a>
				</div>
			</form>

			<form class="reset-form" method="POST" action="?/resetPassword">
				<div>
					<h2>Lösenord</h2>
					<p>Återställer användarens lösenord till den gemensamma demo-standarden.</p>
				</div>
				<button type="submit" class="secondary">Återställ till demo123</button>
			</form>
		</section>

		<aside class="summary-panel">
			<section>
				<h2>Aktiviteter</h2>
				<ul class="tag-list">
					{#each data.user.activityNames as activity (activity)}
						<li>{activity}</li>
					{/each}
				</ul>
			</section>

			{#if data.user.profile}
				<section>
					<h2>Profiler</h2>
					<ul class="tag-list">
						{#each data.user.profile.derivedProfiles as profile (profile)}
							<li>{profile}</li>
						{/each}
					</ul>
				</section>

				<section>
					<h2>Checklistor</h2>
					<ul class="summary-list">
						{#each data.user.profile.assignedChecklistSlugs as slug (slug)}
							<li>{slug}</li>
						{/each}
					</ul>
				</section>

				<section>
					<h2>Arealer</h2>
					<div class="metrics">
						<div>
							<span>Åker</span>
							<strong>{data.user.profile.areas.cropHa || '0'}</strong>
						</div>
						<div>
							<span>Bete</span>
							<strong>{data.user.profile.areas.pastureHa || '0'}</strong>
						</div>
					</div>
				</section>
			{/if}
		</aside>
	</div>
</main>

<style>
	:global(body) {
		background: #f4f4ef;
	}

	main {
		max-width: 1280px;
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

	h1,
	h2 {
		margin: 0;
	}

	h1 {
		font-size: 34px;
		font-weight: 500;
	}

	h2 {
		font-size: 18px;
		font-weight: 700;
	}

	.lead {
		max-width: 68ch;
		margin: 12px 0 0;
		line-height: 1.5;
	}

	.back-link {
		color: #00754c;
		font-weight: 700;
		text-decoration: none;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 320px;
		gap: 22px;
		margin-top: 28px;
		align-items: start;
	}

	.content-panel,
	.summary-panel {
		background: #fff;
		border: 1px solid #d7ddd6;
		border-radius: 6px;
	}

	.content-panel {
		padding: 22px;
	}

	.status-message,
	.error-message {
		margin: 0 0 18px;
		padding: 12px 14px;
		border: 1px solid #d7ddd6;
		background: #f8faf7;
	}

	.status-message {
		border-color: #b7d6c8;
		background: #eef7f1;
		color: #1e5a41;
	}

	.error-message {
		border-color: #ebccd1;
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

	input[disabled] {
		background: #f0f3ef;
		color: #617066;
	}

	.actions,
	.reset-form {
		padding-top: 20px;
		border-top: 1px solid #e1e6df;
	}

	.actions {
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.reset-form {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: center;
		margin-top: 24px;
	}

	.reset-form p {
		margin: 8px 0 0;
		color: #55645b;
		line-height: 1.5;
	}

	button {
		border: 0;
		border-radius: 5px;
		background: #007a5b;
		color: #fff;
		cursor: pointer;
		padding: 11px 18px;
	}

	button.secondary {
		background: #e9eeea;
		color: #324038;
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

	.danger-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 40px;
		padding: 0 16px;
		border: 1px solid #d9b0b0;
		border-radius: 5px;
		color: #8a2727;
		background: #fff5f5;
		font-weight: 700;
		text-decoration: none;
	}

	.summary-panel {
		padding: 20px;
		position: sticky;
		top: 20px;
	}

	.summary-panel section + section {
		margin-top: 22px;
		padding-top: 20px;
		border-top: 1px solid #e1e6df;
	}

	.tag-list,
	.summary-list {
		margin: 14px 0 0;
		padding-left: 18px;
	}

	.tag-list li,
	.summary-list li {
		margin: 0 0 8px;
		line-height: 1.4;
	}

	.metrics {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		margin-top: 14px;
	}

	.metrics div {
		padding: 14px 16px;
		border: 1px solid #dce2dc;
		border-radius: 6px;
		background: #fafcf9;
	}

	.metrics span {
		display: block;
		color: #617066;
		font-size: 13px;
	}

	.metrics strong {
		display: block;
		margin-top: 6px;
		font-size: 24px;
	}

	@media (max-width: 980px) {
		.layout {
			grid-template-columns: 1fr;
		}

		.summary-panel {
			position: static;
		}
	}

	@media (max-width: 720px) {
		.page-header,
		.reset-form,
		.actions {
			flex-direction: column;
			align-items: stretch;
		}

		.field-grid,
		.metrics {
			grid-template-columns: 1fr;
		}
	}
</style>
