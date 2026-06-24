<svelte:head>
	<title>Kontakt</title>
</svelte:head>

<script lang="ts">
	import { contactDetails } from '$lib/public-site';
</script>

<main class="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
	<section class="grid gap-8 md:grid-cols-[minmax(0,1fr)_22rem] md:items-start">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">Kontakt</p>
			<h2 class="font-display mt-3 text-4xl font-semibold tracking-tight text-bark md:text-6xl">
				Support för användning, innehåll och inloggning.
			</h2>
			<p class="mt-4 max-w-3xl text-base leading-7 text-ink/75 md:text-lg">
				Har du frågor om hur du arbetar i tjänsten eller behöver hjälp att hitta rätt material kan
				du kontakta supporten direkt.
			</p>
			<p class="mt-3 max-w-3xl text-sm leading-7 text-mute md:text-base">
				Behöver du juridisk tolkning eller myndighetsbesked bör du även kontakta ansvarig myndighet
				för det aktuella området.
			</p>
		</div>

		<div class="grid gap-3">
			<a href={`mailto:${contactDetails.email}`} class="rounded-[1.5rem] border border-line bg-white/70 p-5 transition hover:border-leaf">
				<p class="text-xs font-semibold uppercase tracking-[0.16em] text-mute">E-post</p>
				<p class="font-display mt-3 text-2xl font-semibold tracking-tight text-bark">
					{contactDetails.email}
				</p>
			</a>
			<a href={`tel:${contactDetails.phone}`} class="rounded-[1.5rem] border border-line bg-white/70 p-5 transition hover:border-leaf">
				<p class="text-xs font-semibold uppercase tracking-[0.16em] text-mute">Telefon</p>
				<p class="font-display mt-3 text-2xl font-semibold tracking-tight text-bark">
					{contactDetails.phone}
				</p>
			</a>
		</div>
	</section>
</main>
