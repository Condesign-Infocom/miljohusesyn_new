<svelte:head>
	<title>Innehållsredaktion - Profilregler</title>
</svelte:head>

<script lang="ts">
	import ContentStudioNav from '$lib/components/admin/ContentStudioNav.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const normalizedSearch = $derived(data.search.trim().toLowerCase());
	const visibleChecklists = $derived.by(() =>
		data.checklists
			.filter((checklist) => !data.checklistId || checklist.id === data.checklistId)
			.map((checklist) => ({
				...checklist,
				groups: checklist.groups
					.map((group) => ({
						...group,
						questions: group.questions.filter((question) =>
							matchesSearch(
								[
									checklist.title,
									checklist.checklistId,
									group.title,
									group.nodeId,
									question.questionText,
									question.nodeId,
									...group.profiles.map((profile) => profile.profileName),
									...question.profiles.map((profile) => profile.profileName)
								],
								normalizedSearch
							)
						)
					}))
					.filter(
						(group) =>
							group.questions.length > 0 ||
							matchesSearch(
								[
									checklist.title,
									checklist.checklistId,
									group.title,
									group.nodeId,
									...group.profiles.map((profile) => profile.profileName)
								],
								normalizedSearch
							)
					)
			}))
			.filter((checklist) => checklist.groups.length > 0)
	);
	const directQuestionProfileCount = $derived(
		data.checklists.reduce(
			(count, checklist) =>
				count +
				checklist.groups.reduce(
					(groupCount, group) =>
						groupCount +
						group.questions.reduce(
							(questionCount, question) => questionCount + question.profiles.length,
							0
						),
					0
				),
			0
		)
	);

	function matchesSearch(values: string[], search: string) {
		if (!search) {
			return true;
		}

		return values.some((value) => value.toLowerCase().includes(search));
	}

	function availableProfiles(
		catalog: PageData['profileCatalog'],
		assigned: Array<{ profileKey: string }>
	) {
		const assignedKeys = new Set(assigned.map((profile) => profile.profileKey));
		return catalog.filter((profile) => !assignedKeys.has(profile.profileKey));
	}

	function profileLabel(count: number) {
		return count === 1 ? 'profil' : 'profiler';
	}
</script>

