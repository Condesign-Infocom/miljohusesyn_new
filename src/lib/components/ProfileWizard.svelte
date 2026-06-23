<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		activityOptions,
		animalGroupOptions,
		animalOptions,
		certificationOptions,
		farmSettingOptions,
		foodProcessingOptions,
		obligationSettingOptions,
		reportObligationAnswerOptions,
		reportObligationQuestionOptions
	} from '$lib/profile-config';
	import {
		computeObligationSummary,
		hasCropActivity
	} from '$lib/profile-logic';
	import { validateEditableProfileInput } from '$lib/profile-validation';
	import type { EditableProfileData, EditableProfileInput } from '$lib/types/profile';

	type FormState = {
		errors?: Record<string, string>;
		values?: EditableProfileInput;
	};

	type Step = {
		id: string;
		title: string;
		description: string;
		visible: boolean;
		completed: boolean;
	};

	function serializeDraft(values: EditableProfileInput) {
		return JSON.stringify(values);
	}

	function createDraftSeed(profile: EditableProfileData, values?: EditableProfileInput): EditableProfileInput {
		return structuredClone(values ?? {
			displayName: profile.displayName,
			phone: profile.phone,
			companyName: profile.companyName,
			companyOrgNum: profile.companyOrgNum,
			companyAddress1: profile.companyAddress1,
			companyPostcode: profile.companyPostcode,
			companyCity: profile.companyCity,
			areas: profile.areas,
			activities: profile.activities,
			certifications: profile.certifications,
			foodProcessing: profile.foodProcessing,
			settings: profile.settings,
			animals: profile.animals,
			obligationAnswers: profile.obligationAnswers
		});
	}

	let {
		profile,
		saved,
		form,
		eyebrow = 'Profil',
		title = 'Mina Uppgifter',
		lead = 'Vi visar samma uppgifter som i den gamla registreringen, men i ett modernare arbetsläge. Dina val styr vilka checklistor och frågor som visas.',
		backRoute,
		backRouteParams,
		backLabel,
		loginLead = 'Användarnamn och e-post ligger kvar som referens medan vi bygger ut resten av den gamla registreringsupplevelsen.',
		saveLabel = 'Spara uppgifter'
	}: {
		profile: EditableProfileData;
		saved: boolean;
		form?: FormState;
		eyebrow?: string;
		title?: string;
		lead?: string;
		backRoute?: string;
		backRouteParams?: Record<string, string>;
		backLabel?: string;
		loginLead?: string;
		saveLabel?: string;
	} = $props();

	const getDraftSeed = () => createDraftSeed(profile, form?.values);
	let draft = $state<EditableProfileInput>(getDraftSeed());
	const baselineDraft = $derived(getDraftSeed());
	const isDirty = $derived(serializeDraft(draft) !== serializeDraft(baselineDraft));
	const liveErrors = $derived(validateEditableProfileInput(draft));
	const errors = $derived(
		Object.keys(liveErrors).length > 0 ? liveErrors : (form?.errors ?? {})
	);

	const hasAnimals = $derived(Object.values(draft.animals).some((amount) => amount > 0));
	const cropActivitySelected = $derived(hasCropActivity(draft.activities));
	const computedObligations = $derived(computeObligationSummary(draft));
	const commonFoodQuestions = $derived(
		draft.foodProcessing.animalProducts || draft.foodProcessing.vegetableProducts ?
			reportObligationQuestionOptions.filter((question) => question.scope === 'both')
		:	[]
	);
	const vegetableFoodQuestions = $derived(
		draft.foodProcessing.vegetableProducts ?
			reportObligationQuestionOptions.filter((question) => question.scope === 'vegetable')
		:	[]
	);
	const groupedAnimalOptions = $derived(
		animalGroupOptions.map((group) => ({
			...group,
			options: animalOptions.filter((option) => option.group === group.key)
		}))
	);
	const steps = $derived<Step[]>([
		{
			id: 'login',
			title: 'Inloggningsuppgifter',
			description: profile.username,
			visible: true,
			completed: true
		},
		{
			id: 'company',
			title: 'Mitt företag',
			description: draft.companyName || 'Ange företagsuppgifter',
			visible: true,
			completed: Boolean(draft.companyName.trim() && draft.companyOrgNum.trim())
		},
		{
			id: 'activities',
			title: 'Mina verksamheter',
			description:
				Object.values(draft.activities).some(Boolean) ? 'Valda verksamheter' : 'Välj verksamheter',
			visible: true,
			completed: Object.values(draft.activities).some(Boolean) || hasAnimals
		},
		{
			id: 'animals',
			title: 'Djurhållning',
			description: hasAnimals ? `${computedObligations.animalUnits} djurenheter` : 'Ange djur och bete',
			visible: draft.activities.djurhallning || hasAnimals,
			completed: !draft.activities.djurhallning || Boolean(draft.areas.pastureHa.trim())
		},
		{
			id: 'crop',
			title: 'Odling och trädgård',
			description: draft.areas.cropHa ? `${draft.areas.cropHa} ha` : 'Ange odlingsareal',
			visible: cropActivitySelected,
			completed: !cropActivitySelected || Boolean(draft.areas.cropHa.trim())
		},
		{
			id: 'obligations',
			title: 'Tillstånds- & anmälningsplikt',
			description:
				computedObligations.tillstandsplikt ? 'Tillståndspliktig'
				: computedObligations.anmalningsplikt ? 'Anmälningspliktig'
				:	'Beräknad från dina uppgifter',
			visible: true,
			completed: true
		}
	].filter((step) => step.visible));

	let requestedStepId = $state('company');
	const currentStepId = $derived(
		steps.some((step) => step.id === requestedStepId) ? requestedStepId : (steps[0]?.id ?? 'company')
	);
	const currentStepIndex = $derived(Math.max(steps.findIndex((step) => step.id === currentStepId), 0));

	function goToStep(stepId: string) {
		requestedStepId = stepId;
	}

	function goToOffset(offset: number) {
		const nextStep = steps[currentStepIndex + offset];
		if (nextStep) {
			requestedStepId = nextStep.id;
		}
	}
