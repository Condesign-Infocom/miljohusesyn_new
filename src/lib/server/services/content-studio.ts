import { randomUUID } from 'node:crypto';
import {
	createContentStudioRepository,
	type ContentStudioProfileCatalogRow,
	type ContentStudioChecklistTree,
	type ContentStudioDraftState,
	type ContentStudioFactRow,
	type ContentStudioNewsRow,
	type ContentStudioPublishingQueueItem,
	type ContentStudioSnapshot,
	type ContentStudioStandardContentRow,
	type ContentStudioSummary
} from '$lib/server/domain-store/content-studio-repository';
import { withDomainStoreClient } from '$lib/server/domain-store/client';
import { createDb } from '$lib/server/db/client';
import { resetRuntimeAnswerStatesForQuestion } from '$lib/server/db/runtime-write-repository';
import {
	requirePostgresDsn,
	requireSqliteDomainStorePath,
	resolveDomainStoreConfig
} from '../../../../scripts/domain-store-config';
import {
	extractPublicParagraphs,
	normalizePublicBodyHtml,
	paragraphsToPublicBodyHtml
} from './public-content-format';
import { clearPublishedPublicFactsCache } from './public-facts';
import { clearPublishedPublicNewsCache } from './public-news';
import { ensureSeededPublicNewsRows } from './public-news-store';
import { clearPublishedPublicStandardContentCache } from './public-standard-content';
import {
	syncDomainStoreSnapshot,
	syncPostgresDomainStoreSnapshot
} from '../sync/importer-sync';

function clearPublishedContentCaches() {
	clearPublishedPublicFactsCache();
	clearPublishedPublicNewsCache();
	clearPublishedPublicStandardContentCache();
}

export type ContentStudioFactListData = {
	latestSnapshot: ContentStudioSnapshot | null;
	search: string;
	items: ContentStudioFactRow[];
};

export type ContentStudioStandardContentListData = {
	latestSnapshot: ContentStudioSnapshot | null;
	kind: string;
	items: ContentStudioStandardContentRow[];
};

export type ContentStudioNewsListData = {
	latestSnapshot: ContentStudioSnapshot | null;
	items: ContentStudioNewsRow[];
};

export type ContentStudioChecklistListData = {
	latestSnapshot: ContentStudioSnapshot | null;
	items: ContentStudioChecklistDiscoveryRow[];
};

export type ContentStudioChecklistTreeData = {
	latestSnapshot: ContentStudioSnapshot | null;
	tree: ContentStudioChecklistTree | null;
};

type ContentStudioProfileListItem = {
	profileKey: string;
	profileName: string;
};

export type ContentStudioProfileRulesChecklist = ContentStudioChecklistTree['checklist'] & {
	groups: Array<
		Omit<ContentStudioChecklistTree['groups'][number], 'questions'> & {
			questions: Array<
				ContentStudioChecklistTree['groups'][number]['questions'][number] & {
					groupId: string;
					groupTitle: string;
					groupProfiles: ContentStudioProfileListItem[];
				}
			>;
		}
	>;
};

export type ContentStudioProfileRulesData = {
	latestSnapshot: ContentStudioSnapshot | null;
	profileCatalog: ContentStudioProfileCatalogRow[];
	checklists: ContentStudioProfileRulesChecklist[];
};

export type ContentStudioChecklistValidation = {
	duplicateNodeIds: Array<{
		nodeId: string;
		occurrences: number;
		rows: Array<{ checklistId: string; kind: 'group' | 'question'; title: string }>;
	}>;
	missingFactLinks: Array<{
		checklistId: string;
		groupTitle: string;
		questionId: string;
		nodeId: string;
		questionText: string;
	}>;
	unresolvedFactNodeIds: Array<{
		checklistId: string;
		questionId: string;
		nodeId: string;
		questionText: string;
		linkStatuses: string[];
	}>;
	emptyQuestionTexts: Array<{
		checklistId: string;
		groupTitle: string;
		questionId: string;
		nodeId: string;
	}>;
	missingStandardTargets: Array<{
		blockId: string;
		contentType: string;
		title: string;
	}>;
	readiness: ContentStudioChecklistReadiness;
};

export type ContentStudioChecklistReadiness = {
	state: 'ready' | 'warning' | 'blocking';
	blockerCount: number;
	warningCount: number;
};

export type ContentStudioChecklistEditorData = {
	latestSnapshot: ContentStudioSnapshot | null;
	tree: ContentStudioChecklistTree | null;
	validation: ContentStudioChecklistValidation;
};

export type ContentStudioChecklistFactWorkspaceData = {
	node: {
		kind: 'group' | 'question';
		id: string;
		nodeId: string;
		title: string;
		summaryText: string;
		groupId: string | null;
		groupTitle: string | null;
	};
	question: {
		id: string;
		nodeId: string;
		questionText: string;
		groupId: string;
		groupTitle: string;
	} | null;
	linkedFacts: Array<{
		factRowId: string;
		factId: string | null;
		title: string;
		nodeId: string | null;
		excerpt: string;
		usageCount: number;
	}>;
	selectedFact: {
		factRowId: string;
		factId: string | null;
		title: string;
		nodeId: string | null;
		excerpt: string;
		usageCount: number;
	} | null;
	selectedFactEditor: {
		factRowId: string;
		title: string;
		bodyHtml: string;
		nodeIds: string[];
		status: string;
		updatedAt: string | null;
		reviewStatus: string | null;
		validationStatus: string;
	} | null;
	availableFacts: Array<{
		factRowId: string;
		factId: string | null;
		title: string;
		nodeId: string | null;
		excerpt: string;
		usageCount: number;
		isLinked: boolean;
	}>;
};

export type ContentStudioChecklistEditorWorkspaceData = ContentStudioChecklistEditorData & {
	factWorkspace: ContentStudioChecklistFactWorkspaceData | null;
	factValidation?: DraftValidation;
};

export type ContentStudioValidationData = {
	latestSnapshot: ContentStudioSnapshot | null;
	checklists: Array<{ id: string; checklistId: string; title: string }>;
	validation: ContentStudioChecklistValidation;
};

export type ContentStudioPublishingQueueData = {
	latestSnapshot: ContentStudioSnapshot | null;
	items: ContentStudioPublishingQueueRow[];
};

export type ContentStudioPublishDecision = {
	state: 'ready' | 'warning' | 'blocked';
	reason: string;
};

export type ContentStudioPublishingQueueRow = ContentStudioPublishingQueueItem & {
	publishDecision: ContentStudioPublishDecision;
	linkedChecklistStates: Array<{
		checklistId: string;
		title: string;
		readiness: ContentStudioChecklistReadiness;
	}>;
};

export type ContentStudioFactDraftInput = {
	title: string;
	bodyHtml: string;
	nodeIds: string[];
};

export type ContentStudioStandardContentDraftInput = {
	title: string;
	bodyHtml: string;
	targets: string[];
};

export type ContentStudioNewsDraftInput = {
	title: string;
	publishedAt: string;
	excerpt: string;
	bodyParagraphs: string[];
	legacyUrl: string;
};

export type ContentStudioFactEditorDraft = ContentStudioFactDraftInput & {
	id: string | null;
	status: string;
	updatedAt: string | null;
	reviewStatus: string | null;
	validationStatus: string;
};

export type ContentStudioStandardContentEditorDraft = ContentStudioStandardContentDraftInput & {
	id: string | null;
	status: string;
	updatedAt: string | null;
	reviewStatus: string | null;
	validationStatus: string;
};

export type ContentStudioNewsEditorDraft = ContentStudioNewsDraftInput & {
	id: string | null;
	status: string;
	updatedAt: string | null;
	reviewStatus: string | null;
	validationStatus: string;
	bodyHtml: string;
};

export type ContentStudioFactEditorData = {
	latestSnapshot: ContentStudioSnapshot | null;
	item: ContentStudioFactRow | null;
	draft: ContentStudioFactEditorDraft | null;
	linkOptions: Array<{
		id: string;
		linkNodeId: string;
		legacyNodeId: string;
		checklistId: string;
		checklistTitle: string;
		groupId: string;
		groupTitle: string;
		questionId: string;
		questionText: string;
		selected: boolean;
	}>;
	unresolvedNodeIds: string[];
};

export type ContentStudioStandardContentEditorData = {
	latestSnapshot: ContentStudioSnapshot | null;
	item: ContentStudioStandardContentRow | null;
	draft: ContentStudioStandardContentEditorDraft | null;
};

export type ContentStudioNewsEditorData = {
	latestSnapshot: ContentStudioSnapshot | null;
	item: ContentStudioNewsRow | null;
	draft: ContentStudioNewsEditorDraft | null;
};

export type ChecklistGroupDraftInput = {
	title: string;
	introText: string;
};

export type ChecklistQuestionDraftInput = {
	questionText: string;
	flags: {
		cc: boolean;
		ccExtra: boolean;
		base: boolean;
		annualQuestion: boolean;
		newFlag: boolean;
		recommended: boolean;
	};
};

type ChecklistInsertPosition = 'before' | 'after' | 'end';
type ChecklistMoveDirection = 'up' | 'down';

type DraftValidation = {
	status: string;
	errors: Record<string, string>;
};

type EditorialDraftStatus = 'draft' | 'in_review' | 'published';
type ContentStudioRepository = ReturnType<typeof createContentStudioRepository>;

type ContentStudioChecklistDiscoveryRow =
	Awaited<ReturnType<ReturnType<typeof createContentStudioRepository>['listChecklistRows']>>[number] & {
		missingFactLinkCount: number;
		duplicateNodeIdCount: number;
		emptyQuestionTextCount: number;
		unresolvedFactNodeIdCount: number;
		readiness: ContentStudioChecklistReadiness;
	};

type FactDraftPayload = {
	title?: string;
	bodyHtml?: string;
	nodeIds?: string[];
};

