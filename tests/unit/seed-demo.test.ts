import { describe, expect, it } from 'vitest';
import { bootstrapDemoState } from '$lib/server/db/seed-demo';
import {
	appChecklists,
	appUserActivities,
	appUserAnimalTypes,
	appUserProfiles,
	appUserSettings
} from '$lib/server/db/schema';
import { createTestDb } from './test-db';

describe('bootstrapDemoState', () => {
	it('creates fake users with checklist assignments and legacy-like metadata', async () => {
		const originalEngine = process.env.APP_DB_ENGINE;
		const originalDsn = process.env.APP_DB_POSTGRES_DSN;
		process.env.APP_DB_ENGINE = 'sqlite';
		delete process.env.APP_DB_POSTGRES_DSN;

		const db = createTestDb();

		try {
			db.insert(appChecklists)
				.values({
					slug: 'miljohusesyn-default',
					title: 'Miljohusesyn',
					variantKey: 'default',
					snapshotKey: 'demo-snapshot'
				})
				.run();

			await bootstrapDemoState(db, { checklistSlug: 'miljohusesyn-default' });

			const summary = await db.query.appUsers.findMany({
				with: { checklistAssignments: true }
			});

			expect(summary).toHaveLength(4);
			expect(summary[0]?.checklistAssignments).toHaveLength(1);

			expect(db.select().from(appUserSettings).all().length).toBeGreaterThan(0);
			expect(db.select().from(appUserProfiles).all().length).toBeGreaterThan(0);
			expect(db.select().from(appUserActivities).all().length).toBeGreaterThan(0);
			expect(db.select().from(appUserAnimalTypes).all().length).toBeGreaterThan(0);
		} finally {
			if (originalEngine === undefined) {
				delete process.env.APP_DB_ENGINE;
			} else {
				process.env.APP_DB_ENGINE = originalEngine;
			}

			if (originalDsn === undefined) {
				delete process.env.APP_DB_POSTGRES_DSN;
			} else {
				process.env.APP_DB_POSTGRES_DSN = originalDsn;
			}
		}
	});
});
