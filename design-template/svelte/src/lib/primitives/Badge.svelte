<script>
  let { label, icon = undefined } = $props();
</script>

<span
  class="inline-flex items-center gap-2 rounded-full border border-leaf/30 bg-cream/70 px-3 py-1 text-xs font-medium tracking-wide text-leaf-2 uppercase"
>
  {@render icon?.()}{label}
</span>
