import { publicNewsItems } from '../src/lib/public-site';
import { withDomainStoreClient } from '../src/lib/server/domain-store/client';
import { createContentStudioRepository } from '../src/lib/server/domain-store/content-studio-repository';

function paragraphsToHtml(paragraphs: string[]) {
	return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('\n\n');
}

async function main() {
	await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			throw new Error('No content snapshot found in the configured domain store.');
		}

		await repository.ensurePublicNewsSchema();

		for (const [index, item] of publicNewsItems.entries()) {
			await repository.upsertNewsRow({
				id: `news:${item.slug}`,
				snapshotId: latestSnapshot.id,
				sortOrder: index + 1,
				slug: item.slug,
				title: item.title,
				publishedAt: item.date,
				excerpt: item.excerpt,
				bodyHtml: paragraphsToHtml(item.bodyParagraphs),
				legacyUrl: item.legacyUrl,
				sourceFile: `captured://${item.legacyUrl.replace(/^https?:\/\//, '')}`
			});
		}

		console.log(`Imported ${publicNewsItems.length} public news items into snapshot ${latestSnapshot.id}.`);
	});
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
