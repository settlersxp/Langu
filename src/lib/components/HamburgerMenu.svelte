<script lang="ts">
  // Simple responsive hamburger menu
  let isOpen = $state(false);

  function toggleMenu() {
    isOpen = !isOpen;
  }

  function closeMenu() {
    isOpen = false;
  }
</script>

<button class="hamburger floating" aria-label="Open menu" aria-expanded={isOpen} onclick={toggleMenu}>
  <span class="bar"></span>
  <span class="bar"></span>
  <span class="bar"></span>
  <span class="sr-only">Menu</span>
</button>

{#if isOpen}
  <div class="overlay" onclick={closeMenu} aria-hidden="true"></div>
{/if}

<aside class="drawer" class:open={isOpen} aria-hidden={!isOpen}>
  <div class="drawer-header">
    <span class="title">Menu</span>
    <button class="close" aria-label="Close menu" onclick={closeMenu}>×</button>
  </div>
  <ul class="links">
    <li><a href="/" onclick={closeMenu}>Home</a></li>
    <li><a href="/conversation" onclick={closeMenu}>Conversations</a></li>
    <li><a href="/decks" onclick={closeMenu}>Decks</a></li>
  </ul>
</aside>

<style>
  .hamburger {
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    width: 40px;
    height: 36px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px;
    cursor: pointer;
  }
  .hamburger.floating {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 60;
    background: #101418;
  }
  .hamburger .bar {
    display: block;
    height: 2px;
    width: 20px;
    background: #fff;
    margin: 0 auto;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0,0,0,0);
    white-space: nowrap;
    border: 0;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 49;
  }

  .drawer {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    background: #12171c;
    color: #e6eef6;
    transform: translateX(-100%);
    transition: transform 180ms ease-in-out;
    z-index: 50;
    display: flex;
    flex-direction: column;
  }
  .drawer.open {
    transform: translateX(0%);
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .drawer-header .title {
    font-weight: 600;
  }
  .drawer-header .close {
    background: transparent;
    border: none;
    color: #e6eef6;
    font-size: 1.25rem;
    cursor: pointer;
  }

  .links {
    list-style: none;
    padding: 0.5rem 0.25rem;
    margin: 0;
  }
  .links li a {
    display: block;
    padding: 0.65rem 1rem;
    border-radius: 8px;
    color: #e6eef6;
    text-decoration: none;
  }
  .links li a:hover {
    background: rgba(255,255,255,0.08);
  }

  @media (min-width: 900px) {
    .hamburger.floating { top: 12px; left: 12px; }
  }
</style>


