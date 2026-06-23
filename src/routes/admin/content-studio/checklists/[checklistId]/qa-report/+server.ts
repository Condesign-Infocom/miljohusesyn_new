import fs from 'node:fs/promises';
import { error } from '@sveltejs/kit';
import { requireContentStudioUser } from '$lib/server/auth';
import {
	buildChecklistQaReport,
	renderChecklistQaReportPdf
} from '$lib/server/services/checklist-qa-report';

export const GET = async ({ locals, params, url }) => {
	requireContentStudioUser(locals, url);

	const format = (url.searchParams.get('format') ?? 'html').toLowerCase();

	if (format === 'pdf') {
		const rendered = await renderChecklistQaReportPdf(params.checklistId);
		if (!rendered.ok) {
			throw error(500, rendered.message);
		}

		const pdf = await fs.readFile(rendered.outputPdf);
		return new Response(pdf, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${params.checklistId}-qa-report.pdf"`,
				'Cache-Control': 'no-store'
			}
		});
	}

	const built = await buildChecklistQaReport(params.checklistId);
	if (!built) {
		throw error(404, 'Checklistan hittades inte.');
	}

	return new Response(built.html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'no-store'
		}
	});
};
