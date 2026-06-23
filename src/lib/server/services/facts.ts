import type { AppDb } from '$lib/server/db/client';
import { createRuntimeGateway } from '$lib/server/db/runtime-gateway';

export async function getFactDetail(db: AppDb, nodeId: string) {
	return createRuntimeGateway(db).loadFactDetailData(normalizeNodeId(nodeId));
}

function normalizeNodeId(nodeId: string) {
	return nodeId.replace(/^node-id-/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '');
}
