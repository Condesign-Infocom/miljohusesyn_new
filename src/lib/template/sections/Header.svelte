<script lang="ts">
  import Icon from '../primitives/Icon.svelte';
  import NavLink from '../primitives/NavLink.svelte';
  import type { TemplateLink } from '../types';

  let {
    brand = 'Miljöhusesyn',
    loginHref = '/login',
    links = [
      { href: '#hem', label: 'Hem' },
      { href: '#viktigt', label: 'Viktigt för alla' },
      { href: '#nyheter', label: 'Regeländringar' },
      { href: '#faktabank', label: 'Faktabank' },
      { href: '#berakningar', label: 'Beräkningar' },
      { href: '#kontakt', label: 'Kontakt' }
    ]
  }: {
    brand?: string;
    loginHref?: string;
    links?: TemplateLink[];
  } = $props();
  let open = $state(false);
</script>

<header class="sticky top-0 z-40 border-b border-line/70 bg-cream/85 backdrop-blur">
  <div class="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
    <a href="#hem" class="flex items-center gap-2">
      <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-leaf text-cream">
        <Icon name="wheat" class="h-5 w-5" />
      </span>
      <span class="font-display text-xl font-semibold tracking-tight text-leaf-2">{brand}</span>
    </a>
    <nav class="hidden items-center gap-7 text-sm text-ink/80 lg:flex">
      {#each links as l (l.label)}
        <NavLink href={l.href} label={l.label} />
      {/each}
    </nav>
    <div class="flex items-center gap-2">
      <button aria-label="Sök" class="hidden h-10 w-10 items-center justify-center rounded-full border border-line text-ink/70 transition hover:border-leaf hover:text-leaf md:inline-flex">
        <Icon name="search" class="h-4 w-4" />
      </button>
      <a href={loginHref} class="hidden items-center gap-2 rounded-full bg-leaf px-4 py-2.5 text-sm font-medium text-cream shadow-sm transition hover:bg-leaf-2 md:inline-flex">
        <Icon name="log-in" class="h-4 w-4" />Logga in
      </a>
      <button onclick={() => (open = !open)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Meny" class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink/70 lg:hidden">
        <Icon name="menu" class="h-5 w-5" />
      </button>
    </div>
  </div>
  <nav id="mobile-nav" hidden={!open} class="border-t border-line/70 lg:hidden">
    <div class="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4 text-sm text-ink/80">
      {#each links as l (l.label)}
        <NavLink href={l.href} label={l.label} class="py-2 transition hover:text-leaf" />
      {/each}
    </div>
  </nav>
</header>
