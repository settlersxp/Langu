<script lang="ts">
  import AudioControls from './AudioControls.svelte';
  
  interface Message {
    id: number;
    conversationId: number;
    role: 'user' | 'assistant';
    content: string;
    confidenceLevel?: number;
    translation?: string;
    audioPath?: string;
    audioUuid?: string;
    createdAt: string;
  }

  interface Props {
    messages: Message[];
    isLoading?: boolean;
  }

  let { messages, isLoading = false }: Props = $props();
  
  // State for managing translations
  let translationStates = $state<{[messageId: number]: {isTranslating: boolean, showTranslation: boolean}}>({});
  
  // State for managing audio playback
  let audioStates = $state<{[messageId: number]: {isGenerating: boolean, isPlaying: boolean, isPaused: boolean, hasAudio: boolean}}>({});
  let currentAudio: HTMLAudioElement | null = null;
  let currentMessageId: number | null = null;
  
  async function toggleTranslation(message: Message) {
    if (!translationStates[message.id]) {
      translationStates[message.id] = { isTranslating: false, showTranslation: false };
    }
    
    const state = translationStates[message.id];
    
    // If translation is already shown, just hide it
    if (state.showTranslation) {
      state.showTranslation = false;
      return;
    }
    
    // If no translation exists, fetch it
    if (!message.translation) {
      state.isTranslating = true;
      
      try {
        const response = await fetch(`/api/messages/${message.id}/translate`, {
          method: 'POST'
        });
        
        if (response.ok) {
          const result = await response.json();
          // Update the message object with the translation
          message.translation = result.translation;
          state.showTranslation = true;
        } else {
          console.error('Failed to translate message');
        }
      } catch (error) {
        console.error('Error translating message:', error);
      } finally {
        state.isTranslating = false;
      }
    } else {
      // Translation exists, just show it
      state.showTranslation = true;
    }
  }
  
  async function playMessageAudio(message: Message) {
    if (!audioStates[message.id]) {
      audioStates[message.id] = { isGenerating: false, isPlaying: false, isPaused: false, hasAudio: false };
    }
    
    const state = audioStates[message.id];
    
    // Stop any currently playing audio from other messages
    if (currentAudio && currentMessageId !== message.id) {
      currentAudio.pause();
      if (currentMessageId) {
        audioStates[currentMessageId].isPlaying = false;
        audioStates[currentMessageId].isPaused = false;
      }
    }
    
    try {
      state.isGenerating = true;
      
      // Generate or get audio
      const response = await fetch(`/api/messages/${message.id}/tts`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update message with audio info
        message.audioPath = result.audioPath;
        message.audioUuid = result.audioUuid;
        
        // Create and play audio
        const audio = new Audio(result.audioPath);
        currentAudio = audio;
        currentMessageId = message.id;
        state.isPlaying = true;
        state.isPaused = false;
        state.hasAudio = true;
        
        audio.onended = () => {
          state.isPlaying = false;
          state.isPaused = false;
        };
        
        audio.onerror = () => {
          state.isPlaying = false;
          state.isPaused = false;
          currentAudio = null;
          currentMessageId = null;
          console.error('Error playing audio');
        };
        
        await audio.play();
      } else {
        console.error('Failed to generate audio');
      }
    } catch (error) {
      console.error('Error playing message audio:', error);
    } finally {
      state.isGenerating = false;
    }
  }
  
  function togglePlayPause(message: Message) {
    if (!audioStates[message.id]) return;
    
    const state = audioStates[message.id];
    
    if (currentAudio && currentMessageId === message.id) {
      if (state.isPlaying) {
        currentAudio.pause();
        state.isPlaying = false;
        state.isPaused = true;
      } else if (state.isPaused) {
        currentAudio.play();
        state.isPlaying = true;
        state.isPaused = false;
      }
    }
  }
  
  function replayAudio(message: Message) {
    if (!audioStates[message.id]) return;
    
    const state = audioStates[message.id];
    
    if (currentAudio && currentMessageId === message.id) {
      currentAudio.currentTime = 0;
      if (!state.isPlaying) {
        currentAudio.play();
        state.isPlaying = true;
        state.isPaused = false;
      }
    }
  }
</script>

