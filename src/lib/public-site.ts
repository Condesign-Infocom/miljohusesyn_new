export type PublicNavChild = {
	label: string;
	href?: string;
	children?: PublicNavChild[];
};

export type PublicNavItem = PublicNavChild & {
	matchPrefix?: string;
};

export type FactTopic = {
	slug: string;
	title: string;
	description: string;
	entries: {
		title: string;
		href?: string;
		description?: string;
	}[];
};

export type DownloadResource = {
	title: string;
	description: string;
	href: string;
	category?: string;
	external?: boolean;
};

export type PublicNewsItem = {
	slug: string;
	legacyId: number;
	date: string;
	title: string;
	excerpt: string;
	bodyParagraphs: string[];
	legacyUrl: string;
};

export type PublicCalculatorPage = {
	slug: string;
	title: string;
	excerpt: string;
	heroImage?: string;
	bodyParagraphs: string[];
	status: 'rebuild' | 'planned';
};

export type PublicStaticFactPage = {
	slug: string;
	title: string;
	excerpt: string;
	bodyHtml: string;
	bodyParagraphs: string[];
	contentType: string;
	relatedDownloads?: string[];
};

export const publicNavigation: PublicNavItem[] = [
	{ label: 'Hem', href: '/' },
	{ label: 'Viktigt för alla!', href: '/faktabank/viktigt-for-alla' },
	{ label: 'Regeländringar och Nyheter', href: '/faktabank/regelandringar-och-nyheter' },
	{ label: 'Grundvillkor', href: '/grundvillkor' },
	{
		label: 'Faktabank',
		href: '/faktabank',
		matchPrefix: '/faktabank',
		children: [
			{ label: 'Material för nedladdning', href: '/faktabank/material' },
			{ label: 'Liten ordlista om regler', href: '/faktabank/liten-ordlista-om-regler' },
			{ label: 'Branschriktlinjer', href: '/faktabank/branschriktlinjer' },
			{
				label: 'Djurhållning',
				href: '/faktabank/amnen/djurhallning',
				children: [
					{ label: 'Med en djurenhet (DE) menas', href: '/faktabank/med-en-djurenhet-de-menas' },
					{ label: 'Djurskydd vid elavbrott', href: '/faktabank/material' },
					{ label: 'Mjölk, temperatur- och hygienkrav' },
					{ label: 'Krav på leverans- och mottagningsjournal för stallgödsel', href: '/faktabank/leverans-och-mottagningsjournal-stallgodsel' },
					{ label: 'Utrymmeskrav', href: '/faktabank/utrymmeskrav-for-djurhallning' },
					{ label: 'Godkända bedövnings- och avlivningsmetoder' },
					{ label: 'Nedgrävning m.m. av döda djur, animaliska biprodukter' },
					{ label: 'Blankett för anmälan om besöksverksamhet', href: '/faktabank/material' }
				]
			},
			{
				label: 'B- eller C-verksamhet',
				href: '/faktabank/amnen/b-eller-c-verksamhet',
				children: [
					{ label: 'Anmälningsplikt', href: '/faktabank/anmalningspliktig-verksamhet' },
					{ label: 'Översikt övergångsbestämmelser', href: '/faktabank/oversikt-overgangsbestammelser' },
					{ label: 'Begränsningsvärden för en ny förbränningsanläggning', href: '/faktabank/begransningsvarden-ny-forbranningsanlaggning' },
					{ label: 'Tillståndsplikt', href: '/faktabank/tillstandspliktig-verksamhet' }
				]
			},
			{ label: 'Kemikalier', href: '/faktabank/kemikalier' },
			{
				label: 'Energiproduktion',
				href: '/faktabank/energiproduktion'
			},
			{ label: 'Köldmedia', href: '/faktabank/koldmedia' },
			{ label: 'Farligt avfall', href: '/faktabank/farligt-avfall' },
			{ label: 'Känsliga områden', href: '/faktabank/kansliga-omraden' },
			{ label: 'Slättbygder' },
			{
				label: 'Växtodling',
				href: '/faktabank/amnen/vaxtodling',
				children: [
					{ label: 'Avloppsslam', href: '/faktabank/avloppsslam' },
					{ label: 'Krav på lagringskapacitet för stallgödsel', href: '/faktabank/krav-pa-lagringskapacitet-for-stallgodsel' },
					{ label: 'Rekommendationer för gödsling och kalkning' },
					{ label: 'Sprutning', href: '/faktabank/sprutning' }
				]
			},
			{
				label: 'Regler och tillsyn',
				href: '/faktabank/amnen/regler-och-tillsyn',
				children: [
					{ label: 'Inför tillsyn – Tips och råd', href: '/faktabank/infor-tillsyn-tips-och-rad' },
					{ label: 'Personalliggare', href: '/faktabank/personalliggare' },
					{ label: 'Tillsynsmyndigheter', href: '/faktabank/tillsynsmyndigheter' },
					{ label: 'Miljösanktionsavgifter', href: '/faktabank/miljosanktionsavgifter' }
				]
			},
			{
				label: 'Arbetsmiljö',
				href: '/faktabank/amnen/arbetsmiljo',
				children: [
					{ label: 'Systematiskt arbetsmiljöarbete', href: '/faktabank/systematiskt-arbetsmiljoarbete' },
					{ label: 'Trycksatta anordningar', href: '/faktabank/trycksatta-anordningar' }
				]
			}
		]
	},
	{ label: 'Kontakt', href: '/kontakt' },
	{
		label: 'Beräkningar',
		href: '/berakningar',
		matchPrefix: '/berakningar',
		children: [
			{ label: 'Spridningsareal - Beräkningar utifrån djur', href: '/berakningar/spridningsareal-utifran-djur' },
			{ label: 'Spridningsareal - Fosforbalansberäkningar', href: '/berakningar/fosforbalansberakningar' },
			{ label: 'Lagringsvolymer för stallgödsel', href: '/berakningar/lagringsvolymer-stallgodsel' }
		]
	},
	{ label: 'Om Miljöhusesyn', href: '/om' }
];

