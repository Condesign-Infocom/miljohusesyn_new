import { requireRuntimePostgresPool } from '$lib/server/db/client';
import {
	extractPublicExcerpt,
	extractPublicParagraphs,
	normalizePublicBodyHtml,
	slugifyPublicContent
} from './public-content-format';
import { createTtlCache } from './ttl-cache';

export type PublicFactSummary = {
	slug: string;
	nodeId: string;
	title: string;
	excerpt: string;
};

export type PublicFactDetail = PublicFactSummary & {
	bodyHtml: string;
	bodyParagraphs: string[];
};

type FactRow = {
	nodeId: string;
	title: string;
	bodyHtml: string;
};

const publicFactRowsCache = createTtlCache<FactRow[]>(60 * 1000);

export function clearPublishedPublicFactsCache() {
	publicFactRowsCache.clear();
}

export async function listPublishedPublicFacts(): Promise<PublicFactSummary[]> {
	const rows = await loadPublishedFactRows();
	const usedSlugs = new Set<string>();

	return rows.map((row) => {
		const slug = makeUniqueSlug(slugifyPublicContent(row.title), row.nodeId, usedSlugs);

		return {
			slug,
			nodeId: row.nodeId,
			title: row.title,
			excerpt: extractPublicExcerpt(row.bodyHtml)
		};
	});
}

export async function getPublishedPublicFactBySlug(slug: string): Promise<PublicFactDetail | null> {
	const rows = await loadPublishedFactRows();
	const usedSlugs = new Set<string>();

	for (const row of rows) {
		const candidateSlug = makeUniqueSlug(slugifyPublicContent(row.title), row.nodeId, usedSlugs);

		if (candidateSlug === slug) {
			return {
				slug: candidateSlug,
				nodeId: row.nodeId,
				title: row.title,
				bodyHtml: normalizePublicBodyHtml(row.bodyHtml),
				bodyParagraphs: extractPublicParagraphs(row.bodyHtml),
				excerpt: extractPublicExcerpt(row.bodyHtml)
			};
		}
	}

	return null;
}

async function loadPublishedFactRows(): Promise<FactRow[]> {
	return await publicFactRowsCache.get(loadPublishedFactRowsUncached);
}

async function loadPublishedFactRowsUncached(): Promise<FactRow[]> {
	const result = await requireRuntimePostgresPool().query<FactRow>(
		`
			select distinct on (f.node_id, f.title)
				f.node_id as "nodeId",
				f.title,
				f.body_html as "bodyHtml"
			from app_question_fact_links l
			join app_facts f on f.id = l.fact_id
			where nullif(trim(f.body_html), '') is not null
				and f.snapshot_key <> 'snapshot-domain'
			order by f.node_id, f.title
		`
	);

	return result.rows;
}

function makeUniqueSlug(baseSlug: string, nodeId: string, usedSlugs: Set<string>) {
	const fallback = baseSlug || slugifyPublicContent(nodeId);
	let slug = fallback;

	if (usedSlugs.has(slug)) {
		slug = `${fallback}-${slugifyPublicContent(nodeId)}`;
	}

	usedSlugs.add(slug);
	return slug;
}
