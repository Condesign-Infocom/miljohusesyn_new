import fs from 'node:fs/promises';
import { error } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { createDb } from '$lib/server/db/client';
import { createRuntimeGateway } from '$lib/server/db/runtime-gateway';
import type { PublicationRequestKind } from '$lib/server/services/pdf-export';
import { generateChecklistActionPlanPdf } from '$lib/server/services/checklist-action-plan-pdf';
import { processPublicationJob } from '$lib/server/services/publication-queue';
import {
	enqueueRuntimePublicationJob,
	getRuntimePublicationJob,
	recordRuntimePublicationDelivery,
	syncRuntimePublicationJob
} from '$lib/server/services/publication-telemetry';

export const POST = async ({ locals, params, request, url }) => {
	const user = requireUser(locals, url);
	const db = createDb();
	const runtimeGateway = createRuntimeGateway(db);
	let checklist = await runtimeGateway.findChecklistBySlug(params.checklistId);

	if (!checklist && params.checklistId === 'miljohusesyn') {
		const preferredOrder = ['miljohusesyn-g', 'miljohusesyn-v', 'miljohusesyn-d', 'miljohusesyn-a'];
		const { data, assignedChecklistIds } = await runtimeGateway.loadChecklistListQuery(user.id);
		checklist =
			preferredOrder
				.map((slug) => data.checklists.find((entry) => entry.slug === slug && assignedChecklistIds.has(entry.id)))
				.find(Boolean) ??
			data.checklists.find((entry) => assignedChecklistIds.has(entry.id)) ??
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
	}

	if (!checklist) {
		throw error(404, 'Checklist not found');
	}

	const formData = await request.formData();
	const rawKind = formData.get('kind');
	const publicationKind: PublicationRequestKind =
		rawKind === 'complete' || rawKind === 'user-full' || rawKind === 'plan' ? rawKind : 'plan';

	if (publicationKind === 'complete' && user.role !== 'admin') {
		throw error(403, 'Only admins can export the complete base book.');
	}

	if (publicationKind === 'plan') {
		const artifact = await generateChecklistActionPlanPdf(db, params.checklistId, user.id);

		if (!artifact) {
			throw error(404, 'Checklist not found');
		}

		const pdf = await fs.readFile(artifact.pdfPath);
		await runtimeGateway.insertPdfExportEvent({
			userId: user.id,
			checklistId: checklist.id,
			exportKind: publicationKind,
			filename: artifact.filename
		});

		return new Response(pdf, {
			headers: {
				'Content-Type': artifact.contentType,
				'Content-Disposition': `attachment; filename="${artifact.filename}"`,
				'Cache-Control': 'no-store'
			}
		});
	}

	const jobId = await enqueueRuntimePublicationJob(
		{
			userId: user.id,
			checklistId: checklist.id,
			publicationKind: publicationKind
		},
		db
	);

	try {
		const processed = await processPublicationJob(db, jobId);
		await syncRuntimePublicationJob(jobId, db);
		const artifact = processed?.artifact;

		if (!artifact) {
			throw error(404, 'Checklist not found');
		}

		const pdf = await fs.readFile(artifact.pdfPath);
		await runtimeGateway.insertPdfExportEvent({
			userId: user.id,
			checklistId: checklist.id,
			exportKind: publicationKind,
			filename: artifact.filename
		});
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
	} catch (failure) {
		await syncRuntimePublicationJob(jobId, db);
		const failedJob = await getRuntimePublicationJob(jobId, db);
		if (failedJob?.status === 'retryable') {
			throw error(503, 'Publiceringsjobbet misslyckades tillfälligt och är markerat för nytt försök.');
		}
		throw failure;
	}
};
