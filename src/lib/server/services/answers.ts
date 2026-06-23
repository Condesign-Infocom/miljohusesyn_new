import type { AppDb } from '$lib/server/db/client';
import { createRuntimeGateway } from '$lib/server/db/runtime-gateway';
import { upsertAnswerStateToRuntimePostgres } from '$lib/server/db/runtime-postgres-shadow';
import type { AnswerPayload } from '$lib/types/checklists';

export async function saveAnswerState(db: AppDb, input: AnswerPayload) {
	const updatedAt = new Date().toISOString();
	const saved = await createRuntimeGateway(db).upsertAnswerState({
		userId: input.userId,
		questionId: input.questionId,
		responseValue: input.responseValue,
		comment: input.comment,
		dueDate: input.dueDate,
		updatedAt
	});

	if (saved) {
		await upsertAnswerStateToRuntimePostgres(saved);
	}
}
