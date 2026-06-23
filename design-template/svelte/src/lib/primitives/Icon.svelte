<script>
  import {
    ArrowRight, ArrowUpRight, BookOpen, Calculator, Download, FileText,
    Leaf, LogIn, Mail, Menu, Search, Sprout, Tractor, Wheat
  } from 'lucide-svelte';

  /** @type {Record<string, any>} */
  const REGISTRY = {
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

  let { name, size = 24, class: cls = '' } = $props();
  const Cmp = $derived(REGISTRY[name]);
</script>

{#if Cmp}
  <Cmp {size} class={cls} aria-hidden="true" />
{:else}
  <!-- unknown icon name: {name} -->
{/if}