export const factTopics: FactTopic[] = [
	{
		slug: 'djurhallning',
		title: 'Djurhållning',
		description: 'Planerat publiceringsområde för regler och stödmaterial om djurhållning, utrymmeskrav och beredskap.',
		entries: [
			{
				title: 'Med en djurenhet (DE) menas',
				href: '/faktabank/med-en-djurenhet-de-menas',
				description: 'Bevarad faktasida om hur olika djurslag räknas om till djurenheter.'
			},
			{
				title: 'Utrymmeskrav för djurhållning',
				href: '/faktabank/utrymmeskrav-for-djurhallning',
				description: 'Importerad appendixtext i den nya innehållsdatabasen.'
			},
			{
				title: 'Allmänna råd',
				href: '/faktabank/allmanna-rad',
				description: 'Bevarad referenstext som kompletterar djurhållningsområdet.'
			},
			{
				title: 'Djurskydd vid elavbrott',
				href: '/faktabank/material',
				description: 'Mall och stödmaterial finns nu i nedladdningsbiblioteket.'
			},
			{
				title: 'Krav på leverans- och mottagningsjournal för stallgödsel',
				href: '/faktabank/leverans-och-mottagningsjournal-stallgodsel',
				description: 'Bevarad faktasida om journalföring för mottagen och bortlämnad stallgödsel.'
			}
		]
	},
	{
		slug: 'b-eller-c-verksamhet',
		title: 'B- eller C-verksamhet',
		description: 'Planerat publiceringsområde för tillstånd, anmälningar och egenkontroll.',
		entries: [
			{
				title: 'Anmälningspliktig verksamhet',
				href: '/faktabank/anmalningspliktig-verksamhet',
				description: 'Publicerad faktasida från runtime-databasen.'
			},
			{
				title: 'Översikt övergångsbestämmelser',
				href: '/faktabank/oversikt-overgangsbestammelser',
				description: 'Bevarad faktasida om tidpunkter och övergångsregler för medelstora förbränningsanläggningar.'
			},
			{
				title: 'Begränsningsvärden för en ny förbränningsanläggning',
				href: '/faktabank/begransningsvarden-ny-forbranningsanlaggning',
				description: 'Bevarad faktasida om utsläppsgränser för nya förbränningsanläggningar enligt FMF.'
			},
			{
				title: 'Tillståndspliktig verksamhet',
				href: '/faktabank/tillstandspliktig-verksamhet',
				description: 'Publicerad faktasida från runtime-databasen.'
			},
			{
				title: 'Miljörapport',
				href: '/faktabank/miljorapport',
				description: 'Publicerad faktasida kopplad till tillståndspliktig verksamhet.'
			}
		]
	},
	{
		slug: 'vaxtodling',
		title: 'Växtodling',
		description: 'Planerat publiceringsområde för spridningsregler, lagringskapacitet och säker växtodling.',
		entries: [
			{
				title: 'Kemikalier',
				href: '/faktabank/kemikalier',
				description: 'Bevarad stödsida med formulär och klassificeringsunderlag.'
			},
			{
				title: 'Sprutning',
				href: '/faktabank/sprutning',
				description: 'Bevarad legacy-sida med myndighetslänkar, skyddsråd och tillsynsunderlag.'
			},
			{
				title: 'Avfallsjournal',
				href: '/faktabank/avfallsjournal',
				description: 'Importerad journaltext som nu kan publiceras direkt från innehållsdatabasen.'
			},
			{
				title: 'Känsliga områden',
				href: '/faktabank/kansliga-omraden',
				description: 'Bevarad förklaringssida tills motsvarande innehåll har flyttats in i Postgres.'
			},
			{
				title: 'Krav på leverans- och mottagningsjournal för stallgödsel',
				href: '/faktabank/leverans-och-mottagningsjournal-stallgodsel',
				description: 'Bevarad faktasida om journalföring för mottagen och bortlämnad stallgödsel.'
			}
		]
	},
	{
		slug: 'regler-och-tillsyn',
		title: 'Regler och tillsyn',
		description: 'Planerat publiceringsområde för tillsyn, miljösanktionsavgifter och myndighetskontakter.',
		entries: [
			{
				title: 'Miljösanktionsavgifter',
				href: '/faktabank/miljosanktionsavgifter',
				description: 'Importerad appendixtext i den nya innehållsdatabasen.'
			},
			{
				title: 'Viktigt för alla',
				href: '/faktabank/viktigt-for-alla',
				description: 'Övergripande referenstext med grundläggande regelram.'
			},
			{
				title: 'Tillsynsmyndigheter',
				href: '/faktabank/tillsynsmyndigheter',
				description: 'Bevarad orienteringssida om vilken myndighet som utövar tillsyn inom olika områden.'
			},
			{
				title: 'Liten ordlista om regler',
				href: '/faktabank/liten-ordlista-om-regler',
				description: 'Publicerad ordlista från standardinnehållet för begrepp och definitioner.'
			}
		]
	},
	{
		slug: 'arbetsmiljo',
		title: 'Arbetsmiljö',
		description: 'Planerat publiceringsområde för arbetsmiljöarbete och mallar för risker i gårdsdriften.',
		entries: [
			{
				title: 'Systematiskt arbetsmiljöarbete',
				href: '/faktabank/systematiskt-arbetsmiljoarbete',
				description: 'Bevarad faktasida om grundläggande arbetsmiljöarbete, föreskrifter och rådgivning.'
			},
			{
				title: 'Trycksatta anordningar',
				href: '/faktabank/trycksatta-anordningar',
				description: 'Bevarad faktasida om fortlöpande tillsyn, riskbedömning och kontroller.'
			},
			{
				title: 'Kemikalier i arbetsmiljön',
				href: '/faktabank/kemikalier',
				description: 'Formulär och CLP-underlag för arbetsgivarens kemikaliearbete.'
			},
			{
				title: 'Åtgärdsplan för Miljöhusesyn',
				href: '/faktabank/atgardsplan-for-miljohusesyn',
				description: 'Plantexten finns nu som publicerad standardsida i den nya innehållskedjan.'
			},
			{
				title: 'Äldre Miljöhusesyner',
				href: '/faktabank/aldre-miljohusesyner',
				description: 'Historiska tabeller och bilagor som fortfarande kan behövas.'
			}
		]
	}
];