<div class="messages">
  {#each messages as message (message.id)}
    <div class="message {message.role}">
      <div class="message-content">
        {message.content}
      </div>
      <!-- Message actions for all messages -->
      <div class="message-actions">
        <!-- TTS button for all messages -->
        {#if audioStates[message.id]?.hasAudio && (audioStates[message.id]?.isPlaying || audioStates[message.id]?.isPaused)}
          <!-- Show audio controls when audio is loaded and playing/paused -->
          <AudioControls 
            isPlaying={audioStates[message.id]?.isPlaying || false}
            onPlayPause={() => togglePlayPause(message)}
            onReplay={() => replayAudio(message)}
          />
        {:else}
          <!-- Show single TTS button when no audio or not playing -->
          <button 
            class="action-btn tts-btn"
            onclick={() => playMessageAudio(message)}
            disabled={audioStates[message.id]?.isGenerating}
            title="Play audio"
          >
            {#if audioStates[message.id]?.isGenerating}
              🔄
            {:else}
              🔊
            {/if}
          </button>
        {/if}
        
        <!-- Confidence and translate for assistant messages only -->
        {#if message.role === 'assistant' && message.confidenceLevel !== undefined && message.confidenceLevel !== null}
          <div class="confidence-level">
            <span class="confidence-label">Confidence:</span>
            <span class="confidence-value" class:low={message.confidenceLevel < 70} class:medium={message.confidenceLevel >= 70 && message.confidenceLevel < 85} class:high={message.confidenceLevel >= 85}>
              {message.confidenceLevel.toFixed(1)}%
            </span>
          </div>
          <button 
            class="action-btn translate-btn"
            onclick={() => toggleTranslation(message)}
            disabled={translationStates[message.id]?.isTranslating}
          >
            {#if translationStates[message.id]?.isTranslating}
              Translating...
            {:else if translationStates[message.id]?.showTranslation}
              Hide
            {:else}
              Translate
            {/if}
          </button>
        {/if}
      </div>
      
      {#if translationStates[message.id]?.showTranslation && message.translation}
        <div class="translation">
          <span class="translation-label">Translation:</span>
          <span class="translation-text">{message.translation}</span>
        </div>
      {/if}
    </div>
  {/each}
  
  {#if isLoading}
    <div class="message assistant loading">
      <div class="loading-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  {/if}
</div>

<style>
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .message {
    max-width: 80%;
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 0.5rem;
  }

  .message.user {
    background-color: #007bff;
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
  }

  .message.assistant {
    background-color: #f1f3f5;
    color: #212529;
    align-self: flex-start;
    border-bottom-left-radius: 4px;
  }

  .message-content {
    white-space: pre-wrap;
  }

  .message-actions {
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8rem;
    opacity: 0.8;
  }

  .confidence-level {
    display: flex;
    align-items: center;
  }

  .confidence-label {
    color: #6c757d;
    margin-right: 0.25rem;
  }

  .confidence-value {
    font-weight: 500;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .confidence-value.high {
    background-color: #d4edda;
    color: #155724;
  }

  .confidence-value.medium {
    background-color: #fff3cd;
    color: #856404;
  }

  .confidence-value.low {
    background-color: #f8d7da;
    color: #721c24;
  }

  .action-btn {
    background: none;
    border: 1px solid #dee2e6;
    color: #6c757d;
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 1.75rem;
  }

  .action-btn:hover:not(:disabled) {
    background-color: #f8f9fa;
    border-color: #adb5bd;
    color: #495057;
  }

  .action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .tts-btn {
    font-size: 0.9rem;
  }

  .tts-btn:hover:not(:disabled) {
    background-color: #e8f4f8;
    border-color: #17a2b8;
    color: #17a2b8;
  }

  .translation {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: #e9ecef;
    border-radius: 6px;
    font-size: 0.85rem;
    border-left: 3px solid #6c757d;
  }

  .translation-label {
    color: #6c757d;
    font-weight: 500;
    margin-right: 0.5rem;
  }

  .translation-text {
    color: #495057;
    font-style: italic;
  }

  .loading-indicator {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    justify-content: center;
    height: 2rem;
  }

  .loading-indicator span {
    width: 8px;
    height: 8px;
    background-color: #adb5bd;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .loading-indicator span:nth-child(1) {
    animation-delay: -0.32s;
  }

  .loading-indicator span:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes bounce {
    0%, 80%, 100% { 
      transform: scale(0);
    } 40% { 
      transform: scale(1);
    }
  }
</style>