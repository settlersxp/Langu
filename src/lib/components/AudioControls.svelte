<script lang="ts">
  interface Props {
    isPlaying: boolean;
    onPlayPause: () => void;
    onReplay: () => void;
  }

  let { isPlaying, onPlayPause, onReplay }: Props = $props();
</script>

<div class="audio-controls">
  <button 
    class="control-btn play-pause-btn"
    onclick={onPlayPause}
    title={isPlaying ? 'Pause' : 'Play'}
  >
    {#if isPlaying}
      ⏸️
    {:else}
      ▶️
    {/if}
  </button>
  
  <button 
    class="control-btn replay-btn"
    onclick={onReplay}
    title="Replay"
  >
    🔄
  </button>
</div>

<style>
  .audio-controls {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }

  .control-btn {
    background: none;
    border: 1px solid #dee2e6;
    color: #6c757d;
    font-size: 0.8rem;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    height: 1.5rem;
  }

  .control-btn:hover {
    background-color: #f8f9fa;
    border-color: #adb5bd;
    color: #495057;
  }

  .play-pause-btn:hover {
    background-color: #e8f4f8;
    border-color: #17a2b8;
    color: #17a2b8;
  }

  .replay-btn:hover {
    background-color: #fff3cd;
    border-color: #ffc107;
    color: #856404;
  }
</style>