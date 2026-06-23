<svelte:head>
	<title>Miljöhusesyn</title>
</svelte:head>

<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Calculations,
		Contact,
		Faktabank,
		FeatureGrid,
		Hero,
		News,
		PartnersBand,
		type CalculationTool,
		type ContactCard,
		type FaktabankCard,
		type FeatureGridItem,
		type NewsListItem,
		type TemplateLink
	} from '$lib/template';
	import { factTopics, publicCalculatorPages, type PublicNewsItem } from '$lib/public-site';

	let {
		data
	}: {
		data: {
			user?: App.Locals['user'] | null;
			homepageNews: PublicNewsItem[];
		};
	} = $props();

	const route = (path: string) => (resolve as unknown as (pathname: string) => string)(path);

	const heroPrimaryCta = $derived<TemplateLink>(
		data.user ?
			{ label: 'Öppna mina checklistor', href: route('/checklists/miljohusesyn') }
		:	{ label: 'Logga in / Registrera dig', href: route('/login') }
	);

	const featureItems: FeatureGridItem[] = [
		{ icon: 'leaf', label: 'Grundvillkor och tvärvillkor' },
		{ icon: 'leaf', label: 'Djurhållning och djurskydd' },
		{ icon: 'leaf', label: 'Växtodling och gödselhantering' },
		{ icon: 'leaf', label: 'Energi, köldmedia och farligt avfall' },
		{ icon: 'leaf', label: 'Arbetsmiljö och tillsyn' }
	];

	const faktabankCards: FaktabankCard[] = [
		{
			icon: 'leaf',
			title: 'Grundvillkor',
			body: 'De villkor som ditt företag måste uppfylla för att få fullt jordbruksstöd.',
			href: route('/grundvillkor')
		},
		{
			icon: 'tractor',
			title: 'Djurhållning',
			body: factTopics.find((topic) => topic.slug === 'djurhallning')?.description ?? '',
			href: route('/faktabank/amnen/djurhallning')
		},
		{
			icon: 'sprout',
			title: 'Växtodling',
			body: factTopics.find((topic) => topic.slug === 'vaxtodling')?.description ?? '',
			href: route('/faktabank/amnen/vaxtodling')
		},
		{
			icon: 'book-open',
			title: 'Branschriktlinjer',
			body: 'Vägledningar och praxis framtagna tillsammans med berörda branscher.',
			href: route('/faktabank/branschriktlinjer')
		},
		{
			icon: 'file-text',
			title: 'Regler och tillsyn',
			body: factTopics.find((topic) => topic.slug === 'regler-och-tillsyn')?.description ?? '',
			href: route('/faktabank/amnen/regler-och-tillsyn')
		},
		{
			icon: 'download',
			title: 'Material för nedladdning',
			body: 'Blanketter, journaler och PDF-versioner att ladda ned och skriva ut.',
			href: route('/faktabank/material')
		}
	];

	const calculationTools: CalculationTool[] = publicCalculatorPages.map((calculator, index) => ({
		number: `${index + 1}`.padStart(2, '0'),
		title:
			calculator.slug === 'spridningsareal-utifran-djur' ? 'Spridningsareal'
			: calculator.slug === 'fosforbalansberakningar' ? 'Fosforbalans'
			: 'Lagringsvolymer',
		body: calculator.excerpt,
		href: route(`/berakningar/${calculator.slug}`)
	}));

	const newsItems = $derived.by<NewsListItem[]>(() =>
		data.homepageNews.map((item) => ({
			date: item.date,
			title: item.title,
			body: item.excerpt,
			href: route(`/nyheter/${item.slug}`)
		}))
	);

	const contactCards: ContactCard[] = [
		{ icon: 'leaf', label: 'Grundvillkor' },
		{ icon: 'tractor', label: 'Djurhållning' },
		{ icon: 'sprout', label: 'Växtodling' },
		{ icon: 'file-text', label: 'Material' }
	];
</script>

<main id="hem" class="text-ink">
	<Hero
		title="Välkommen till"
		highlight="Miljöhusesyn"
		subtitle="Snabbt och enkelt – ta reda på vilka regler och författningar som gäller just ditt jordbruksföretag. Samlat, sökbart och uppdaterat inför 2026."
		primaryCta={heroPrimaryCta}
		secondaryCta={{ label: 'Material för nedladdning', href: route('/faktabank/material') }}
		image="/images/field-wheat.jpg"
	/>

	<PartnersBand />

	<FeatureGrid
		heading="Lagstiftningen som styr ditt företag – samlad på ett ställe."
		body={[
			'Miljöhusesyn är framtagen av LRF i samarbete med berörda myndigheter och hjälper företag på landsbygden att hålla koll på de författningar som styr verksamheten.',
			'Huvudsyftet är att samla och göra det enklare att hitta gällande lagstiftning, med checklistor, faktatexter och nedladdningsbart stödmaterial i samma flöde.'
		]}
		disclaimer="Sigill Kvalitetssystem AB ansvarar för innehållet i Miljöhusesyn. Kontakta respektive ansvarig myndighet för information och råd."
		items={featureItems}
	/>

	<Faktabank
		seeAll={{ label: 'Se hela faktabanken', href: route('/faktabank') }}
		cards={faktabankCards}
	/>

	<Calculations tools={calculationTools} />

	<News linkLabel="Alla nyheter" linkHref={route('/nyheter')} items={newsItems} />

	<Contact
		downloadLabel="Ladda ned PDF"
		downloadHref={route(
			data.user ? '/download/miljohusesyn' : '/login?redirectTo=%2Fdownload%2Fmiljohusesyn'
		)}
		contactLabel="Kontakta oss"
		contactHref={route('/kontakt')}
		cards={contactCards}
	/>
</main>
