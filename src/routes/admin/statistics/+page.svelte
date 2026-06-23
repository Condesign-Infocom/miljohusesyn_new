<svelte:head>
	<title>Admin - Statistik</title>
</svelte:head>

<script lang="ts">
	let {
		data
	}: {
		data: {
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
					profileUpdateCount30Days: number;
					profileUpdateUserCount30Days: number;
					publicationJobCount30Days: number;
					queuedPublicationJobCount30Days: number;
					runningPublicationJobCount30Days: number;
					successfulPublicationJobCount30Days: number;
					failedPublicationJobCount30Days: number;
					retryablePublicationJobCount30Days: number;
					publicationRetryCount30Days: number;
					publicationJobUserCount30Days: number;
					publicationDeliveryCount30Days: number;
					publicationDeliveryUserCount30Days: number;
				};
				pdfExportCount: number;
				pdfExportUserCount: number;
				profileUpdateCount: number;
				profileUpdateUserCount: number;
				publicationJobCount: number;
				queuedPublicationJobCount: number;
				runningPublicationJobCount: number;
				successfulPublicationJobCount: number;
				failedPublicationJobCount: number;
				retryablePublicationJobCount: number;
				publicationRetryCount: number;
				publicationJobUserCount: number;
				publicationDeliveryCount: number;
				publicationDeliveryUserCount: number;
				queueHealth: {
					oldestQueuedJobAgeMinutes: number | null;
					oldestRunningJobAgeMinutes: number | null;
					nextRetryInMinutes: number | null;
				};
				publicationKindBreakdown: Array<{
					publicationKind: string;
					jobCount: number;
					deliveryCount: number;
					failedJobCount: number;
				}>;
				checklistBreakdown: Array<{
					checklistId: number;
					title: string;
					assignedUserCount: number;
					usersWithAnswersCount: number;
					answeredQuestionCount: number;
					noAnswerCount: number;
					dueDateCount: number;
				}>;
			};
		};
	} = $props();
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Admin</p>
			<h1>Statistik</h1>
			<p class="lead">Modern operativ statistik från appdatabasen. Den här sidan täcker användning, registrering, svarsaktivitet, profiluppdateringar, PDF-exporter, publiceringsjobb, leveranser och åtgärdstryck.</p>
		</div>
	</header>

	<nav class="admin-nav" aria-label="Admin navigation">
		<a href="/admin/users">Användare</a>
		<a aria-current="page" href="/admin/statistics">Statistik</a>
		<a href="/admin/content-studio">Innehållsredaktion</a>
	</nav>

	<section class="hero-grid">
		<div class="hero-card">
			<span>Aktiva användare 30 dagar</span>
			<strong>{data.reporting.recent.activeUserCount30Days}</strong>
			<small>{data.reporting.recent.sessionCount30Days} sessioner under perioden</small>
		</div>
		<div class="hero-card">
			<span>Nya användare 30 dagar</span>
			<strong>{data.reporting.recent.newUserCount30Days}</strong>
			<small>{data.reporting.usersWithProfilesCount} med profiler</small>
		</div>
		<div class="hero-card accent">
			<span>Förfallna åtgärder</span>
			<strong>{data.reporting.overdueActionCount}</strong>
			<small>{data.reporting.noAnswerCount} nej-svar totalt</small>
		</div>
		<div class="hero-card">
			<span>Besvarade frågor</span>
			<strong>{data.reporting.answeredQuestionCount}</strong>
			<small>{data.reporting.usersWithAnswersCount} användare har svarat</small>
		</div>
		<div class="hero-card">
			<span>PDF-exporter 30 dagar</span>
			<strong>{data.reporting.recent.pdfExportCount30Days}</strong>
			<small>{data.reporting.recent.pdfExportUserCount30Days} unika användare</small>
		</div>
		<div class="hero-card accent">
			<span>Publiceringskö 30 dagar</span>
			<strong>{data.reporting.recent.retryablePublicationJobCount30Days}</strong>
			<small>{data.reporting.recent.failedPublicationJobCount30Days} misslyckade jobb och {data.reporting.recent.publicationRetryCount30Days} omförsök</small>
		</div>
	</section>

	<div class="layout">
		<section class="content-panel">
			<div class="section-heading">
				<div>
					<p class="eyebrow">Senaste 30 dagarna</p>
					<h2>Aktivitet och registrering</h2>
				</div>
			</div>

			<div class="report-grid">
				<div class="report-card">
					<h3>Registrering och inloggning</h3>
					<dl>
						<div><dt>Nya användare</dt><dd>{data.reporting.recent.newUserCount30Days}</dd></div>
						<div><dt>Sessioner</dt><dd>{data.reporting.recent.sessionCount30Days}</dd></div>
						<div><dt>Aktiva användare</dt><dd>{data.reporting.recent.activeUserCount30Days}</dd></div>
					</dl>
				</div>

				<div class="report-card">
					<h3>Svar och åtgärder</h3>
					<dl>
						<div><dt>Uppdaterade svar</dt><dd>{data.reporting.recent.updatedAnswerCount30Days}</dd></div>
						<div><dt>Svarande användare</dt><dd>{data.reporting.recent.answeringUserCount30Days}</dd></div>
						<div><dt>Besvarade frågor</dt><dd>{data.reporting.answeredQuestionCount}</dd></div>
						<div><dt>Nej-svar</dt><dd>{data.reporting.noAnswerCount}</dd></div>
						<div><dt>Frågor med datum</dt><dd>{data.reporting.dueDateCount}</dd></div>
						<div><dt>Förfallna åtgärder</dt><dd>{data.reporting.overdueActionCount}</dd></div>
					</dl>
				</div>

				<div class="report-card">
					<h3>PDF och profiler</h3>
					<dl>
						<div><dt>PDF-exporter</dt><dd>{data.reporting.recent.pdfExportCount30Days}</dd></div>
						<div><dt>PDF-användare</dt><dd>{data.reporting.recent.pdfExportUserCount30Days}</dd></div>
						<div><dt>Profiluppdateringar</dt><dd>{data.reporting.recent.profileUpdateCount30Days}</dd></div>
						<div><dt>Profilanvändare</dt><dd>{data.reporting.recent.profileUpdateUserCount30Days}</dd></div>
					</dl>
				</div>

				<div class="report-card alert-card">
					<h3>Publicering och leverans</h3>
					<dl>
						<div><dt>Publiceringsjobb</dt><dd>{data.reporting.recent.publicationJobCount30Days}</dd></div>
						<div><dt>Köade jobb</dt><dd>{data.reporting.recent.queuedPublicationJobCount30Days}</dd></div>
						<div><dt>Körande jobb</dt><dd>{data.reporting.recent.runningPublicationJobCount30Days}</dd></div>
						<div><dt>Lyckade jobb</dt><dd>{data.reporting.recent.successfulPublicationJobCount30Days}</dd></div>
						<div><dt>Misslyckade jobb</dt><dd>{data.reporting.recent.failedPublicationJobCount30Days}</dd></div>
						<div><dt>Retrybara jobb</dt><dd>{data.reporting.recent.retryablePublicationJobCount30Days}</dd></div>
						<div><dt>Omförsök</dt><dd>{data.reporting.recent.publicationRetryCount30Days}</dd></div>
						<div><dt>Leveranser</dt><dd>{data.reporting.recent.publicationDeliveryCount30Days}</dd></div>
						<div><dt>Leveransanvändare</dt><dd>{data.reporting.recent.publicationDeliveryUserCount30Days}</dd></div>
					</dl>
				</div>
			</div>

			<div class="section-heading section-gap">
				<div>
					<p class="eyebrow">Publicering</p>
					<h2>Variantfördelning</h2>
				</div>
			</div>

			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Variant</th>
							<th>Jobb</th>
							<th>Leveranser</th>
							<th>Misslyckade jobb</th>
						</tr>
					</thead>
					<tbody>
						{#each data.reporting.publicationKindBreakdown as row (row.publicationKind)}
							<tr>
								<td><strong>{row.publicationKind}</strong></td>
								<td>{row.jobCount}</td>
								<td>{row.deliveryCount}</td>
								<td>{row.failedJobCount}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="section-heading section-gap">
				<div>
					<p class="eyebrow">Checklistor</p>
					<h2>Belastning per checklista</h2>
				</div>
			</div>

			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Checklista</th>
							<th>Tilldelade</th>
							<th>Med svar</th>
							<th>Besvarade frågor</th>
							<th>Nej-svar</th>
							<th>Datum satta</th>
						</tr>
					</thead>
					<tbody>
						{#each data.reporting.checklistBreakdown as row (row.checklistId)}
							<tr>
								<td><strong>{row.title}</strong></td>
								<td>{row.assignedUserCount}</td>
								<td>{row.usersWithAnswersCount}</td>
								<td>{row.answeredQuestionCount}</td>
								<td>{row.noAnswerCount}</td>
								<td>{row.dueDateCount}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<aside class="summary-panel">
			<section>
				<h2>Köhälsa</h2>
				<div class="metrics">
					<div>
						<span>Äldsta köade jobb</span>
						<strong>{data.reporting.queueHealth.oldestQueuedJobAgeMinutes ?? 0} min</strong>
					</div>
					<div>
						<span>Äldsta körande jobb</span>
						<strong>{data.reporting.queueHealth.oldestRunningJobAgeMinutes ?? 0} min</strong>
					</div>
					<div>
						<span>Nästa retry</span>
						<strong>{data.reporting.queueHealth.nextRetryInMinutes ?? 0} min</strong>
					</div>
				</div>
			</section>

			<section class="summary-section">
				<h2>Totalt sedan start</h2>
				<div class="metrics">
					<div>
						<span>Profiluppdateringar totalt</span>
						<strong>{data.reporting.profileUpdateCount}</strong>
					</div>
					<div>
						<span>PDF-exporter totalt</span>
						<strong>{data.reporting.pdfExportCount}</strong>
					</div>
					<div>
						<span>Publiceringsjobb totalt</span>
						<strong>{data.reporting.publicationJobCount}</strong>
					</div>
					<div>
						<span>Misslyckade jobb totalt</span>
						<strong>{data.reporting.failedPublicationJobCount}</strong>
					</div>
					<div>
						<span>Leveranser totalt</span>
						<strong>{data.reporting.publicationDeliveryCount}</strong>
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
		max-width: 74ch;
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




	.hero-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		margin-top: 24px;
	}

	.hero-card,
	.content-panel,
	.summary-panel {
		background: #fff;
		border: 1px solid #d7ddd6;
		border-radius: 6px;
	}

	.hero-card {
		padding: 18px;
	}

	.hero-card.accent {
		background: #fff9f1;
		border-color: #ead5ae;
	}

	.hero-card span,
	.metrics span {
		display: block;
		color: #617066;
		font-size: 13px;
	}

	.hero-card strong,
	.metrics strong {
		display: block;
		margin-top: 8px;
		font-size: 28px;
	}

	.hero-card small {
		display: block;
		margin-top: 10px;
		color: #617066;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 280px;
		gap: 22px;
		margin-top: 22px;
		align-items: start;
	}

	.content-panel {
		padding: 22px;
	}

	.summary-panel {
		padding: 20px;
		position: sticky;
		top: 20px;
	}

	.summary-section {
		margin-top: 22px;
	}

	.section-heading {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: end;
		margin-bottom: 18px;
	}

	.section-gap {
		margin-top: 26px;
	}

	.report-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}

	.report-card {
		padding: 18px 20px;
		border: 1px solid #dce2dc;
		border-radius: 6px;
		background: #fafcf9;
	}

	.report-card h3 {
		margin: 0 0 16px;
		font-size: 18px;
		color: #215c46;
	}

	.report-card dl {
		margin: 0;
		display: grid;
		gap: 12px;
	}

	.report-card dl div {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 16px;
		align-items: end;
		padding-bottom: 10px;
		border-bottom: 1px solid #e5e9e4;
	}

	.report-card dl div:last-child {
		padding-bottom: 0;
		border-bottom: 0;
	}

	.report-card dt {
		color: #617066;
		font-size: 14px;
		line-height: 1.35;
	}

	.report-card dd {
		margin: 0;
		font-size: 28px;
		font-weight: 700;
		line-height: 1;
	}

	.table-wrap {
		overflow-x: auto;
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

	@media (max-width: 1080px) {
		.hero-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
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
		.hero-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
