<svelte:head>
	<title>Admin - Användare</title>
</svelte:head>

<script lang="ts">
	let {
		data
	}: {
		data: {
			deleted: boolean;
			search: string;
			users: Array<{
				id: number;
				email: string;
				username: string;
				displayName: string;
				role: string;
				companyName: string;
				phone: string;
				createdAt: string;
				checklistCount: number;
				profileCount: number;
			}>;
			stats: {
				userCount: number;
				adminCount: number;
				profileCount: number;
				checklistAssignmentCount: number;
				activityCount: number;
			};
			reporting: {
				userCount: number;
				adminCount: number;
				checklistCount: number;
				assignedUserCount: number;
				usersWithAnswersCount: number;
				answeredQuestionCount: number;
				noAnswerCount: number;
				dueDateCount: number;
				overdueActionCount: number;
				usersWithProfilesCount: number;
				usersWithActivitiesCount: number;
				unassignedUserCount: number;
				usersWithoutAnswersCount: number;
				recent: {
					newUserCount30Days: number;
					sessionCount30Days: number;
					activeUserCount30Days: number;
					updatedAnswerCount30Days: number;
					answeringUserCount30Days: number;
					pdfExportCount30Days: number;
					pdfExportUserCount30Days: number;
				};
				pdfExportCount: number;
				pdfExportUserCount: number;
			};
		};
	} = $props();
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Admin</p>
			<h1>Användare</h1>
			<p class="lead">Hantera demoanvändare, roller och en snabb översikt över profiler och checklistor.</p>
		</div>
		<a class="create-link" href="/admin/users/new">Skapa användare</a>
	</header>

	<nav class="admin-nav" aria-label="Admin navigation">
		<a aria-current="page" href="/admin/users">Användare</a>
		<a href="/admin/statistics">Statistik</a>
		<a href="/admin/content-studio">Innehållsredaktion</a>
	</nav>

	<div class="layout">
		<section class="content-panel">
			{#if data.deleted}
				<p class="status-message">Användaren är borttagen.</p>
			{/if}
			<form class="search-bar" method="GET">
				<label>
					<span>Sök</span>
					<input name="q" type="search" value={data.search} placeholder="Namn, användarnamn, företag eller e-post" />
				</label>
				<button type="submit">Sök</button>
			</form>

			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Användare</th>
							<th>Företag</th>
							<th>Roll</th>
							<th>Checklistor</th>
							<th>Profiler</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each data.users as user (user.id)}
							<tr>
								<td>
									<div class="user-cell">
										<strong>{user.displayName}</strong>
										<span>{user.username}</span>
										<small>{user.email}</small>
									</div>
								</td>
								<td>
									<div class="company-cell">
										<span>{user.companyName || 'Saknas'}</span>
										<small>{user.phone || 'Ingen telefon'}</small>
									</div>
								</td>
								<td>
									<span class:admin={user.role === 'admin'} class="role-pill">{user.role}</span>
								</td>
								<td>{user.checklistCount}</td>
								<td>{user.profileCount}</td>
								<td class="action-cell">
									<a href={`/admin/users/${user.id}`}>Öppna</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<section class="reporting-section">
				<div class="section-heading">
					<div>
						<p class="eyebrow">Rapportering</p>
						<h2>Operativ lägesbild</h2>
					</div>
					<p class="section-copy">Första moderna ersättningen för legacy-statistiken: aktivitet, registrering och checkliste-status från appdatabasen.</p>
				</div>

				<div class="report-grid">
					<div class="report-card">
						<h3>Senaste 30 dagarna</h3>
						<dl>
							<div><dt>Nya användare</dt><dd>{data.reporting.recent.newUserCount30Days}</dd></div>
							<div><dt>Sessioner</dt><dd>{data.reporting.recent.sessionCount30Days}</dd></div>
							<div><dt>Aktiva användare</dt><dd>{data.reporting.recent.activeUserCount30Days}</dd></div>
							<div><dt>Uppdaterade svar</dt><dd>{data.reporting.recent.updatedAnswerCount30Days}</dd></div>
							<div><dt>Svarande användare</dt><dd>{data.reporting.recent.answeringUserCount30Days}</dd></div>
						</dl>
					</div>

					<div class="report-card">
						<h3>Täckning</h3>
						<dl>
							<div><dt>Tilldelade användare</dt><dd>{data.reporting.assignedUserCount}</dd></div>
							<div><dt>Utan tilldelning</dt><dd>{data.reporting.unassignedUserCount}</dd></div>
							<div><dt>Med profiler</dt><dd>{data.reporting.usersWithProfilesCount}</dd></div>
							<div><dt>Med aktiviteter</dt><dd>{data.reporting.usersWithActivitiesCount}</dd></div>
							<div><dt>Utan svar</dt><dd>{data.reporting.usersWithoutAnswersCount}</dd></div>
						</dl>
					</div>

					<div class="report-card alert-card">
						<h3>Åtgärder</h3>
						<dl>
							<div><dt>Besvarade frågor</dt><dd>{data.reporting.answeredQuestionCount}</dd></div>
							<div><dt>Nej-svar</dt><dd>{data.reporting.noAnswerCount}</dd></div>
							<div><dt>Frågor med datum</dt><dd>{data.reporting.dueDateCount}</dd></div>
							<div><dt>Förfallna åtgärder</dt><dd>{data.reporting.overdueActionCount}</dd></div>
							<div><dt>Användare med svar</dt><dd>{data.reporting.usersWithAnswersCount}</dd></div>
						</dl>
					</div>
				</div>

			</section>
		</section>

		<aside class="summary-panel">
			<section>
				<h2>Översikt</h2>
				<div class="metrics">
					<div>
						<span>Användare</span>
						<strong>{data.stats.userCount}</strong>
					</div>
					<div>
						<span>Admin</span>
						<strong>{data.stats.adminCount}</strong>
					</div>
					<div>
						<span>Profiler</span>
						<strong>{data.stats.profileCount}</strong>
					</div>
					<div>
						<span>Checklistkopplingar</span>
						<strong>{data.stats.checklistAssignmentCount}</strong>
					</div>
					<div>
						<span>Aktiviteter</span>
						<strong>{data.stats.activityCount}</strong>
					</div>
					<div>
						<span>Förfallna åtgärder</span>
						<strong>{data.reporting.overdueActionCount}</strong>
					</div>
					<div>
						<span>Aktiva 30 dagar</span>
						<strong>{data.reporting.recent.activeUserCount30Days}</strong>
					</div>
					<div>
						<span>PDF-exporter 30 dagar</span>
						<strong>{data.reporting.recent.pdfExportCount30Days}</strong>
					</div>
				</div>
			</section>
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

	.lead {
		max-width: 62ch;
		margin: 12px 0 0;
		line-height: 1.5;
	}

	.admin-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 12px;
		padding-top: 12px;
	}

	.admin-nav a {
		border: 1px solid #acc6b2;
		border-radius: 999px;
		padding: 7px 14px;
		color: #1f3a2d;
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
	}

	.admin-nav a[aria-current='page'] {
		border-color: #007a5b;
		color: #007a5b;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 280px;
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

	.status-message {
		margin: 0 0 18px;
		padding: 12px 14px;
		border: 1px solid #b7d6c8;
		background: #eef7f1;
		color: #1e5a41;
	}

	.create-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 40px;
		padding: 0 16px;
		border-radius: 5px;
		background: #007a5b;
		color: #fff;
		font-weight: 700;
		text-decoration: none;
	}




	.search-bar {
		display: flex;
		gap: 12px;
		align-items: end;
		margin-bottom: 20px;
	}

	.search-bar label {
		display: grid;
		gap: 7px;
		flex: 1;
		font-size: 14px;
	}

	input,
	button {
		font: inherit;
	}

	input {
		height: 40px;
		padding: 8px 10px;
		border: 1px solid #c9d1cb;
		border-radius: 4px;
	}

	button {
		border: 0;
		border-radius: 5px;
		background: #007a5b;
		color: #fff;
		cursor: pointer;
		height: 40px;
		padding: 0 16px;
	}

	.table-wrap {
		overflow-x: auto;
	}

	.reporting-section {
		margin-top: 28px;
		padding-top: 24px;
		border-top: 1px solid #e3e7e2;
	}

	.section-heading {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: end;
		margin-bottom: 18px;
	}

	.section-copy {
		max-width: 48ch;
		margin: 0;
		color: #617066;
		font-size: 14px;
		line-height: 1.5;
	}

	.report-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		margin-bottom: 18px;
	}

	.report-card {
		padding: 16px;
		border: 1px solid #dce2dc;
		border-radius: 6px;
		background: #fafcf9;
	}

	.report-card h3 {
		margin: 0 0 14px;
		font-size: 18px;
	}

	.report-card dl {
		margin: 0;
		display: grid;
		gap: 10px;
	}

	.report-card dl div {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: baseline;
	}

	.report-card dt {
		color: #617066;
		font-size: 14px;
	}

	.report-card dd {
		margin: 0;
		font-size: 22px;
		font-weight: 700;
	}

	.alert-card {
		background: #fff9f1;
		border-color: #ead5ae;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 14px 12px;
		border-bottom: 1px solid #e3e7e2;
		text-align: left;
		vertical-align: top;
		font-size: 14px;
	}

	th {
		color: #627166;
		font-size: 13px;
		font-weight: 700;
	}

	.user-cell,
	.company-cell {
		display: grid;
		gap: 4px;
	}

	.user-cell span,
	.company-cell small {
		color: #627166;
	}

	.role-pill {
		display: inline-block;
		padding: 4px 9px;
		border: 1px solid #d3dad4;
		border-radius: 999px;
		background: #f6f8f5;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.role-pill.admin {
		border-color: #b9d8ca;
		background: #eef7f1;
		color: #1f6547;
	}

	.action-cell {
		white-space: nowrap;
	}

	a {
		color: #00754c;
		font-weight: 700;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}

	.summary-panel {
		padding: 20px;
		position: sticky;
		top: 20px;
	}

	.metrics {
		display: grid;
		gap: 12px;
		margin-top: 16px;
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

		.report-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.search-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.section-heading {
			flex-direction: column;
			align-items: start;
		}
	}
</style>
