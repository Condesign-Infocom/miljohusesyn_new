import type { ContentStudioStandardContentRow } from '$lib/server/domain-store/content-studio-repository';

export type StandardContentReferenceView = {
	label: string;
	raw: string;
};

export type StandardContentUsageView = {
	id: string;
	title: string;
	contentTypeLabel: string;
};

export type StandardContentDisplayRow = ContentStudioStandardContentRow & {
	contentTypeLabel: string;
	roleLabel: string;
	outboundReferences: StandardContentReferenceView[];
	inboundReferences: StandardContentUsageView[];
};

export function buildStandardContentDisplayRows(
	rows: ContentStudioStandardContentRow[]
): StandardContentDisplayRow[] {
	const titleByBlockId = new Map<string, string>();
	const contentTypeByBlockId = new Map<string, string>();

	for (const row of rows) {
		if (!row.blockId) {
			continue;
		}

		titleByBlockId.set(row.blockId.trim(), row.title);
		contentTypeByBlockId.set(row.blockId.trim(), row.contentType);
	}

	const inboundReferencesByBlockId = new Map<string, StandardContentUsageView[]>();

	for (const row of rows) {
		for (const target of row.targets) {
			const targetBlockId = extractTargetBlockId(target);
			if (!targetBlockId || !titleByBlockId.has(targetBlockId)) {
				continue;
			}

			const usageRows = inboundReferencesByBlockId.get(targetBlockId) ?? [];
			usageRows.push({
				id: row.id,
				title: row.title,
				contentTypeLabel: formatContentTypeLabel(row.contentType)
			});
			inboundReferencesByBlockId.set(targetBlockId, usageRows);
		}
	}

	return rows.map((row) => ({
		...row,
		contentTypeLabel: formatContentTypeLabel(row.contentType),
		roleLabel: formatRoleLabel(row.rootTag),
		outboundReferences: row.targets.map((target) => ({
			label: resolveReferenceLabel(target, titleByBlockId),
			raw: target
		})),
		inboundReferences: row.blockId ? (inboundReferencesByBlockId.get(row.blockId.trim()) ?? []) : []
	}));
}

function extractTargetBlockId(rawTarget: string) {
	const fragment = rawTarget.split('#')[1]?.trim();
	return fragment || null;
}

function resolveReferenceLabel(rawTarget: string, titleByBlockId: Map<string, string>) {
	const targetBlockId = extractTargetBlockId(rawTarget);
	if (targetBlockId && titleByBlockId.has(targetBlockId)) {
		return titleByBlockId.get(targetBlockId) ?? targetBlockId;
	}

	if (rawTarget.includes('/checklists/')) {
		return 'Checklistor';
	}

	if (rawTarget.includes('/facts/')) {
		return 'Fakta';
	}

	if (rawTarget.includes('/users/')) {
		return 'Användaruppgifter';
	}

	if (targetBlockId === 'id-checklists') {
		return 'Checklistor';
	}

	if (targetBlockId === 'id-facts') {
		return 'Fakta';
	}

	if (targetBlockId === 'id-user-info') {
		return 'Användaruppgifter';
	}

	return targetBlockId ?? rawTarget;
}

function formatContentTypeLabel(contentType: string) {
	switch (contentType) {
		case 'appendix':
			return 'Bilaga';
		case 'common-standard-text':
			return 'Gemensam standardtext';
		case 'glossary':
			return 'Ordlista';
		case 'journal':
			return 'Journal';
		case 'plan':
			return 'Plan';
		case 'preface':
			return 'Förord';
		case 'root-assembly':
			return 'Rotsammanställning';
		default:
			return contentType;
	}
}

function formatRoleLabel(rootTag: string) {
	switch (rootTag) {
		case 'appendix':
			return 'Bilagedel';
		case 'article':
			return 'Artikel';
		case 'glossary':
			return 'Ordlistedel';
		case 'lrf-pub':
			return 'Publiceringsrot';
		default:
			return rootTag;
	}
}
