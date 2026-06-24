import type { StandardContentDisplayRow } from './content-studio-display';
import {
	getPublicStandardContentHref,
	getPublicStandardContentSlug,
	getPublicStandardContentTitle,
	isPublicStandardContentSourceTitle
} from './public-standard-content';

export type FrontendContentDisplayRow = StandardContentDisplayRow & {
	publicTitle: string;
	publicSlug: string;
	publicHref: string;
};

export type FrontendContentPreset = {
	sourceTitle: string;
	contentType: string;
	rootTag: string;
	blockId: string;
	sourceFile: string;
	initialBodyHtml: string;
};

const FRONTEND_CONTENT_PRESETS: FrontendContentPreset[] = [
	{
		sourceTitle: 'Viktigt för alla',
		contentType: 'common-standard-text',
		rootTag: 'article',
		blockId: 'id-common-facts',
		sourceFile: 'content-staging\\source\\standard-texts\\facts-common-uid0.xml',
		initialBodyHtml: '<p>Skriv innehållet för sidan Viktigt för alla här.</p>'
	},
	{
		sourceTitle: 'Regeländringar och Nyheter',
		contentType: 'preface',
		rootTag: 'article',
		blockId: 'id-preface2',
		sourceFile: 'content-staging\\source\\standard-texts\\preface2.xml',
		initialBodyHtml: '<p>Skriv innehållet för sidan Regeländringar och Nyheter här.</p>'
	},
	{
		sourceTitle: 'Miljösanktionsavgifter',
		contentType: 'appendix',
		rootTag: 'appendix',
		blockId: 'id-app3',
		sourceFile: 'content-staging\\pub\\standard-texts\\app3-pub-uid0.xml',
		initialBodyHtml: '<p>Skriv innehållet för sidan Miljösanktionsavgifter här.</p>'
	},
	{
		sourceTitle: 'Utrymmeskrav för djurhållning',
		contentType: 'appendix',
		rootTag: 'appendix',
		blockId: 'id-app1',
		sourceFile: 'content-staging\\pub\\standard-texts\\app1-pub-uid0.xml',
		initialBodyHtml: '<p>Skriv innehållet för sidan Utrymmeskrav för djurhållning här.</p>'
	},
	{
		sourceTitle: 'Allmänna råd',
		contentType: 'appendix',
		rootTag: 'appendix',
		blockId: 'id-app2',
		sourceFile: 'content-staging\\pub\\standard-texts\\app2-pub-uid0.xml',
		initialBodyHtml: '<p>Skriv innehållet för sidan Allmänna råd här.</p>'
	},
	{
		sourceTitle: 'Avfallsjournal',
		contentType: 'journal',
		rootTag: 'appendix',
		blockId: 'id-journal',
		sourceFile: 'content-staging\\source\\standard-texts\\journal.xml',
		initialBodyHtml: '<p>Skriv innehållet för sidan Avfallsjournal här.</p>'
	},
	{
		sourceTitle: 'Åtgärdsplan för Miljöhusesyn',
		contentType: 'plan',
		rootTag: 'appendix',
		blockId: 'id-plan',
		sourceFile: 'content-staging\\source\\standard-texts\\plan.xml',
		initialBodyHtml: '<p>Skriv innehållet för sidan Åtgärdsplan för Miljöhusesyn här.</p>'
	},
	{
		sourceTitle: 'glossary',
		contentType: 'glossary',
		rootTag: 'glossary',
		blockId: 'id-gloss',
		sourceFile: 'content-staging\\source\\standard-texts\\glossary.xml',
		initialBodyHtml: '<p>Skriv eller klistra in ordlistans innehåll här.</p>'
	}
];

export function isFrontendContentTitle(title: string) {
	return isPublicStandardContentSourceTitle(title);
}

export function buildFrontendContentDisplayRows(rows: StandardContentDisplayRow[]): FrontendContentDisplayRow[] {
	return rows
		.filter((row) => isFrontendContentTitle(row.title))
		.map((row) => ({
			...row,
			publicTitle: getPublicStandardContentTitle(row.title),
			publicSlug: getPublicStandardContentSlug(row.title),
			publicHref: getPublicStandardContentHref(row.title)
		}))
		.sort((left, right) => left.publicTitle.localeCompare(right.publicTitle, 'sv'));
}

export function getFrontendContentMeta(title: string) {
	if (!isFrontendContentTitle(title)) {
		return null;
	}

	return {
		publicTitle: getPublicStandardContentTitle(title),
		publicSlug: getPublicStandardContentSlug(title),
		publicHref: getPublicStandardContentHref(title)
	};
}

export function getFrontendContentPreset(sourceTitle: string) {
	return FRONTEND_CONTENT_PRESETS.find((preset) => preset.sourceTitle === sourceTitle) ?? null;
}

export function listMissingFrontendContentPresets(rows: Array<{ title: string }>) {
	const existingTitles = new Set(rows.map((row) => row.title));

	return FRONTEND_CONTENT_PRESETS.filter((preset) => !existingTitles.has(preset.sourceTitle)).map((preset) => ({
		...preset,
		publicTitle: getPublicStandardContentTitle(preset.sourceTitle),
		publicSlug: getPublicStandardContentSlug(preset.sourceTitle),
		publicHref: getPublicStandardContentHref(preset.sourceTitle)
	}));
}
