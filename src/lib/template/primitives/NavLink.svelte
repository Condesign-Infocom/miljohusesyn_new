<script lang="ts">
  let {
    href,
    label,
    class: cls = 'transition hover:text-leaf'
  }: { href: string; label: string; class?: string } = $props();
</script>

<a {href} class={cls}>{label}</a>