type StandardContentDraftPayload = {
	title?: string;
	bodyHtml?: string;
	targets?: string[];
};

type NewsDraftPayload = {
	title?: string;
	publishedAt?: string;
	excerpt?: string;
	bodyHtml?: string;
	bodyParagraphs?: string[];
	legacyUrl?: string;
};

export async function loadContentStudioLandingData(snapshotId?: string): Promise<ContentStudioSummary> {
	return await withDomainStoreClient(async (client) => {
		return await createContentStudioRepository(client).loadContentStudioSummary(snapshotId);
	});
}

export async function loadContentStudioChecklists(snapshotId?: string): Promise<ContentStudioChecklistListData> {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();

		return {
			latestSnapshot,
			items: latestSnapshot ? await buildChecklistDiscoveryRows(repository, latestSnapshot.id) : []
		};
	});
}

export async function loadContentStudioFacts({
	search = '',
	snapshotId
}: {
	search?: string;
	snapshotId?: string;
} = {}): Promise<ContentStudioFactListData> {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();

		return {
			latestSnapshot,
			search: search.trim(),
			items: latestSnapshot ? await repository.listFactRows({ snapshotId: latestSnapshot.id, search }) : []
		};
	});
}

export async function loadContentStudioFact(
	factId: string,
	snapshotId?: string
): Promise<{ latestSnapshot: ContentStudioSnapshot | null; item: ContentStudioFactRow | null }> {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();

		return {
			latestSnapshot,
			item: latestSnapshot ? await repository.loadFactRow(factId, latestSnapshot.id) : null
		};
	});
}

export async function loadContentStudioStandardContent({
	kind = '',
	contentType,
	snapshotId
}: {
	kind?: string;
	contentType?: string;
	snapshotId?: string;
} = {}): Promise<ContentStudioStandardContentListData> {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();
		const normalizedKind = (kind || contentType || '').trim();

		return {
			latestSnapshot,
			kind: normalizedKind,
			items:
				latestSnapshot ?
					await repository.listStandardContentRows({
						snapshotId: latestSnapshot.id,
						kind: normalizedKind
					})
				:	[]
		};
	});
}

export async function loadContentStudioNews(snapshotId?: string): Promise<ContentStudioNewsListData> {
	if (!snapshotId) {
		await ensureSeededPublicNewsRows();
	}

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();

		return {
			latestSnapshot,
			items: latestSnapshot ? await repository.listNewsRows(latestSnapshot.id) : []
		};
	});
}

export async function loadContentStudioStandardContentBlock(
	blockId: string,
	snapshotId?: string
): Promise<{ latestSnapshot: ContentStudioSnapshot | null; item: ContentStudioStandardContentRow | null }> {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();

		return {
			latestSnapshot,
			item: latestSnapshot ? await repository.loadStandardContentRow(blockId, latestSnapshot.id) : null
		};
	});
}

export async function loadContentStudioChecklistTree(
	checklistId: string,
	snapshotId?: string
): Promise<ContentStudioChecklistTreeData> {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();

		return {
			latestSnapshot,
			tree: latestSnapshot ? await repository.loadChecklistTree(checklistId, latestSnapshot.id) : null
		};
	});
}

export async function loadContentStudioProfileRules(
	snapshotId?: string
): Promise<ContentStudioProfileRulesData> {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			return {
				latestSnapshot: null,
				profileCatalog: [],
				checklists: []
			};
		}

		const [profileCatalog, checklistRows] = await Promise.all([
			repository.listProfileCatalog(latestSnapshot.id),
			repository.listChecklistRows(latestSnapshot.id)
		]);
		const trees = (
			await Promise.all(checklistRows.map((row) => repository.loadChecklistTree(row.id, latestSnapshot.id)))
		).filter((tree): tree is ContentStudioChecklistTree => Boolean(tree));

		return {
			latestSnapshot,
			profileCatalog,
			checklists: trees
				.map((tree) => ({
					...tree.checklist,
					groups: tree.groups.map((group) => ({
						...group,
						questions: group.questions.map((question) => ({
							...question,
							groupId: group.id,
							groupTitle: group.title,
							groupProfiles: group.profiles
						}))
					}))
				}))
				.sort((left, right) => left.sourceRowId.localeCompare(right.sourceRowId, 'sv'))
		};
	});
}

export async function addChecklistGroupProfileRule(input: { groupId: string; profileKey: string }) {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const result = await repository.addChecklistGroupProfile({
			groupRowId: input.groupId,
			profileKey: input.profileKey
		});

		assertProfileRuleMutationResult(result, 'Gruppen hittades inte.');
	});
}

export async function removeChecklistGroupProfileRule(input: { groupId: string; profileKey: string }) {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const result = await repository.removeChecklistGroupProfile({
			groupRowId: input.groupId,
			profileKey: input.profileKey
		});

		assertProfileRuleMutationResult(result, 'Gruppen hittades inte.');
	});
}

export async function addChecklistQuestionProfileRule(input: { questionId: string; profileKey: string }) {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const result = await repository.addChecklistQuestionProfile({
			questionRowId: input.questionId,
			profileKey: input.profileKey
		});

		assertProfileRuleMutationResult(result, 'Frågan hittades inte.');
	});
}

export async function removeChecklistQuestionProfileRule(input: { questionId: string; profileKey: string }) {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const result = await repository.removeChecklistQuestionProfile({
			questionRowId: input.questionId,
			profileKey: input.profileKey
		});

		assertProfileRuleMutationResult(result, 'Frågan hittades inte.');
	});
}

export async function loadChecklistEditor(
	checklistId: string,
	snapshotId?: string
): Promise<ContentStudioChecklistEditorData> {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			return {
				latestSnapshot: null,
				tree: null,
				validation: emptyChecklistValidation()
			};
		}

		const tree = await repository.loadChecklistTree(checklistId, latestSnapshot.id);
		const validation = await buildChecklistValidation(repository, latestSnapshot.id, tree ? checklistId : undefined);

		return {
			latestSnapshot,
			tree,
			validation
		};
	});
}

export async function loadChecklistEditorWorkspace(
	checklistId: string,
	selectedNodeId: string | null,
	selectedFactId?: string,
	snapshotId?: string
): Promise<ContentStudioChecklistEditorWorkspaceData> {
	const editor = await loadChecklistEditor(checklistId, snapshotId);

	if (!editor.tree || !selectedNodeId) {
		return {
			...editor,
			factWorkspace: null
		};
	}

	const selectedNode = findChecklistNodeById(editor.tree, selectedNodeId);
	if (!selectedNode) {
		return {
			...editor,
			factWorkspace: null
		};
	}

	const factRows = await loadContentStudioFacts({ snapshotId: editor.latestSnapshot?.id }).then(
		(result) => result.items
	);
	const usageCounts = new Map(
		(
			await withDomainStoreClient(async (client) => {
				const repository = createContentStudioRepository(client);
				return await repository.listFactLinkCounts(editor.latestSnapshot?.id);
			})
		).map((item) => [item.factRowId, item.usageCount])
	);
	const linkedFacts = mergeFactWorkspaceSummaries(
		await Promise.all(
		dedupeFactLinksByRowId(selectedNode.factLinks).map(async (factLink) => {
			const factRow = factRows.find((item) => item.sourceRowId === factLink.factRowId || item.id === factLink.factRowId);
			const bodyHtml = factRow?.bodyHtml ?? '';

			return {
				factRowId: factLink.factRowId,
				factId: factRow?.factId ?? factLink.factId,
				title: factRow?.title ?? factLink.title,
				nodeId: factRow?.nodeId ?? factLink.nodeId,
				excerpt: buildFactExcerpt(bodyHtml),
				usageCount: usageCounts.get(factLink.factRowId) ?? 0
			};
		})
		)
	);

	const effectiveFactKey = buildFactWorkspaceLogicalKeyFromRowId(selectedFactId, factRows);
	const selectedFact =
		linkedFacts.find((fact) => fact.factRowId === selectedFactId) ??
		linkedFacts.find((fact) => buildFactWorkspaceLogicalKey(fact) === effectiveFactKey) ??
		linkedFacts[0] ??
		null;
	const selectedFactEditorData =
		selectedFact ? await loadFactEditor(selectedFact.factRowId, 0, editor.latestSnapshot?.id) : null;
	const linkedFactIds = new Set(linkedFacts.map((fact) => fact.factRowId));
	const availableFacts = mergeFactWorkspaceSummaries(
		factRows
		.map((factRow) => ({
			factRowId: factRow.sourceRowId,
			factId: factRow.factId,
			title: factRow.title,
			nodeId: factRow.nodeId,
			excerpt: buildFactExcerpt(factRow.bodyHtml),
			usageCount: usageCounts.get(factRow.sourceRowId) ?? 0,
			isLinked: linkedFactIds.has(factRow.sourceRowId)
		}))
	).map((fact) => ({
		...fact,
		isLinked:
			fact.isLinked ||
			linkedFacts.some((linkedFact) => buildFactWorkspaceLogicalKey(linkedFact) === buildFactWorkspaceLogicalKey(fact))
	}))
		.sort((left, right) =>
			Number(right.isLinked) - Number(left.isLinked) ||
			left.title.localeCompare(right.title, 'sv')
		);

	return {
		...editor,
		factWorkspace: {
			node: {
				kind: selectedNode.kind,
				id: selectedNode.id,
				nodeId: selectedNode.nodeId,
				title: selectedNode.title,
				summaryText: selectedNode.summaryText,
				groupId: selectedNode.groupId,
				groupTitle: selectedNode.groupTitle
			},
			question:
				selectedNode.kind === 'question' && selectedNode.groupId && selectedNode.groupTitle ?
					{
						id: selectedNode.id,
						nodeId: selectedNode.nodeId,
						questionText: selectedNode.summaryText,
						groupId: selectedNode.groupId,
						groupTitle: selectedNode.groupTitle
					}
				:	null,
			linkedFacts,
			selectedFact,
			selectedFactEditor:
				selectedFactEditorData?.item && selectedFactEditorData.draft ?
					{
						factRowId: selectedFactEditorData.item.sourceRowId,
						title: selectedFactEditorData.draft.title,
						bodyHtml: selectedFactEditorData.draft.bodyHtml,
						nodeIds: selectedFactEditorData.draft.nodeIds,
						status: selectedFactEditorData.draft.status,
						updatedAt: selectedFactEditorData.draft.updatedAt,
						reviewStatus: selectedFactEditorData.draft.reviewStatus,
						validationStatus: selectedFactEditorData.draft.validationStatus
					}
				:	null,
			availableFacts
		}
	};
}

