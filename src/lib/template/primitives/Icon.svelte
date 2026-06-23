<script lang="ts">
  import {
    ArrowRight, ArrowUpRight, BookOpen, Calculator, Download, FileText,
    Leaf, LogIn, Mail, Menu, Search, Sprout, Tractor, Wheat
  } from 'lucide-svelte';
	import type { TemplateIconName } from '../types';

  const REGISTRY: Record<TemplateIconName, typeof ArrowRight> = {
    'arrow-right': ArrowRight,
    'arrow-up-right': ArrowUpRight,
    'book-open': BookOpen,
    calculator: Calculator,
    download: Download,
    'file-text': FileText,
    leaf: Leaf,
    'log-in': LogIn,
    mail: Mail,
    menu: Menu,
    search: Search,
    sprout: Sprout,
    tractor: Tractor,
    wheat: Wheat
  };

  let { name, size = 24, class: cls = '' }: { name: TemplateIconName; size?: number; class?: string } = $props();
  const Cmp = $derived(REGISTRY[name]);
</script>

{#if Cmp}
  <Cmp {size} class={cls} aria-hidden="true" />
{:else}
  <!-- unknown icon name: {name} -->
{/if}