export const downloadResources: DownloadResource[] = [
	{
		title: 'Åtgärdsplan',
		description: 'Blankett för uppföljning av åtgärder när du inte arbetar direkt i checklistorna.',
		href: '/downloads/atgardsplan.pdf',
		category: 'Blanketter'
	},
	{
		title: 'Avfallsjournal för farligt avfall',
		description: 'Journal för dokumentation av farligt avfall i verksamheten.',
		href: '/downloads/avfallsjournal-farligt-avfall.pdf',
		category: 'Blanketter'
	},
	{
		title: 'Kemikalieförteckning',
		description: 'Mall för att samla kemikalier, klassning och användning på gården.',
		href: '/downloads/kemikalieforteckning.pdf',
		category: 'Blanketter'
	},
	{
		title: 'Transportdokument för farligt avfall',
		description: 'Underlag att använda vid transport av farligt avfall.',
		href: '/downloads/transportdokument-farligt-avfall.pdf',
		category: 'Blanketter'
	},
	{
		title: 'Djurskydd vid elavbrott',
		description: 'Planstöd för att upprätthålla djurskyddet vid störningar och elavbrott.',
		href: '/downloads/djurskydd-vid-elavbrott.pdf',
		category: 'Beredskap'
	},
	{
		title: 'Journal för leverans av stallgödsel',
		description: 'Dokumentation för leverans av stallgödsel till annan mottagare.',
		href: '/downloads/journal-leverans-stallgodsel.pdf',
		category: 'Blanketter'
	},
	{
		title: 'Journal för mottagen stallgödsel',
		description: 'Dokumentation för mottagen stallgödsel och organiska gödselmedel.',
		href: '/downloads/journal-mottagen-stallgodsel.pdf',
		category: 'Blanketter'
	},
	{
		title: 'Klassificering och märkning av kemikalier',
		description: 'Bakgrundsmaterial om CLP-märkning och kemikalieklassning.',
		href: '/downloads/klassificering-och-markning-av-kemikalier.pdf',
		category: 'Vägledning'
	},
	{
		title: 'Kemikalieförteckning för arbetsgivare',
		description: 'Kompletterande arbetsgivarmall för kemiska arbetsmiljörisker.',
		href: '/downloads/kemikalieforteckning-arbetsgivare.pdf',
		category: 'Blanketter'
	},
	{
		title: 'Studieplan för Miljöhusesyn på webben',
		description: 'Introduktion till struktur, inloggning och arbetssätt i tjänsten.',
		href: '/downloads/studieplan-miljohusesyn.pdf',
		category: 'Stödmaterial'
	},
	{
		title: 'Studievägledning för studiecirkel',
		description: 'Fördjupningsmaterial för grupparbete och genomförande av Miljöhusesyn.',
		href: '/downloads/studievagledning-miljohusesyn.pdf',
		category: 'Stödmaterial'
	},
	{
		title: 'Arbetsmiljö – viktiga telefonnummer',
		description: 'Snabb referens till viktiga kontakter vid arbetsmiljöincidenter.',
		href: '/downloads/arbetsmiljo-viktiga-telefonnummer.pdf',
		category: 'Stödmaterial'
	},
	{
		title: 'Regler för djurhållning – bilaga 2',
		description: 'Historisk bilaga med tabellstöd för djurhållning.',
		href: '/downloads/regler-for-djurhallning-bilaga-2.pdf',
		category: 'Arkiv'
	},
	{
		title: 'Tabell 22',
		description: 'Bevarad äldre tabell från tidigare Miljöhusesyn-version.',
		href: '/downloads/mhs-tabell-22.pdf',
		category: 'Arkiv'
	},
	{
		title: 'Tabell 24',
		description: 'Bevarad äldre tabell från tidigare Miljöhusesyn-version.',
		href: '/downloads/mhs-tabell-24.pdf',
		category: 'Arkiv'
	},
	{
		title: 'Växtskydd hos Jordbruksverket',
		description: 'Myndighetsinformation om växtskydd, växtskyddsmedel och växtskadegörare.',
		href: 'https://jordbruksverket.se/vaxter/vaxtskydd',
		category: 'Externa länkar',
		external: true
	},
	{
		title: 'Växtskyddsmedel hos Naturvårdsverket',
		description: 'Regler, anmälan och tillstånd för användning av växtskyddsmedel.',
		href: 'https://www.naturvardsverket.se/amnesomraden/bekampningsmedel/vaxtskyddsmedel/',
		category: 'Externa länkar',
		external: true
	},
	{
		title: 'Ditt grundskydd mot växtskyddsmedel',
		description: 'Stöd om skyddsutrustning och säker hantering av koncentrerade växtskyddsmedel.',
		href: 'https://www.sakertvaxtskydd.se/',
		category: 'Externa länkar',
		external: true
	},
	{
		title: 'Greppa Näringen om växtskydd',
		description: 'Rådgivning och vägledning om användning av växtskyddsmedel.',
		href: 'https://greppa.nu/',
		category: 'Externa länkar',
		external: true
	},
	{
		title: 'Nitratkänsliga områden hos Jordbruksverket',
		description: 'Kartor och regler för nitratkänsliga och andra känsliga områden.',
		href: 'https://jordbruksverket.se/miljo-och-klimat/godsel-och-vaxtnaring/nitratkansliga-omraden',
		category: 'Externa länkar',
		external: true
	},
	{
		title: 'Säkra djurskyddskontroller',
		description: 'LRF:s råd om djurskyddskontroller och tillsynssituationer på gården.',
		href: 'https://www.lrf.se/politikochpaverkan/djuromsorg-och-djurhalsa/djurskyddskontroll/',
		category: 'Externa länkar',
		external: true
	},
	{
		title: 'Effektiv tillsyn',
		description: 'LRF:s stöd om dialog med myndigheter och tillsynsarbete.',
		href: 'https://www.lrf.se/politikochpaverkan/myndighetskontakter/tillsyn-och-kontroll/',
		category: 'Externa länkar',
		external: true
	},
	{
		title: 'PM om personalliggare',
		description: 'Skatteverkets informationssida om personalliggare.',
		href: 'https://skatteverket.se/foretag/etjansterochblanketter/blanketterbroschyrer/broschyrer/info/605.4.70ac421612e2a997f85800051356.html',
		category: 'Externa länkar',
		external: true
	},
	{
		title: 'Hur stor lagringskapacitet du behöver',
		description: 'Jordbruksverkets vägledning om krav på lagringskapacitet för stallgödsel.',
		href: 'https://jordbruksverket.se/vaxter/odling/vaxtnaring/lagra-godsel#h-Hurstorlagringskapacitetdubehover',
		category: 'Externa länkar',
		external: true
	}
];