export async function loadContentStudioValidation(
	snapshotId?: string
): Promise<ContentStudioValidationData> {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			return {
				latestSnapshot: null,
				checklists: [],
				validation: emptyChecklistValidation()
			};
		}

		const checklists = await repository.listChecklistRows(latestSnapshot.id);
		const validation = await buildChecklistValidation(repository, latestSnapshot.id);

		return {
			latestSnapshot,
			checklists: checklists.map((item) => ({
				id: item.id,
				checklistId: item.checklistId,
				title: item.title
			})),
			validation
		};
	});
}

export async function loadFactEditor(
	factId: string,
	userId: number,
	snapshotId?: string
): Promise<ContentStudioFactEditorData> {
	void userId;

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			return { latestSnapshot: null, item: null, draft: null, linkOptions: [], unresolvedNodeIds: [] };
		}

		const item = await repository.loadFactRow(factId, latestSnapshot.id);

		if (!item) {
			return { latestSnapshot, item: null, draft: null, linkOptions: [], unresolvedNodeIds: [] };
		}

		const draftState = await repository.findLatestDraftForSource('fact', item.sourceRowId, latestSnapshot.id);
		const draftRevision =
			draftState ? await repository.loadLatestDraftRevision(draftState.id) : null;

		const draft = buildFactEditorDraft(item, draftState, draftRevision?.payloadJson);
		const linkOptions = await buildFactLinkOptions(repository, latestSnapshot.id, draft.nodeIds);
		const knownLinkNodeIds = new Set(linkOptions.map((option) => option.linkNodeId));
		const unresolvedNodeIds = draft.nodeIds.filter((nodeId) => !knownLinkNodeIds.has(nodeId));

		return {
			latestSnapshot,
			item,
			draft,
			linkOptions,
			unresolvedNodeIds
		};
	});
}

export async function loadPublishingQueue(snapshotId?: string): Promise<ContentStudioPublishingQueueData> {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();

		return {
			latestSnapshot,
			items:
				latestSnapshot ?
					await Promise.all(
						(await repository.listPublishingQueue(latestSnapshot.id)).map(async (item) => {
							const linkedChecklistStates = await buildLinkedChecklistStatesForQueueItem(
								repository,
								item
							);

							return {
								...item,
								linkedChecklistStates,
								publishDecision: resolvePublishDecision(
									item.latestRevisionValidationStatus,
									linkedChecklistStates
								)
							};
						})
					)
				:	[]
		};
	});
}

export async function approvePublishingReview(input: {
	reviewRequestId: string;
	draftId: string;
	userId: number;
	snapshotId?: string;
}) {
	const now = new Date().toISOString();
	const queue = await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = input.snapshotId ?
			await repository.findSnapshot(input.snapshotId)
		:	await repository.findLatestSnapshot();
		const queueItems = latestSnapshot ? await repository.listPublishingQueue(latestSnapshot.id) : [];
		const queueItem = queueItems.find(
			(item) => item.reviewRequestId === input.reviewRequestId && item.draftId === input.draftId
		);

		if (!queueItem) {
			throw new Error('Granskningsärendet hittades inte.');
		}

		const linkedChecklistStates = await buildLinkedChecklistStatesForQueueItem(repository, queueItem);
		const publishDecision = resolvePublishDecision(
			queueItem.latestRevisionValidationStatus,
			linkedChecklistStates
		);
		if (publishDecision.state === 'blocked') {
			throw new Error(publishDecision.reason);
		}

		const latestRevision = await repository.loadLatestDraftRevision(queueItem.draftId);
		if (!latestRevision) {
			throw new Error('Det finns ingen revisionsdata att publicera.');
		}

		if (queueItem.contentKind === 'fact') {
			const factRow = await repository.loadFactRow(queueItem.sourceRowId, latestSnapshot?.id);
			const payload = parseJsonPayload<FactDraftPayload>(latestRevision.payloadJson);
			const values = normalizeFactDraftInput({
				title: payload?.title ?? factRow?.title ?? '',
				bodyHtml: payload?.bodyHtml ?? factRow?.bodyHtml ?? '',
				nodeIds:
					payload?.nodeIds?.map((nodeId) => nodeId.trim()).filter(Boolean) ??
					(factRow?.nodeId ? [factRow.nodeId] : [])
			});
			await applyFactDraftRevision({
				repository,
				factId: queueItem.sourceRowId,
				snapshotId: queueItem.snapshotId,
				values
			});
		} else if (queueItem.contentKind === 'standard_content') {
			const item = await repository.loadStandardContentRow(queueItem.sourceRowId, queueItem.snapshotId);
			const payload = parseJsonPayload<StandardContentDraftPayload>(latestRevision.payloadJson);
			const values = normalizeStandardContentDraftInput({
				title: payload?.title ?? item?.title ?? '',
				bodyHtml: payload?.bodyHtml ?? item?.bodyHtml ?? '',
				targets: payload?.targets ?? item?.targets ?? []
			});
			await applyStandardContentDraftRevision({
				repository,
				blockId: queueItem.sourceRowId,
				snapshotId: queueItem.snapshotId,
				values
			});
		} else {
			const item = await repository.loadNewsRow(queueItem.sourceRowId, queueItem.snapshotId);
			const payload = parseJsonPayload<NewsDraftPayload>(latestRevision.payloadJson);
			const values = normalizeNewsDraftInput({
				title: payload?.title ?? item?.title ?? '',
				publishedAt: payload?.publishedAt ?? item?.publishedAt ?? '',
				excerpt: payload?.excerpt ?? item?.excerpt ?? '',
				bodyParagraphs:
					payload?.bodyParagraphs ??
					extractPublicParagraphs(payload?.bodyHtml ?? item?.bodyHtml ?? ''),
				legacyUrl: payload?.legacyUrl ?? item?.legacyUrl ?? ''
			});
			await applyNewsDraftRevision({
				repository,
				newsId: queueItem.sourceRowId,
				snapshotId: queueItem.snapshotId,
				values
			});
		}

		await repository.approveReviewRequest({
			reviewRequestId: input.reviewRequestId,
			draftId: input.draftId,
			userId: input.userId,
			now
		});
		await finalizeEditorialPublication({
			contentKind: queueItem.contentKind,
			snapshotId: queueItem.snapshotId
		});

		return await loadPublishingQueue(queueItem.snapshotId);
	});

	return queue;
}

export async function materializePublishedSnapshot(snapshotId?: string) {
	const config = resolveDomainStoreConfig();
	const db = createDb();

	const result =
		config.engine === 'postgres'
			? await syncPostgresDomainStoreSnapshot(db, requirePostgresDsn(), snapshotId)
			: await syncDomainStoreSnapshot(db, requireSqliteDomainStorePath(), snapshotId);
	clearPublishedContentCaches();
	return result;
}

export async function loadStandardContentEditor(
	blockId: string,
	userId: number,
	snapshotId?: string
): Promise<ContentStudioStandardContentEditorData> {
	void userId;

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			return { latestSnapshot: null, item: null, draft: null };
		}

		const item = await repository.loadStandardContentRow(blockId, latestSnapshot.id);

		if (!item) {
			return { latestSnapshot, item: null, draft: null };
		}

		const draftState = await repository.findLatestDraftForSource(
			'standard_content',
			item.sourceRowId,
			latestSnapshot.id
		);
		const draftRevision =
			draftState ? await repository.loadLatestDraftRevision(draftState.id) : null;

		return {
			latestSnapshot,
			item,
			draft: buildStandardContentEditorDraft(item, draftState, draftRevision?.payloadJson)
		};
	});
}

export async function loadNewsEditor(
	newsId: string,
	userId: number,
	snapshotId?: string
): Promise<ContentStudioNewsEditorData> {
	void userId;

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = snapshotId ?
			await repository.findSnapshot(snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			return { latestSnapshot: null, item: null, draft: null };
		}

		const item = await repository.loadNewsRow(newsId, latestSnapshot.id);

		if (!item) {
			return { latestSnapshot, item: null, draft: null };
		}

		const draftState = await repository.findLatestDraftForSource('news', item.sourceRowId, latestSnapshot.id);
		const draftRevision = draftState ? await repository.loadLatestDraftRevision(draftState.id) : null;

		return {
			latestSnapshot,
			item,
			draft: buildNewsEditorDraft(item, draftState, draftRevision?.payloadJson)
		};
	});
}

export async function createChecklistGroupDraft(input: {
	checklistId: string;
	userId: number;
	position?: ChecklistInsertPosition;
	referenceGroupId?: string;
	snapshotId?: string;
}) {
	void input.userId;

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		await repository.ensureChecklistMutationSchema();
		const latestSnapshot = input.snapshotId ?
			await repository.findSnapshot(input.snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			throw new Error('Ingen snapshot finns att redigera mot.');
		}

		const tree = await repository.loadChecklistTree(input.checklistId, latestSnapshot.id);
		if (!tree) {
			throw new Error('Checklistan hittades inte.');
		}

		const groupId = randomUUID();
		await repository.insertChecklistGroup({
			id: groupId,
			snapshotId: latestSnapshot.id,
			checklistRowId: tree.checklist.sourceRowId,
			nodeId: buildChecklistDraftNodeId('group'),
			title: 'Ny grupp',
			introText: '',
			position: input.position ?? 'end',
			referenceGroupRowId: input.referenceGroupId
		});

		return { groupId };
	});
}

