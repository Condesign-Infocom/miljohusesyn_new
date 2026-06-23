<script lang="ts">
  import type { Snippet } from 'svelte';

  let { class: cls = '', children }: { class?: string; children?: Snippet } = $props();
</script>

<div class={`rounded-3xl border border-line bg-cream/95 p-6 shadow-xl shadow-leaf/5 ${cls}`}>
  {@render children?.()}
</div>
