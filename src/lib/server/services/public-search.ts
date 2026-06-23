import {
	contactDetails,
	downloadResources,
	homepageHighlights,
	publicNewsItems,
	publicStaticFactPages
} from '$lib/public-site';
import { listPublishedPublicFacts } from './public-facts';
import { listPublishedPublicStandardContent } from './public-standard-content';

export type PublicSearchScope = 'all' | 'wp' | 'exist';

export type PublicSearchResult = {
	title: string;
	href: string;
	excerpt: string;
	kind: 'fact' | 'standard' | 'static' | 'news' | 'download' | 'page';
	meta: string;
};

export async function searchPublicContent(query: string, scope: PublicSearchScope) {
	const normalizedQuery = normalizeSearchText(query);
	const terms = normalizedQuery
		.split(/\s+/)
		.map((term) => term.trim())
		.filter(Boolean);

	if (!normalizedQuery || terms.length === 0) {
		return [];
	}

	const [facts, standardContent] = await Promise.all([
		listPublishedPublicFacts(),
		listPublishedPublicStandardContent()
	]);

	const results: PublicSearchResult[] = [];
	const seen = new Set<string>();

	for (const fact of facts) {
		pushIfMatch(results, seen, terms, {
			title: fact.title,
			href: `/faktabank/${fact.slug}`,
			excerpt: fact.excerpt,
			kind: 'fact',
			meta: `Fakta · ${fact.nodeId}`
		});
	}

	for (const item of standardContent) {
		pushIfMatch(results, seen, terms, {
			title: item.title,
			href: `/faktabank/${item.slug}`,
			excerpt: item.excerpt,
			kind: 'standard',
			meta: `Standardtext · ${item.contentType}`
		});
	}

	if (scope !== 'exist') {
		for (const page of publicStaticFactPages) {
			pushIfMatch(results, seen, terms, {
				title: page.title,
				href: `/faktabank/${page.slug}`,
				excerpt: page.excerpt,
				kind: 'static',
				meta: 'Bevarad Faktabank-sida'
			});
		}

		for (const resource of downloadResources) {
			pushIfMatch(results, seen, terms, {
				title: resource.title,
				href: resource.href,
				excerpt: resource.description,
				kind: 'download',
				meta: resource.category ? `Material · ${resource.category}` : 'Material'
			});
		}
	}

	if (scope === 'all') {
		for (const item of publicNewsItems) {
			pushIfMatch(results, seen, terms, {
				title: item.title,
				href: `/nyheter/${item.slug}`,
				excerpt: item.excerpt,
				kind: 'news',
				meta: `Nyhet · ${item.date}`
			});
		}

		const publicPages: PublicSearchResult[] = [
			{
				title: 'Hem',
				href: '/',
				excerpt: homepageHighlights.join(' '),
				kind: 'page',
				meta: 'Publik sida'
			},
			{
				title: 'Om Miljöhusesyn',
				href: '/om',
				excerpt:
					'Information om hur Miljöhusesyn används, vad tjänsten innehåller och hur den hjälper verksamheter att följa regler.',
				kind: 'page',
				meta: 'Publik sida'
			},
			{
				title: 'Kontakt',
				href: '/kontakt',
				excerpt: `Kontakta Miljöhusesyn via ${contactDetails.email} eller ${contactDetails.phone}.`,
				kind: 'page',
				meta: 'Publik sida'
			}
		];

		for (const page of publicPages) {
			pushIfMatch(results, seen, terms, page);
		}
	}

	return results.sort((left, right) => rankResult(left, normalizedQuery, terms) - rankResult(right, normalizedQuery, terms));
}

function pushIfMatch(
	results: PublicSearchResult[],
	seen: Set<string>,
	terms: string[],
	result: PublicSearchResult
) {
	const haystack = normalizeSearchText([result.title, result.excerpt, result.meta].join(' '));

	if (!terms.every((term) => haystack.includes(term))) {
		return;
	}

	const key = `${result.kind}:${result.href}`;
	if (seen.has(key)) {
		return;
	}

	seen.add(key);
	results.push(result);
}

function rankResult(result: PublicSearchResult, query: string, terms: string[]) {
	const title = normalizeSearchText(result.title);
	const excerpt = normalizeSearchText(result.excerpt);
	const meta = normalizeSearchText(result.meta);
	let score = 100;

	if (title === query) {
		score -= 80;
	} else if (title.startsWith(query)) {
		score -= 65;
	} else if (title.includes(query)) {
		score -= 50;
	}

	const titleTermMatches = terms.filter((term) => title.includes(term)).length;
	const excerptTermMatches = terms.filter((term) => excerpt.includes(term)).length;
	const metaTermMatches = terms.filter((term) => meta.includes(term)).length;

	score -= titleTermMatches * 12;
	score -= excerptTermMatches * 5;
	score -= metaTermMatches * 3;

	if (terms.every((term) => title.includes(term))) {
		score -= 18;
	}

	if (title.split(/[^a-z0-9]+/i).includes(query)) {
		score -= 10;
	}

	score += kindPriority(result.kind);

	return score;
}

function kindPriority(kind: PublicSearchResult['kind']) {
	switch (kind) {
		case 'fact':
			return 0;
		case 'standard':
			return 2;
		case 'static':
			return 4;
		case 'news':
			return 6;
		case 'download':
			return 8;
		case 'page':
			return 10;
	}
}

function normalizeSearchText(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}
