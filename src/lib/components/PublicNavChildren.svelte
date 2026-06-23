<script lang="ts">
	import type { PublicNavChild } from '$lib/public-site';

	let { items }: { items: PublicNavChild[] } = $props();
</script>

<div class="submenu">
	{#each items as item, index (`${item.label}-${item.href ?? 'group'}-${index}`)}
		<div class="submenu-entry" class:has-children={Boolean(item.children?.length)}>
			{#if item.href}
				<a href={item.href} class:has-children-link={Boolean(item.children?.length)}>{item.label}</a>
			{:else}
				<span class:has-children-link={Boolean(item.children?.length)}>{item.label}</span>
			{/if}

			{#if item.children?.length}
				<div class="submenu-nested">
					{#each item.children as child, childIndex (`${child.label}-${child.href ?? 'group'}-${childIndex}`)}
						{#if child.href}
							<a href={child.href}>{child.label}</a>
						{:else}
							<span>{child.label}</span>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.submenu,
	.submenu-nested {
		background: #fffdf8;
		border: 1px solid #e3dcc6;
		border-radius: 22px;
		box-shadow: 0 22px 56px rgba(30, 42, 34, 0.08);
		min-width: 280px;
		padding: 8px;
		z-index: 30;
	}

	.submenu {
		display: none;
		left: 0;
		position: absolute;
		top: 100%;
	}

	.submenu-nested {
		display: none;
		left: 100%;
		position: absolute;
		top: 0;
	}

	.submenu-entry {
		position: relative;
	}

	.submenu a,
	.submenu span,
	.submenu-nested a,
	.submenu-nested span {
		color: #243027;
		display: block;
		font-family: 'Source Sans 3', Arial, sans-serif;
		font-size: 15px;
		font-weight: 600;
		padding: 12px 16px;
		text-decoration: none;
		white-space: nowrap;
	}

	.has-children-link {
		padding-right: 34px;
		position: relative;
	}

	.has-children-link::after {
		color: #5b6a5f;
		content: '\203A';
		font-size: 20px;
		line-height: 1;
		position: absolute;
		right: 14px;
		top: 50%;
		transform: translateY(-50%);
	}

	.submenu a:hover,
	.submenu span:hover,
	.submenu-nested a:hover,
	.submenu-nested span:hover {
		background: rgba(200, 214, 182, 0.22);
		border-radius: 14px;
		color: #244a2e;
	}

	.submenu-entry:hover > .submenu-nested {
		display: block;
	}
</style>
