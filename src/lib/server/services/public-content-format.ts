export function slugifyPublicContent(value: string) {
	return value
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function extractPublicExcerpt(bodyHtml: string) {
	const plainText = extractPublicPlainText(bodyHtml);

	if (plainText.length <= 190) {
		return plainText;
	}

	return `${plainText.slice(0, 187).trimEnd()}...`;
}

export function extractPublicPlainText(bodyHtml: string) {
	return bodyHtml
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
		.trim();
}

export function normalizePublicBodyHtml(bodyHtml: string) {
	if (/<[a-z][\s\S]*>/i.test(bodyHtml)) {
		return bodyHtml
			.replace(/<!--[\s\S]*?-->/g, '')
			.replace(/<p>\s*(?:&nbsp;|\s|<br\s*\/?>)*<\/p>/gi, '')
			.trim();
	}

	return bodyHtml
		.split(/\n{2,}/)
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br />')}</p>`)
		.join('');
}

export function paragraphsToPublicBodyHtml(paragraphs: string[]) {
	return paragraphs
		.map((paragraph) => paragraph.trim())
		.filter(Boolean)
		.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
		.join('');
}

export function extractPublicParagraphs(bodyHtml: string) {
	const normalized = bodyHtml
		.replace(/<\/(p|h1|h2|h3|h4|h5|h6|li|tr|div|section|article)>/gi, '$&\n\n')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/\r\n/g, '\n')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

	return normalized
		.split(/\n{2,}/)
		.map((part) => part.trim())
		.filter(Boolean);
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
