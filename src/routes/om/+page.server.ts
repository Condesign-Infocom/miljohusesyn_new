import { getPublishedPublicStandardContentByTitle } from '$lib/server/services/public-standard-content';

export const load = async () => ({
	importedContent: await getPublishedPublicStandardContentByTitle('Om Miljöhusesyn')
});
