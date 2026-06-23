import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
	appChecklists,
	appPublicationDeliveries,
	appPublicationJobs,
	appUsers
} from '$lib/server/db/schema';
import {
	completePublicationJob,
	enqueuePublicationJob,
	enqueueRuntimePublicationJob,
	getPublicationJob,
	failPublicationJob,
	recordPublicationDelivery,
	recordRuntimePublicationDelivery,
	requeuePublicationJob,
	syncRuntimePublicationJob,
	startPublicationAttempt
} from '$lib/server/services/publication-telemetry';
import { createTestDb } from './test-db';

describe('publication telemetry', () => {
	it('records publication job lifecycle and delivery events', async () => {
		const db = createTestDb();
		const checklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'telemetry-checklist',
					title: 'Telemetry Checklist',
					variantKey: 'default',
					snapshotKey: 'telemetry-snapshot'
				})
				.run().lastInsertRowid
		);
		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'telemetry@miljohusesyn.local',
					username: 'telemetry-user',
					passwordHash: 'hash',
					displayName: 'Telemetry User'
				})
				.run().lastInsertRowid
		);

		const successfulJobId = await enqueuePublicationJob(db, {
			userId,
			checklistId,
			publicationKind: 'user-plan'
		});
		await startPublicationAttempt(db, successfulJobId);
		await completePublicationJob(db, {
			jobId: successfulJobId,
			filename: 'telemetry-plan.pdf',
			outputPdfPath: 'artifacts/telemetry-plan.pdf',
			reportPath: 'reports/telemetry-plan.json'
		});
		await recordPublicationDelivery(db, {
			jobId: successfulJobId,
			userId,
			checklistId,
			filename: 'telemetry-plan.pdf',
			byteCount: 5120
		});

		const failedJobId = await enqueuePublicationJob(db, {
			userId,
			checklistId,
			publicationKind: 'user-plan'
		});
		await startPublicationAttempt(db, failedJobId);
		await failPublicationJob(db, failedJobId, 'Renderer failed', {
			retryable: true,
			nextRetryAt: '2026-05-18T12:15:00Z'
		});
		await requeuePublicationJob(db, failedJobId, '2026-05-18T12:15:00Z');
		await startPublicationAttempt(db, failedJobId);
		await failPublicationJob(db, failedJobId, 'Renderer failed twice');

		const jobs = db.select().from(appPublicationJobs).all();
		const deliveries = db.select().from(appPublicationDeliveries).all();
		const successfulJob = db
			.select()
			.from(appPublicationJobs)
			.where(eq(appPublicationJobs.id, successfulJobId))
			.get();
		const failedJob = db
			.select()
			.from(appPublicationJobs)
			.where(eq(appPublicationJobs.id, failedJobId))
			.get();

		expect(jobs).toHaveLength(2);
		expect(deliveries).toHaveLength(1);
		expect(successfulJob?.status).toBe('succeeded');
		expect(successfulJob?.attemptCount).toBe(1);
		expect(successfulJob?.filename).toBe('telemetry-plan.pdf');
		expect(successfulJob?.outputPdfPath).toBe('artifacts/telemetry-plan.pdf');
		expect(successfulJob?.reportPath).toBe('reports/telemetry-plan.json');
		expect(successfulJob?.finishedAt).toBeTruthy();
		expect(failedJob?.status).toBe('failed');
		expect(failedJob?.attemptCount).toBe(2);
		expect(failedJob?.errorMessage).toContain('Renderer failed twice');
		expect((await getPublicationJob(db, failedJobId))?.nextRetryAt).toBeNull();
		expect(deliveries[0]).toMatchObject({
			publicationJobId: successfulJobId,
			userId,
			checklistId,
			filename: 'telemetry-plan.pdf',
			byteCount: 5120
		});
	});

	it('supports runtime telemetry helpers against the current sqlite runtime store', async () => {
		const db = createTestDb();
		const checklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'runtime-telemetry-checklist',
					title: 'Runtime Telemetry Checklist',
					variantKey: 'default',
					snapshotKey: 'runtime-telemetry-snapshot'
				})
				.run().lastInsertRowid
		);
		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'runtime-telemetry@miljohusesyn.local',
					username: 'runtime-telemetry-user',
					passwordHash: 'hash',
					displayName: 'Runtime Telemetry User'
				})
				.run().lastInsertRowid
		);

		const jobId = await enqueueRuntimePublicationJob(
			{ userId, checklistId, publicationKind: 'plan' },
			db
		);

		await startPublicationAttempt(db, jobId);
		await completePublicationJob(db, {
			jobId,
			filename: 'runtime-telemetry-plan.pdf',
			outputPdfPath: 'artifacts/runtime-telemetry-plan.pdf',
			reportPath: 'reports/runtime-telemetry-plan.json'
		});
		await syncRuntimePublicationJob(jobId, db);
		await recordRuntimePublicationDelivery(
			{
				jobId,
				userId,
				checklistId,
				filename: 'runtime-telemetry-plan.pdf',
				byteCount: 2048
			},
			db
		);

		expect((await getPublicationJob(db, jobId))?.status).toBe('succeeded');
		expect(db.select().from(appPublicationDeliveries).where(eq(appPublicationDeliveries.publicationJobId, jobId)).all()).toHaveLength(1);
	});
});
