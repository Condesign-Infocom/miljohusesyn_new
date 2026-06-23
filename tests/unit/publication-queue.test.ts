import path from 'node:path';
import fs from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { appChecklists, appPublicationJobs, appUsers } from '$lib/server/db/schema';
import { claimNextPublicationJob, processPublicationQueue } from '$lib/server/services/publication-queue';
import { enqueuePublicationJob } from '$lib/server/services/publication-telemetry';
import { createTestDb } from './test-db';

describe('publication queue', () => {
	it('claims queued jobs before retryable jobs that are not yet due', async () => {
		const db = createTestDb();
		const checklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'queue-checklist',
					title: 'Queue Checklist',
					variantKey: 'default',
					snapshotKey: 'queue-snapshot'
				})
				.run().lastInsertRowid
		);
		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'queue@miljohusesyn.local',
					username: 'queue-user',
					passwordHash: 'hash',
					displayName: 'Queue User'
				})
				.run().lastInsertRowid
		);

		const queuedJobId = await enqueuePublicationJob(db, { userId, checklistId, publicationKind: 'plan' });
		const retryableJobId = await enqueuePublicationJob(db, {
			userId,
			checklistId,
			publicationKind: 'user-full'
		});
		db.update(appPublicationJobs)
			.set({
				status: 'retryable',
				nextRetryAt: '2099-01-01T00:00:00Z'
			})
			.where(eq(appPublicationJobs.id, retryableJobId))
			.run();

		const claimed = await claimNextPublicationJob(db, new Date('2026-05-18T10:00:00Z'));

		expect(claimed?.id).toBe(queuedJobId);
		expect(claimed?.status).toBe('running');
	});

	it('processes claimed jobs and persists rendered artifact paths', async () => {
		const db = createTestDb();
		const tempRoot = path.join(process.cwd(), 'data', 'test-publication-queue');
		const pdfPath = path.join(tempRoot, 'out.pdf');
		const reportPath = path.join(tempRoot, 'report.json');

		await fs.mkdir(tempRoot, { recursive: true });
		await fs.writeFile(pdfPath, '%PDF-1.4\n', 'utf8');
		await fs.writeFile(reportPath, '{"status":"rendered"}', 'utf8');

		const checklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'queue-export',
					title: 'Queue Export',
					variantKey: 'default',
					snapshotKey: 'queue-snapshot'
				})
				.run().lastInsertRowid
		);
		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'queue-export@miljohusesyn.local',
					username: 'queue-export-user',
					passwordHash: 'hash',
					displayName: 'Queue Export User'
				})
				.run().lastInsertRowid
		);

		await enqueuePublicationJob(db, { userId, checklistId, publicationKind: 'complete' });
		const results = await processPublicationQueue(db, 5, async () => ({
			filename: 'queue-export-complete.pdf',
			contentType: 'application/pdf',
			pdfPath,
			reportPath
		}));
		const job = db.select().from(appPublicationJobs).get();

		expect(results).toHaveLength(1);
		expect(job?.status).toBe('succeeded');
		expect(job?.outputPdfPath).toBe(pdfPath);
		expect(job?.reportPath).toBe(reportPath);
	});
});