export async function createChecklistQuestionDraft(input: {
	checklistId: string;
	groupId: string;
	userId: number;
	position?: ChecklistInsertPosition;
	referenceQuestionId?: string;
	snapshotId?: string;
}) {
	void input.userId;

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		await repository.ensureChecklistMutationSchema();
		const latestSnapshot = input.snapshotId ?
			await repository.findSnapshot(input.snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			throw new Error('Ingen snapshot finns att redigera mot.');
		}

		const tree = await repository.loadChecklistTree(input.checklistId, latestSnapshot.id);
		if (!tree) {
			throw new Error('Checklistan hittades inte.');
		}

		const group = tree.groups.find((item) => item.id === input.groupId || item.sourceRowId === input.groupId);
		if (!group) {
			throw new Error('Gruppen hittades inte.');
		}

		const questionId = randomUUID();
		await repository.insertChecklistQuestion({
			id: questionId,
			snapshotId: latestSnapshot.id,
			groupRowId: group.sourceRowId,
			nodeId: buildChecklistDraftNodeId('question'),
			questionText: 'Ny fråga',
			position: input.position ?? 'end',
			referenceQuestionRowId: input.referenceQuestionId
		});

		return { questionId };
	});
}

export async function moveChecklistGroupDraft(input: {
	checklistId: string;
	groupId: string;
	direction: ChecklistMoveDirection;
	userId: number;
	snapshotId?: string;
}) {
	void input.checklistId;
	void input.userId;

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		await repository.ensureChecklistMutationSchema();
		const moved = await repository.moveChecklistGroup({
			groupRowId: input.groupId,
			direction: input.direction
		});

		if (!moved) {
			throw new Error('Gruppen hittades inte.');
		}

		return { groupId: moved.id };
	});
}

export async function reorderChecklistGroupsDraft(input: {
	checklistId: string;
	groupIds: string[];
	selectedNodeId?: string;
	userId: number;
	snapshotId?: string;
}) {
	void input.userId;

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		await repository.ensureChecklistMutationSchema();
		const latestSnapshot = input.snapshotId ?
			await repository.findSnapshot(input.snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			throw new Error('Ingen snapshot finns att redigera mot.');
		}

		const tree = await repository.loadChecklistTree(input.checklistId, latestSnapshot.id);
		if (!tree) {
			throw new Error('Checklistan hittades inte.');
		}

		await repository.reorderChecklistGroups({
			checklistRowId: tree.checklist.sourceRowId,
			groupRowIds: input.groupIds
		});

		return { selectedNodeId: input.selectedNodeId ?? input.groupIds[0] ?? tree.groups[0]?.id };
	});
}

export async function moveChecklistQuestionDraft(input: {
	checklistId: string;
	questionId: string;
	direction: ChecklistMoveDirection;
	userId: number;
	snapshotId?: string;
}) {
	void input.checklistId;
	void input.userId;
	void input.snapshotId;

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		await repository.ensureChecklistMutationSchema();
		const moved = await repository.moveChecklistQuestion({
			questionRowId: input.questionId,
			direction: input.direction
		});

		if (!moved) {
			throw new Error('Frågan hittades inte.');
		}

		return { questionId: moved.id };
	});
}

export async function reorderChecklistQuestionsDraft(input: {
	checklistId: string;
	groupId: string;
	questionIds: string[];
	selectedNodeId?: string;
	userId: number;
	snapshotId?: string;
}) {
	void input.userId;

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		await repository.ensureChecklistMutationSchema();
		const latestSnapshot = input.snapshotId ?
			await repository.findSnapshot(input.snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			throw new Error('Ingen snapshot finns att redigera mot.');
		}

		const tree = await repository.loadChecklistTree(input.checklistId, latestSnapshot.id);
		if (!tree) {
			throw new Error('Checklistan hittades inte.');
		}

		const group = tree.groups.find((item) => item.id === input.groupId || item.sourceRowId === input.groupId);
		if (!group) {
			throw new Error('Gruppen hittades inte.');
		}

		await repository.reorderChecklistQuestions({
			groupRowId: group.sourceRowId,
			questionRowIds: input.questionIds
		});

		return { selectedNodeId: input.selectedNodeId ?? input.questionIds[0] ?? group.id };
	});
}

export async function deleteChecklistGroupDraft(input: {
	checklistId: string;
	groupId: string;
	userId: number;
	snapshotId?: string;
}) {
	void input.userId;
	void input.snapshotId;

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		await repository.ensureChecklistMutationSchema();
		const tree = await repository.loadChecklistTree(input.checklistId, input.snapshotId);
		const group = tree?.groups.find((item) => item.id === input.groupId || item.sourceRowId === input.groupId);

		if (!group) {
			throw new Error('Gruppen hittades inte.');
		}

		if (group.questions.length > 0) {
			throw new Error('Gruppen kan inte tas bort eftersom den fortfarande innehåller frågor.');
		}

		const deleted = await repository.deleteChecklistGroup({
			groupRowId: group.sourceRowId
		});

		if (!deleted) {
			throw new Error('Gruppen hittades inte.');
		}

		return { checklistId: group.id };
	});
}

export async function deleteChecklistQuestionDraft(input: {
	checklistId: string;
	questionId: string;
	userId: number;
	snapshotId?: string;
}) {
	void input.checklistId;
	void input.userId;
	void input.snapshotId;

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		await repository.ensureChecklistMutationSchema();
		const deleted = await repository.deleteChecklistQuestion({
			questionRowId: input.questionId
		});

		if (!deleted) {
			throw new Error('Frågan hittades inte.');
		}

		return { groupId: deleted.groupRowId };
	});
}

export async function saveChecklistGroupDraft(input: {
	checklistId: string;
	groupId: string;
	userId: number;
	values: ChecklistGroupDraftInput;
	snapshotId?: string;
}) {
	void input.checklistId;
	void input.userId;
	void input.snapshotId;

	const values = normalizeChecklistGroupDraftInput(input.values);

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		await repository.ensureChecklistMutationSchema();
		const saved = await repository.updateChecklistGroup({
			groupRowId: input.groupId,
			title: values.title,
			introText: values.introText
		});

		if (!saved) {
			throw new Error('Gruppen hittades inte.');
		}

		return { groupId: saved.id };
	});
}

export async function saveChecklistQuestionDraft(input: {
	checklistId: string;
	questionId: string;
	userId: number;
	values: ChecklistQuestionDraftInput;
	snapshotId?: string;
}) {
	void input.checklistId;
	void input.userId;
	void input.snapshotId;

	const values = normalizeChecklistQuestionDraftInput(input.values);

	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		await repository.ensureChecklistMutationSchema();
		const saved = await repository.updateChecklistQuestion({
			questionRowId: input.questionId,
			questionText: values.questionText,
			flags: values.flags
		});

		if (!saved) {
			throw new Error('Frågan hittades inte.');
		}

		return { questionId: saved.id };
	});
}

export async function resetChecklistQuestionAnswers(input: {
	checklistId: string;
	questionId: string;
	userId: number;
	snapshotId?: string;
}) {
	void input.userId;
	void input.snapshotId;

	const editor = await loadChecklistEditor(input.checklistId);
	const checklist = editor.tree?.checklist;
	const questionContext = editor.tree ? findChecklistQuestionById(editor.tree, input.questionId) : null;

	if (!checklist || !questionContext) {
		throw new Error('Frågan hittades inte.');
	}

	const resetCount = await resetRuntimeAnswerStatesForQuestion(createDb(), {
		checklistVariantKey: checklist.qaType,
		groupNodeId: questionContext.group.nodeId,
		questionNodeId: questionContext.question.nodeId,
		updatedAt: new Date().toISOString()
	});

	return { questionId: questionContext.question.id, resetCount };
}

function resolveEditorialDraftStatus(status?: EditorialDraftStatus): EditorialDraftStatus {
	return status === 'draft' || status === 'in_review' || status === 'published' ? status : 'published';
}

async function upsertEditorialWorkflow(input: {
	repository: ContentStudioRepository;
	contentKind: 'fact' | 'standard_content' | 'news';
	sourceRowId: string;
	snapshotId: string;
	userId: number;
	status: EditorialDraftStatus;
	payloadJson: string;
	validationStatus: string;
}) {
	const existingDraft = await input.repository.findLatestDraftForSource(
		input.contentKind,
		input.sourceRowId,
		input.snapshotId
	);
	const draftId = existingDraft?.id ?? randomUUID();
	const now = new Date().toISOString();

	if (!existingDraft) {
		await input.repository.createDraft({
			id: draftId,
			snapshotId: input.snapshotId,
			contentKind: input.contentKind,
			sourceRowId: input.sourceRowId,
			status: input.status,
			userId: input.userId,
			now
		});
	} else {
		await input.repository.updateDraftStatus({
			draftId,
			status: input.status,
			userId: input.userId,
			now
		});
	}

	const revisionNumber = (existingDraft?.latestRevisionNumber ?? 0) + 1;
	await input.repository.appendDraftRevision({
		id: randomUUID(),
		draftId,
		revisionNumber,
		payloadJson: input.payloadJson,
		validationStatus: input.validationStatus,
		userId: input.userId,
		now
	});

	if (input.status === 'published') {
		await input.repository.updateReviewRequestsForDraft({
			draftId,
			fromStatus: 'pending',
			toStatus: 'superseded'
		});
	} else if (
		input.status === 'in_review' &&
		existingDraft?.reviewRequest?.status !== 'pending'
	) {
		await input.repository.createReviewRequest({
			id: randomUUID(),
			draftId,
			userId: input.userId,
			now,
			status: 'pending'
		});
	}

	return { draftId, existingDraft };
}

