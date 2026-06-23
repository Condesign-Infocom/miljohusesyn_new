<script>
  import Icon from '../primitives/Icon.svelte';
  let {
    eyebrow = 'Om verktyget',
    title = 'Vad omfattar Miljöhusesyn?',
    heading = 'Lagstiftningen som styr ditt företag – samlad på ett ställe.',
    body = [
      'Miljöhusesyn är framtagen av LRF i samarbete med berörda myndigheter och förvaltas av Sigill Kvalitetssystem AB, helägt dotterbolag till LRF.',
      'Verktyget hjälper företag på landsbygden att hålla koll på de författningar som styr verksamheten. Huvudsyftet är att samla och göra det enklare att hitta gällande lagstiftning.'
    ],
    disclaimer = 'Sigill Kvalitetssystem AB ansvarar för innehållet i Miljöhusesyn och friskriver sig från eventuella fel. Kontakta respektive ansvarig myndighet för information och råd.',
    items = [
      { icon: 'leaf', label: 'Grundvillkor och tvärvillkor' },
      { icon: 'leaf', label: 'Djurhållning och djurskydd' },
      { icon: 'leaf', label: 'Växtodling och gödselhantering' },
      { icon: 'leaf', label: 'Energi, köldmedia och farligt avfall' },
      { icon: 'leaf', label: 'Arbetsmiljö och tillsyn' }
    ]
  } = $props();
</script>

<section id="viktigt" class="mx-auto max-w-7xl px-6 py-24">
  <div class="grid gap-12 lg:grid-cols-12">
    <div class="lg:col-span-5">
      <span class="text-xs font-medium tracking-widest text-leaf uppercase">{eyebrow}</span>
      <h2
        class="font-display mt-3 text-4xl leading-tight font-semibold tracking-tight text-bark md:text-5xl"
      >
        {heading}
      </h2>
      <h3 class="sr-only">{title}</h3>
      <ul class="mt-8 space-y-3 text-sm">
        {#each items as item}
          <li class="flex items-start gap-3">
            <span
              class="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-2 text-leaf-2"
            >
              <Icon name={item.icon} class="h-3 w-3" />
            </span>
            <span class="text-ink/85">{item.label}</span>
          </li>
        {/each}
      </ul>
    </div>
    <div class="space-y-5 text-lg text-ink/80 lg:col-span-7">
      {#each body as paragraph}
        <p>{paragraph}</p>
      {/each}
      <p class="text-sm text-mute">{disclaimer}</p>
    </div>
  </div>
</section>
