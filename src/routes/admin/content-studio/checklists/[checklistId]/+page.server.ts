import { error, fail, redirect } from '@sveltejs/kit';
import { requireContentStudioUser } from '$lib/server/auth';
import {
	createChecklistGroupDraft,
	createChecklistQuestionDraft,
	deleteChecklistGroupDraft,
	deleteChecklistQuestionDraft,
	createChecklistWorkspaceFactFromNode,
	linkChecklistWorkspaceFact,
	loadChecklistEditor,
	loadChecklistEditorWorkspace,
	loadContentStudioChecklists,
	materializePublishedSnapshot,
	moveChecklistGroupDraft,
	moveChecklistQuestionDraft,
	reorderChecklistGroupsDraft,
	reorderChecklistQuestionsDraft,
	resetChecklistQuestionAnswers,
	saveChecklistGroupDraft,
	saveChecklistWorkspaceFactDraft,
	saveChecklistQuestionDraft,
	unlinkChecklistWorkspaceFact
} from '$lib/server/services/content-studio';

function readPosition(formData: FormData) {
	const position = String(formData.get('position') ?? 'end');
	return position === 'before' || position === 'after' || position === 'end' ? position : 'end';
}

function readDirection(formData: FormData) {
	const direction = String(formData.get('direction') ?? 'up');
	return direction === 'up' || direction === 'down' ? direction : 'up';
}

function readOrderedIds(formData: FormData, fieldName: string) {
	return formData
		.getAll(fieldName)
		.map((value) => String(value).trim())
		.filter(Boolean);
}

function buildEditorUrl(checklistId: string, selectedNodeId?: string, successMessage?: string) {
	const params = new URLSearchParams();

	if (selectedNodeId) {
		params.set('selected', selectedNodeId);
	}

	if (successMessage) {
		params.set('success', successMessage);
	}

	const search = params.toString();
	return `/admin/content-studio/checklists/${encodeURIComponent(checklistId)}${search ? `?${search}` : ''}`;
}

function buildWorkspaceUrl(
	checklistId: string,
	selectedNodeId?: string,
	selectedFactId?: string,
	successMessage?: string
) {
	const params = new URLSearchParams();

	if (selectedNodeId) {
		params.set('selected', selectedNodeId);
	}

	if (selectedFactId) {
		params.set('fact', selectedFactId);
	}

	if (successMessage) {
		params.set('success', successMessage);
	}

	const search = params.toString();
	return `/admin/content-studio/checklists/${encodeURIComponent(checklistId)}${search ? `?${search}` : ''}`;
}

function readFlag(formData: FormData, name: string) {
	return String(formData.get(name) ?? '') === 'on';
}

function readInlineFactValues(formData: FormData) {
	return {
		title: String(formData.get('title') ?? '').trim(),
		bodyHtml: String(formData.get('bodyHtml') ?? '').trim(),
		nodeIds: formData
			.getAll('nodeIds')
			.map((value) => String(value).trim())
			.filter(Boolean)
	};
}

function readCreateFactValues(formData: FormData) {
	return {
		title: String(formData.get('title') ?? '').trim(),
		bodyHtml: String(formData.get('bodyHtml') ?? '').trim()
	};
}

function readPublishStatus(formData: FormData) {
	return String(formData.get('intent') ?? '') === 'publish' ? 'published' : 'in_review';
}

function hasBodyText(bodyHtml: string) {
	return bodyHtml
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim().length > 0;
}

function validateCreateFactValues(values: { title: string; bodyHtml: string }) {
	const errors: Record<string, string> = {};

	if (!values.title) {
		errors.title = 'Ange en titel.';
	}

	if (!hasBodyText(values.bodyHtml)) {
		errors.bodyHtml = 'Ange innehåll.';
	}

	return errors;
}

export const load = async ({ locals, params, url }) => {
	requireContentStudioUser(locals, url);
	const selectedNodeId = url.searchParams.get('selected');
	const selectedFactId = url.searchParams.get('fact') ?? undefined;
	const result = await loadChecklistEditorWorkspace(params.checklistId, selectedNodeId, selectedFactId);
	const checklistList = await loadContentStudioChecklists();

	if (!result.tree) {
		error(404, 'Checklistan hittades inte.');
	}

	return {
		checklist: result.tree.checklist,
		checklistList: checklistList.items.map((item) => ({
			id: item.id,
			title: item.title
		})),
		groups: result.tree.groups,
		selectedNodeId: selectedNodeId ?? result.tree.groups[0]?.id ?? null,
		selectedFactId,
		editFactModal: url.searchParams.get('editFact') === '1',
		successMessage: url.searchParams.get('success'),
		validation: result.validation,
		factWorkspace: result.factWorkspace
	};
};