</script>

<main class="wizard-page">
	<header class="page-header">
		<div>
			<p class="eyebrow">{eyebrow}</p>
			<h1>{title}</h1>
			<p class="lead">{lead}</p>
		</div>
		<div class="header-actions">
			{#if saved}
				<p class="saved-message" role="status">Ändringarna är sparade.</p>
			{/if}
			{#if backRoute && backLabel}
				<a class="back-link" href={resolve(backRoute, backRouteParams ?? {})}>{backLabel}</a>
			{/if}
		</div>
	</header>

	<section class="status-strip" aria-label="Direktstatus">
		<div class="status-card">
			<span>Djurenheter</span>
			<strong>{computedObligations.animalUnits}</strong>
		</div>
		<div class="status-card">
			<span>Anmälningsplikt</span>
			<strong>{computedObligations.anmalningsplikt ? 'JA' : 'NEJ'}</strong>
		</div>
		<div class="status-card">
			<span>Tillståndsplikt</span>
			<strong>{computedObligations.tillstandsplikt ? 'JA' : 'NEJ'}</strong>
		</div>
	</section>

	<div class="wizard-layout">
		<div class="wizard-rail">
			<nav class="wizard-nav" aria-label="Registreringssteg">
				<ol>
					{#each steps as step (step.id)}
						<li class:active={step.id === currentStepId} class:completed={step.completed}>
							<button type="button" onclick={() => goToStep(step.id)} aria-current={step.id === currentStepId ? 'step' : undefined}>
								<span class="step-heading">
									<span class="step-title">{step.title}</span>
									{#if step.completed}
										<span class="step-status">Klar</span>
									{/if}
								</span>
								<span class="step-desc">{step.description}</span>
							</button>
						</li>
					{/each}
				</ol>
			</nav>

			<section class="save-panel">
				<h2>{saveLabel}</h2>
				<p>Spara när du vill. Uppdateringen påverkar direkt vilka frågor och regler som visas.</p>
				<button type="submit" form="profile-form" disabled={!isDirty}>{saveLabel}</button>
			</section>
		</div>

		<form class="wizard-form" method="POST" id="profile-form">
			{#if Object.keys(errors).length > 0}
				<div class="alert" role="alert">
					<h2>Kontrollera uppgifterna</h2>
					<ul>
						{#each Object.values(errors) as message (message)}
							<li>{message}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<section class="step-panel" class:step-hidden={currentStepId !== 'login'}>
				<h2>Inloggningsuppgifter</h2>
				<p class="step-lead">{loginLead}</p>
				<div class="field-grid">
					<label>
						<span>Användarnamn</span>
						<input type="text" value={profile.username} disabled />
					</label>
					<label>
						<span>E-post</span>
						<input type="email" value={profile.email} disabled />
					</label>
					<label>
						<span>Namn i systemet</span>
						<input
							name="displayName"
							type="text"
							bind:value={draft.displayName}
							aria-invalid={errors.displayName ? 'true' : 'false'}
						/>
					</label>
					<label>
						<span>Telefon</span>
						<input name="phone" type="text" bind:value={draft.phone} />
					</label>
				</div>
			</section>

			<section class="step-panel" class:step-hidden={currentStepId !== 'company'}>
				<h2>Mitt företag</h2>
				<p class="step-lead">Fyll i företagsuppgifter och de basfrågor som styr arbetsmiljö och gårdskrav.</p>
				<div class="field-grid">
					<label class="wide">
						<span>Företagsnamn / Namn</span>
						<input
							name="companyName"
							type="text"
							bind:value={draft.companyName}
							aria-invalid={errors.companyName ? 'true' : 'false'}
						/>
					</label>
					<label>
						<span>Organisationsnummer</span>
						<input name="companyOrgNum" type="text" bind:value={draft.companyOrgNum} />
					</label>
					<label class="wide">
						<span>Adress</span>
						<input name="companyAddress1" type="text" bind:value={draft.companyAddress1} />
					</label>
					<label>
						<span>Postnummer</span>
						<input name="companyPostcode" type="text" bind:value={draft.companyPostcode} />
					</label>
					<label>
						<span>Postadress</span>
						<input name="companyCity" type="text" bind:value={draft.companyCity} />
					</label>
				</div>

				<div class="checkbox-list separated">
					{#each farmSettingOptions as option (option.key)}
						<label class="toggle-row">
							<input name={option.key} type="checkbox" bind:checked={draft.settings[option.key]} />
							<span>{option.label}</span>
						</label>
					{/each}
				</div>
			</section>

			<section class="step-panel" class:step-hidden={currentStepId !== 'activities'}>
				<h2>Mina verksamheter</h2>
				<p class="step-lead">Valkorten motsvarar de gamla verksamhetsrutorna. De styr vilka steg som blir tillgängliga och vilka checklistor som skapas.</p>
				{#if errors.activities}
					<p class="field-error">{errors.activities}</p>
				{/if}
				<div class="activity-grid">
					{#each activityOptions as option (option.key)}
						<label class:checked={draft.activities[option.key]} class="activity-option">
							<input name={option.key} type="checkbox" bind:checked={draft.activities[option.key]} />
							<span class="activity-title">{option.label}</span>
							{#if 'description' in option && option.description}
								<span class="activity-copy">{option.description}</span>
							{/if}
						</label>
					{/each}
				</div>

				{#if draft.activities.livsmedelsforadling}
					<div class="subpanel">
						<h3>Förädlingsinriktning</h3>
						{#if errors.foodProcessing}
							<p class="field-error">{errors.foodProcessing}</p>
						{/if}
						<div class="checkbox-list">
							{#each foodProcessingOptions as option (option.key)}
								<label class="toggle-row">
									<input
										name={option.key === 'animalProducts' ? 'foodAnimalProcessing' : 'foodVegetableProcessing'}
										type="checkbox"
										bind:checked={draft.foodProcessing[option.key]}
									/>
									<span>
										<strong>{option.label}</strong><br />
										<small>{option.description}</small>
									</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}
			</section>

			{#if draft.activities.djurhallning || hasAnimals}
				<section class="step-panel" class:step-hidden={currentStepId !== 'animals'}>
					<h2>Djurhållning</h2>
					<p class="step-lead">Precis som i den gamla registreringen samlar vi djuruppgifter och beteareal för att räkna fram djurenheter och pliktstatus.</p>
					{#if errors.pastureHa}
						<p class="field-error">{errors.pastureHa}</p>
					{/if}
					<div class="field-grid">
						<label>
							<span>Bete (ha)</span>
							<input name="pastureHa" type="text" bind:value={draft.areas.pastureHa} />
						</label>
						<label>
							<span>Ekologisk certifiering</span>
							<select name="animalCertification" bind:value={draft.certifications.animal}>
								{#each certificationOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</label>
					</div>

					<div class="animal-sections">
						{#each groupedAnimalOptions as group (group.key)}
							<section class="animal-section">
								<h3>{group.label}</h3>
								<div class="animal-grid">
									{#each group.options as option (option.key)}
										<label>
											<span>{option.label}</span>
											<input
												name={option.formKey}
												type="number"
												min="0"
												step="1"
												bind:value={draft.animals[option.key]}
											/>
											<small>1 djurenhet = {option.unitLabel}</small>
										</label>
									{/each}
								</div>
							</section>
						{/each}
					</div>

					<div class="metric-row">
						<div>
							<span class="metric-label">Djurenheter</span>
							<strong>{computedObligations.animalUnits}</strong>
						</div>
						<div>
							<span class="metric-label">Totalt antal djur</span>
							<strong>{computedObligations.totalAnimals}</strong>
						</div>
						<div>
							<span class="metric-label">Nöt/häst-enheter för TP1</span>
							<strong>{computedObligations.cattleUnits}</strong>
						</div>
						<div>
							<span class="metric-label">Fjäderfäplatser för TP3</span>
							<strong>{computedObligations.poultryPlaces}</strong>
						</div>
					</div>
				</section>
			{/if}

			{#if cropActivitySelected}
				<section class="step-panel" class:step-hidden={currentStepId !== 'crop'}>
					<h2>Odling och trädgård</h2>
					<p class="step-lead">Odlingsareal och certifiering bygger samma grund som den gamla odlingssidan, inklusive trädgårdsföretag och potatisodling.</p>
					{#if errors.cropHa}
						<p class="field-error">{errors.cropHa}</p>
					{/if}
					<div class="field-grid">
						<label>
							<span>Åker (ha)</span>
							<input name="cropHa" type="text" bind:value={draft.areas.cropHa} />
						</label>
						<label>
							<span>Ekologisk certifiering</span>
							<select name="cropCertification" bind:value={draft.certifications.crop}>
								{#each certificationOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</label>
					</div>
				</section>
			{/if}

			<section class="step-panel" class:step-hidden={currentStepId !== 'obligations'}>
				<h2>Tillstånd och anmälningsplikt enligt 9 kap. Miljöbalken</h2>
				<p class="step-lead">Statusen räknas fram automatiskt från djuruppgifter och svar om förädling, vilket ligger närmare hur den gamla registreringen fungerade.</p>

				<div class="status-grid">
					<div class="status-box">
						<span>Tillståndspliktig</span>
						<strong class:tint={computedObligations.tillstandsplikt}>
							{computedObligations.tillstandsplikt ? 'JA' : 'NEJ'}
						</strong>
						<small>
							Baserad på över 400 nöt/häst-enheter eller gränsvärden för fjäderfä,
							slaktsvin och suggor i den gamla registreringen.
						</small>
					</div>
					<div class="status-box">
						<span>Anmälningspliktig</span>
						<strong class:tint={computedObligations.anmalningsplikt}>
							{computedObligations.anmalningsplikt ? 'JA' : 'NEJ'}
						</strong>
						<small>Byggs av djurenheter och svar på förädlingsfrågorna nedan.</small>
					</div>
				</div>

				<div class="checkbox-list separated readonly-list">
					{#each obligationSettingOptions as option (option.key)}
						<label class="toggle-row">
							<input
								type="checkbox"
								checked={
									option.key === 'AP1' ? computedObligations.ap1
									: option.key === 'TP1' ? computedObligations.tp1
									: option.key === 'TP3' ? computedObligations.tp3
									: option.key === 'Anmalningsplikt' ? computedObligations.anmalningsplikt
									: computedObligations.tillstandsplikt
								}
								disabled
							/>
							<span>{option.label}</span>
						</label>
					{/each}
				</div>

				<div class="status-notes">
					<p>TP1: {computedObligations.cattleUnits} nöt/häst-enheter.</p>
					<p>
						TP3: {computedObligations.poultryPlaces} fjäderfäplatser,
						{draft.animals.slaughterPigs} slaktsvin,
						{draft.animals.sowAndPiglets} suggor.
					</p>
				</div>

				{#if draft.activities.livsmedelsforadling && (commonFoodQuestions.length > 0 || vegetableFoodQuestions.length > 0)}
					<div class="subpanel">
						<h3>Anmälningsplikt för livsmedelsförädling</h3>
						<p>Minst ett ja-svar gör verksamheten anmälningspliktig så länge den inte redan är tillståndspliktig.</p>
						{#if commonFoodQuestions.length > 0}
								<div class="question-table-block">
									<h4>
										{draft.foodProcessing.animalProducts ? 'Gemensamma frågor och animaliska produkter' : 'Gemensamma frågor'}
									</h4>
								<div class="question-table-wrap">
									<table class="question-table">
										<thead>
											<tr>
												<th>Påstående</th>
												{#each reportObligationAnswerOptions as answer (answer.value)}
													<th>{answer.label}</th>
												{/each}
											</tr>
										</thead>
										<tbody>
											{#each commonFoodQuestions as question (question.key)}
												<tr>
													<th scope="row">{question.label}</th>
													{#each reportObligationAnswerOptions as answer (answer.value)}
														<td>
															<input
																type="radio"
																name={question.key}
																value={answer.value}
																bind:group={draft.obligationAnswers[question.key]}
															/>
														</td>
													{/each}
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/if}

						{#if vegetableFoodQuestions.length > 0}
							<div class="question-table-block">
								<h4>Vegetabiliska produkter och foder</h4>
								<div class="question-table-wrap">
									<table class="question-table">
										<thead>
											<tr>
												<th>Påstående</th>
												{#each reportObligationAnswerOptions as answer (answer.value)}
													<th>{answer.label}</th>
												{/each}
											</tr>
										</thead>
										<tbody>
											{#each vegetableFoodQuestions as question (question.key)}
												<tr>
													<th scope="row">{question.label}</th>
													{#each reportObligationAnswerOptions as answer (answer.value)}
														<td>
															<input
																type="radio"
																name={question.key}
																value={answer.value}
																bind:group={draft.obligationAnswers[question.key]}
															/>
														</td>
													{/each}
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</section>

			<div class="wizard-actions">
				<button type="button" class="secondary" onclick={() => goToOffset(-1)} disabled={currentStepIndex === 0}>
					Tillbaka
				</button>
				<button type="button" onclick={() => goToOffset(1)} disabled={currentStepIndex === steps.length - 1}>
					Fortsätt
				</button>
			</div>
		</form>
	</div>
</main>

<style>
	:global(body) {
		background:
			radial-gradient(circle at top, rgb(200 214 182 / 0.22), transparent 35%),
			linear-gradient(180deg, #fdfbf5 0%, #faf6ec 100%);
	}

	main {
		box-sizing: border-box;
		width: 100%;
		max-width: 1280px;
		margin: 0 auto;
		padding: 40px 24px 72px;
		color: var(--public-ink);
		font-family: 'Source Sans 3', Arial, sans-serif;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		gap: 24px 40px;
		align-items: flex-start;
		padding-bottom: 24px;
		border-bottom: 1px solid color-mix(in srgb, var(--public-line) 88%, white);
	}

	.header-actions {
		display: grid;
		gap: 12px;
		justify-items: end;
	}

	.eyebrow {
		margin: 0 0 10px;
		color: var(--public-leaf);
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0 0 14px;
		color: var(--public-bark);
		font-family: 'Fraunces', Georgia, serif;
		font-size: clamp(2.6rem, 5vw, 4.4rem);
		font-weight: 600;
		line-height: 0.96;
		letter-spacing: -0.04em;
	}

	.lead {
		max-width: 68ch;
		margin: 0;
		font-size: 1.06rem;
		line-height: 1.72;
		color: color-mix(in srgb, var(--public-ink) 80%, white);
	}

	.saved-message {
		margin: 0;
		padding: 12px 16px;
		border: 1px solid color-mix(in srgb, var(--public-leaf) 18%, white);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.7);
		color: var(--public-leaf-2);
		font-size: 0.92rem;
		font-weight: 700;
	}

	.back-link {
		padding: 0;
		border: 0;
		background: transparent;
		box-shadow: none;
		color: var(--public-leaf);
		font-weight: 700;
		text-decoration: none;
	}

	.status-strip {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
		margin-top: 30px;
	}

	.status-card {
		border: 1px solid var(--public-line);
		border-radius: 1.6rem;
		background:
			linear-gradient(180deg, rgb(250 246 236 / 0.95), rgb(250 246 236 / 0.82)),
			radial-gradient(circle at top left, rgb(200 214 182 / 0.22), transparent 52%);
		box-shadow: var(--public-shadow);
		padding: 18px 20px;
	}

	.status-card span {
		display: block;
		color: var(--public-mute);
		font-size: 0.84rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.status-card strong {
		display: block;
		margin-top: 10px;
		color: var(--public-bark);
		font-family: 'Fraunces', Georgia, serif;
		font-size: clamp(2rem, 3vw, 2.6rem);
		font-weight: 600;
		line-height: 0.98;
	}

	.wizard-layout {
		display: grid;
		grid-template-columns: 300px minmax(0, 1fr);
		gap: 24px;
		margin-top: 28px;
		align-items: start;
	}

	.wizard-rail {
		display: grid;
		gap: 18px;
	}

	.wizard-nav,
	.wizard-form,
	.save-panel {
		border: 1px solid var(--public-line);
		border-radius: 1.8rem;
		background:
			linear-gradient(180deg, rgb(250 246 236 / 0.95), rgb(250 246 236 / 0.86)),
			radial-gradient(circle at top left, rgb(200 214 182 / 0.18), transparent 55%);
		box-shadow: var(--public-shadow);
	}

	.wizard-nav {
		padding: 12px;
	}

	.wizard-nav ol {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 10px;
	}

	.wizard-nav li {
		position: relative;
	}

	.wizard-nav button {
		width: 100%;
		padding: 15px 18px;
		background: rgb(255 255 255 / 0.44);
		border: 1px solid color-mix(in srgb, var(--public-line) 84%, white);
		border-radius: 1.35rem;
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.45);
		color: inherit;
		text-align: left;
		cursor: pointer;
		transition:
			border-color 0.18s ease,
			background-color 0.18s ease,
			transform 0.18s ease,
			box-shadow 0.18s ease;
	}

	.wizard-nav li.active button {
		background:
			linear-gradient(180deg, rgb(230 238 219 / 0.95), rgb(222 233 209 / 0.9));
		border-color: color-mix(in srgb, var(--public-sage) 40%, white);
		box-shadow:
			inset 4px 0 0 var(--public-leaf),
			0 14px 28px rgb(30 42 34 / 0.06);
	}

	.wizard-nav button:hover {
		transform: translateY(-1px);
		border-color: color-mix(in srgb, var(--public-sage) 38%, white);
	}

	.step-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.step-title {
		display: block;
		font-size: 1rem;
		font-weight: 700;
		color: var(--public-bark);
	}

	.step-status {
		flex: 0 0 auto;
		border-radius: 999px;
		background: color-mix(in srgb, var(--public-sage-2) 55%, white);
		color: var(--public-leaf-2);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		padding: 0.32rem 0.55rem;
		text-transform: uppercase;
	}

	.step-desc {
		display: block;
		margin-top: 5px;
		font-size: 0.88rem;
		color: color-mix(in srgb, var(--public-ink) 72%, white);
		line-height: 1.45;
	}

	.wizard-form {
		padding: 32px;
	}

	.step-panel h2,
	.save-panel h2,
	.alert h2 {
		margin: 0 0 14px;
		font-family: 'Fraunces', Georgia, serif;
		font-size: clamp(1.8rem, 3vw, 2.5rem);
		font-weight: 600;
		line-height: 1.04;
		color: var(--public-bark);
	}

	.step-hidden {
		display: none;
	}

	.step-lead {
		margin: 0 0 22px;
		color: color-mix(in srgb, var(--public-ink) 76%, white);
		line-height: 1.7;
		font-size: 1rem;
	}

	.field-grid,
	.status-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px 18px;
	}

	.animal-sections {
		display: grid;
		gap: 20px;
		margin-top: 24px;
	}

	.animal-section {
		padding-top: 20px;
		border-top: 1px solid color-mix(in srgb, var(--public-line) 80%, white);
	}

	.animal-section:first-child {
		padding-top: 0;
		border-top: 0;
	}

	.animal-section h3 {
		margin: 0 0 14px;
		font-family: 'Fraunces', Georgia, serif;
		font-size: 1.35rem;
		color: var(--public-bark);
	}

	.animal-grid {
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
		font-size: 0.95rem;
	}

	label span {
		color: var(--public-bark);
	}

	label small {
		color: var(--public-mute);
		line-height: 1.35;
	}

	input,
	select,
	button {
		font: inherit;
	}

	input[type='text'],
	input[type='email'],
	input[type='number'],
	select {
		box-sizing: border-box;
		width: 100%;
		min-height: 48px;
		padding: 10px 14px;
		border: 1px solid color-mix(in srgb, var(--public-line) 88%, white);
		border-radius: 1rem;
		background: rgb(255 255 255 / 0.88);
		color: var(--public-ink);
	}

	input[disabled] {
		background: rgb(240 243 239 / 0.9);
		color: var(--public-mute);
	}

	.checkbox-list {
		display: grid;
		gap: 12px;
	}

	.checkbox-list.separated {
		margin-top: 24px;
		padding-top: 22px;
		border-top: 1px solid color-mix(in srgb, var(--public-line) 80%, white);
	}

	.toggle-row {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px 14px;
		border: 1px solid color-mix(in srgb, var(--public-line) 84%, white);
		border-radius: 1rem;
		background: rgb(255 255 255 / 0.58);
	}

	.toggle-row input {
		width: 18px;
		height: 18px;
		margin-top: 1px;
		accent-color: var(--public-leaf);
	}

	.activity-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
	}

	.activity-option {
		display: block;
		padding: 18px;
		border: 1px solid color-mix(in srgb, var(--public-line) 84%, white);
		border-radius: 1.3rem;
		background: rgb(255 255 255 / 0.65);
		cursor: pointer;
		transition:
			transform 0.18s ease,
			border-color 0.18s ease,
			box-shadow 0.18s ease;
	}

	.activity-option.checked {
		border-color: color-mix(in srgb, var(--public-leaf) 30%, white);
		background: color-mix(in srgb, var(--public-sage-2) 34%, white);
		box-shadow: 0 16px 32px rgb(30 42 34 / 0.06);
	}

	.activity-option:hover {
		transform: translateY(-1px);
	}

	.activity-option input {
		margin: 0 0 10px;
	}

	.activity-title {
		display: block;
		font-weight: 700;
		color: var(--public-bark);
	}

	.activity-copy {
		display: block;
		margin-top: 8px;
		font-size: 0.88rem;
		line-height: 1.45;
		color: color-mix(in srgb, var(--public-ink) 72%, white);
	}

	.subpanel {
		margin-top: 26px;
		padding-top: 24px;
		border-top: 1px solid color-mix(in srgb, var(--public-line) 80%, white);
	}

	.subpanel h3 {
		margin: 0 0 12px;
		font-family: 'Fraunces', Georgia, serif;
		font-size: 1.45rem;
		color: var(--public-bark);
	}

	.question-table-block + .question-table-block {
		margin-top: 20px;
	}

	.question-table-block h4 {
		margin: 0 0 10px;
		font-size: 1rem;
		color: var(--public-bark);
	}

	.metric-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		margin-top: 22px;
	}

	.metric-row > div,
	.status-box {
		padding: 18px 18px;
		border: 1px solid color-mix(in srgb, var(--public-line) 86%, white);
		border-radius: 1.2rem;
		background: rgb(255 255 255 / 0.62);
	}

	.metric-label,
	.status-box span {
		display: block;
		color: var(--public-mute);
		font-size: 0.84rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.metric-row strong,
	.status-box strong {
		display: block;
		margin-top: 8px;
		font-family: 'Fraunces', Georgia, serif;
		font-size: 2rem;
		font-weight: 600;
		color: var(--public-bark);
	}

	.status-box strong.tint {
		color: var(--public-leaf);
	}

	.status-box small {
		display: block;
		margin-top: 8px;
		color: var(--public-mute);
		line-height: 1.45;
	}

	.status-notes {
		margin-top: 18px;
		font-size: 0.95rem;
		color: color-mix(in srgb, var(--public-ink) 74%, white);
	}

	.status-notes p {
		margin: 8px 0 0;
	}

	.question-table-wrap {
		overflow-x: auto;
	}

	.question-table {
		width: 100%;
		border-collapse: collapse;
	}

	.question-table th,
	.question-table td {
		padding: 12px 10px;
		border-bottom: 1px solid color-mix(in srgb, var(--public-line) 80%, white);
		vertical-align: top;
	}

	.question-table thead th {
		font-size: 0.82rem;
		color: var(--public-mute);
		text-align: center;
	}

	.question-table tbody th {
		width: 100%;
		min-width: 420px;
		text-align: left;
		font-size: 0.95rem;
		font-weight: 400;
		line-height: 1.55;
	}

	.question-table td {
		text-align: center;
	}

	.alert {
		margin-bottom: 24px;
		padding: 18px 20px;
		border: 1px solid #e7b8c1;
		border-radius: 1.2rem;
		background: #f8e8ea;
		color: #8c3040;
	}

	.alert ul {
		margin: 0;
		padding-left: 18px;
	}

	.field-error {
		margin: 0 0 14px;
		color: #8c3040;
		font-size: 0.92rem;
	}

	.save-panel {
		padding: 22px;
	}

	.save-panel h2 {
		margin-bottom: 10px;
		font-size: 1.55rem;
	}

	.save-panel p {
		margin: 0 0 14px;
		color: color-mix(in srgb, var(--public-ink) 72%, white);
		font-size: 0.92rem;
		line-height: 1.6;
	}

	.save-panel button {
		width: 100%;
	}

	.wizard-actions {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin-top: 28px;
		padding-top: 22px;
		border-top: 1px solid color-mix(in srgb, var(--public-line) 80%, white);
	}

	button {
		border: 0;
		border-radius: 999px;
		background: var(--public-leaf);
		box-shadow: 0 10px 24px rgb(47 93 58 / 0.18);
		color: var(--public-cream);
		cursor: pointer;
		padding: 13px 20px;
		font-weight: 700;
		transition:
			transform 0.18s ease,
			background-color 0.18s ease,
			border-color 0.18s ease,
			color 0.18s ease;
	}

	button.secondary {
		background: rgb(250 246 236 / 0.88);
		border: 1px solid color-mix(in srgb, var(--public-leaf) 18%, white);
		box-shadow: none;
		color: var(--public-leaf-2);
	}

	button:hover {
		transform: translateY(-1px);
		background: var(--public-leaf-2);
	}

	button.secondary:hover {
		background: rgb(250 246 236 / 1);
		border-color: var(--public-leaf);
		color: var(--public-leaf-2);
	}

	.back-link:hover {
		background: transparent;
		color: var(--public-leaf-2);
		transform: none;
		text-decoration: underline;
	}

	button:disabled {
		opacity: 0.55;
		cursor: default;
		transform: none;
	}

	@media (max-width: 1180px) {
		.status-strip {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 900px) {
		.status-strip,
		.wizard-layout {
			grid-template-columns: 1fr;
		}

		.activity-grid,
		.field-grid,
		.animal-grid,
		.status-grid,
		.metric-row {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		main {
			padding-left: 18px;
			padding-right: 18px;
		}

		.page-header {
			flex-direction: column;
		}

		.header-actions {
			width: 100%;
			justify-items: start;
		}

		h1 {
			font-size: 2.8rem;
		}

		.wizard-form {
			padding: 24px;
		}

		.question-table tbody th {
			min-width: 280px;
		}

		.wizard-actions {
			flex-direction: column;
		}
	}
</style>
