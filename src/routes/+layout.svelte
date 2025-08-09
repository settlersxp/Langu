<script lang="ts">
  import HamburgerMenu from '$lib/components/HamburgerMenu.svelte';
  const { children } = $props();
</script>

<HamburgerMenu />

{@render children()}

<style>
  :global(html, body) { margin: 0; padding: 0; }
</style>


