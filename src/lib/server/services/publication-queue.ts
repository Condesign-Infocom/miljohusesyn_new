import type { AppDb } from '../db/client';
import { createRuntimeGateway } from '../db/runtime-gateway';
import { generatePublicationPdf, type PublicationRequestKind } from './pdf-export';
import {
	completePublicationJob,
	failPublicationJob,
	getPublicationJob,
	startPublicationAttempt
} from './publication-telemetry';

function resolvePublicationKind(value: string): PublicationRequestKind {
	return value === 'complete' || value === 'user-full' || value === 'plan' ? value : 'plan';
}

function buildRetryTimestamp(attemptCount: number, now = new Date()) {
	const retryMinutes = Math.min(60, Math.max(1, attemptCount) * 15);
	return new Date(now.getTime() + retryMinutes * 60 * 1000).toISOString();
}

export async function claimNextPublicationJob(db: AppDb, now = new Date()) {
	return await createRuntimeGateway(db).claimNextPublicationJob(now.toISOString());
}

export async function processPublicationJob(db: AppDb, jobId: number) {
	return processPublicationJobWithRunner(db, jobId, generatePublicationPdf);
}

async function processPublicationJobWithRunner(
	db: AppDb,
	jobId: number,
	runPublication: typeof generatePublicationPdf
) {
	let job = await getPublicationJob(db, jobId);

	if (!job) {
		return null;
	}

	if (job.status !== 'running') {
		await startPublicationAttempt(db, jobId);
		job = await getPublicationJob(db, jobId);
	}

	if (!job) {
		return null;
	}

	const checklist = await createRuntimeGateway(db).findChecklistById(job.checklistId);
	if (!checklist) {
		await failPublicationJob(db, job.id, `Checklist ${job.checklistId} not found`);
		return null;
	}

	try {
		const artifact = await runPublication(
			db,
			checklist.slug,
			job.userId,
			resolvePublicationKind(job.publicationKind)
		);

		if (!artifact) {
			await failPublicationJob(db, job.id, 'Checklist assignment was not available for PDF export.');
			return null;
		}

		await completePublicationJob(db, {
			jobId: job.id,
			filename: artifact.filename,
			outputPdfPath: artifact.pdfPath,
			reportPath: artifact.reportPath
		});

		return {
			jobId: job.id,
			artifact
		};
	} catch (failure) {
		const latestJob = await getPublicationJob(db, job.id);
		const attemptCount = latestJob?.attemptCount ?? job.attemptCount;
		const maxAttempts = latestJob?.maxAttempts ?? job.maxAttempts;
		const retryable = attemptCount < maxAttempts;

		await failPublicationJob(
			db,
			job.id,
			failure instanceof Error ? failure.message : 'Unknown publication job failure.',
			{
				retryable,
				nextRetryAt: retryable ? buildRetryTimestamp(attemptCount) : null
			}
		);
		throw failure;
	}
}

export async function processPublicationQueue(
	db: AppDb,
	limit = 10,
	runPublication: typeof generatePublicationPdf = generatePublicationPdf
) {
	const results: Array<{
		jobId: number;
		status: 'succeeded' | 'failed';
		publicationKind: string;
	}> = [];

	for (let index = 0; index < limit; index += 1) {
		const claimedJob = await claimNextPublicationJob(db);

		if (!claimedJob) {
			break;
		}

		try {
			await processPublicationJobWithRunner(db, claimedJob.id, runPublication);
			const finalJob = await getPublicationJob(db, claimedJob.id);
			results.push({
				jobId: claimedJob.id,
				status: finalJob?.status === 'succeeded' ? 'succeeded' : 'failed',
				publicationKind: claimedJob.publicationKind
			});
		} catch {
			const finalJob = await getPublicationJob(db, claimedJob.id);
			results.push({
				jobId: claimedJob.id,
				status: finalJob?.status === 'succeeded' ? 'succeeded' : 'failed',
				publicationKind: claimedJob.publicationKind
			});
		}
	}

	return results;
}