async function applyFactDraftRevision(input: {
	repository: ContentStudioRepository;
	factId: string;
	snapshotId: string;
	values: ContentStudioFactDraftInput;
}) {
	const item = await input.repository.loadFactRow(input.factId, input.snapshotId);
	if (!item) {
		throw new Error('Faktan hittades inte.');
	}

	await input.repository.updateFactRow({
		factRowId: item.sourceRowId,
		title: input.values.title,
		bodyHtml: input.values.bodyHtml
	});
	await input.repository.replaceFactLinks({
		snapshotId: input.snapshotId,
		factRowId: item.sourceRowId,
		nodeIds: input.values.nodeIds
	});

	return item;
}

async function applyStandardContentDraftRevision(input: {
	repository: ContentStudioRepository;
	blockId: string;
	snapshotId: string;
	values: ContentStudioStandardContentDraftInput;
}) {
	const item = await input.repository.loadStandardContentRow(input.blockId, input.snapshotId);
	if (!item) {
		throw new Error('Standardtexten hittades inte.');
	}

	await input.repository.updateStandardContentRow({
		blockRowId: item.sourceRowId,
		title: input.values.title,
		bodyHtml: input.values.bodyHtml
	});
	await input.repository.replaceStandardContentTargets({
		snapshotId: input.snapshotId,
		blockRowId: item.sourceRowId,
		targets: input.values.targets
	});

	return item;
}

async function applyNewsDraftRevision(input: {
	repository: ContentStudioRepository;
	newsId: string;
	snapshotId: string;
	values: ContentStudioNewsDraftInput;
}) {
	const item = await input.repository.loadNewsRow(input.newsId, input.snapshotId);
	if (!item) {
		throw new Error('Nyheten hittades inte.');
	}

	await input.repository.updateNewsRow({
		newsRowId: item.sourceRowId,
		title: input.values.title,
		publishedAt: input.values.publishedAt,
		excerpt: input.values.excerpt,
		bodyHtml: paragraphsToPublicBodyHtml(input.values.bodyParagraphs),
		legacyUrl: input.values.legacyUrl
	});

	return item;
}

async function finalizeEditorialPublication(input: {
	contentKind: 'fact' | 'standard_content' | 'news';
	snapshotId?: string;
}) {
	if (input.contentKind === 'fact' && input.snapshotId) {
		await materializePublishedSnapshot(input.snapshotId);
		return;
	}

	clearPublishedContentCaches();
}

export async function saveFactDraft(input: {
	factId: string;
	userId: number;
	values: ContentStudioFactDraftInput;
	snapshotId?: string;
	status?: 'draft' | 'in_review' | 'published';
}) {
	const normalizedValues = normalizeFactDraftInput(input.values);
	const validation = validateFactDraft(normalizedValues);
	const nextStatus = resolveEditorialDraftStatus(input.status);

	const result = await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = input.snapshotId ?
			await repository.findSnapshot(input.snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			throw new Error('Ingen snapshot finns att redigera mot.');
		}

		const item = await repository.loadFactRow(input.factId, latestSnapshot.id);

		if (!item) {
			throw new Error('Faktan hittades inte.');
		}

		if (Object.keys(validation.errors).length > 0) {
			return await loadFactEditor(input.factId, input.userId, latestSnapshot.id);
		}

		if (nextStatus === 'published') {
			await applyFactDraftRevision({
				repository,
				factId: input.factId,
				snapshotId: latestSnapshot.id,
				values: normalizedValues
			});
		}

		await upsertEditorialWorkflow({
			repository,
			contentKind: 'fact',
			sourceRowId: item.sourceRowId,
			snapshotId: latestSnapshot.id,
			userId: input.userId,
			status: nextStatus,
			payloadJson: JSON.stringify(normalizedValues),
			validationStatus: validation.status
		});

		return await loadFactEditor(input.factId, input.userId, latestSnapshot.id);
	});

	if (Object.keys(validation.errors).length === 0 && nextStatus === 'published') {
		clearPublishedContentCaches();
	}

	return {
		...result,
		validation
	};
}

export async function saveChecklistWorkspaceFactDraft(input: {
	checklistId: string;
	questionId: string;
	factId: string;
	userId: number;
	values: ContentStudioFactDraftInput;
	snapshotId?: string;
	status?: 'draft' | 'in_review' | 'published';
}) {
	const savedFact = await saveFactDraft({
		factId: input.factId,
		userId: input.userId,
		values: input.values,
		snapshotId: input.snapshotId,
		status: input.status
	});

	const editor = await loadChecklistEditorWorkspace(
		input.checklistId,
		input.questionId,
		input.factId,
		input.snapshotId
	);

	return {
		...editor,
		factValidation: savedFact.validation
	};
}

export async function createChecklistWorkspaceFactFromNode(input: {
	checklistId: string;
	nodeId: string;
	userId: number;
	snapshotId?: string;
	status?: 'draft' | 'in_review' | 'published';
	values?: {
		title: string;
		bodyHtml: string;
	};
}) {
	const createdFact = await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = input.snapshotId ?
			await repository.findSnapshot(input.snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			throw new Error('Ingen snapshot finns att redigera mot.');
		}

		const tree = await repository.loadChecklistTree(input.checklistId, latestSnapshot.id);
		if (!tree) {
			throw new Error('Checklistan hittades inte.');
		}

		const selectedNode = findChecklistNodeById(tree, input.nodeId);
		if (!selectedNode) {
			throw new Error('Noden hittades inte.');
		}

		const factRowId = `editorial-fact-${randomUUID()}`;
		const generatedFactId = `fact-${randomUUID().slice(0, 8)}`;
		const linkNodeId = normalizeLegacyLinkNodeId(selectedNode.nodeId);
		const title =
			input.values?.title.trim() ||
			(selectedNode.kind === 'question' ? selectedNode.summaryText : selectedNode.title).trim() ||
			'Ny fakta';
		const bodyHtml = input.values?.bodyHtml.trim() || '<p></p>';

		await repository.insertFactRow({
			id: factRowId,
			snapshotId: latestSnapshot.id,
			factId: generatedFactId,
			nodeId: linkNodeId || null,
			title,
			sourceFile: `editorial/facts/${generatedFactId}.html`,
			bodyHtml
		});

		if (linkNodeId) {
			await repository.insertFactLink({
				id: `editorial-fact-link-${randomUUID()}`,
				snapshotId: latestSnapshot.id,
				factRowId,
				nodeId: linkNodeId,
				linkSource: 'editorial_manual',
				linkStatus: 'linked'
			});
		}

		return {
			factRowId,
			title,
			bodyHtml,
			nodeIds: linkNodeId ? [linkNodeId] : []
		};
	});

	await saveFactDraft({
		factId: createdFact.factRowId,
		userId: input.userId,
		values: {
			title: createdFact.title,
			bodyHtml: createdFact.bodyHtml,
			nodeIds: createdFact.nodeIds
		},
		snapshotId: input.snapshotId,
		status: input.status ?? 'draft'
	});

	return await loadChecklistEditorWorkspace(
		input.checklistId,
		input.nodeId,
		createdFact.factRowId,
		input.snapshotId
	);
}

export async function createChecklistWorkspaceFactFromQuestion(input: {
	checklistId: string;
	questionId: string;
	userId: number;
	snapshotId?: string;
	status?: 'draft' | 'in_review' | 'published';
	values?: {
		title: string;
		bodyHtml: string;
	};
}) {
	return await createChecklistWorkspaceFactFromNode({
		checklistId: input.checklistId,
		nodeId: input.questionId,
		userId: input.userId,
		snapshotId: input.snapshotId,
		status: input.status,
		values: input.values
	});
}

export async function linkChecklistWorkspaceFact(input: {
	checklistId: string;
	nodeId?: string;
	questionId?: string;
	factId: string;
	snapshotId?: string;
}) {
	const selectedNodeId = input.nodeId ?? input.questionId;
	if (!selectedNodeId) {
		throw new Error('Noden saknas.');
	}

	await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = input.snapshotId ?
			await repository.findSnapshot(input.snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			throw new Error('Ingen snapshot finns att redigera mot.');
		}

		const tree = await repository.loadChecklistTree(input.checklistId, latestSnapshot.id);
		if (!tree) {
			throw new Error('Checklistan hittades inte.');
		}

		const selectedNode = findChecklistNodeById(tree, selectedNodeId);
		if (!selectedNode) {
			throw new Error('Noden hittades inte.');
		}

		const factRow = await repository.loadFactRow(input.factId, latestSnapshot.id);
		if (!factRow) {
			throw new Error('Faktan hittades inte.');
		}

		const linkNodeId = normalizeLegacyLinkNodeId(selectedNode.nodeId);
		if (!linkNodeId) {
			throw new Error('Noden saknar länkbar node-id.');
		}

		const exists = await repository.hasFactLink({
			snapshotId: latestSnapshot.id,
			factRowId: factRow.sourceRowId,
			nodeId: linkNodeId
		});

		if (!exists) {
			await repository.insertFactLink({
				id: `editorial-fact-link-${randomUUID()}`,
				snapshotId: latestSnapshot.id,
				factRowId: factRow.sourceRowId,
				nodeId: linkNodeId,
				linkSource: 'editorial_manual',
				linkStatus: 'linked'
			});
		}

		return latestSnapshot.id;
	});

	return await loadChecklistEditorWorkspace(
		input.checklistId,
		selectedNodeId,
		input.factId,
		input.snapshotId
	);
}

