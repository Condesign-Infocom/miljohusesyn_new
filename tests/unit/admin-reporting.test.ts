import { describe, expect, it } from 'vitest';
import { getAdminReportingSummary } from '$lib/server/services/admin-reporting';
import { saveAnswerState } from '$lib/server/services/answers';
import {
	appChecklistAssignments,
	appChecklists,
	appPdfExportEvents,
	appPublicationDeliveries,
	appPublicationJobs,
	appProfileUpdateEvents,
	appQuestionGroups,
	appQuestions,
	appSections,
	appSessions,
	appUserActivities,
	appUserProfiles,
	appUsers
} from '$lib/server/db/schema';
import { createTestDb } from './test-db';

describe('admin reporting', () => {
	it('summarizes modern operational reporting metrics from the app database', async () => {
		const db = createTestDb();
		const now = new Date('2026-05-18T12:00:00Z');
		const checklistId = Number(
			db
				.insert(appChecklists)
				.values({
					slug: 'miljohusesyn-reporting',
					title: 'Reporting Checklist',
					variantKey: 'default',
					snapshotKey: 'report-snapshot'
				})
				.run().lastInsertRowid
		);
		const sectionId = Number(
			db
				.insert(appSections)
				.values({
					checklistId,
					nodeId: 'report-sec',
					prefix: 'R1',
					title: 'Reporting',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const groupId = Number(
			db
				.insert(appQuestionGroups)
				.values({
					sectionId,
					nodeId: 'report-group',
					prefix: 'R1',
					title: 'Reporting Group',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const firstQuestionId = Number(
			db
				.insert(appQuestions)
				.values({
					groupId,
					nodeId: 'report-q-1',
					prefix: 'R1.1',
					questionText: 'First reporting question',
					sortOrder: 1
				})
				.run().lastInsertRowid
		);
		const secondQuestionId = Number(
			db
				.insert(appQuestions)
				.values({
					groupId,
					nodeId: 'report-q-2',
					prefix: 'R1.2',
					questionText: 'Second reporting question',
					sortOrder: 2
				})
				.run().lastInsertRowid
		);
		const adminUserId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'admin-reporting@example.com',
					username: 'admin-reporting',
					passwordHash: 'hash',
					displayName: 'Admin Reporting',
					role: 'admin',
					createdAt: '2026-03-01 09:00:00'
				})
				.run().lastInsertRowid
		);
		const standardUserId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'user-reporting@example.com',
					username: 'user-reporting',
					passwordHash: 'hash',
					displayName: 'User Reporting',
					createdAt: '2026-05-10 09:00:00'
				})
				.run().lastInsertRowid
		);
		const secondUserId = Number(
			db
				.insert(appUsers)
				.values({
					email: 'quiet-reporting@example.com',
					username: 'quiet-reporting',
					passwordHash: 'hash',
					displayName: 'Quiet Reporting',
					createdAt: '2026-04-01 09:00:00'
				})
				.run().lastInsertRowid
		);

		db.insert(appChecklistAssignments)
			.values({ userId: standardUserId, checklistId })
			.run();
		db.insert(appUserProfiles)
			.values({ userId: standardUserId, profileKey: 'Profile_One', profileName: 'Profile One' })
			.run();
		db.insert(appUserActivities)
			.values({ userId: standardUserId, activityName: 'odling', certified: 1 })
			.run();
		db.insert(appSessions)
			.values({
				userId: standardUserId,
				tokenHash: 'session-user-reporting',
				expiresAt: '2026-06-18 09:00:00',
				createdAt: '2026-05-17 09:00:00'
			})
			.run();
		db.insert(appSessions)
			.values({
				userId: adminUserId,
				tokenHash: 'session-admin-reporting',
				expiresAt: '2026-06-18 10:00:00',
				createdAt: '2026-05-01 10:00:00'
			})
			.run();
		db.insert(appPdfExportEvents)
			.values({
				userId: standardUserId,
				checklistId,
				exportKind: 'plan',
				filename: 'reporting-plan.pdf',
				createdAt: '2026-05-16 09:00:00'
			})
			.run();
		db.insert(appPdfExportEvents)
			.values({
				userId: adminUserId,
				checklistId,
				exportKind: 'plan',
				filename: 'admin-plan.pdf',
				createdAt: '2026-04-10 09:00:00'
			})
			.run();
		db.insert(appProfileUpdateEvents)
			.values({
				userId: standardUserId,
				createdAt: '2026-05-14 09:00:00'
			})
			.run();
		db.insert(appProfileUpdateEvents)
			.values({
				userId: adminUserId,
				createdAt: '2026-04-05 09:00:00'
			})
			.run();
		const successfulJobId = Number(
			db
				.insert(appPublicationJobs)
				.values({
					userId: standardUserId,
					checklistId,
					publicationKind: 'user-plan',
					status: 'succeeded',
					attemptCount: 1,
					filename: 'reporting-plan.pdf',
					reportPath: 'reports/reporting-plan.json',
					createdAt: '2026-05-16 09:00:00',
					finishedAt: '2026-05-16T09:01:00Z'
				})
				.run().lastInsertRowid
		);
		db.insert(appPublicationJobs)
			.values({
				userId: adminUserId,
				checklistId,
				publicationKind: 'user-full',
				status: 'retryable',
				attemptCount: 2,
				errorMessage: 'Renderer exited with code 1',
				createdAt: '2026-04-10 09:00:00',
				finishedAt: '2026-04-10T09:01:00Z',
				nextRetryAt: '2026-05-19T10:00:00Z'
			})
			.run();
		db.insert(appPublicationJobs)
			.values({
				userId: secondUserId,
				checklistId,
				publicationKind: 'complete',
				status: 'queued',
				attemptCount: 0,
				queuedAt: '2026-05-18 08:00:00',
				createdAt: '2026-05-18 08:00:00'
			})
			.run();
		db.insert(appPublicationDeliveries)
			.values({
				publicationJobId: successfulJobId,
				userId: standardUserId,
				checklistId,
				deliveryKind: 'download',
				filename: 'reporting-plan.pdf',
				byteCount: 2048,
				createdAt: '2026-05-16 09:02:00'
			})
			.run();

		await saveAnswerState(db, {
			userId: standardUserId,
			questionId: firstQuestionId,
			responseValue: 'no',
			comment: 'Needs action',
			dueDate: '2026-05-10'
		});
		await saveAnswerState(db, {
			userId: standardUserId,
			questionId: secondQuestionId,
			responseValue: 'yes',
			comment: '',
			dueDate: null
		});

		const summary = await getAdminReportingSummary(db, now);

		expect(adminUserId).toBeGreaterThan(0);
		expect(secondUserId).toBeGreaterThan(0);
		expect(summary).toEqual({
			userCount: 3,
			adminCount: 1,
			checklistCount: 1,
			assignedUserCount: 1,
			usersWithAnswersCount: 1,
			answeredQuestionCount: 2,
			noAnswerCount: 1,
			dueDateCount: 1,
			overdueActionCount: 1,
			usersWithProfilesCount: 1,
			usersWithActivitiesCount: 1,
			unassignedUserCount: 2,
			usersWithoutAnswersCount: 2,
			pdfExportCount: 2,
			pdfExportUserCount: 2,
			profileUpdateCount: 2,
			profileUpdateUserCount: 2,
			publicationJobCount: 3,
			queuedPublicationJobCount: 1,
			runningPublicationJobCount: 0,
			successfulPublicationJobCount: 1,
			failedPublicationJobCount: 0,
			retryablePublicationJobCount: 1,
			publicationRetryCount: 1,
			publicationJobUserCount: 3,
			publicationDeliveryCount: 1,
			publicationDeliveryUserCount: 1,
			queueHealth: {
				oldestQueuedJobAgeMinutes: 240,
				oldestRunningJobAgeMinutes: null,
				nextRetryInMinutes: 1320
			},
			recent: {
				newUserCount30Days: 1,
				sessionCount30Days: 2,
				activeUserCount30Days: 2,
				updatedAnswerCount30Days: 2,
				answeringUserCount30Days: 1,
				pdfExportCount30Days: 1,
				pdfExportUserCount30Days: 1,
				profileUpdateCount30Days: 1,
				profileUpdateUserCount30Days: 1,
				publicationJobCount30Days: 2,
				queuedPublicationJobCount30Days: 1,
				runningPublicationJobCount30Days: 0,
				successfulPublicationJobCount30Days: 1,
				failedPublicationJobCount30Days: 0,
				retryablePublicationJobCount30Days: 0,
				publicationRetryCount30Days: 0,
				publicationJobUserCount30Days: 2,
				publicationDeliveryCount30Days: 1,
				publicationDeliveryUserCount30Days: 1
			},
			publicationKindBreakdown: [
				{
					publicationKind: 'complete',
					jobCount: 1,
					deliveryCount: 0,
					failedJobCount: 0
				},
				{
					publicationKind: 'user-full',
					jobCount: 1,
					deliveryCount: 0,
					failedJobCount: 0
				},
				{
					publicationKind: 'user-plan',
					jobCount: 1,
					deliveryCount: 1,
					failedJobCount: 0
				}
			],
			checklistBreakdown: [
				{
					checklistId,
					title: 'Reporting Checklist',
					assignedUserCount: 1,
					usersWithAnswersCount: 1,
					answeredQuestionCount: 2,
					noAnswerCount: 1,
					dueDateCount: 1
				}
			]
		});
	});
});
