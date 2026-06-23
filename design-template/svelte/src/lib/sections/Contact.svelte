<script>
  import Icon from '../primitives/Icon.svelte';
  let {
    eyebrow = 'Material',
    heading = 'Ladda ned Miljöhusesyn som PDF.',
    body = 'Hela materialet finns att ladda ned, skriva ut och ta med i fält. Perfekt för dig som vill gå igenom kraven på egen hand.',
    downloadLabel = 'Ladda ned PDF',
    downloadHref = '#',
    contactLabel = 'Kontakta oss',
    contactHref = '#',
    cards = [
      { icon: 'leaf', label: 'Grundvillkor' },
      { icon: 'tractor', label: 'Djurhållning' },
      { icon: 'sprout', label: 'Växtodling' },
      { icon: 'file-text', label: 'Material' }
    ]
  } = $props();
</script>

<section id="kontakt" class="mx-auto max-w-7xl px-6 py-24">
  <div
    class="grid gap-10 overflow-hidden rounded-3xl border border-line bg-cream p-10 md:grid-cols-2 md:p-14"
  >
    <div>
      <span class="text-xs font-medium tracking-widest text-leaf uppercase">{eyebrow}</span>
      <h2 class="font-display mt-3 text-4xl leading-tight font-semibold tracking-tight text-bark">
        {heading}
      </h2>
      <p class="mt-4 text-ink/75">{body}</p>
      <div class="mt-7 flex flex-wrap gap-3">
        <a
          href={downloadHref}
          class="inline-flex items-center gap-2 rounded-full bg-leaf px-6 py-3.5 text-sm font-medium text-cream transition hover:bg-leaf-2"
        >
          <Icon name="download" class="lucide lucide-download h-4 w-4" />{downloadLabel}
        </a>
        <a
          href={contactHref}
          class="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3.5 text-sm font-medium text-ink transition hover:border-leaf hover:text-leaf"
        >
          <Icon name="mail" class="lucide lucide-mail h-4 w-4" />{contactLabel}
        </a>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      {#each cards as card}
        <div class="flex flex-col justify-between rounded-2xl border border-line bg-cream-2/60 p-5">
          <Icon name={card.icon} class={`lucide lucide-${card.icon} h-6 w-6 text-leaf`} />
          <span class="font-display mt-10 text-lg font-semibold text-bark">{card.label}</span>
        </div>
      {/each}
    </div>
  </div>
</section>
