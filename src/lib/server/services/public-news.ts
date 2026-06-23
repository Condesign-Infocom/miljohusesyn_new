import { publicNewsItems, type PublicNewsItem } from '$lib/public-site';
import { withDomainStoreClient } from '$lib/server/domain-store/client';
import { createContentStudioRepository } from '$lib/server/domain-store/content-studio-repository';
import {
	extractPublicParagraphs,
	normalizePublicBodyHtml,
	paragraphsToPublicBodyHtml
} from './public-content-format';
import { ensureSeededPublicNewsRows } from './public-news-store';
import { createTtlCache } from './ttl-cache';

type NewsDraftPayload = {
	title?: string;
	publishedAt?: string;
	excerpt?: string;
	bodyHtml?: string;
	bodyParagraphs?: string[];
	legacyUrl?: string;
};

const publishedPublicNewsCache = createTtlCache<PublicNewsItem[]>(60 * 1000);

export function clearPublishedPublicNewsCache() {
	publishedPublicNewsCache.clear();
}

function parseDraftPayload(payloadJson?: string | null) {
	if (!payloadJson) {
		return null;
	}

	try {
		return JSON.parse(payloadJson) as NewsDraftPayload;
	} catch {
		return null;
	}
}

async function mapPublishedNewsRows(): Promise<PublicNewsItem[]> {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = await ensureSeededPublicNewsRows();

		if (!latestSnapshot) {
			return [];
		}

		const rows = await repository.listNewsRows(latestSnapshot.id);
		const items: PublicNewsItem[] = [];

		for (const row of rows) {
			const draftState = await repository.findLatestDraftForSource('news', row.sourceRowId, latestSnapshot.id);
			const draftRevision =
				draftState?.status === 'published' ? await repository.loadLatestDraftRevision(draftState.id) : null;
			const payload = parseDraftPayload(draftRevision?.payloadJson);
			const bodyHtml = normalizePublicBodyHtml(
				payload?.bodyHtml ??
					(payload?.bodyParagraphs ? paragraphsToPublicBodyHtml(payload.bodyParagraphs) : row.bodyHtml)
			);

			items.push({
				slug: row.slug,
				legacyId: Number.parseInt(row.id.replace(/\D+/g, '').slice(-6) || '0', 10),
				date: payload?.publishedAt ?? row.publishedAt,
				title: payload?.title ?? row.title,
				excerpt: payload?.excerpt ?? row.excerpt,
				bodyParagraphs: extractPublicParagraphs(bodyHtml),
				legacyUrl: payload?.legacyUrl ?? row.legacyUrl
			});
		}

		return items;
	});
}

function isRecoverablePublicNewsFailure(error: unknown) {
	if (!(error instanceof Error)) {
		return false;
	}

	const code = 'code' in error && typeof error.code === 'string' ? error.code.toLowerCase() : '';
	const message = error.message.toLowerCase();
	return (
		code === 'econnrefused' ||
		code === 'econnreset' ||
		code === 'etimedout' ||
		code === '57p01' ||
		code === '57p02' ||
		message.includes('content_snapshots') ||
		message.includes('econnreset') ||
		message.includes('read econnreset') ||
		message.includes('econrefused') ||
		message.includes('connect econnrefused') ||
		message.includes('terminating connection') ||
		message.includes('connection terminated unexpectedly') ||
		message.includes('connection ended unexpectedly') ||
		message.includes('the database system is shutting down') ||
		message.includes('relation "') ||
		message.includes('does not exist')
	);
}

export async function listPublishedPublicNews() {
	return await publishedPublicNewsCache.get(async () => {
		try {
			const items = await mapPublishedNewsRows();
			return items.length > 0 ? items : publicNewsItems;
		} catch (error) {
			if (!isRecoverablePublicNewsFailure(error)) {
				throw error;
			}

			return publicNewsItems;
		}
	});
}

export async function getPublishedPublicNewsBySlug(slug: string) {
	const items = await listPublishedPublicNews();
	return items.find((item) => item.slug === slug) ?? null;
}

export async function listHomepagePublicNews(limit = 5) {
	return (await listPublishedPublicNews()).slice(0, limit);
}
