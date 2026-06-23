import { createDb } from '$lib/server/db/client';
import { demoPassword, hashPassword } from '$lib/server/auth';
import {
	appChecklistAssignments,
	appChecklists,
	appQuestionGroups,
	appQuestions,
	appSections,
	appUsers
} from '$lib/server/db/schema';

export function createTestDb() {
	return createDb(':memory:');
}

export function createSeededDb() {
	const db = createTestDb();

	const checklistId = Number(
		db
			.insert(appChecklists)
			.values({
				slug: 'miljohusesyn-default',
				title: 'Miljohusesyn',
				variantKey: 'default',
				snapshotKey: 'test-snapshot'
			})
			.run().lastInsertRowid
	);
	const sectionId = Number(
		db
			.insert(appSections)
			.values({
				checklistId,
				nodeId: 'g1',
				prefix: 'G1',
				title: 'Environment',
				sortOrder: 1
			})
			.run().lastInsertRowid
	);
	const groupId = Number(
		db
			.insert(appQuestionGroups)
			.values({
				sectionId,
				nodeId: 'g1:group',
				prefix: 'G1',
				title: 'Environment',
				sortOrder: 1
			})
			.run().lastInsertRowid
	);

	db.insert(appQuestions)
		.values({
			groupId,
			nodeId: 'g1-1',
			prefix: 'G1-1',
			questionText: 'Is the activity registered?',
			sortOrder: 1
		})
		.run();

	const userId = Number(
		db
			.insert(appUsers)
			.values({
				email: 'demo@miljohusesyn.local',
				username: 'demo',
				passwordHash: hashPassword(demoPassword, 'test-demo-salt'),
				displayName: 'Demo User'
			})
			.run().lastInsertRowid
	);

	db.insert(appChecklistAssignments).values({ userId, checklistId }).run();

	return db;
}
