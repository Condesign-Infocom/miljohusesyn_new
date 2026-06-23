import { type AppDb } from '../db/client';
import { loadRuntimeReportingData, type ReportingData } from '../db/runtime-read-repository';

type AdminChecklistReportingRow = {
	checklistId: number;
	title: string;
	assignedUserCount: number;
	usersWithAnswersCount: number;
	answeredQuestionCount: number;
	noAnswerCount: number;
	dueDateCount: number;
};

type AdminPublicationKindBreakdownRow = {
	publicationKind: string;
	jobCount: number;
	deliveryCount: number;
	failedJobCount: number;
};

function minutesBetween(later: Date, earlier: Date | null) {
	if (!earlier) {
		return null;
	}

	return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / (60 * 1000)));
}

function coerceTimestamp(value: string | null | undefined) {
	if (!value) {
		return null;
	}

	const normalized = value.includes('T') ? value : value.replace(' ', 'T');
	const withZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized) ? normalized : `${normalized}Z`;
	const parsed = new Date(withZone);

	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	return parsed;
}

function isOnOrAfter(value: string | null | undefined, threshold: Date) {
	const parsed = coerceTimestamp(value);
	return parsed ? parsed.getTime() >= threshold.getTime() : false;
}

function isBefore(value: string | null | undefined, threshold: Date) {
	const parsed = coerceTimestamp(value);
	return parsed ? parsed.getTime() < threshold.getTime() : false;
}

