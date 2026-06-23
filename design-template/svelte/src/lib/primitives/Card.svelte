<script>
  let { class: cls = '', children } = $props();
</script>

<div class={`rounded-3xl border border-line bg-cream/95 p-6 shadow-xl shadow-leaf/5 ${cls}`}>
  {@render children?.()}
</div>