export async function unlinkChecklistWorkspaceFact(input: {
	checklistId: string;
	nodeId?: string;
	questionId?: string;
	factId: string;
	snapshotId?: string;
}) {
	const selectedNodeId = input.nodeId ?? input.questionId;
	if (!selectedNodeId) {
		throw new Error('Noden saknas.');
	}

	await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = input.snapshotId ?
			await repository.findSnapshot(input.snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			throw new Error('Ingen snapshot finns att redigera mot.');
		}

		const tree = await repository.loadChecklistTree(input.checklistId, latestSnapshot.id);
		if (!tree) {
			throw new Error('Checklistan hittades inte.');
		}

		const selectedNode = findChecklistNodeById(tree, selectedNodeId);
		if (!selectedNode) {
			throw new Error('Noden hittades inte.');
		}

		const factRow = await repository.loadFactRow(input.factId, latestSnapshot.id);
		if (!factRow) {
			throw new Error('Faktan hittades inte.');
		}

		const linkNodeId = normalizeLegacyLinkNodeId(selectedNode.nodeId);
		if (!linkNodeId) {
			throw new Error('Noden saknar länkbar node-id.');
		}

		const rowsToUnlink =
			factRow.factId ?
				(await repository.listFactRows({ snapshotId: latestSnapshot.id })).filter(
					(row) => row.factId === factRow.factId
				)
			:	[factRow];

		for (const row of rowsToUnlink) {
			await repository.deleteFactLink({
				snapshotId: latestSnapshot.id,
				factRowId: row.sourceRowId,
				nodeId: linkNodeId
			});
		}
	});

	return await loadChecklistEditorWorkspace(
		input.checklistId,
		selectedNodeId,
		undefined,
		input.snapshotId
	);
}

export async function saveStandardContentDraft(input: {
	blockId: string;
	userId: number;
	values: ContentStudioStandardContentDraftInput;
	snapshotId?: string;
	status?: 'draft' | 'in_review' | 'published';
}) {
	const normalizedValues = normalizeStandardContentDraftInput(input.values);
	const validation = validateStandardContentDraft(normalizedValues);
	const nextStatus = resolveEditorialDraftStatus(input.status);

	const result = await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = input.snapshotId ?
			await repository.findSnapshot(input.snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			throw new Error('Ingen snapshot finns att redigera mot.');
		}

		const item = await repository.loadStandardContentRow(input.blockId, latestSnapshot.id);

		if (!item) {
			throw new Error('Standardtexten hittades inte.');
		}

		if (Object.keys(validation.errors).length > 0) {
			return await loadStandardContentEditor(input.blockId, input.userId, latestSnapshot.id);
		}

		if (nextStatus === 'published') {
			await applyStandardContentDraftRevision({
				repository,
				blockId: input.blockId,
				snapshotId: latestSnapshot.id,
				values: normalizedValues
			});
		}

		await upsertEditorialWorkflow({
			repository,
			contentKind: 'standard_content',
			sourceRowId: item.sourceRowId,
			snapshotId: latestSnapshot.id,
			userId: input.userId,
			status: nextStatus,
			payloadJson: JSON.stringify(normalizedValues),
			validationStatus: validation.status
		});

		return await loadStandardContentEditor(input.blockId, input.userId, latestSnapshot.id);
	});

	if (Object.keys(validation.errors).length === 0 && nextStatus === 'published') {
		clearPublishedContentCaches();
	}

	return {
		...result,
		validation
	};
}

export async function saveNewsDraft(input: {
	newsId: string;
	userId: number;
	values: ContentStudioNewsDraftInput;
	snapshotId?: string;
	status?: 'draft' | 'in_review' | 'published';
}) {
	const normalizedValues = normalizeNewsDraftInput(input.values);
	const validation = validateNewsDraft(normalizedValues);
	const nextStatus = resolveEditorialDraftStatus(input.status);
	const payload = {
		...normalizedValues,
		bodyHtml: paragraphsToPublicBodyHtml(normalizedValues.bodyParagraphs)
	};

	const result = await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = input.snapshotId ?
			await repository.findSnapshot(input.snapshotId)
		:	await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			throw new Error('Ingen snapshot finns att redigera mot.');
		}

		const item = await repository.loadNewsRow(input.newsId, latestSnapshot.id);

		if (!item) {
			throw new Error('Nyheten hittades inte.');
		}

		if (Object.keys(validation.errors).length > 0) {
			return await loadNewsEditor(input.newsId, input.userId, latestSnapshot.id);
		}

		if (nextStatus === 'published') {
			await applyNewsDraftRevision({
				repository,
				newsId: input.newsId,
				snapshotId: latestSnapshot.id,
				values: normalizedValues
			});
		}

		await upsertEditorialWorkflow({
			repository,
			contentKind: 'news',
			sourceRowId: item.sourceRowId,
			snapshotId: latestSnapshot.id,
			userId: input.userId,
			status: nextStatus,
			payloadJson: JSON.stringify(payload),
			validationStatus: validation.status
		});

		return await loadNewsEditor(input.newsId, input.userId, latestSnapshot.id);
	});

	if (Object.keys(validation.errors).length === 0 && nextStatus === 'published') {
		clearPublishedContentCaches();
	}

	return {
		...result,
		validation
	};
}

function buildFactEditorDraft(
	item: ContentStudioFactRow,
	draftState: ContentStudioDraftState | null,
	payloadJson?: string | null
): ContentStudioFactEditorDraft {
	const payload = parseJsonPayload<FactDraftPayload>(payloadJson);
	const nodeIds =
		payload?.nodeIds?.map((nodeId) => nodeId.trim()).filter(Boolean) ??
		(item.nodeId ? [item.nodeId] : []);

	return {
		id: draftState?.id ?? null,
		status: draftState?.status ?? 'draft',
		updatedAt: draftState?.updatedAt ?? null,
		reviewStatus: draftState?.reviewRequest?.status ?? null,
		validationStatus: draftState?.latestRevisionValidationStatus ?? inferFactValidationStatus({
			title: payload?.title ?? item.title,
			bodyHtml: payload?.bodyHtml ?? item.bodyHtml,
			nodeIds
		}),
		title: payload?.title ?? item.title,
		bodyHtml: payload?.bodyHtml ?? item.bodyHtml,
		nodeIds
	};
}

function buildStandardContentEditorDraft(
	item: ContentStudioStandardContentRow,
	draftState: ContentStudioDraftState | null,
	payloadJson?: string | null
): ContentStudioStandardContentEditorDraft {
	const payload = parseJsonPayload<StandardContentDraftPayload>(payloadJson);
	const targets =
		payload?.targets?.map((target) => target.trim()).filter(Boolean) ?? item.targets;

	return {
		id: draftState?.id ?? null,
		status: draftState?.status ?? 'draft',
		updatedAt: draftState?.updatedAt ?? null,
		reviewStatus: draftState?.reviewRequest?.status ?? null,
		validationStatus: draftState?.latestRevisionValidationStatus ?? inferStandardContentValidationStatus({
			title: payload?.title ?? item.title,
			bodyHtml: payload?.bodyHtml ?? item.bodyHtml,
			targets
		}),
		title: payload?.title ?? item.title,
		bodyHtml: payload?.bodyHtml ?? item.bodyHtml,
		targets
	};
}

function buildNewsEditorDraft(
	item: ContentStudioNewsRow,
	draftState: ContentStudioDraftState | null,
	payloadJson?: string | null
): ContentStudioNewsEditorDraft {
	const payload = parseJsonPayload<NewsDraftPayload>(payloadJson);
	const sourceBodyHtml = payload?.bodyHtml ?? item.bodyHtml;
	const bodyParagraphs =
		payload?.bodyParagraphs?.map((paragraph) => paragraph.trim()).filter(Boolean) ??
		extractPublicParagraphs(sourceBodyHtml);
	const bodyHtml = normalizePublicBodyHtml(
		payload?.bodyHtml ?? paragraphsToPublicBodyHtml(bodyParagraphs)
	);

	return {
		id: draftState?.id ?? null,
		status: draftState?.status ?? 'draft',
		updatedAt: draftState?.updatedAt ?? null,
		reviewStatus: draftState?.reviewRequest?.status ?? null,
		validationStatus: draftState?.latestRevisionValidationStatus ?? inferNewsValidationStatus({
			title: payload?.title ?? item.title,
			publishedAt: payload?.publishedAt ?? item.publishedAt,
			excerpt: payload?.excerpt ?? item.excerpt,
			bodyParagraphs,
			legacyUrl: payload?.legacyUrl ?? item.legacyUrl
		}),
		title: payload?.title ?? item.title,
		publishedAt: payload?.publishedAt ?? item.publishedAt,
		excerpt: payload?.excerpt ?? item.excerpt,
		bodyParagraphs,
		bodyHtml,
		legacyUrl: payload?.legacyUrl ?? item.legacyUrl
	};
}

function parseJsonPayload<T>(payloadJson?: string | null) {
	if (!payloadJson) {
		return null;
	}

	try {
		return JSON.parse(payloadJson) as T;
	} catch {
		return null;
	}
}

function normalizeFactDraftInput(values: ContentStudioFactDraftInput): ContentStudioFactDraftInput {
	return {
		title: values.title.trim(),
		bodyHtml: values.bodyHtml.trim(),
		nodeIds: dedupeStrings(values.nodeIds)
	};
}

function normalizeChecklistGroupDraftInput(values: ChecklistGroupDraftInput): ChecklistGroupDraftInput {
	return {
		title: values.title.trim(),
		introText: normalizeSingleParagraphText(values.introText)
	};
}

function normalizeChecklistQuestionDraftInput(
	values: ChecklistQuestionDraftInput
): ChecklistQuestionDraftInput {
	return {
		questionText: values.questionText.trim(),
		flags: { ...values.flags }
	};
}

function normalizeStandardContentDraftInput(
	values: ContentStudioStandardContentDraftInput
): ContentStudioStandardContentDraftInput {
	return {
		title: values.title.trim(),
		bodyHtml: values.bodyHtml.trim(),
		targets: dedupeStrings(values.targets)
	};
}

