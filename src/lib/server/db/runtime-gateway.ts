import { createDb, type AppDb } from './client';
import {
	loadRuntimeChecklistListQuery,
	loadRuntimeChecklistQuery,
	loadRuntimePublicationPlanQuery
} from './runtime-query-repository';
import {
	findRuntimeChecklistById,
	findRuntimeChecklistBySlug,
	loadRuntimeAdminUserDetailSeedData,
	loadRuntimeAdminUserListData,
	loadRuntimeAdminUserStatsData,
	loadRuntimeEditableProfileSeedData,
	loadRuntimeFactDetailData,
	loadRuntimeProfileMirrorData
} from './runtime-read-repository';
import {
	claimNextRuntimePublicationJob,
	deleteRuntimeSessionByTokenHash,
	findActiveRuntimeSessionByTokenHash,
	findRuntimeUserById,
	findRuntimeUserByLogin,
	insertRuntimePdfExportEventRow,
	insertRuntimeSession,
	upsertRuntimeAnswerState
} from './runtime-write-repository';

export function createRuntimeGateway(db: AppDb = createDb()) {
	return {
		db,
		findUserByLogin(normalizedLogin: string) {
			return findRuntimeUserByLogin(db, normalizedLogin);
		},
		findUserById(userId: number) {
			return findRuntimeUserById(db, userId);
		},
		findChecklistById(checklistId: number) {
			return findRuntimeChecklistById(db, checklistId);
		},
		findChecklistBySlug(checklistSlug: string) {
			return findRuntimeChecklistBySlug(db, checklistSlug);
		},
		loadEditableProfileSeedData(userId: number) {
			return loadRuntimeEditableProfileSeedData(db, userId);
		},
		loadFactDetailData(nodeId: string) {
			return loadRuntimeFactDetailData(db, nodeId);
		},
		insertSession(input: {
			userId: number;
			tokenHash: string;
			expiresAt: string;
			createdAt: string;
		}) {
			return insertRuntimeSession(db, input);
		},
		findActiveSessionByTokenHash(tokenHash: string, nowIso: string) {
			return findActiveRuntimeSessionByTokenHash(db, tokenHash, nowIso);
		},
		deleteSessionByTokenHash(tokenHash: string) {
			return deleteRuntimeSessionByTokenHash(db, tokenHash);
		},
		insertPdfExportEvent(input: {
			userId: number;
			checklistId: number;
			exportKind: string;
			filename: string;
		}) {
			return insertRuntimePdfExportEventRow(db, input);
		},
		claimNextPublicationJob(nowIso: string) {
			return claimNextRuntimePublicationJob(db, nowIso);
		},
		upsertAnswerState(input: {
			userId: number;
			questionId: number;
			responseValue: 'yes' | 'no' | 'na' | 'blank';
			comment: string;
			dueDate: string | null;
			updatedAt: string;
		}) {
			return upsertRuntimeAnswerState(db, input);
		},
		loadChecklistListQuery(userId: number) {
			return loadRuntimeChecklistListQuery(db, userId);
		},
		loadChecklistQuery(checklistSlug: string, userId: number) {
			return loadRuntimeChecklistQuery(db, checklistSlug, userId);
		},
		loadAdminUserListData() {
			return loadRuntimeAdminUserListData(db);
		},
		loadAdminUserDetailSeedData(userId: number) {
			return loadRuntimeAdminUserDetailSeedData(db, userId);
		},
		loadAdminUserStatsData() {
			return loadRuntimeAdminUserStatsData(db);
		},
		loadProfileMirrorData(userId: number, profileUpdateEventId: number) {
			return loadRuntimeProfileMirrorData(db, userId, profileUpdateEventId);
		},
		loadPublicationPlanQuery(
			checklistSlug: string,
			userId: number,
			kind: 'complete' | 'user-full' | 'user-plan'
		) {
			return loadRuntimePublicationPlanQuery(db, checklistSlug, userId, kind);
		}
	};
}

export type RuntimeGateway = ReturnType<typeof createRuntimeGateway>;
