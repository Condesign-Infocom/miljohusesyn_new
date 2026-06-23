import { withDomainStoreClient } from '../src/lib/server/domain-store/client';
import { createContentStudioRepository } from '../src/lib/server/domain-store/content-studio-repository';
import { normalizePublicBodyHtml } from '../src/lib/server/services/public-content-format';

const IMPORT_DEFINITIONS = {
	'regelandringar-och-nyheter': {
		title: 'Regeländringar och Nyheter',
		url: 'https://www.miljohusesyn.nu/p/927'
	},
	'viktigt-for-alla': {
		title: 'Viktigt för alla',
		url: 'https://www.miljohusesyn.nu/p/1094'
	},
	miljosanktionsavgifter: {
		title: 'Miljösanktionsavgifter',
		url: 'https://www.miljohusesyn.nu/p/214'
	},
	'utrymmeskrav-for-djurhallning': {
		title: 'Utrymmeskrav för djurhållning',
		url: 'https://www.miljohusesyn.nu/p/181'
	},
	'om-miljohusesyn': {
		title: 'Om Miljöhusesyn',
		url: 'https://www.miljohusesyn.nu/p/9'
	}
} as const;

type ImportSlug = keyof typeof IMPORT_DEFINITIONS;

async function main() {
	const slugArg = process.argv[2]?.trim();

	if (!slugArg) {
		throw new Error(
			`Usage: npm exec tsx scripts/import-legacy-standard-content.ts <${Object.keys(IMPORT_DEFINITIONS).join('|')}|all>`
		);
	}

	const slugs =
		slugArg === 'all'
			? (Object.keys(IMPORT_DEFINITIONS) as ImportSlug[])
			: slugArg in IMPORT_DEFINITIONS
				? [slugArg as ImportSlug]
				: null;

	if (!slugs) {
		throw new Error(
			`Usage: npm exec tsx scripts/import-legacy-standard-content.ts <${Object.keys(IMPORT_DEFINITIONS).join('|')}|all>`
		);
	}

	await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			throw new Error('No durable content snapshot found.');
		}

		const rows = await repository.listStandardContentRows({ snapshotId: latestSnapshot.id });
		for (const slug of slugs) {
			const definition = IMPORT_DEFINITIONS[slug];
			const legacyPage = await fetchLegacyPage(definition.url);

			if (!legacyPage?.bodyHtml.trim()) {
				throw new Error(`Could not load legacy page HTML for ${slug}.`);
			}

			const row = rows.find((item) => item.title === definition.title);
			const capturedSourceFile = `captured://miljohusesyn.nu/${slug}`;
			const rowToUpdate =
				row ??
				rows.find(
					(item) =>
						item.sourceFile === capturedSourceFile ||
						normalizeTitle(item.title) === normalizeTitle(definition.title)
					);

			if (!rowToUpdate) {
				throw new Error(
					`Could not find standard content row "${definition.title}" in snapshot ${latestSnapshot.id}.`
				);
			}

			await client.run(
				`
					update standard_content_blocks
					set body_html = ?, title = ?, source_file = ?
					where id = ?
					  and snapshot_id = ?
				`,
				[
					legacyPage.bodyHtml,
					definition.title,
					capturedSourceFile,
					rowToUpdate.sourceRowId,
					latestSnapshot.id
				]
			);

			console.log(
				`Imported ${definition.title} into durable snapshot ${latestSnapshot.id} from legacy public page ${slug}.`
			);
		}
	});
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});

async function fetchLegacyPage(url: string) {
	const response = await fetch(url, {
		headers: {
			'user-agent': 'Miljohusesyn new-system standard-content importer'
		}
	});

	if (!response.ok) {
		return null;
	}

	const html = await response.text();
	const bodyHtmlMatch = html.match(
		/<(?:div|section)[^>]*class=(['"])[^'"]*\bwpcontainer\b[^'"]*\1[^>]*>([\s\S]*?)<\/(?:div|section)>/i
	);

	if (!bodyHtmlMatch) {
		return null;
	}

	const bodyHtml = normalizePublicBodyHtml(bodyHtmlMatch[2]);
	const titleMatch = bodyHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

	return {
		title: titleMatch ? decodeHtml(titleMatch[1]).trim() : '',
		bodyHtml
	};
}

function decodeHtml(value: string) {
	return value
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/\s+/g, ' ');
}

function normalizeTitle(value: string) {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '')
		.toLowerCase();
}