export const actions = {
	createGroup: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const groupId = String(formData.get('groupId') ?? '').trim();
		const created = await createChecklistGroupDraft({
			checklistId: params.checklistId,
			userId: user.id,
			position: readPosition(formData),
			referenceGroupId: groupId || undefined
		});
		await materializePublishedSnapshot();

		redirect(303, buildEditorUrl(params.checklistId, created.groupId, 'Gruppen skapades.'));
	},
	createQuestion: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const groupId = String(formData.get('groupId') ?? '').trim();

		if (!groupId) {
			return fail(400, { errors: { form: 'Välj en grupp innan du skapar en fråga.' } });
		}

		const questionId = String(formData.get('questionId') ?? '').trim();
		const created = await createChecklistQuestionDraft({
			checklistId: params.checklistId,
			groupId,
			userId: user.id,
			position: readPosition(formData),
			referenceQuestionId: questionId || undefined
		});
		await materializePublishedSnapshot();

		redirect(303, buildEditorUrl(params.checklistId, created.questionId, 'Frågan skapades.'));
	},
	saveGroup: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const groupId = String(formData.get('groupId') ?? '').trim();

		if (!groupId) {
			return fail(400, { errors: { form: 'Gruppen saknas.' } });
		}

		const saved = await saveChecklistGroupDraft({
			checklistId: params.checklistId,
			groupId,
			userId: user.id,
			values: {
				title: String(formData.get('title') ?? ''),
				introText: String(formData.get('introText') ?? '')
			}
		});
		await materializePublishedSnapshot();

		redirect(303, buildEditorUrl(params.checklistId, saved.groupId, 'Gruppen sparades.'));
	},
	saveQuestion: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const questionId = String(formData.get('questionId') ?? '').trim();

		if (!questionId) {
			return fail(400, { errors: { form: 'Frågan saknas.' } });
		}

		const saved = await saveChecklistQuestionDraft({
			checklistId: params.checklistId,
			questionId,
			userId: user.id,
			values: {
				questionText: String(formData.get('questionText') ?? ''),
				flags: {
					cc: readFlag(formData, 'cc'),
					ccExtra: readFlag(formData, 'ccExtra'),
					base: readFlag(formData, 'base'),
					annualQuestion: readFlag(formData, 'annualQuestion'),
					newFlag: readFlag(formData, 'newFlag'),
					recommended: readFlag(formData, 'recommended')
				}
			}
		});
		await materializePublishedSnapshot();

		redirect(303, buildEditorUrl(params.checklistId, saved.questionId, 'Frågan sparades.'));
	},
	resetQuestion: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const questionId = String(formData.get('questionId') ?? '').trim();

		if (!questionId) {
			return fail(400, { errors: { form: 'Frågan saknas.' } });
		}

		const reset = await resetChecklistQuestionAnswers({
			checklistId: params.checklistId,
			questionId,
			userId: user.id
		});

		redirect(303, buildEditorUrl(params.checklistId, reset.questionId, 'Frågan nollställdes.'));
	},
	linkFact: async ({ locals, params, request, url }) => {
		requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const nodeId = String(formData.get('nodeId') ?? '').trim();
		const factId = String(formData.get('factId') ?? '').trim();

		if (!nodeId || !factId) {
			return fail(400, { errors: { form: 'Nod eller fakta saknas.' } });
		}

		await linkChecklistWorkspaceFact({
			checklistId: params.checklistId,
			nodeId,
			factId,
			snapshotId: undefined
		});
		await materializePublishedSnapshot();

		redirect(303, buildWorkspaceUrl(params.checklistId, nodeId, factId, 'Fakta kopplades.'));
	},
	unlinkFact: async ({ locals, params, request, url }) => {
		requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const nodeId = String(formData.get('nodeId') ?? '').trim();
		const factId = String(formData.get('factId') ?? '').trim();

		if (!nodeId || !factId) {
			return fail(400, { errors: { form: 'Nod eller fakta saknas.' } });
		}

		await unlinkChecklistWorkspaceFact({
			checklistId: params.checklistId,
			nodeId,
			factId
		});
		await materializePublishedSnapshot();

		redirect(303, buildWorkspaceUrl(params.checklistId, nodeId, undefined, 'Faktalänken togs bort.'));
	},
	createFact: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const nodeId = String(formData.get('nodeId') ?? '').trim();
		const values = readCreateFactValues(formData);

		if (!nodeId) {
			return fail(400, { errors: { form: 'Noden saknas.' } });
		}

		const errors = validateCreateFactValues(values);
		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				factFormMode: 'create',
				createFactValues: values
			});
		}

		const created = await createChecklistWorkspaceFactFromNode({
			checklistId: params.checklistId,
			nodeId,
			userId: user.id,
			values,
			status: readPublishStatus(formData)
		});

		const factId = created.factWorkspace?.selectedFact?.factRowId;
		const status = readPublishStatus(formData);

		if (status === 'published') {
			await materializePublishedSnapshot();
		}

		redirect(
			303,
			buildWorkspaceUrl(
				params.checklistId,
				nodeId,
				factId,
				status === 'published' ? 'Ny fakta skapades och publicerades.' : 'Ny fakta skapades och skickades för godkännande.'
			)
		);
	},
	saveFactInline: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const questionId = String(formData.get('questionId') ?? '').trim();
		const factId = String(formData.get('factId') ?? '').trim();

		if (!questionId || !factId) {
			return fail(400, { errors: { form: 'Fråga eller fakta saknas.' } });
		}

		const result = await saveChecklistWorkspaceFactDraft({
			checklistId: params.checklistId,
			questionId,
			factId,
			userId: user.id,
			values: readInlineFactValues(formData),
			status: readPublishStatus(formData)
		});

		if (Object.keys(result.factValidation?.errors ?? {}).length > 0) {
			return fail(400, {
				errors: result.factValidation?.errors ?? {},
				factFormMode: 'edit',
				factWorkspace: result.factWorkspace,
				factValidation: result.factValidation
			});
		}

		const status = readPublishStatus(formData);
		if (status === 'published') {
			await materializePublishedSnapshot();
		}

		redirect(
			303,
			buildWorkspaceUrl(
				params.checklistId,
				questionId,
				factId,
				status === 'published' ? 'Faktan sparades och publicerades.' : 'Faktan skickades för godkännande.'
			)
		);
	},
	moveGroup: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const groupId = String(formData.get('groupId') ?? '').trim();

		if (!groupId) {
			return fail(400, { errors: { form: 'Gruppen saknas.' } });
		}

		const moved = await moveChecklistGroupDraft({
			checklistId: params.checklistId,
			groupId,
			direction: readDirection(formData),
			userId: user.id
		});
		await materializePublishedSnapshot();

		redirect(303, buildEditorUrl(params.checklistId, moved.groupId, 'Gruppen flyttades.'));
	},
	moveQuestion: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const questionId = String(formData.get('questionId') ?? '').trim();

		if (!questionId) {
			return fail(400, { errors: { form: 'Frågan saknas.' } });
		}

		const moved = await moveChecklistQuestionDraft({
			checklistId: params.checklistId,
			questionId,
			direction: readDirection(formData),
			userId: user.id
		});
		await materializePublishedSnapshot();

		redirect(303, buildEditorUrl(params.checklistId, moved.questionId, 'Frågan flyttades.'));
	},
	reorderGroups: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const groupIds = readOrderedIds(formData, 'groupIds');
		const selectedNodeId = String(formData.get('selectedNodeId') ?? '').trim() || undefined;

		if (groupIds.length === 0) {
			return fail(400, { errors: { form: 'Gruppordningen saknas.' } });
		}

		const reordered = await reorderChecklistGroupsDraft({
			checklistId: params.checklistId,
			groupIds,
			selectedNodeId,
			userId: user.id
		});
		await materializePublishedSnapshot();

		redirect(
			303,
			buildEditorUrl(params.checklistId, reordered.selectedNodeId, 'Gruppordningen uppdaterades.')
		);
	},
	reorderQuestions: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const groupId = String(formData.get('groupId') ?? '').trim();
		const questionIds = readOrderedIds(formData, 'questionIds');
		const selectedNodeId = String(formData.get('selectedNodeId') ?? '').trim() || undefined;

		if (!groupId) {
			return fail(400, { errors: { form: 'Gruppen saknas.' } });
		}

		if (questionIds.length === 0) {
			return fail(400, { errors: { form: 'Frågeordningen saknas.' } });
		}

		const reordered = await reorderChecklistQuestionsDraft({
			checklistId: params.checklistId,
			groupId,
			questionIds,
			selectedNodeId,
			userId: user.id
		});
		await materializePublishedSnapshot();

		redirect(
			303,
			buildEditorUrl(params.checklistId, reordered.selectedNodeId, 'Frågeordningen uppdaterades.')
		);
	},
	deleteGroup: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const groupId = String(formData.get('groupId') ?? '').trim();

		if (!groupId) {
			return fail(400, { errors: { form: 'Gruppen saknas.' } });
		}

		await deleteChecklistGroupDraft({
			checklistId: params.checklistId,
			groupId,
			userId: user.id
		});
		await materializePublishedSnapshot();

		redirect(303, buildEditorUrl(params.checklistId, undefined, 'Gruppen togs bort.'));
	},
	deleteQuestion: async ({ locals, params, request, url }) => {
		const user = requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const questionId = String(formData.get('questionId') ?? '').trim();

		if (!questionId) {
			return fail(400, { errors: { form: 'Frågan saknas.' } });
		}

		const deleted = await deleteChecklistQuestionDraft({
			checklistId: params.checklistId,
			questionId,
			userId: user.id
		});
		await materializePublishedSnapshot();

		redirect(303, buildEditorUrl(params.checklistId, deleted.groupId, 'Frågan togs bort.'));
	}
};
