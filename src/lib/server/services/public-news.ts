import { publicNewsItems, type PublicNewsItem } from '$lib/public-site';
import { withDomainStoreClient } from '$lib/server/domain-store/client';
import { createContentStudioRepository } from '$lib/server/domain-store/content-studio-repository';
import {
	extractPublicParagraphs,
	normalizePublicBodyHtml,
	paragraphsToPublicBodyHtml
} from './public-content-format';
import { ensureSeededPublicNewsRows } from './public-news-store';

type NewsDraftPayload = {
	title?: string;
	publishedAt?: string;
	excerpt?: string;
	bodyHtml?: string;
	bodyParagraphs?: string[];
	legacyUrl?: string;
};

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

	const message = error.message.toLowerCase();
	return (
		message.includes('content_snapshots') ||
		message.includes('econrefused') ||
		message.includes('connect econnrefused') ||
		message.includes('relation "') ||
		message.includes('does not exist')
	);
}

export async function listPublishedPublicNews() {
	try {
		const items = await mapPublishedNewsRows();
		return items.length > 0 ? items : publicNewsItems;
	} catch (error) {
		if (!isRecoverablePublicNewsFailure(error)) {
			throw error;
		}

		return publicNewsItems;
	}
}

export async function getPublishedPublicNewsBySlug(slug: string) {
	const items = await listPublishedPublicNews();
	return items.find((item) => item.slug === slug) ?? null;
}

export async function listHomepagePublicNews(limit = 5) {
	return (await listPublishedPublicNews()).slice(0, limit);
}