function normalizeNewsDraftInput(values: ContentStudioNewsDraftInput): ContentStudioNewsDraftInput {
	return {
		title: values.title.trim(),
		publishedAt: values.publishedAt.trim(),
		excerpt: values.excerpt.trim(),
		bodyParagraphs: values.bodyParagraphs.map((paragraph) => paragraph.trim()).filter(Boolean),
		legacyUrl: values.legacyUrl.trim()
	};
}

function validateFactDraft(values: ContentStudioFactDraftInput): DraftValidation {
	const errors: Record<string, string> = {};

	if (!values.title) {
		errors.title = 'Ange en titel.';
	}

	if (!values.bodyHtml) {
		errors.bodyHtml = 'Ange innehåll.';
	}

	const status =
		Object.keys(errors).length > 0 ? 'invalid'
		: values.nodeIds.length === 0 ? 'warning'
		: 'valid';

	return { status, errors };
}

function validateStandardContentDraft(values: ContentStudioStandardContentDraftInput): DraftValidation {
	const errors: Record<string, string> = {};

	if (!values.title) {
		errors.title = 'Ange en titel.';
	}

	if (!values.bodyHtml) {
		errors.bodyHtml = 'Ange innehåll.';
	}

	const status =
		Object.keys(errors).length > 0 ? 'invalid'
		: values.targets.length === 0 ? 'warning'
		: 'valid';

	return { status, errors };
}

function validateNewsDraft(values: ContentStudioNewsDraftInput): DraftValidation {
	const errors: Record<string, string> = {};

	if (!values.title) {
		errors.title = 'Ange en titel.';
	}

	if (!values.publishedAt) {
		errors.publishedAt = 'Ange publiceringsdatum.';
	}

	if (!values.excerpt) {
		errors.excerpt = 'Ange en ingress.';
	}

	if (values.bodyParagraphs.length === 0) {
		errors.bodyParagraphs = 'Ange minst ett stycke i brödtexten.';
	}

	if (!values.legacyUrl) {
		errors.legacyUrl = 'Ange källänken från legacy-sajten.';
	}

	const status = Object.keys(errors).length > 0 ? 'invalid' : 'valid';
	return { status, errors };
}

function inferFactValidationStatus(values: ContentStudioFactDraftInput) {
	return validateFactDraft(values).status;
}

function inferStandardContentValidationStatus(values: ContentStudioStandardContentDraftInput) {
	return validateStandardContentDraft(values).status;
}

function inferNewsValidationStatus(values: ContentStudioNewsDraftInput) {
	return validateNewsDraft(values).status;
}

async function buildFactLinkOptions(
	repository: ReturnType<typeof createContentStudioRepository>,
	snapshotId: string,
	selectedNodeIds: string[]
) {
	const checklistRows = await repository.listChecklistRows(snapshotId);
	const selectedNodeIdSet = new Set(selectedNodeIds);
	const options: Array<{
		id: string;
		linkNodeId: string;
		legacyNodeId: string;
		checklistId: string;
		checklistTitle: string;
		groupId: string;
		groupTitle: string;
		questionId: string;
		questionText: string;
		selected: boolean;
	}> = [];
	const seenOptionIds = new Set<string>();

	for (const checklistRow of checklistRows) {
		const tree = await repository.loadChecklistTree(checklistRow.id, snapshotId);
		if (!tree) {
			continue;
		}

		for (const group of tree.groups) {
			for (const question of group.questions) {
				const linkNodeId = normalizeLegacyLinkNodeId(question.nodeId);
				if (!linkNodeId) {
					continue;
				}

				const optionId = `${tree.checklist.checklistId}:${question.id}:${linkNodeId}`;
				if (seenOptionIds.has(optionId)) {
					continue;
				}
				seenOptionIds.add(optionId);

				options.push({
					id: optionId,
					linkNodeId,
					legacyNodeId: question.nodeId,
					checklistId: tree.checklist.checklistId,
					checklistTitle: tree.checklist.title,
					groupId: group.id,
					groupTitle: group.title,
					questionId: question.id,
					questionText: question.questionText,
					selected: selectedNodeIdSet.has(linkNodeId)
				});
			}
		}
	}

	return options.sort((left, right) =>
		left.checklistTitle.localeCompare(right.checklistTitle, 'sv') ||
		left.groupTitle.localeCompare(right.groupTitle, 'sv') ||
		left.questionText.localeCompare(right.questionText, 'sv')
	);
}

function normalizeLegacyLinkNodeId(nodeId: string) {
	return (nodeId ?? '').replace(/^node-id-/, '').replace(/-\d{4}-\d{2}-\d{2}.*$/, '').trim();
}

function findChecklistQuestionById(tree: ContentStudioChecklistTree, questionId: string) {
	for (const group of tree.groups) {
		const question = group.questions.find((item) => item.id === questionId);
		if (question) {
			return { group, question };
		}
	}

	return null;
}

function findChecklistNodeById(tree: ContentStudioChecklistTree, nodeId: string) {
	for (const group of tree.groups) {
		if (group.id === nodeId) {
			return {
				kind: 'group' as const,
				id: group.id,
				nodeId: group.nodeId,
				title: group.title,
				summaryText: group.introText,
				groupId: null,
				groupTitle: null,
				factLinks: group.factLinks
			};
		}

		const question = group.questions.find((item) => item.id === nodeId);
		if (question) {
			return {
				kind: 'question' as const,
				id: question.id,
				nodeId: question.nodeId,
				title: group.title,
				summaryText: question.questionText,
				groupId: group.id,
				groupTitle: group.title,
				factLinks: question.factLinks
			};
		}
	}

	return null;
}

function assertProfileRuleMutationResult(
	result: { status: 'ok' | 'missing-target' | 'missing-profile' },
	missingTargetMessage: string
) {
	if (result.status === 'missing-profile') {
		throw new Error('Profilen hittades inte.');
	}

	if (result.status === 'missing-target') {
		throw new Error(missingTargetMessage);
	}
}

function buildFactExcerpt(bodyHtml: string) {
	const text = extractPublicParagraphs(bodyHtml).join(' ').replace(/\s+/g, ' ').trim();
	return text.slice(0, 180);
}

function dedupeFactLinksByRowId<
	T extends {
		factRowId: string;
	}
>(links: T[]) {
	const seen = new Set<string>();
	return links.filter((link) => {
		if (seen.has(link.factRowId)) {
			return false;
		}

		seen.add(link.factRowId);
		return true;
	});
}

function buildFactWorkspaceLogicalKey(input: {
	factRowId: string;
	factId: string | null;
	title: string;
	nodeId: string | null;
}) {
	return input.factId?.trim() || input.factRowId;
}

function buildFactWorkspaceLogicalKeyFromRowId(
	factRowId: string | null | undefined,
	factRows: Array<{ sourceRowId: string; factId: string | null }>
) {
	if (!factRowId) {
		return null;
	}

	const factRow = factRows.find((row) => row.sourceRowId === factRowId);
	return factRow?.factId?.trim() || factRowId;
}

function mergeFactWorkspaceSummaries<
	T extends {
		factRowId: string;
		factId: string | null;
		title: string;
		nodeId: string | null;
		excerpt: string;
		usageCount: number | string;
	}
>(items: T[]) {
	const merged = new Map<string, T & { usageCount: number; isLinked?: boolean }>();

	for (const item of items) {
		const key = buildFactWorkspaceLogicalKey(item);
		const usageCount = Number(item.usageCount) || 0;
		const existing = merged.get(key);

		if (!existing) {
			merged.set(key, {
				...item,
				usageCount
			});
			continue;
		}

		const preferredItem = usageCount > existing.usageCount ? item : existing;

		merged.set(key, {
			...preferredItem,
			usageCount: Math.max(existing.usageCount, usageCount),
			isLinked: Boolean(existing.isLinked || (item as { isLinked?: boolean }).isLinked)
		});
	}

	return Array.from(merged.values());
}

function buildChecklistDraftNodeId(kind: 'group' | 'question') {
	return `draft-${kind}-${randomUUID().slice(0, 8)}`;
}

function dedupeStrings(values: string[]) {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const value of values.map((entry) => entry.trim()).filter(Boolean)) {
		if (!seen.has(value)) {
			seen.add(value);
			result.push(value);
		}
	}

	return result;
}

function normalizeSingleParagraphText(value: string) {
	return value.replace(/\s+/g, ' ').trim();
}

async function buildChecklistDiscoveryRows(
	repository: ReturnType<typeof createContentStudioRepository>,
	snapshotId: string
): Promise<ContentStudioChecklistDiscoveryRow[]> {
	const checklistRows = await repository.listChecklistRows(snapshotId);
	const trees = (
		await Promise.all(checklistRows.map((row) => repository.loadChecklistTree(row.id, snapshotId)))
	).filter((tree): tree is ContentStudioChecklistTree => Boolean(tree));
	const missingFactLinkCounts = new Map<string, number>();
	const nodeRegistry = new Map<string, string[]>();
	const emptyQuestionTextCounts = new Map<string, number>();
	const unresolvedFactNodeIdCounts = new Map<string, number>();

	for (const tree of trees) {
		const checklistKey = resolveChecklistKey(tree.checklist.checklistId, tree.checklist.id, tree.checklist.sourceRowId);
		missingFactLinkCounts.set(checklistKey, countMissingFactLinks(tree));
		emptyQuestionTextCounts.set(checklistKey, countEmptyQuestionTexts(tree));
		unresolvedFactNodeIdCounts.set(checklistKey, countUnresolvedFactNodeIds(tree));

		for (const group of tree.groups) {
			registerChecklistNodeId(nodeRegistry, group.nodeId, checklistKey);

			for (const question of group.questions) {
				registerChecklistNodeId(nodeRegistry, question.nodeId, checklistKey);
			}
		}
	}

	const duplicateNodeIdCounts = buildChecklistDuplicateNodeIdCounts(nodeRegistry);

	return checklistRows.map((row) => {
		const checklistKey = resolveChecklistKey(row.checklistId, row.id, row.sourceRowId);
		const duplicateNodeIdCount = duplicateNodeIdCounts.get(checklistKey) ?? 0;
		const missingFactLinkCount = missingFactLinkCounts.get(checklistKey) ?? 0;
		const emptyQuestionTextCount = emptyQuestionTextCounts.get(checklistKey) ?? 0;
		const unresolvedFactNodeIdCount = unresolvedFactNodeIdCounts.get(checklistKey) ?? 0;

		return {
			...row,
			missingFactLinkCount,
			duplicateNodeIdCount,
			emptyQuestionTextCount,
			unresolvedFactNodeIdCount,
			readiness: classifyChecklistReadiness({
				duplicateNodeIdCount,
				emptyQuestionTextCount,
				unresolvedFactNodeIdCount,
				missingFactLinkCount
			})
		};
	});
}

