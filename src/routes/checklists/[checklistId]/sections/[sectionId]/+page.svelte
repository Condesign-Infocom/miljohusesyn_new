<svelte:head>
	<title>{data.section.title}</title>
</svelte:head>

<script lang="ts">
	import ChecklistSectionView from '$lib/components/ChecklistSectionView.svelte';
	import type { ChecklistSectionDetail } from '$lib/types/checklists';

	let { data }: { data: ChecklistSectionDetail } = $props();
</script>

{#key data.section.nodeId}
	<ChecklistSectionView {data} />
{/key}