<main class="admin-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">Innehållsredaktion</p>
			<h1>Profilregler</h1>
			<p class="lead">Tilldela befintliga profiler direkt till checklistgrupper och frågor. Frågor visar både gruppens profiler och sina egna direkta profiler.</p>
		</div>
	</header>

	<ContentStudioNav active="profiles" />

	<section class="metrics-grid">
		<div class="metric-card">
			<span>Profilkatalog</span>
			<strong>{data.profileCatalog.length}</strong>
			<small>{profileLabel(data.profileCatalog.length)} i senaste snapshot</small>
		</div>
		<div class="metric-card">
			<span>Checklistor</span>
			<strong>{data.checklists.length}</strong>
			<small>med grupper och frågor</small>
		</div>
		<div class="metric-card accent">
			<span>Direkta frågeprofiler</span>
			<strong>{directQuestionProfileCount}</strong>
			<small>utöver gruppnivån</small>
		</div>
	</section>

	<section class="content-panel">
		<div class="section-bar">
			<div>
				<strong>{visibleChecklists.length}</strong>
				<span>{visibleChecklists.length === 1 ? 'checklista visas' : 'checklistor visas'}</span>
			</div>
			{#if data.latestSnapshot}
				<small>{data.latestSnapshot.sourceLabel} · {data.latestSnapshot.id}</small>
			{/if}
		</div>

		{#if data.successMessage}
			<p class="success-message">{data.successMessage}</p>
		{/if}

		<form class="filter-bar" method="GET">
			<label>
				<span>Sök</span>
				<input name="q" type="search" value={data.search} placeholder="profil, grupp, fråga eller node-id" />
			</label>
			<label>
				<span>Checklista</span>
				<select name="checklist">
					<option value="">Alla checklistor</option>
					{#each data.checklists as checklist (checklist.id)}
						<option value={checklist.id} selected={data.checklistId === checklist.id}>{checklist.title}</option>
					{/each}
				</select>
			</label>
			<button type="submit">Filtrera</button>
		</form>

		{#if data.profileCatalog.length === 0}
			<p class="empty-state">Profilkatalogen saknas i senaste snapshot.</p>
		{:else if visibleChecklists.length === 0}
			<p class="empty-state">Inga grupper eller frågor matchar filtret.</p>
		{:else}
			<div class="rules-stack">
				{#each visibleChecklists as checklist (checklist.id)}
					<section class="checklist-block">
						<div class="checklist-heading">
							<div>
								<h2>{checklist.title}</h2>
								<small>{checklist.checklistId} · {checklist.qaType}</small>
							</div>
							<a href={`/admin/content-studio/checklists/${checklist.id}`}>Öppna struktur</a>
						</div>

						{#each checklist.groups as group (group.id)}
							<section class="group-block">
								<div class="group-heading">
									<div>
										<h3>{group.title}</h3>
										<small>{group.nodeId}</small>
									</div>
									<div class="profile-editor">
										<div class="pill-row" aria-label="Grupprofiler">
											{#if group.profiles.length === 0}
												<span class="muted-pill">Saknas</span>
											{:else}
												{#each group.profiles as profile (profile.profileKey)}
													<form method="POST" action="?/removeGroupProfile">
														<input type="hidden" name="groupId" value={group.id} />
														<input type="hidden" name="profileKey" value={profile.profileKey} />
														<button class="profile-pill" type="submit" title="Ta bort grupprofil">
															{profile.profileName}
														</button>
													</form>
												{/each}
											{/if}
										</div>
										<form class="add-profile-form" method="POST" action="?/addGroupProfile">
											<input type="hidden" name="groupId" value={group.id} />
											<select
												name="profileKey"
												required
												disabled={availableProfiles(data.profileCatalog, group.profiles).length === 0}
											>
												<option value="">Lägg till grupprofil</option>
												{#each availableProfiles(data.profileCatalog, group.profiles) as profile (profile.profileKey)}
													<option value={profile.profileKey}>{profile.profileName}</option>
												{/each}
											</select>
											<button
												type="submit"
												disabled={availableProfiles(data.profileCatalog, group.profiles).length === 0}
											>
												Lägg till
											</button>
										</form>
									</div>
								</div>

								<div class="question-table">
									<table>
										<thead>
											<tr>
												<th>Fråga</th>
												<th>Gruppprofiler</th>
												<th>Direkta frågeprofiler</th>
												<th>Lägg till</th>
											</tr>
										</thead>
										<tbody>
											{#each group.questions as question (question.id)}
												<tr>
													<td>
														<div class="question-cell">
															<strong>{question.questionText || 'Namnlös fråga'}</strong>
															<small>{question.nodeId}</small>
														</div>
													</td>
													<td>
														<div class="pill-row">
															{#if question.groupProfiles.length === 0}
																<span class="muted-pill">Saknas</span>
															{:else}
																{#each question.groupProfiles as profile (profile.profileKey)}
																	<span class="inherited-pill">{profile.profileName}</span>
																{/each}
															{/if}
														</div>
													</td>
													<td>
														<div class="pill-row">
															{#if question.profiles.length === 0}
																<span class="muted-pill">Saknas</span>
															{:else}
																{#each question.profiles as profile (profile.profileKey)}
																	<form method="POST" action="?/removeQuestionProfile">
																		<input type="hidden" name="questionId" value={question.id} />
																		<input type="hidden" name="profileKey" value={profile.profileKey} />
																		<button class="profile-pill" type="submit" title="Ta bort frågeprofil">
																			{profile.profileName}
																		</button>
																	</form>
																{/each}
															{/if}
														</div>
													</td>
													<td>
														<form class="add-profile-form compact" method="POST" action="?/addQuestionProfile">
															<input type="hidden" name="questionId" value={question.id} />
															<select
																name="profileKey"
																required
																disabled={availableProfiles(data.profileCatalog, question.profiles).length === 0}
															>
																<option value="">Välj profil</option>
																{#each availableProfiles(data.profileCatalog, question.profiles) as profile (profile.profileKey)}
																	<option value={profile.profileKey}>{profile.profileName}</option>
																{/each}
															</select>
															<button
																type="submit"
																disabled={availableProfiles(data.profileCatalog, question.profiles).length === 0}
															>
																Lägg till
															</button>
														</form>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</section>
						{/each}
					</section>
				{/each}
			</div>
		{/if}
	</section>
</main>

<style>
	:global(body) {
		background: #f4f4ef;
	}

	main {
		max-width: 1900px;
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
	h2,
	h3 {
		margin: 0;
	}

	h1 {
		font-size: 34px;
		font-weight: 500;
	}

	h2 {
		font-size: 22px;
		font-weight: 600;
	}

	h3 {
		font-size: 18px;
		font-weight: 600;
	}

	.lead {
		max-width: 76ch;
		margin: 12px 0 0;
		line-height: 1.5;
	}




	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 14px;
		margin-top: 18px;
	}

	.metric-card,
	.content-panel,
	.checklist-block,
	.group-block {
		border: 1px solid #d1d7ce;
		border-radius: 6px;
		background: #ffffff;
	}

	.metric-card {
		padding: 16px;
	}

	.metric-card span,
	.metric-card small,
	.section-bar small,
	.checklist-heading small,
	.group-heading small,
	.question-cell small {
		color: #5d675f;
	}

	.metric-card strong {
		display: block;
		margin-top: 6px;
		font-size: 30px;
		font-weight: 600;
		color: #14261c;
	}

	.metric-card small {
		display: block;
		margin-top: 8px;
		line-height: 1.45;
	}

	.accent {
		border-color: #edc58f;
		background: #fff9f1;
	}

	.content-panel {
		margin-top: 18px;
		padding: 18px;
		overflow: hidden;
	}

	.section-bar,
	.checklist-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 18px;
	}

	.group-heading {
		display: grid;
		grid-template-columns: minmax(260px, 0.95fr) minmax(340px, 1.35fr);
		gap: 14px;
		align-items: start;
	}

	.section-bar {
		padding-bottom: 14px;
		border-bottom: 1px solid #e2e5de;
	}

	.section-bar strong {
		font-size: 24px;
	}

	.section-bar span {
		margin-left: 8px;
		color: #5d675f;
	}

	.success-message {
		margin: 14px 0 0;
		border: 1px solid #8db89a;
		border-radius: 6px;
		padding: 10px 12px;
		background: #edf8ef;
		color: #245832;
		font-weight: 700;
	}

	.filter-bar,
	.add-profile-form {
		display: flex;
		align-items: end;
		gap: 10px;
	}

	.filter-bar {
		flex-wrap: wrap;
		margin-top: 16px;
	}

	label {
		display: grid;
		gap: 5px;
		color: #465149;
		font-size: 13px;
		font-weight: 700;
	}

	input,
	select,
	button {
		min-height: 36px;
		border-radius: 5px;
		font: inherit;
	}

	input,
	select {
		border: 1px solid #b9c5bb;
		background: #ffffff;
		padding: 7px 9px;
	}

	input[type='search'] {
		min-width: min(420px, 82vw);
	}

	button {
		border: 1px solid #007a5b;
		background: #007a5b;
		padding: 7px 12px;
		color: #ffffff;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
	}

	button:disabled,
	select:disabled {
		opacity: 0.58;
		cursor: not-allowed;
	}

	.rules-stack,
	.checklist-block,
	.group-block {
		display: grid;
		gap: 14px;
		min-width: 0;
	}

	.rules-stack {
		margin-top: 18px;
	}

	.checklist-block {
		padding: 16px;
	}

	.checklist-heading a {
		color: #007a5b;
		font-weight: 700;
		text-decoration: none;
	}

	.group-block {
		padding: 14px;
		background: #fbfcf9;
		min-width: 0;
	}

	.profile-editor {
		display: grid;
		justify-items: stretch;
		gap: 8px;
		min-width: 0;
	}

	.pill-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		justify-content: flex-end;
	}

	.profile-pill,
	.inherited-pill,
	.muted-pill {
		display: inline-flex;
		align-items: center;
		min-height: 28px;
		border-radius: 999px;
		padding: 4px 9px;
		font-size: 13px;
		font-weight: 700;
	}

	.profile-pill {
		border-color: #007a5b;
		background: #e8f5ed;
		color: #165334;
	}

	.inherited-pill {
		border: 1px solid #9eb8c4;
		background: #edf6f9;
		color: #234a5b;
	}

	.muted-pill {
		border: 1px solid #d4d7d1;
		background: #f2f2ed;
		color: #69716b;
	}

	.add-profile-form.compact {
		align-items: center;
	}

	.add-profile-form {
		display: grid;
		grid-template-columns: minmax(180px, 1fr) max-content;
		align-items: center;
		width: 100%;
	}

	.add-profile-form select {
		width: 100%;
		min-width: 0;
	}

	.add-profile-form.compact select {
		max-width: none;
	}

	.question-table {
		overflow-x: auto;
		border: 1px solid #e2e5de;
		border-radius: 6px;
		background: #ffffff;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 760px;
	}

	th,
	td {
		padding: 10px 12px;
		border-bottom: 1px solid #e8ebe5;
		text-align: left;
		vertical-align: top;
	}

	th {
		background: #f6f7f2;
		color: #3f4a42;
		font-size: 13px;
		white-space: nowrap;
	}

	tr:last-child td {
		border-bottom: 0;
	}

	.question-cell {
		display: grid;
		gap: 5px;
		min-width: 240px;
	}

	.empty-state {
		margin: 18px 0 0;
		border: 1px dashed #c4cbbb;
		border-radius: 6px;
		padding: 18px;
		background: #fbfcf9;
		color: #5d675f;
	}

	@media (max-width: 820px) {
		main {
			padding-inline: 14px;
		}

		.section-bar,
		.checklist-heading,
		.group-heading,
		.filter-bar {
			display: grid;
			justify-items: stretch;
		}

		.profile-editor {
			justify-items: stretch;
			min-width: 0;
		}

		input[type='search'] {
			min-width: 0;
			width: 100%;
		}

		.pill-row {
			justify-content: flex-start;
		}
	}

	@media (max-width: 560px) {
		.add-profile-form {
			grid-template-columns: 1fr;
		}
	}
</style>