export const publicStaticFactPages: PublicStaticFactPage[] = [
	{
		slug: 'branschriktlinjer',
		title: 'Branschriktlinjer',
		excerpt: 'Bevarad faktasida om hur nationella branschriktlinjer kan användas som stöd för säkra livsmedel, rätt märkning och spårbarhet.',
		bodyHtml: '',
		contentType: 'preserved-fact-page',
		bodyParagraphs: [
			'För att göra det lättare att följa bestämmelserna har man tagit fram nationella branschriktlinjer inom vissa områden. Det är branschens egen beskrivning av hur målen i lagstiftningen kan uppnås, till exempel produktion av säkra livsmedel, rätt märkning och god spårbarhet.',
			'Lagstiftningen måste alla följa, men branschriktlinjerna är ett praktiskt stöd för att omsätta kraven i fungerande rutiner för hygienisk och säker produktion. De ger exempel på arbetsrutiner och åtgärder som hjälper producenten att nå samma mål som reglerna kräver.',
			'Branschriktlinjerna är frivilliga men värdefulla som hjälpmedel. Det finns nationella riktlinjer för bland annat honung, grisproduktion, lamm- och nötköttsproduktion, mjölk, grönsaker och bär. Riktlinjerna bedöms av Livsmedelsverket och Jordbruksverket.'
		]
	},
	{
		slug: 'med-en-djurenhet-de-menas',
		title: 'Med en djurenhet (DE) menas',
		excerpt: 'Bevarad faktasida som förklarar hur djurenheter räknas i samband med anmälningspliktig djurhållning.',
		bodyHtml: '',
		contentType: 'preserved-fact-page',
		bodyParagraphs: [
			'När reglerna hänvisar till djurenheter, DE, används ett fast omräkningssätt för olika djurslag. Syftet är att kunna bedöma verksamhetens omfattning enligt samma skala oavsett om gården har nötkreatur, grisar, fjäderfä, hästar eller andra djur.',
			'Som exempel räknas en mjölkko som en djurenhet, sex kalvar som en djurenhet, tre övriga nötkreatur som en djurenhet, tre suggor som en djurenhet, tio slaktsvin som en djurenhet och en häst som en djurenhet.',
			'För andra djurslag används andra omräkningstal, till exempel hundra värphöns, hundra kaniner eller tio får eller getter för en djurenhet. Omräkningen är särskilt viktig när man ska avgöra om djurhållningen blir anmälningspliktig eller omfattas av andra tröskelvärden i miljöreglerna.'
		]
	},
	{
		slug: 'energiproduktion',
		title: 'Energiproduktion',
		excerpt: 'Bevarad faktasida om fastbränslepannor, medelstora förbränningsanläggningar och ekodesignkrav.',
		bodyHtml: '',
		contentType: 'preserved-fact-page',
		bodyParagraphs: [
			'Området energiproduktion omfattar bland annat fastbränslepannor, medelstora förbränningsanläggningar och produktkrav på nya pannor. Reglerna handlar både om utsläpp från byggnader och om vilka minimikrav som gäller när nya produkter släpps ut på marknaden.',
			'Boverkets byggregler ställer krav på utsläpp av förbränningsgaser och verkningsgrad för byggnader med fastbränslepannor upp till 500 kW. Reglerna aktualiseras framför allt vid nyinstallation eller byte av panna och syftar till att begränsa föroreningar som påverkar hygien, hälsa och miljö.',
			'För större pannor och andra medelstora förbränningsanläggningar gäller särskilda regler om installerad effekt, utsläppsbegränsningar och kontroll. För lantbruket blir detta särskilt relevant för anläggningar som eldas med ved, halm eller annat fast biobränsle.',
			'Ekodesignreglerna kompletterar byggreglerna. De ställer minimikrav på nya produkter, bland annat för fastbränslepannor och oljepannor, och påverkar vilka produkter som får säljas eller tas i bruk inom EU.'
		]
	},
	{
		slug: 'oversikt-overgangsbestammelser',
		title: 'Översikt övergångsbestämmelser',
		excerpt: 'Bevarad faktasida om tidsschemat för övergångsbestämmelser enligt förordningen om medelstora förbränningsanläggningar.',
		bodyHtml: '',
		contentType: 'preserved-fact-page',
		bodyParagraphs: [
			'Förordningen om medelstora förbränningsanläggningar innehåller övergångsbestämmelser som avgör när olika krav börjar gälla. Reglerna skiljer mellan nya anläggningar och så kallade 2018-anläggningar, det vill säga anläggningar som togs i drift senast den 19 december 2018.',
			'Först träffas nya pannor och andra anläggningar som tagits i drift från den 20 december 2018 eller senare. Därefter följer skärpta steg för befintliga 2018-anläggningar, först för de större anläggningarna över 5 MW och senare för anläggningar mellan 1 och 5 MW.',
			'Övergångsbestämmelserna påverkar både när en anläggning måste vara registrerad och från vilken tidpunkt begränsningsvärden för utsläpp till luft ska tillämpas. Därför är det viktigt att känna till både effekt, drifttidpunkt och om anläggningen omfattas av sammanräkningsregeln.'
		]
	},
	{
		slug: 'begransningsvarden-ny-forbranningsanlaggning',
		title: 'Begränsningsvärden för en ny förbränningsanläggning',
		excerpt: 'Bevarad faktasida om utsläppsgränser för nya medelstora förbränningsanläggningar enligt FMF.',
		bodyHtml: '',
		contentType: 'preserved-fact-page',
		bodyParagraphs: [
			'För nya förbränningsanläggningar som inte är motorer eller gasturbiner och som har en anläggningseffekt på högst 5 megawatt finns särskilda begränsningsvärden enligt förordningen om medelstora förbränningsanläggningar.',
			'Gränsvärdena anges per bränsle och omfattar utsläpp av svaveldioxid, kväveoxider och stoft, uttryckt i milligram per kubikmeter normal torr gas. Om inget värde anges för en viss förorening innebär det att något begränsningsvärde inte gäller för just den föroreningen i den aktuella tabellen.',
			'För lantbrukets del blir dessa regler främst aktuella för anläggningar som eldas med ved, halm eller annat fast biobränsle när de når en effekt som omfattas av FMF. Det är därför viktigt att bedöma både bränsleslag och installerad effekt när en ny anläggning planeras.'
		]
	},
	{
		slug: 'koldmedia',
		title: 'Köldmedia',
		excerpt: 'Bevarad faktasida om f-gaser, GWP-värden, läckagekontroller och miljösanktionsavgifter för kyl-, värme- och klimatanläggningar.',
		bodyHtml: '',
		contentType: 'preserved-fact-page',
		bodyParagraphs: [
			'Kyl-, värme- och klimatanläggningar använder i dag ofta köldmedier som ersatt de äldre CFC- och HCFC-ämnena. Många av de vanliga alternativen, särskilt HFC-föreningar, är i stället kraftiga växthusgaser och omfattas därför av EU:s f-gasförordning.',
			'Förordningen reglerar användningen av fluorerade växthusgaser och utgår från gasernas GWP-värde, alltså hur mycket de påverkar klimatet jämfört med koldioxid. Det innebär att både typ av köldmedium och mängd i anläggningen påverkar vilka skyldigheter som gäller.',
			'Läckagekontrollerna styrs numera av anläggningens växthuspåverkan uttryckt i koldioxidekvivalenter. Därför behöver man kunna räkna om mängden köldmedium med hjälp av ämnets GWP-faktor för att förstå vilka kontrollintervall som gäller.',
			'Flera miljösanktionsavgifter är kopplade till användningen av köldmedia. För verksamheter med flera olika typer av utrustning kan avgifter i praktiken falla ut per utrustning om reglerna inte följs.'
		]
	},
	{
		slug: 'kemikalier',
		title: 'Kemikalier',
		excerpt: 'Bevarad stödsida för kemikalieförteckning, CLP-märkning och arbetsgivarens dokumentation.',
		bodyHtml: '',
		contentType: 'preserved-support-page',
		relatedDownloads: [
			'Kemikalieförteckning',
			'Kemikalieförteckning för arbetsgivare',
			'Klassificering och märkning av kemikalier'
		],
		bodyParagraphs: [
			'Den här delen samlar stödmaterial som tidigare låg som separata nedladdningar på den publika sajten. Fokus är att bevara fungerande formulär och vägledning medan den mer regelstyrda faktadelen successivt flyttas över till den publiceringsstyrda Postgres-modellen.',
			'För det praktiska arbetet med kemikalier är kemikalieförteckningen central. Här finns både den vanliga mallen och ett kompletterande arbetsgivarmaterial för kemiska arbetsmiljörisker.',
			'Som referens finns även en bevarad broschyr om klassificering och märkning enligt CLP. Den fungerar som ett stöd när du behöver förstå hur produkter ska märkas och dokumenteras.'
		]
	},
	{
		slug: 'farligt-avfall',
		title: 'Farligt avfall',
		excerpt: 'Bevarad stödsida med avfallsjournal, transportdokument och relaterade journaler.',
		bodyHtml: '',
		contentType: 'preserved-support-page',
		relatedDownloads: [
			'Avfallsjournal för farligt avfall',
			'Transportdokument för farligt avfall',
			'Journal för leverans av stallgödsel',
			'Journal för mottagen stallgödsel'
		],
		bodyParagraphs: [
			'Det här området samlar de blanketter som i den äldre sajten användes för att dokumentera farligt avfall, transporter och vissa relaterade journaler.',
			'Avfallsjournalen och transportdokumentet är bevarade som lokala filer i den nya applikationen, så att den publika delen fortfarande kan fungera utan WordPress-länkar.',
			'Vi har även behållit journalerna för mottagen och levererad stallgödsel eftersom de ofta användes tillsammans med samma dokumentationsflöde på den äldre webbplatsen.'
		]
	},
	{
		slug: 'aldre-miljohusesyner',
		title: 'Äldre Miljöhusesyner',
		excerpt: 'Historiska tabeller och bilagor från tidigare publicerade versioner av Miljöhusesyn.',
		bodyHtml: '',
		contentType: 'preserved-archive-page',
		relatedDownloads: ['Regler för djurhållning – bilaga 2', 'Tabell 22', 'Tabell 24'],
		bodyParagraphs: [
			'Den här arkivsidan samlar äldre tabeller och bilagor som fortfarande kan behövas som referens under övergången till det nya systemet.',
			'Materialet är inte tänkt som den långsiktiga primära publiceringsformen, men det är värdefullt att behålla åtkomsten medan mer av innehållet flyttas in i den nya publiceringskedjan.',
			'När publiceringslagret i Postgres täcker fler ämnesområden kan den här sidan krympa till ett renodlat historiskt arkiv.'
		]
	},
	{
		slug: 'tillsynsmyndigheter',
		title: 'Tillsynsmyndigheter',
		excerpt: 'Bevarad översikt från den legacy-publika sajten över vilken myndighet som utövar tillsyn inom olika delar av lantbruket.',
		bodyHtml: '',
		contentType: 'preserved-legacy-page',
		bodyParagraphs: [
			'Följande myndigheter utövar tillsyn över lantbruket.',
			'Miljöskydd utförs av kommunens miljöskyddsinspektörer.',
			'Djurskydd utförs av länsstyrelsens djurskyddsinspektörer.',
			'Grundvillkor utförs av länsstyrelsen.',
			'Det här är i nuläget en bevarad legacy-sida. Nästa steg blir att avgöra om motsvarande innehåll ska flyttas in i det Postgres-baserade publiceringsflödet eller hållas som en kort statisk orientering.'
		]
	},
	{
		slug: 'sprutning',
		title: 'Sprutning',
		excerpt: 'Bevarad legacy-sida med myndighetsvägledning om växtskyddsmedel, skyddsutrustning, rådgivning och tillsynsunderlag.',
		bodyHtml: '',
		contentType: 'preserved-legacy-page',
		relatedDownloads: [
			'Växtskydd hos Jordbruksverket',
			'Växtskyddsmedel hos Naturvårdsverket',
			'Ditt grundskydd mot växtskyddsmedel',
			'Greppa Näringen om växtskydd'
		],
		bodyParagraphs: [
			'Jordbruksverket samlar information om användning av växtskyddsmedel, växtskadegörare samt stödmaterial som Säkert Växtskydd, skyddszoner och skyddsavstånd i odlingslandskapet.',
			'Naturvårdsverket tillhandahåller information om regler, tillstånd och anmälan för växtskyddsmedel, inklusive användning inom vissa särskilda områden.',
			'Vid hantering av koncentrerade växtskyddsmedel krävs skyddsutrustning enligt etikett och säkerhetsdatablad, exempelvis handskar, visir eller skyddsglasögon samt andningsskydd när det finns risk för stänk eller inandning.',
			'Greppa Näringen erbjuder rådgivning om användning av växtskyddsmedel, och inom vattenskyddsområde krävs särskilt tillstånd från kommunens miljöförvaltning.',
			'Vid miljötillsyn bör aktuell sprutjournal, föregående växtsäsongs dokumentation vid behov, kontrollrapport, Jordbruksverkets godkännande av sprutan samt tillstånd för klass 1L och 2L kunna visas upp.',
			'Det här är i nuläget bevarat legacyinnehåll. Om motsvarande ämnesmaterial senare importeras till Postgres kan sidan ersättas av en publicerad faktasida.'
		]
	},
	{
		slug: 'kansliga-omraden',
		title: 'Känsliga områden',
		excerpt: 'Bevarad legacy-sida om nitratkänsliga och andra känsliga områden som påverkar regler för gödselhantering och växtnäring.',
		bodyHtml: '',
		contentType: 'preserved-legacy-page',
		relatedDownloads: ['Nitratkänsliga områden hos Jordbruksverket'],
		bodyParagraphs: [
			'Områden som klassas som känsliga områden, kustområden och nitratkänsliga områden anges i bilagor till Jordbruksverkets föreskrifter om miljöhänsyn i jordbruket vad avser växtnäring.',
			'Områdena delas in efter län, kommun och församling, och vilket område en verksamhet tillhör påverkar vilka regler som gäller för spridning av stallgödsel.',
			'Klassningen påverkar även hur stor andel höst- och vinterbevuxen mark som behöver finnas i verksamheten.',
			'För aktuell vägledning och kartor över nitratkänsliga områden hänvisar den äldre publika sidan vidare till Jordbruksverket.',
			'Även denna sida är tills vidare bevarad som legacyinnehåll medan vi kartlägger om motsvarande material ska flyttas in i den Postgres-baserade publiceringskedjan.'
		]
	},
	{
		slug: 'infor-tillsyn-tips-och-rad',
		title: 'Inför tillsyn – Tips och råd',
		excerpt: 'Bevarad legacy-sida med LRF:s råd inför tillsyn, kontroll och dialog med myndigheter.',
		bodyHtml: '',
		contentType: 'preserved-legacy-page',
		relatedDownloads: ['Säkra djurskyddskontroller', 'Effektiv tillsyn'],
		bodyParagraphs: [
			'LRF bedriver arbete med tillsynsfrågor via kontakter med politiker, myndigheter och organisationer på internationell, nationell, regional och kommunal nivå.',
			'I skriften "Ta kontroll över kontrollen" lyfter LRF viktiga punkter och frågor som kan vara bra att ställa när någon kommer till gården för tillsyn eller kontroll.',
			'Broschyren "Effektiv dialog" är tänkt att underlätta det personliga mötet mellan företagare och myndigheter.',
			'Den här sidan är i nuläget bevarat legacyinnehåll med länkar vidare till LRF:s råd om djurskyddskontroller och effektiv tillsyn.'
		]
	},
	{
		slug: 'personalliggare',
		title: 'Personalliggare',
		excerpt: 'Bevarad legacy-sida som pekar vidare till informationsmaterial om personalliggare.',
		bodyHtml: '',
		contentType: 'preserved-legacy-page',
		relatedDownloads: ['PM om personalliggare'],
		bodyParagraphs: [
			'Den äldre publika sidan för Personalliggare var mycket kort och fungerade främst som en vidarepekning till informationsmaterial om ämnet.',
			'I den nya publika shellen bevarar vi därför sidan som en enkel vägvisare i navigationen medan vi avgör om området ska få en mer komplett publicerad faktasida senare.'
		]
	},
	{
		slug: 'avloppsslam',
		title: 'Avloppsslam',
		excerpt: 'Bevarad legacy-sida med gränsvärden för metaller vid spridning och saluföring av avloppsslam.',
		bodyHtml: '',
		contentType: 'preserved-legacy-page',
		bodyParagraphs: [
			'Den äldre publika sidan sammanfattade gränsvärden för metaller vid spridning av avloppsslam, inklusive maximal metallhalt i mark och årlig maximal tillförsel per hektar.',
			'Den tog även upp ett undantag där markens zinkhalt i vissa län får uppgå till 150 mg/kg torrsubstans i jord.',
			'Sidan återgav också gränsvärden enligt SFS 1998:944, 20 § för att saluföra eller överlåta avloppsslam.',
			'Det här området är fortfarande viktigt i den djupare Faktabank-navigationen, men innehållet är ännu inte flyttat till den Postgres-baserade publiceringskedjan.'
		]
	},
	{
		slug: 'krav-pa-lagringskapacitet-for-stallgodsel',
		title: 'Krav på lagringskapacitet för stallgödsel',
		excerpt: 'Bevarad legacy-sida om hur krav på lagringskapacitet påverkas av gårdens läge, djurenheter och spridningsregler.',
		bodyHtml: '',
		contentType: 'preserved-legacy-page',
		relatedDownloads: ['Hur stor lagringskapacitet du behöver'],
		bodyParagraphs: [
			'Reglerna för hur stor lagringskapacitet som behövs beror framför allt på var gården ligger och hur många djurenheter verksamheten har.',
			'Den äldre publika sidan påpekade också att verksamheten ofta behöver större marginaler än minimikraven, exempelvis under år med mer nederbörd eller längre perioder med kvarliggande snö.',
			'Behovet av lagringsutrymme påverkas dessutom av reglerna för när stallgödsel får spridas.',
			'I den nya publika shellen bevarar vi sidan tillsammans med länk vidare till Jordbruksverkets vägledning tills motsvarande innehåll kan göras publication-backed i Postgres.'
		]
	},
	{
		slug: 'leverans-och-mottagningsjournal-stallgodsel',
		title: 'Krav på leverans- och mottagningsjournal för stallgödsel',
		excerpt: 'Bevarad faktasida om dokumentationskrav när stallgödsel eller andra organiska gödselmedel tas emot eller lämnas bort.',
		bodyHtml: '',
		contentType: 'preserved-fact-page',
		bodyParagraphs: [
			'Jordbruksföretag som tar emot stallgödsel eller andra organiska gödselmedel ska journalföra uppgifter om gödselslag, mängd, fosforinnehåll eller djuruppgifter, datum för mottagandet och från vem gödseln kommer. Kraven gäller även andra organiska gödselmedel som till exempel avloppsslam.',
			'Företag som lämnar bort stallgödsel ska på motsvarande sätt dokumentera hur mycket gödsel som levereras, vilka djurslag och hur många djur gödseln kommer från eller hur mycket totalfosfor den innehåller, datum för leveransen och vem mottagaren är.',
			'Det här är grundvillkor inom nitratkänsliga områden. För bortlämnad stallgödsel gäller kravet för jordbruksföretag med fler än tio djurenheter på årsbasis. Det finns inte längre något generellt krav på särskilt stallgödselavtal, men journalföringen behöver fortfarande finnas på plats.'
		]
	},
	{
		slug: 'systematiskt-arbetsmiljoarbete',
		title: 'Systematiskt arbetsmiljöarbete',
		excerpt: 'Bevarad faktasida om de vanligaste arbetsmiljöriskerna, relevanta föreskrifter och vart man kan få rådgivning.',
		bodyHtml: '',
		contentType: 'preserved-fact-page',
		bodyParagraphs: [
			'Det här området behandlar de vanligaste riskerna som rör arbetsmiljön inom lantbruks- och trädgårdsverksamhet. De föreskrifter som hänvisas till är de som oftast är mest relevanta inom respektive delområde, men beroende på hur arbetet utförs kan fler regler bli aktuella.',
			'Systematiskt arbetsmiljöarbete handlar om att arbeta löpande med att identifiera risker, bedöma dem, genomföra åtgärder och följa upp att arbetsmiljön fungerar i praktiken. Det gäller både den dagliga driften och mer sällan återkommande arbetsmoment.',
			'För den som vill fördjupa sig finns Arbetsmiljöverkets föreskrifter och allmänna råd som övergripande referens. Det finns också branschanknuten rådgivning genom Säker Arbetsmiljö Sverige för den gröna sektorn.'
		]
	},
	{
		slug: 'trycksatta-anordningar',
		title: 'Trycksatta anordningar',
		excerpt: 'Bevarad faktasida om fortlöpande tillsyn, riskbedömning och ansvar för trycksatta anordningar i lantbruket.',
		bodyHtml: '',
		contentType: 'preserved-fact-page',
		bodyParagraphs: [
			'Trycksatta anordningar med tillhörande säkerhetsutrustning behöver regelbundet undersökas genom fortlöpande tillsyn. Syftet är att ge arbetsgivaren underlag för att bedöma om anordningen eller dess säkerhetsutrustning har skadats eller försämrats.',
			'Den fortlöpande tillsynen behöver bland annat omfatta att anordningen fungerar tillfredsställande, att inga otätheter har uppkommit, att utrustningen inte utsatts för skadlig påverkan och att märkning, ventiler och nödstopp är korrekta.',
			'All användning av trycksatta anordningar ska riskbedömas, oavsett storlek. För jordbruket gäller detta särskilt exempelvis kompressorer med tryckluftsbehållare, vakuumtankvagnar och pannor i klass A eller B, inklusive vissa fastbränslepannor över 100 kW.',
			'Området hör nära ihop med arbetsgivarens ansvar för rutiner, kontrollintervall och dokumentation. Därför är det viktigt att den fortlöpande tillsynen inte behandlas som en engångsinsats utan som en del av det löpande arbetsmiljöarbetet.'
		]
	}
];

