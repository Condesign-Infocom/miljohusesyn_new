<svelte:head>
	<title>Om Miljöhusesyn</title>
</svelte:head>

<script lang="ts">
	let {
		data
	}: {
		data: {
			importedContent: {
				title: string;
				excerpt: string;
				bodyHtml: string;
				bodyParagraphs: string[];
				contentType: string;
			} | null;
		};
	} = $props();

	const renderedBodyHtml = $derived.by(() => {
		if (data.importedContent?.bodyHtml?.trim()) {
			return data.importedContent.bodyHtml;
		}

		return `
			<p>Miljöhusesyn ger dig en samlad överblick över lagstiftning inom miljö, djurskydd, biodling samt foder- och livsmedelssäkerhet. Här finns också arbetsmiljöfrågor för de områden som är särskilt olycksdrabbade i lantbruket.</p>
			<p>Många regler påverkar jordbruksföretag samtidigt. Miljöhusesyn samlar dem i checklistor och faktatexter så att du snabbare kan se vad som gäller för just din verksamhet.</p>
		`;
	});
</script>

<main class="public-page">
	<section class="public-richtext">
		<div>{@html renderedBodyHtml}</div>
	</section>
</main>
