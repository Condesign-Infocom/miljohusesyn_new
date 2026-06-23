import { createDb, type AppDb } from '../db/client';
import { createRuntimeGateway } from '../db/runtime-gateway';
import {
	findRuntimePublicationJobById,
	insertRuntimePublicationDeliveryRow,
	insertRuntimePublicationJobRow,
	incrementRuntimePublicationAttempt,
	markRuntimePublicationJobFailed,
	markRuntimePublicationJobSucceeded,
	requeueRuntimePublicationJobRow
} from '../db/runtime-write-repository';
import {
	mirrorChecklistToRuntimePostgres,
	mirrorPublicationDeliveryToRuntimePostgres,
	mirrorPublicationJobToRuntimePostgres,
	mirrorUserToRuntimePostgres
} from '../db/runtime-postgres-shadow';

type StartPublicationJobInput = {
	userId: number;
	checklistId: number;
	publicationKind: string;
	maxAttempts?: number;
};

type CompletePublicationJobInput = {
	jobId: number;
	filename: string;
	outputPdfPath: string;
	reportPath: string;
};

type RecordPublicationDeliveryInput = {
	jobId: number;
	userId: number;
	checklistId: number;
	filename: string;
	byteCount: number;
	deliveryKind?: string;
};

type FailPublicationJobOptions = {
	retryable?: boolean;
	nextRetryAt?: string | null;
};

export async function enqueuePublicationJob(db: AppDb, input: StartPublicationJobInput) {
	return await insertRuntimePublicationJobRow(db, {
		userId: input.userId,
		checklistId: input.checklistId,
		publicationKind: input.publicationKind,
		maxAttempts: input.maxAttempts ?? 3
	});
}

export async function startPublicationAttempt(db: AppDb, jobId: number) {
	await incrementRuntimePublicationAttempt(db, jobId, new Date().toISOString());
}

export async function completePublicationJob(db: AppDb, input: CompletePublicationJobInput) {
	await markRuntimePublicationJobSucceeded(db, {
		...input,
		finishedAt: new Date().toISOString()
	});
}

export async function failPublicationJob(
	db: AppDb,
	jobId: number,
	errorMessage: string,
	options: FailPublicationJobOptions = {}
) {
	await markRuntimePublicationJobFailed(db, {
		jobId,
		errorMessage,
		retryable: options.retryable ?? false,
		nextRetryAt: options.retryable ? (options.nextRetryAt ?? null) : null,
		finishedAt: new Date().toISOString()
	});
}

export async function requeuePublicationJob(db: AppDb, jobId: number, nextRetryAt?: string | null) {
	await requeueRuntimePublicationJobRow(db, jobId, nextRetryAt ?? null);
}

export async function getPublicationJob(db: AppDb, jobId: number) {
	return await findRuntimePublicationJobById(db, jobId);
}

export async function recordPublicationDelivery(db: AppDb, input: RecordPublicationDeliveryInput) {
	await insertRuntimePublicationDeliveryRow(db, {
		jobId: input.jobId,
		userId: input.userId,
		checklistId: input.checklistId,
		deliveryKind: input.deliveryKind ?? 'download',
		filename: input.filename,
		byteCount: input.byteCount
	});
}

async function mirrorPublicationJobDependencies(db: AppDb, userId: number, checklistId: number) {
	const gateway = createRuntimeGateway(db);
	const user = await gateway.findUserById(userId);
	const checklist = await gateway.findChecklistById(checklistId);

	if (user) {
		await mirrorUserToRuntimePostgres(user);
	}

	if (checklist) {
		await mirrorChecklistToRuntimePostgres(checklist);
	}
}

export async function enqueueRuntimePublicationJob(
	input: StartPublicationJobInput,
	db = createDb()
) {
	const jobId = await enqueuePublicationJob(db, input);
	await mirrorPublicationJobDependencies(db, input.userId, input.checklistId);
	const job = await getPublicationJob(db, jobId);

	if (job) {
		await mirrorPublicationJobToRuntimePostgres(job);
	}

	return jobId;
}

export async function syncRuntimePublicationJob(jobId: number, db = createDb()) {
	const job = await getPublicationJob(db, jobId);

	if (!job) {
		return null;
	}

	await mirrorPublicationJobDependencies(db, job.userId, job.checklistId);
	await mirrorPublicationJobToRuntimePostgres(job);
	return job;
}

export async function getRuntimePublicationJob(jobId: number, db = createDb()) {
	return await getPublicationJob(db, jobId);
}

export async function recordRuntimePublicationDelivery(
	input: RecordPublicationDeliveryInput,
	db = createDb()
) {
	await recordPublicationDelivery(db, input);
	await mirrorPublicationJobDependencies(db, input.userId, input.checklistId);
	await mirrorPublicationDeliveryToRuntimePostgres({
		publicationJobId: input.jobId,
		userId: input.userId,
		checklistId: input.checklistId,
		deliveryKind: input.deliveryKind ?? 'download',
		filename: input.filename,
		byteCount: input.byteCount
	});
}
