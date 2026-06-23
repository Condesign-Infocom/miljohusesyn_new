import { requireContentStudioUser } from '$lib/server/auth';
import {
	loadContentStudioChecklistTree,
	loadContentStudioFacts
} from '$lib/server/services/content-studio';

export const load = async ({ locals, url }) => {
	requireContentStudioUser(locals, url);

	const search = url.searchParams.get('q')?.trim() ?? '';
	const checklistId = url.searchParams.get('checklist')?.trim() ?? '';
	const [factsResult, checklistResult] = await Promise.all([
		loadContentStudioFacts({ search }),
		checklistId ? loadContentStudioChecklistTree(checklistId) : Promise.resolve({ tree: null })
	]);

	if (!checklistResult.tree) {
		return {
			...factsResult,
			selectedChecklist: null
		};
	}

	const nodeIds = new Set(
		checklistResult.tree.groups.flatMap((group) =>
			group.questions.map((question) => normalizeChecklistNodeId(question.nodeId)).filter(Boolean)
		)
	);

	return {
		...factsResult,
		items: factsResult.items.filter((item) => nodeIds.has(normalizeFactNodeId(item.nodeId))),
		selectedChecklist: {
			id: checklistResult.tree.checklist.id,
			checklistId: checklistResult.tree.checklist.checklistId,
			title: checklistResult.tree.checklist.title,
			qaType: checklistResult.tree.checklist.qaType,
			questionCount: checklistResult.tree.groups.reduce(
				(count, group) => count + group.questions.length,
				0
			),
			missingFactLinkCount: checklistResult.tree.groups.reduce(
				(count, group) =>
					count + group.questions.filter((question) => question.factLinks.length === 0).length,
				0
			)
		}
	};
};

function normalizeChecklistNodeId(nodeId: string) {
	return (nodeId ?? '')
		.replace(/^node-id-/, '')
		.replace(/-\d{4}-\d{2}-\d{2}.*$/, '')
		.trim();
}

function normalizeFactNodeId(nodeId: string | null) {
	return (nodeId ?? '').trim();
}
