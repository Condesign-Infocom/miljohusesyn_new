import { describe, expect, it } from 'vitest';
import { resetRuntimeAnswerStatesForQuestion } from '$lib/server/db/runtime-write-repository';
import {
	appAnswerStates,
	appChecklistAssignments,
	appChecklists,
	appQuestionGroups,
	appQuestions,
	appSections,
	appUsers
} from '$lib/server/db/schema';
import { saveAnswerState } from '$lib/server/services/answers';
import { createSeededDb, createTestDb } from './test-db';

describe('saveAnswerState', () => {
	it('upserts response, comment, and due date for one user question', async () => {
		const seededDb = createSeededDb();
		await saveAnswerState(seededDb, {
			userId: 1,
			questionId: 1,
			responseValue: 'no',
			comment: 'Needs follow-up',
			dueDate: '2026-06-01'
		});

		const saved = await seededDb.query.appAnswerStates.findFirst();
		expect(saved?.responseValue).toBe('no');
		expect(saved?.comment).toBe('Needs follow-up');
		expect(saved?.dueDate).toBe('2026-06-01');
	});

	it('resets existing answers for one runtime question', async () => {
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
					nodeId: 'node-id-G1-2015-02-25',
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
					nodeId: 'node-id-G1-2015-02-25:group',
					prefix: 'G1',
					title: 'Environment',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const questionId = Number(
			db
				.insert(appQuestions)
				.values({
					groupId,
					nodeId: 'node-id-G1-1-2015-02-25',
					prefix: 'G1-1',
					questionText: 'Is the activity registered?',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const otherQuestionId = Number(
			db
				.insert(appQuestions)
				.values({
					groupId,
					nodeId: 'node-id-G1-2-2015-02-25',
					prefix: 'G1-2',
					questionText: 'Are logs retained?',
					sortOrder: 2
				})
				.run().lastInsertRowid
		);
		const userId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'demo@miljohusesyn.local',
					username: 'demo',
					passwordHash: 'hash',
					displayName: 'Demo User'
				})
				.run().lastInsertRowid
		);
		db.insert(appChecklistAssignments).values({ userId, checklistId }).run();
		await saveAnswerState(db, {
			userId,
			questionId,
			responseValue: 'no',
			comment: 'Needs follow-up',
			dueDate: '2026-06-01'
		});
		await saveAnswerState(db, {
			userId,
			questionId: otherQuestionId,
			responseValue: 'yes',
			comment: 'Still valid',
			dueDate: null
		});

		const resetCount = await resetRuntimeAnswerStatesForQuestion(db, {
			checklistVariantKey: 'default',
			groupNodeId: 'node-id-G1-2015-02-25',
			questionNodeId: 'node-id-G1-1-2015-02-25',
			updatedAt: '2026-06-09T12:00:00.000Z'
		});

		expect(resetCount).toBe(1);
		const answers = await db.query.appAnswerStates.findMany({
			orderBy: (answer, { asc }) => [asc(answer.questionId)]
		});
		expect(answers).toEqual([
			expect.objectContaining({
				questionId,
				responseValue: 'blank',
				comment: '',
				dueDate: null
			}),
			expect.objectContaining({
				questionId: otherQuestionId,
				responseValue: 'yes',
				comment: 'Still valid'
			})
		]);
		expect(await db.select().from(appAnswerStates)).toHaveLength(2);
	});
});