export const getFactTopicBySlug = (slug: string) => factTopics.find((topic) => topic.slug === slug) ?? null;

export const getStaticFactPageBySlug = (slug: string) =>
	publicStaticFactPages.find((page) => page.slug === slug) ?? null;

export const getDownloadResourcesByTitle = (titles: string[]) =>
	downloadResources.filter((resource) => titles.includes(resource.title));

export const homepageHighlights = [
	'Få checklistor anpassade till företagets verksamhet och geografiska läge.',
	'Använd faktatexter och hänvisningar när du behöver förstå ett krav mer i detalj.',
	'Följ upp avvikelser med åtgärdsplan och nedladdningsbara mallar.'
];

export const publicNewsItems: PublicNewsItem[] = [
	{
		slug: 'arliga-fragor-infors-i-miljohusesyn-fran-2026',
		legacyId: 2319,
		date: '20 februari 2026',
		title: 'Årliga frågor införs i Miljöhusesyn från 2026',
		excerpt: 'Vissa frågor i Miljöhusesyn behöver från och med 2026 besvaras på nytt varje år för att hålla underlaget aktuellt.',
		bodyParagraphs: [
			'Från och med 2026 införs årliga frågor i Miljöhusesyn. Det innebär att vissa frågor behöver besvaras varje år för att stödet ska spegla aktuell verksamhet och gällande regler.',
			'Förändringen gäller framför allt frågor där förutsättningar ofta ändras, där dokumentation behöver hållas uppdaterad eller där området bedöms vara särskilt viktigt ur ett regel- och lagstiftningsperspektiv.',
			'Det här är inte ett nytt krav i sak, utan ett sätt att göra tidigare svar mer tillförlitliga över tid. Ett svar som var korrekt för flera år sedan behöver inte vara rätt idag.',
			'När ett nytt år börjar tas tidigare svar bort för de berörda frågorna. De visas då som obesvarade och behöver gås igenom igen så att svaren stämmer med verksamheten som den ser ut nu.'
		],
		legacyUrl: 'https://www.miljohusesyn.nu/page/2319'
	},
	{
		slug: 'miljohusesyn-ar-uppdaterad-redo-att-guida-dig-genom-2026',
		legacyId: 2320,
		date: '20 februari 2026',
		title: 'Miljöhusesyn är uppdaterad – redo att guida dig genom 2026',
		excerpt: 'Verktyget är uppdaterat utifrån kända lagändringar och visar nya eller väsentligt omformulerade frågor som "NY".',
		bodyParagraphs: [
			'Miljöhusesyn är nu uppdaterad utifrån de lagändringar som var kända inför 2026. Det gör att frågorna bättre speglar gällande regler när du går igenom din verksamhet.',
			'Om ytterligare lagändringar tillkommer under året uppdateras verktyget löpande, så att den information som används i tjänsten fortsätter vara relevant.',
			'Nya eller väsentligt omformulerade frågor markeras med "NY". För en snabb överblick finns också checklistan "Nya frågor 2026", där bara årets nya frågor visas.',
			'Den här uppdateringen hänger ihop med införandet av årliga frågor, som gör det enklare att återkommande följa upp det som behöver ses över varje år.'
		],
		legacyUrl: 'https://www.miljohusesyn.nu/page/2320'
	},
	{
		slug: 'starkt-losenordsskydd-i-miljohusesyn',
		legacyId: 2317,
		date: '9 februari 2026',
		title: 'Starkt lösenordsskydd i Miljöhusesyn',
		excerpt: 'Inloggningen kräver nu lösenord med minst 12 tecken, små och stora bokstäver samt minst två siffror.',
		bodyParagraphs: [
			'Miljöhusesyn använder ett starkt lösenordsskydd för att ge en trygg och säker inloggning i tjänsten.',
			'För att uppnå rätt skyddsnivå behöver lösenord innehålla minst 12 tecken, minst en liten bokstav, minst en stor bokstav och minst två siffror.',
			'Lösenorden hanteras med modern kryptering och följer aktuell säkerhetspraxis. Om ett befintligt lösenord inte uppfyller kraven behöver användaren välja ett nytt vid inloggning.',
			'När lösenordet har uppdaterats går det att fortsätta arbeta i Miljöhusesyn som vanligt.'
		],
		legacyUrl: 'https://www.miljohusesyn.nu/page/2317'
	},
	{
		slug: 'nytt-vid-anmalan-av-miljofarlig-verksamhet-1-jan-2026',
		date: '14 januari 2026',
		legacyId: 2314,
		title: 'Nytt vid anmälan av miljöfarlig verksamhet 1 jan 2026 – kommunens beslut måste inväntas innan start',
		excerpt: 'För vissa C-verksamheter måste verksamheten nu invänta kommunens beslut om betydande miljöpåverkan innan start.',
		bodyParagraphs: [
			'Från den 1 januari 2026 gäller nya regler för handläggning av anmälan om miljöfarlig verksamhet, så kallad C-anmälan. För vissa verksamheter måste tillsynsmyndigheten först besluta om verksamheten kan antas medföra betydande miljöpåverkan eller inte.',
			'Det betyder att verksamheten inte längre får startas bara för att sex veckor har gått sedan anmälan skickades in. Beslutet från kommunen måste inväntas innan start, och för vissa avfallsverksamheter behöver även beslut om försiktighetsmått vara klart.',
			'Det har också förtydligats hur kommunen ska handlägga ärendet. Inom sex veckor ska anmälan normalt vara behandlad, även om tiden kan förlängas om det finns skäl för det.',
			'För djurhållning över 100 djurenheter och vissa andra verksamheter har även innehållet i själva anmälan skärpts, bland annat genom hänvisning till miljöbedömningsförordningen.'
		],
		legacyUrl: 'https://www.miljohusesyn.nu/page/2314'
	},
	{
		slug: 'inforande-av-kunskapskrav-for-pannoperatorer-fran-1-jan-2026',
		legacyId: 2311,
		date: '7 januari 2026',
		title: 'Införande av kunskapskrav för pannoperatörer från 1 jan. 2026',
		excerpt: 'Kravet på certifiering ersätts av krav på dokumenterad kunskap för operatörer av trycksatta pannor i klass A och B.',
		bodyParagraphs: [
			'Från och med den 1 januari 2026 gäller nya kunskapskrav för operatörer av trycksatta pannor i klass A eller B. Det tidigare kravet på ackrediterad certifiering har ersatts av krav på dokumenterad kunskap.',
			'Arbetsgivaren ansvarar nu för att pannoperatörer har rätt teoretisk och praktisk kompetens, och att kunskaperna kan styrkas med exempelvis kursintyg eller arbetsgivarintyg.',
			'Kunskapskraven omfattar bland annat energi, risker, säkerhetsfunktioner och åtgärder vid larm eller nödsituationer. Det ska också vara dokumenterat vilka personer som har uppdraget att använda eller underhålla utrustningen.'
		],
		legacyUrl: 'https://www.miljohusesyn.nu/page/2311'
	}
];

