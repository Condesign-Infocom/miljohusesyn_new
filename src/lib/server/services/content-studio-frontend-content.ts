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
