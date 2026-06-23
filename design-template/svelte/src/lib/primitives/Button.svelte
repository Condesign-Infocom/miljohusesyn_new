<script>
  let {
    label,
    href = undefined,
    variant = 'primary',
    class: cls = '',
    icon = undefined,
    ...rest
  } = $props();

  const base =
    'inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium transition';
  /** @type {Record<string, string>} */
  const variants = {
    primary: 'bg-leaf text-cream shadow-md shadow-leaf/20 hover:bg-leaf-2',
    secondary: 'border border-leaf/30 bg-cream/70 text-leaf-2 hover:border-leaf'
  };
  const klass = `${base} ${variants[variant] ?? variants.primary} ${cls}`;
</script>

{#if href}
  <a {href} class={klass} {...rest}>{label}{@render icon?.()}</a>
{:else}
  <button class={klass} {...rest}>{label}{@render icon?.()}</button>
{/if}