export const homepageNews = publicNewsItems.slice(0, 5);

export const publicCalculatorPages: PublicCalculatorPage[] = [
	{
		slug: 'spridningsareal-utifran-djur',
		title: 'Spridningsareal - Beräkningar utifrån djur',
		excerpt: 'Beräkningsverktyget för spridningsareal utifrån djur håller på att byggas upp på nytt i den nya plattformen.',
		heroImage: '/brand/hero.jpg',
		status: 'rebuild',
		bodyParagraphs: [
			'Det här området motsvarar en av de tre beräkningsytor som fanns i den äldre publika sajten.',
			'Vid kontroll den 19 maj 2026 returnerade den äldre live-adressen ett applikationsfel, så den tidigare implementationen går inte att återanvända direkt som referens i drift.',
			'Nästa steg är att återskapa själva beräkningslogiken utifrån underliggande regler, indata och förväntade resultat i stället för att försöka spegla en trasig legacy-endpoint.',
			'Tills dess fungerar den här sidan som publik hållplats i navigationen, så att informationsarkitekturen i nya systemet matchar den äldre sajten bättre.'
		]
	},
	{
		slug: 'fosforbalansberakningar',
		title: 'Spridningsareal - Fosforbalansberäkningar',
		excerpt: 'Fosforbalansberäkningen behöver byggas om i nya systemet eftersom den äldre publika implementationen inte längre är tillgänglig.',
		heroImage: '/brand/hero.jpg',
		status: 'rebuild',
		bodyParagraphs: [
			'Den äldre publika länken för fosforbalansberäkningar svarar idag med ett serverfel i legacy-miljön.',
			'Det gör att vi behöver återskapa funktion, formulär och resultatpresentation som en modern app-funktion i stället för att försöka bädda in eller proxya den gamla sidan.',
			'Den nya publika hållplatsen gör det möjligt att behålla menustrukturen redan nu medan vi bryter ut den faktiska beräkningslogiken i ett kommande steg.',
			'När vi går vidare här bör fokus ligga på vilka indata användaren behöver ange, hur reglerna ska uttryckas och hur resultatet ska förklaras tydligt.'
		]
	},
	{
		slug: 'lagringsvolymer-stallgodsel',
		title: 'Lagringsvolymer för stallgödsel',
		excerpt: 'Beräkningen för lagringsvolymer för stallgödsel är planerad för ny implementation i appen.',
		heroImage: '/brand/hero.jpg',
		status: 'rebuild',
		bodyParagraphs: [
			'Även den här beräkningsytan fanns i den äldre menyn men den publika legacy-endpointen är inte längre tillgänglig.',
			'För att få ett hållbart resultat i nya systemet behöver vi därför ta fram beräkningsunderlag, gränsvärden och användarflöde som egen funktionalitet.',
			'Just nu är sidan främst en publik platsmarkör i navigationen, så att Beräkningar inte längre känns som ett tomt eller dött menyområde.',
			'När vi implementerar själva verktyget bör vi samtidigt bestämma om resultaten ska kunna sparas, delas eller kopplas till gårdsuppgifter i den inloggade delen av systemet.'
		]
	}
];

