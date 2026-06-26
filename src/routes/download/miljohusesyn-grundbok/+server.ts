import fs from 'node:fs/promises';
import { createDb } from '$lib/server/db/client';
import { ensurePublicCompleteBookArtifact } from '$lib/server/services/public-complete-book-artifact';

export const GET = async () => {
	const artifact = await ensurePublicCompleteBookArtifact(createDb());
	const pdf = await fs.readFile(artifact.pdfPath);

	return new Response(pdf, {
		headers: {
			'Content-Type': artifact.contentType,
			'Content-Disposition': `attachment; filename="${artifact.filename}"`,
			'Cache-Control': 'public, max-age=300'
		}
	});
};
