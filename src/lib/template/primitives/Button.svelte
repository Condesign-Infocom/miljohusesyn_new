<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Snippet } from 'svelte';
  import type { TemplateButtonVariant } from '../types';

  let {
    label,
    href = undefined,
    variant = 'primary',
    class: cls = '',
    icon = undefined,
    ...rest
  }: {
    label: string;
    href?: string;
    variant?: TemplateButtonVariant;
    class?: string;
    icon?: Snippet;
  } = $props();

  const base =
    'inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium transition';
  const variants: Record<TemplateButtonVariant, string> = {
    primary: 'bg-leaf text-cream shadow-md shadow-leaf/20 hover:bg-leaf-2',
    secondary: 'border border-leaf/30 bg-cream/70 text-leaf-2 hover:border-leaf'
  };
  const klass = $derived(`${base} ${variants[variant] ?? variants.primary} ${cls}`);
  const resolvedHref = $derived(
    href && href.startsWith('/') ? (resolve as unknown as (pathname: string) => string)(href) : href
  );
</script>

{#if href}
  <a href={resolvedHref} class={klass} {...rest}>{label}{@render icon?.()}</a>
{:else}
  <button class={klass} {...rest}>{label}{@render icon?.()}</button>
{/if}
