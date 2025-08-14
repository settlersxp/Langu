<script lang="ts">
  import HamburgerMenu from '$lib/components/HamburgerMenu.svelte';
  import '../app.css';
  const { children } = $props();
</script>

<HamburgerMenu />

{@render children()}
