import fs from 'node:fs/promises';
import { error } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { createDb } from '$lib/server/db/client';
import { createRuntimeGateway } from '$lib/server/db/runtime-gateway';
import { generateChecklistCompleteBookHtmlPdf } from '$lib/server/services/checklist-complete-book-pdf';
import {
	enqueueRuntimePublicationJob,
	recordRuntimePublicationDelivery
} from '$lib/server/services/publication-telemetry';

export const GET = async ({ locals, url }) => {
	const user = requireUser(locals, url);
	const db = createDb();
	const runtimeGateway = createRuntimeGateway(db);
	const { data, assignedChecklistIds } = await runtimeGateway.loadChecklistListQuery(user.id);
	const preferredOrder = ['miljohusesyn-g', 'miljohusesyn-v', 'miljohusesyn-d', 'miljohusesyn-a'];
	let checklist =
		preferredOrder
			.map((slug) => data.checklists.find((item) => item.slug === slug && assignedChecklistIds.has(item.id)))
			.find(Boolean) ??
		data.checklists.find((item) => item.variantKey === 'default' && assignedChecklistIds.has(item.id)) ??
		data.checklists.find((item) => assignedChecklistIds.has(item.id)) ??
		null;

	if (!checklist) {
		for (const slug of preferredOrder) {
			const candidate = await runtimeGateway.findChecklistBySlug(slug);
			if (candidate) {
				checklist = candidate;
				break;
			}
		}
	}

	if (!checklist) {
		throw error(404, 'Checklist not found');
	}

	const artifact = await generateChecklistCompleteBookHtmlPdf(db, 'miljohusesyn', user.id, 'user-full');

	if (!artifact) {
		throw error(404, 'Checklist not found');
	}

	const pdf = await fs.readFile(artifact.pdfPath);
	await runtimeGateway.insertPdfExportEvent({
		userId: user.id,
		checklistId: checklist.id,
		exportKind: 'user-full-html',
		filename: artifact.filename
	});

	const jobId = await enqueueRuntimePublicationJob(
		{
			userId: user.id,
			checklistId: checklist.id,
			publicationKind: 'user-full'
		},
		db
	);

	await recordRuntimePublicationDelivery(
		{
			jobId,
			userId: user.id,
			checklistId: checklist.id,
			filename: artifact.filename,
			byteCount: pdf.byteLength
		},
		db
	);

	return new Response(pdf, {
		headers: {
			'Content-Type': artifact.contentType,
			'Content-Disposition': `attachment; filename="${artifact.filename}"`,
			'Cache-Control': 'no-store'
		}
	});
};
