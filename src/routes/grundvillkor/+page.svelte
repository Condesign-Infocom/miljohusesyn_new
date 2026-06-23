<svelte:head>
	<title>Grundvillkor</title>
</svelte:head>

<script lang="ts">
	import { resolve } from '$app/paths';

	let { data }: { data: { user?: App.Locals['user'] | null } } = $props();

	const route = (path: string) => (resolve as unknown as (pathname: string) => string)(path);
</script>

<main class="public-page">
	<section class="public-richtext">
		<p>
			Grundvillkor är regler som du som söker jordbrukarstöd behöver följa för att få full
			utbetalning av stödet. Genom att följa grundvillkoren bidrar du till att bevara
			jordbruksmarken i gott skick.
		</p>
		<p>
			Du bidrar också till att förbättra den yttre miljön för människor och djur, förbättra
			klimatet, minska smittspridningen och få säkrare livsmedel. Grundvillkoren är indelade i
			verksamhetskrav och normer.
		</p>
		<p>
			Du kan se alla grundvillkor inom Allmänna Gårdskrav, Växtodling och Djurhållning i
			{#if data.user}
				<a href={route('/checklists')}>Lista grundvillkor</a>.
			{:else}
				<a href={route('/login?redirectTo=%2Fgrundvillkor')}>Lista grundvillkor</a>.
			{/if}
		</p>

		<h2>Verksamhetskrav</h2>
		<p>
			Verksamhetskrav är regler som redan finns i svensk lagstiftning och som gäller all
			jordbruksverksamhet, oavsett om du söker jordbrukarstöd eller inte.
		</p>

		<h2>Normer</h2>
		<p>
			Normerna är miljö- och klimatrelaterade grundvillkorsmål som alla medlemsstater måste nå upp
			till inom den gemensamma jordbrukspolitiken.
		</p>

		<h2>Faktabank om grundvillkoren</h2>
		<p>
			Jordbruksverket har tagit fram kontrollinstruktioner för grundvillkorskontroller. Läs mer om
			Kontroll inom jordbrukarstöd och grundvillkor på
			<a href="https://jordbruksverket.se/" target="_blank" rel="noreferrer">jordbruksverket.se</a>.
		</p>

		{#if data.user}
			<p><a href={route('/checklists')}>Gå vidare till dina checklistor</a></p>
		{/if}
	</section>
</main>
