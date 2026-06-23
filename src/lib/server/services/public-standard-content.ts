import { withDomainStoreClient } from '$lib/server/domain-store/client';
import { createContentStudioRepository } from '$lib/server/domain-store/content-studio-repository';
import {
	extractPublicExcerpt,
	extractPublicParagraphs,
	extractPublicPlainText,
	normalizePublicBodyHtml,
	slugifyPublicContent
} from './public-content-format';
import { createTtlCache } from './ttl-cache';

export type PublicStandardContentSummary = {
	slug: string;
	title: string;
	contentType: string;
	excerpt: string;
};

export type PublicStandardContentDetail = PublicStandardContentSummary & {
	bodyHtml: string;
	bodyParagraphs: string[];
	glossaryEntries: Array<{ term: string; description: string }>;
};

export type PublicStandardContentDefinition = {
	sourceTitle: string;
	publicTitle?: string;
	publicSlug?: string;
};

export const PUBLIC_STANDARD_CONTENT_DEFINITIONS: PublicStandardContentDefinition[] = [
	{ sourceTitle: 'Viktigt för alla' },
	{ sourceTitle: 'Regeländringar och Nyheter' },
	{ sourceTitle: 'Miljösanktionsavgifter' },
	{ sourceTitle: 'Utrymmeskrav för djurhållning' },
	{ sourceTitle: 'Allmänna råd' },
	{ sourceTitle: 'Avfallsjournal' },
	{ sourceTitle: 'Åtgärdsplan för Miljöhusesyn' },
	{
		sourceTitle: 'glossary',
		publicTitle: 'Liten ordlista om regler',
		publicSlug: 'liten-ordlista-om-regler'
	}
];

const PUBLIC_STANDARD_CONTENT_BY_SOURCE_TITLE = new Map(
	PUBLIC_STANDARD_CONTENT_DEFINITIONS.map((definition) => [definition.sourceTitle, definition])
);

const publishedPublicStandardContentCache = createTtlCache<PublicStandardContentDetail[]>(60 * 1000);

const GLOSSARY_TERMS = [
	'EU-förordning',
	'EU-direktiv',
	'Författningar',
	'Lag',
	'Förordning',
	'Föreskrift',
	'Allmänna råd och vägledningar',
	'Tvärvillkor',
	'Extra tvärvillkor'
] as const;

export function clearPublishedPublicStandardContentCache() {
	publishedPublicStandardContentCache.clear();
}

export function getPublicStandardContentDefinition(sourceTitle: string) {
	return PUBLIC_STANDARD_CONTENT_BY_SOURCE_TITLE.get(sourceTitle) ?? null;
}

export function isPublicStandardContentSourceTitle(sourceTitle: string) {
	return PUBLIC_STANDARD_CONTENT_BY_SOURCE_TITLE.has(sourceTitle);
}

export function getPublicStandardContentTitle(sourceTitle: string) {
	return getPublicStandardContentDefinition(sourceTitle)?.publicTitle ?? sourceTitle;
}

export function getPublicStandardContentSlug(sourceTitle: string) {
	return getPublicStandardContentDefinition(sourceTitle)?.publicSlug ?? slugifyPublicContent(sourceTitle);
}

export function getPublicStandardContentHref(sourceTitle: string) {
	return `/faktabank/${getPublicStandardContentSlug(sourceTitle)}`;
}

export async function listPublishedPublicStandardContent(): Promise<PublicStandardContentSummary[]> {
	return (await loadPublishedPublicStandardContentDetails()).map((item) => ({
		slug: item.slug,
		title: item.title,
		contentType: item.contentType,
		excerpt: item.excerpt
	}));
}

export async function getPublishedPublicStandardContentBySlug(
	slug: string
): Promise<PublicStandardContentDetail | null> {
	return (await loadPublishedPublicStandardContentDetails()).find((item) => item.slug === slug) ?? null;
}

export async function getPublishedPublicStandardContentByTitle(title: string) {
	return (await loadPublishedPublicStandardContentDetails()).find(
		(item) => item.title === title || item.title === getPublicStandardContentTitle(title)
	) ?? null;
}

async function loadPublishedPublicStandardContentDetails() {
	return await publishedPublicStandardContentCache.get(async () => {
		return await withDomainStoreClient(async (client) => {
			const repository = createContentStudioRepository(client);
			const latestSnapshot = await repository.findLatestSnapshot();

			if (!latestSnapshot) {
				return [];
			}

			const rows = await repository.listStandardContentRows({ snapshotId: latestSnapshot.id });
			return rows
				.filter((row) => isPublicStandardContentSourceTitle(row.title))
				.map((row) => {
					const normalizedBodyHtml = normalizePublicBodyHtml(row.bodyHtml);

					return {
						slug: getPublicStandardContentSlug(row.title),
						title: getPublicStandardContentTitle(row.title),
						contentType: row.contentType,
						bodyHtml: normalizedBodyHtml,
						bodyParagraphs: extractPublicParagraphs(normalizedBodyHtml),
						glossaryEntries: extractGlossaryEntries(normalizedBodyHtml, row.contentType),
						excerpt: extractPublicExcerpt(normalizedBodyHtml)
					};
				});
		});
	});
}

function extractGlossaryEntries(bodyHtml: string, contentType: string) {
	if (contentType !== 'glossary') {
		return [];
	}

	const plainText = extractPublicPlainText(bodyHtml);
	const entries: Array<{ term: string; description: string }> = [];

	for (const [index, term] of GLOSSARY_TERMS.entries()) {
		const startIndex = plainText.indexOf(term);

		if (startIndex === -1) {
			continue;
		}

		const descriptionStart = startIndex + term.length;
		const nextTerm = GLOSSARY_TERMS[index + 1];
		const nextTermIndex = nextTerm ? plainText.indexOf(nextTerm, descriptionStart) : -1;
		const descriptionEnd = nextTermIndex === -1 ? plainText.length : nextTermIndex;
		const description = plainText.slice(descriptionStart, descriptionEnd).trim();

		if (description) {
			entries.push({ term, description });
		}
	}

	return entries;
}
