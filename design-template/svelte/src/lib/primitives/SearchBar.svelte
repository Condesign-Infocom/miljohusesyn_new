<script>
  import Icon from './Icon.svelte';
  let { placeholder = 'Sök', buttonLabel = 'Sök' } = $props();
</script>

<div
  class="flex max-w-xl items-center gap-2 rounded-full border border-line bg-cream/90 p-1.5 pl-5 shadow-sm"
>
  <Icon name="search" class="h-4 w-4 shrink-0 text-mute" />
  <input
    type="search"
    {placeholder}
    class="flex-1 bg-transparent py-2 text-sm text-ink placeholder:text-mute focus:outline-none"
  />
  <button class="rounded-full bg-leaf px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf-2">
    {buttonLabel}
  </button>
</div>