async function buildChecklistValidation(
	repository: ReturnType<typeof createContentStudioRepository>,
	snapshotId: string,
	targetChecklistId?: string
): Promise<ContentStudioChecklistValidation> {
	const checklistRows = await repository.listChecklistRows(snapshotId);
	const targetRows =
		targetChecklistId ?
			checklistRows.filter(
				(row) =>
					row.id === targetChecklistId ||
					row.checklistId === targetChecklistId ||
					row.sourceRowId === targetChecklistId
			)
		:	checklistRows;
	const trees = (
		await Promise.all(targetRows.map((row) => repository.loadChecklistTree(row.id, snapshotId)))
	).filter((tree): tree is ContentStudioChecklistTree => Boolean(tree));
	const standardContentRows = await repository.listStandardContentRows({ snapshotId });
	const nodeRegistry = new Map<
		string,
		Array<{ checklistId: string; kind: 'group' | 'question'; title: string }>
	>();
	const missingFactLinks: ContentStudioChecklistValidation['missingFactLinks'] = [];
	const unresolvedFactNodeIds: ContentStudioChecklistValidation['unresolvedFactNodeIds'] = [];
	const emptyQuestionTexts: ContentStudioChecklistValidation['emptyQuestionTexts'] = [];

	for (const tree of trees) {
		for (const group of tree.groups) {
			registerNodeId(nodeRegistry, group.nodeId, {
				checklistId: tree.checklist.checklistId,
				kind: 'group',
				title: group.title
			});

			for (const question of group.questions) {
				registerNodeId(nodeRegistry, question.nodeId, {
					checklistId: tree.checklist.checklistId,
					kind: 'question',
					title: question.questionText
				});

				if (!question.questionText.trim()) {
					emptyQuestionTexts.push({
						checklistId: tree.checklist.checklistId,
						groupTitle: group.title,
						questionId: question.id,
						nodeId: question.nodeId
					});
				}

				if (question.factLinks.length === 0) {
					missingFactLinks.push({
						checklistId: tree.checklist.checklistId,
						groupTitle: group.title,
						questionId: question.id,
						nodeId: question.nodeId,
						questionText: question.questionText
					});
				}

				const unresolvedLinks = question.factLinks.filter((link) => link.linkStatus !== 'linked');
				if (unresolvedLinks.length > 0) {
					unresolvedFactNodeIds.push({
						checklistId: tree.checklist.checklistId,
						questionId: question.id,
						nodeId: question.nodeId,
						questionText: question.questionText,
						linkStatuses: unresolvedLinks.map((link) => link.linkStatus)
					});
				}
			}
		}
	}

	const duplicateNodeIds = Array.from(nodeRegistry.entries())
		.filter(([, rows]) => rows.length > 1)
		.map(([nodeId, rows]) => ({
			nodeId,
			occurrences: rows.length,
			rows
		}))
		.sort((left, right) => left.nodeId.localeCompare(right.nodeId));

	const missingStandardTargets = standardContentRows
		.filter((row) => row.targetCount === 0)
		.map((row) => ({
			blockId: row.id,
			contentType: row.contentType,
			title: row.title
		}));
	const readiness = classifyChecklistReadiness({
		duplicateNodeIdCount: duplicateNodeIds.length,
		emptyQuestionTextCount: emptyQuestionTexts.length,
		unresolvedFactNodeIdCount: unresolvedFactNodeIds.length,
		missingFactLinkCount: missingFactLinks.length
	});

	return {
		duplicateNodeIds,
		missingFactLinks,
		unresolvedFactNodeIds,
		emptyQuestionTexts,
		missingStandardTargets,
		readiness
	};
}

function registerNodeId(
	registry: Map<string, Array<{ checklistId: string; kind: 'group' | 'question'; title: string }>>,
	nodeId: string,
	entry: { checklistId: string; kind: 'group' | 'question'; title: string }
) {
	const normalizedNodeId = nodeId.trim();
	if (!normalizedNodeId) {
		return;
	}

	const rows = registry.get(normalizedNodeId) ?? [];
	rows.push(entry);
	registry.set(normalizedNodeId, rows);
}

function emptyChecklistValidation(): ContentStudioChecklistValidation {
	return {
		duplicateNodeIds: [],
		missingFactLinks: [],
		unresolvedFactNodeIds: [],
		emptyQuestionTexts: [],
		missingStandardTargets: [],
		readiness: {
			state: 'ready',
			blockerCount: 0,
			warningCount: 0
		}
	};
}

function countMissingFactLinks(tree: ContentStudioChecklistTree) {
	return tree.groups.reduce(
		(count, group) => count + group.questions.filter((question) => question.factLinks.length === 0).length,
		0
	);
}

function countEmptyQuestionTexts(tree: ContentStudioChecklistTree) {
	return tree.groups.reduce(
		(count, group) =>
			count + group.questions.filter((question) => !question.questionText.trim()).length,
		0
	);
}

function countUnresolvedFactNodeIds(tree: ContentStudioChecklistTree) {
	return tree.groups.reduce(
		(count, group) =>
			count +
			group.questions.filter((question) => question.factLinks.some((link) => link.linkStatus !== 'linked'))
				.length,
		0
	);
}

function buildChecklistDuplicateNodeIdCounts(nodeRegistry: Map<string, string[]>) {
	const counts = new Map<string, number>();

	for (const checklistIds of nodeRegistry.values()) {
		if (checklistIds.length < 2) {
			continue;
		}

		for (const checklistId of new Set(checklistIds)) {
			counts.set(checklistId, (counts.get(checklistId) ?? 0) + 1);
		}
	}

	return counts;
}

function registerChecklistNodeId(registry: Map<string, string[]>, nodeId: string, checklistId: string) {
	const normalizedNodeId = nodeId.trim();
	if (!normalizedNodeId) {
		return;
	}

	const checklistIds = registry.get(normalizedNodeId) ?? [];
	checklistIds.push(checklistId);
	registry.set(normalizedNodeId, checklistIds);
}

function resolveChecklistKey(checklistId: string, id: string, sourceRowId: string) {
	return checklistId.trim() || id.trim() || sourceRowId.trim();
}

function classifyChecklistReadiness(input: {
	duplicateNodeIdCount: number;
	emptyQuestionTextCount: number;
	unresolvedFactNodeIdCount: number;
	missingFactLinkCount: number;
}): ContentStudioChecklistReadiness {
	const blockerCount =
		input.duplicateNodeIdCount + input.emptyQuestionTextCount + input.unresolvedFactNodeIdCount;
	const warningCount = input.missingFactLinkCount;

	return {
		state:
			blockerCount > 0 ? 'blocking'
			: warningCount > 0 ? 'warning'
			: 'ready',
		blockerCount,
		warningCount
	};
}

function resolvePublishDecision(
	validationStatus: string | null | undefined,
	linkedChecklistStates: Array<{
		checklistId: string;
		title: string;
		readiness: ContentStudioChecklistReadiness;
	}> = []
): ContentStudioPublishDecision {
	void linkedChecklistStates;

	if (validationStatus === 'valid') {
		return {
			state: 'ready',
			reason: 'Utkastet är redo att publiceras.'
		};
	}

	if (validationStatus === 'warning') {
		return {
			state: 'warning',
			reason: 'Utkastet kan publiceras, men har kvar varningar att följa upp.'
		};
	}

	return {
		state: 'blocked',
		reason: 'Utkast med invalid eller okänd validering kan inte godkännas.'
	};
}

async function buildLinkedChecklistStatesForQueueItem(
	repository: ReturnType<typeof createContentStudioRepository>,
	item: ContentStudioPublishingQueueItem
) {
	if (item.contentKind !== 'fact') {
		return [];
	}

	const factRow = await repository.loadFactRow(item.sourceRowId, item.snapshotId);
	if (!factRow) {
		return [];
	}

	const latestRevision = await repository.loadLatestDraftRevision(item.draftId);
	const payload = parseJsonPayload<FactDraftPayload>(latestRevision?.payloadJson);
	const nodeIds =
		payload?.nodeIds?.map((nodeId) => nodeId.trim()).filter(Boolean) ??
		(factRow.nodeId ? [factRow.nodeId] : []);

	if (nodeIds.length === 0) {
		return [];
	}

	const linkOptions = await buildFactLinkOptions(repository, item.snapshotId, nodeIds);
	const linkedChecklists = new Map<
		string,
		{
			checklistId: string;
			title: string;
			readiness: ContentStudioChecklistReadiness;
		}
	>();

	for (const option of linkOptions.filter((option) => option.selected)) {
		if (linkedChecklists.has(option.checklistId)) {
			continue;
		}

		const validation = await buildChecklistValidation(repository, item.snapshotId, option.checklistId);
		linkedChecklists.set(option.checklistId, {
			checklistId: option.checklistId,
			title: option.checklistTitle,
			readiness: validation.readiness
		});
	}

	return Array.from(linkedChecklists.values()).sort((left, right) =>
		left.title.localeCompare(right.title, 'sv')
	);
}