function summarizeReportingData(
	{
		users,
		checklists,
		assignments,
		answerStates,
		sessions,
		profiles,
		activities,
		questions,
		groups,
		sections,
		pdfExportEvents,
		profileUpdateEvents,
		publicationJobs,
		publicationDeliveries
	}: ReportingData,
	now = new Date()
) {

	const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const assignedUserIds = new Set(assignments.map((assignment) => assignment.userId));
	const answeredStates = answerStates.filter((answer) => answer.responseValue !== 'blank');
	const usersWithAnswers = new Set(answeredStates.map((answer) => answer.userId));
	const dueDateCount = answerStates.filter((answer) => Boolean(answer.dueDate)).length;
	const noAnswerCount = answerStates.filter((answer) => answer.responseValue === 'no').length;
	const overdueActionCount = answerStates.filter(
		(answer) => Boolean(answer.dueDate) && answer.responseValue === 'no' && isBefore(answer.dueDate, startOfToday)
	).length;
	const recentUsers = users.filter((user) => isOnOrAfter(user.createdAt, last30Days));
	const recentSessions = sessions.filter((session) => isOnOrAfter(session.createdAt, last30Days));
	const recentSessionUserIds = new Set(recentSessions.map((session) => session.userId));
	const recentAnswerStates = answerStates.filter((answer) => isOnOrAfter(answer.updatedAt, last30Days));
	const recentAnswerUsers = new Set(recentAnswerStates.map((answer) => answer.userId));
	const recentPdfExportEvents = pdfExportEvents.filter((event) => isOnOrAfter(event.createdAt, last30Days));
	const recentPdfExportUsers = new Set(recentPdfExportEvents.map((event) => event.userId));
	const recentProfileUpdateEvents = profileUpdateEvents.filter((event) => isOnOrAfter(event.createdAt, last30Days));
	const recentProfileUpdateUsers = new Set(recentProfileUpdateEvents.map((event) => event.userId));
	const recentPublicationJobs = publicationJobs.filter((job) => isOnOrAfter(job.createdAt, last30Days));
	const recentPublicationUsers = new Set(recentPublicationJobs.map((job) => job.userId));
	const recentPublicationDeliveries = publicationDeliveries.filter((delivery) =>
		isOnOrAfter(delivery.createdAt, last30Days)
	);
	const recentPublicationDeliveryUsers = new Set(
		recentPublicationDeliveries.map((delivery) => delivery.userId)
	);
	const usersWithProfiles = new Set(profiles.map((profile) => profile.userId));
	const usersWithActivities = new Set(activities.map((activity) => activity.userId));

	const sectionChecklistIdById = new Map(sections.map((section) => [section.id, section.checklistId]));
	const groupChecklistIdById = new Map(
		groups.map((group) => [group.id, sectionChecklistIdById.get(group.sectionId) ?? null])
	);
	const checklistIdByQuestionId = new Map(
		questions.map((question) => [question.id, groupChecklistIdById.get(question.groupId) ?? null])
	);
	const checklistTitleById = new Map(checklists.map((checklist) => [checklist.id, checklist.title]));
	const assignmentUsersByChecklistId = new Map<number, Set<number>>();
	const checklistStats = new Map<number, AdminChecklistReportingRow>();

	for (const checklist of checklists) {
		checklistStats.set(checklist.id, {
			checklistId: checklist.id,
			title: checklist.title,
			assignedUserCount: 0,
			usersWithAnswersCount: 0,
			answeredQuestionCount: 0,
			noAnswerCount: 0,
			dueDateCount: 0
		});
	}

	for (const assignment of assignments) {
		const bucket = assignmentUsersByChecklistId.get(assignment.checklistId) ?? new Set<number>();
		bucket.add(assignment.userId);
		assignmentUsersByChecklistId.set(assignment.checklistId, bucket);
	}

	const answerUsersByChecklistId = new Map<number, Set<number>>();
	for (const answer of answeredStates) {
		const checklistId = checklistIdByQuestionId.get(answer.questionId);
		if (!checklistId) {
			continue;
		}

		const row =
			checklistStats.get(checklistId) ?? {
				checklistId,
				title: checklistTitleById.get(checklistId) ?? `Checklist ${checklistId}`,
				assignedUserCount: 0,
				usersWithAnswersCount: 0,
				answeredQuestionCount: 0,
				noAnswerCount: 0,
				dueDateCount: 0
			};
		row.answeredQuestionCount += 1;
		if (answer.responseValue === 'no') {
			row.noAnswerCount += 1;
		}
		if (answer.dueDate) {
			row.dueDateCount += 1;
		}
		checklistStats.set(checklistId, row);

		const userBucket = answerUsersByChecklistId.get(checklistId) ?? new Set<number>();
		userBucket.add(answer.userId);
		answerUsersByChecklistId.set(checklistId, userBucket);
	}

	for (const [checklistId, row] of checklistStats) {
		row.assignedUserCount = assignmentUsersByChecklistId.get(checklistId)?.size ?? 0;
		row.usersWithAnswersCount = answerUsersByChecklistId.get(checklistId)?.size ?? 0;
	}

	const checklistBreakdown = [...checklistStats.values()]
		.sort((left, right) => left.title.localeCompare(right.title));
	const publicationKindStats = new Map<string, AdminPublicationKindBreakdownRow>();

	for (const job of publicationJobs) {
		const row = publicationKindStats.get(job.publicationKind) ?? {
			publicationKind: job.publicationKind,
			jobCount: 0,
			deliveryCount: 0,
			failedJobCount: 0
		};
		row.jobCount += 1;
		if (job.status === 'failed') {
			row.failedJobCount += 1;
		}
		publicationKindStats.set(job.publicationKind, row);
	}

	for (const delivery of publicationDeliveries) {
		const publicationKind =
			publicationJobs.find((job) => job.id === delivery.publicationJobId)?.publicationKind ?? 'unknown';
		const row = publicationKindStats.get(publicationKind) ?? {
			publicationKind,
			jobCount: 0,
			deliveryCount: 0,
			failedJobCount: 0
		};
		row.deliveryCount += 1;
		publicationKindStats.set(publicationKind, row);
	}

	const publicationKindBreakdown = [...publicationKindStats.values()].sort((left, right) =>
		left.publicationKind.localeCompare(right.publicationKind)
	);
	const queuedJobs = publicationJobs.filter((job) => job.status === 'queued');
	const retryableJobs = publicationJobs.filter((job) => job.status === 'retryable');
	const runningJobs = publicationJobs.filter((job) => job.status === 'running');
	const oldestQueuedJob = queuedJobs
		.map((job) => coerceTimestamp(job.queuedAt) ?? coerceTimestamp(job.createdAt))
		.filter((value): value is Date => Boolean(value))
		.sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
	const oldestRunningJob = runningJobs
		.map((job) => coerceTimestamp(job.lastAttemptAt) ?? coerceTimestamp(job.createdAt))
		.filter((value): value is Date => Boolean(value))
		.sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
	const nextRetryJob = retryableJobs
		.map((job) => coerceTimestamp(job.nextRetryAt))
		.filter((value): value is Date => Boolean(value))
		.sort((left, right) => left.getTime() - right.getTime())[0] ?? null;

	return {
		userCount: users.length,
		adminCount: users.filter((user) => user.role === 'admin').length,
		checklistCount: checklists.length,
		assignedUserCount: assignedUserIds.size,
		usersWithAnswersCount: usersWithAnswers.size,
		answeredQuestionCount: answeredStates.length,
		noAnswerCount,
		dueDateCount,
		overdueActionCount,
		usersWithProfilesCount: usersWithProfiles.size,
		usersWithActivitiesCount: usersWithActivities.size,
		unassignedUserCount: users.length - assignedUserIds.size,
		usersWithoutAnswersCount: users.length - usersWithAnswers.size,
		pdfExportCount: pdfExportEvents.length,
		pdfExportUserCount: new Set(pdfExportEvents.map((event) => event.userId)).size,
		profileUpdateCount: profileUpdateEvents.length,
		profileUpdateUserCount: new Set(profileUpdateEvents.map((event) => event.userId)).size,
		publicationJobCount: publicationJobs.length,
		queuedPublicationJobCount: publicationJobs.filter((job) => job.status === 'queued').length,
		runningPublicationJobCount: publicationJobs.filter((job) => job.status === 'running').length,
		successfulPublicationJobCount: publicationJobs.filter((job) => job.status === 'succeeded').length,
		failedPublicationJobCount: publicationJobs.filter((job) => job.status === 'failed').length,
		retryablePublicationJobCount: publicationJobs.filter((job) => job.status === 'retryable').length,
		publicationRetryCount: publicationJobs.reduce((sum, job) => sum + Math.max(0, job.attemptCount - 1), 0),
		publicationJobUserCount: new Set(publicationJobs.map((job) => job.userId)).size,
		publicationDeliveryCount: publicationDeliveries.length,
		publicationDeliveryUserCount: new Set(publicationDeliveries.map((delivery) => delivery.userId)).size,
		queueHealth: {
			oldestQueuedJobAgeMinutes: minutesBetween(now, oldestQueuedJob),
			oldestRunningJobAgeMinutes: minutesBetween(now, oldestRunningJob),
			nextRetryInMinutes:
				nextRetryJob ? Math.max(0, Math.round((nextRetryJob.getTime() - now.getTime()) / (60 * 1000))) : null
		},
		recent: {
			newUserCount30Days: recentUsers.length,
			sessionCount30Days: recentSessions.length,
			activeUserCount30Days: recentSessionUserIds.size,
			updatedAnswerCount30Days: recentAnswerStates.length,
			answeringUserCount30Days: recentAnswerUsers.size,
			pdfExportCount30Days: recentPdfExportEvents.length,
			pdfExportUserCount30Days: recentPdfExportUsers.size,
			profileUpdateCount30Days: recentProfileUpdateEvents.length,
			profileUpdateUserCount30Days: recentProfileUpdateUsers.size,
			publicationJobCount30Days: recentPublicationJobs.length,
			queuedPublicationJobCount30Days: recentPublicationJobs.filter((job) => job.status === 'queued').length,
			runningPublicationJobCount30Days: recentPublicationJobs.filter((job) => job.status === 'running').length,
			successfulPublicationJobCount30Days: recentPublicationJobs.filter((job) => job.status === 'succeeded').length,
			failedPublicationJobCount30Days: recentPublicationJobs.filter((job) => job.status === 'failed').length,
			retryablePublicationJobCount30Days: recentPublicationJobs.filter((job) => job.status === 'retryable').length,
			publicationRetryCount30Days: recentPublicationJobs.reduce(
				(sum, job) => sum + Math.max(0, job.attemptCount - 1),
				0
			),
			publicationJobUserCount30Days: recentPublicationUsers.size,
			publicationDeliveryCount30Days: recentPublicationDeliveries.length,
			publicationDeliveryUserCount30Days: recentPublicationDeliveryUsers.size
		},
		checklistBreakdown,
		publicationKindBreakdown
	};
}

export async function getAdminReportingSummary(db: AppDb, now = new Date()) {
	const data = await loadRuntimeReportingData(db);
	return summarizeReportingData(data, now);
}
