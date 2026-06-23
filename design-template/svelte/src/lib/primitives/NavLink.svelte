<script>
  let { href, label, class: cls = 'transition hover:text-leaf' } = $props();
</script>

<a {href} class={cls}>{label}</a>
