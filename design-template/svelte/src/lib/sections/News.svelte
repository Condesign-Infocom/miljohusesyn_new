<script>
  import Icon from '../primitives/Icon.svelte';
  let {
    eyebrow = 'Nyheter',
    title = 'Regeländringar och uppdateringar.',
    linkLabel = 'Alla nyheter',
    linkHref = '#',
    items = [
      {
        date: '20 feb 2026',
        title: 'Årliga frågor införs i Miljöhusesyn från 2026',
        href: '#'
      },
      {
        date: '20 feb 2026',
        title: 'Miljöhusesyn är uppdaterad – redo att guida dig genom 2026',
        href: '#'
      },
      {
        date: '9 feb 2026',
        title: 'Starkt lösenordsskydd i Miljöhusesyn',
        href: '#'
      },
      {
        date: '14 jan 2026',
        title:
          'Nytt vid anmälan av miljöfarlig verksamhet – kommunens beslut måste inväntas innan start',
        href: '#'
      },
      {
        date: '7 jan 2026',
        title: 'Införande av kunskapskrav för pannoperatörer från 1 jan 2026',
        href: '#'
      }
    ]
  } = $props();
</script>

<section id="nyheter" class="bg-cream-2/40 py-24">
  <div class="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12">
    <div class="lg:col-span-4">
      <span class="text-xs font-medium tracking-widest text-leaf uppercase">{eyebrow}</span>
      <h2
        class="font-display mt-3 text-4xl leading-tight font-semibold tracking-tight text-bark md:text-5xl"
      >
        {title}
      </h2>
      <a
        href={linkHref}
        class="mt-6 inline-flex items-center gap-2 text-sm font-medium text-leaf hover:text-leaf-2"
      >
        {linkLabel}<Icon name="arrow-right" class="lucide lucide-arrow-right h-4 w-4" />
      </a>
    </div>
    <ul class="divide-y divide-line lg:col-span-8">
      {#each items as item}
        <li>
          <a
            href={item.href}
            class="group flex items-center justify-between gap-6 py-6 transition hover:text-leaf"
          >
            <div>
              <div class="text-xs font-medium tracking-widest text-mute uppercase">{item.date}</div>
              <div
                class="font-display mt-2 text-xl font-medium text-bark transition group-hover:text-leaf md:text-2xl"
              >
                {item.title}
              </div>
              {#if item.body}
                <div class="mt-2 text-sm text-mute">{item.body}</div>
              {/if}
            </div>
            <Icon
              name="arrow-up-right"
              class="lucide lucide-arrow-up-right h-5 w-5 shrink-0 text-mute transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-leaf"
            />
          </a>
        </li>
      {/each}
    </ul>
  </div>
</section>