export const contactDetails = {
	email: 'support@miljohusesyn.nu',
	phone: '010-184 40 00'
};

export const isAppShellRoute = (_pathname: string) => false;

export const getPublicNewsBySlug = (slug: string) =>
	publicNewsItems.find((item) => item.slug === slug) ?? null;

export const getPublicCalculatorBySlug = (slug: string) =>
	publicCalculatorPages.find((item) => item.slug === slug) ?? null;

export function getPublicHeroImage(pathname: string) {
	if (
		pathname === '/' ||
		pathname === '/kontakt' ||
		pathname === '/faktabank' ||
		pathname === '/faktabank/material' ||
		pathname === '/faktabank/kansliga-omraden' ||
		pathname === '/faktabank/sprutning' ||
		pathname === '/faktabank/farligt-avfall' ||
		pathname === '/faktabank/koldmedia' ||
		pathname === '/faktabank/systematiskt-arbetsmiljoarbete'
	) {
		return '/brand/hero.jpg';
	}

	if (
		pathname === '/grundvillkor' ||
		pathname === '/faktabank/miljosanktionsavgifter' ||
		pathname === '/faktabank/tillsynsmyndigheter' ||
		pathname === '/faktabank/amnen/arbetsmiljo' ||
		pathname === '/faktabank/rekommendationer-for-godsling-och-kalkning' ||
		pathname === '/faktabank/krav-pa-leverans-och-mottagningsjournal-for-stallgodsel' ||
		pathname === '/faktabank/trycksatta-anordningar'
	) {
		return '/brand/hero-03.jpg';
	}

	if (
		pathname === '/faktabank/viktigt-for-alla' ||
		pathname === '/faktabank/anmalningspliktig-verksamhet' ||
		pathname === '/faktabank/tillstandspliktig-verksamhet' ||
		pathname === '/faktabank/miljorapport' ||
		pathname === '/faktabank/personalliggare' ||
		pathname === '/faktabank/infor-tillsyn-tips-och-rad' ||
		pathname === '/faktabank/djurskydd-vid-elavbrott' ||
		pathname === '/faktabank/aldre-miljohusesyner' ||
		pathname === '/faktabank/amnen/b-eller-c-verksamhet' ||
		pathname === '/faktabank/amnen/regler-och-tillsyn'
	) {
		return '/brand/hero-02.jpg';
	}

	if (pathname === '/faktabank/regelandringar-och-nyheter') {
		return '/brand/hero.jpg';
	}

	if (
		pathname === '/om' ||
		pathname === '/faktabank/kemikalier' ||
		pathname === '/faktabank/utrymmeskrav-for-djurhallning' ||
		pathname === '/faktabank/allmanna-rad' ||
		pathname === '/faktabank/krav-pa-lagringskapacitet-for-stallgodsel' ||
		pathname === '/faktabank/slattbygder' ||
		pathname === '/faktabank/energiproduktion' ||
		pathname === '/faktabank/amnen/djurhallning'
	) {
		return '/brand/hero-01.jpg';
	}

	return '/brand/hero.jpg';
}
