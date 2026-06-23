import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { createDb } from '$lib/server/db/client';
import { saveAnswerState } from '$lib/server/services/answers';

export const POST = async ({ locals, params, request, url }) => {
	const user = requireUser(locals, url);
	const payload = await request.json();
	const db = createDb();

	await saveAnswerState(db, {
		userId: user.id,
		questionId: Number(params.questionId),
		responseValue: payload.responseValue,
		comment: payload.comment ?? '',
		dueDate: payload.dueDate || null
	});

	return json({ ok: true });
};
