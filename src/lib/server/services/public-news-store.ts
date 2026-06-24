import { publicNewsItems } from '$lib/public-site';
import { withDomainStoreClient } from '$lib/server/domain-store/client';
import { createContentStudioRepository } from '$lib/server/domain-store/content-studio-repository';
import { paragraphsToPublicBodyHtml } from './public-content-format';

function buildSeedNewsRowId(legacyId: number, slug: string) {
	return legacyId > 0 ? `legacy-news-${legacyId}` : `legacy-news-${slug}`;
}

export async function ensureSeededPublicNewsRows() {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			return null;
		}

		const existingRows = await repository.listNewsRows(latestSnapshot.id);

		if (existingRows.length > 0) {
			return latestSnapshot;
		}

		for (const [index, item] of publicNewsItems.entries()) {
			await repository.upsertNewsRow({
				id: buildSeedNewsRowId(item.legacyId, item.slug),
				snapshotId: latestSnapshot.id,
				sortOrder: index,
				slug: item.slug,
				title: item.title,
				publishedAt: item.date,
				excerpt: item.excerpt,
				bodyHtml: paragraphsToPublicBodyHtml(item.bodyParagraphs),
				legacyUrl: '',
				sourceFile: 'src/lib/public-site.ts'
			});
		}

		return latestSnapshot;
	});
}
