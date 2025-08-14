<script lang="ts">
  import { onMount } from 'svelte';
  import MessageList from '$lib/components/MessageList.svelte';
  import MicrophoneButton from '$lib/components/MicrophoneButton.svelte';
  import { listDictionaries, ensureEmbeddingsLoaded } from '$lib/services/smartWordSelector';
  import ConversationTools from '$lib/components/ConversationTools.svelte';
  
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
  
  interface Conversation {
    id: number;
    title: string;
    systemPrompt: string;
    wordsFile?: string;
    createdAt: string;
    updatedAt: string;
    messages: Message[];
  }
  
  let conversations = $state<Conversation[]>([]);
  let currentConversation = $state<Conversation | null>(null);
  let messages = $state<Message[]>([]);
  let newMessage = $state('');
  let newConversationTitle = $state('');
  let newConversationInitialMessage = $state('Hallo! Ich bin Gabi!');
  let isCreatingConversation = $state(false);
  let newConversationWordsFile = $state('B1.txt');
  let availableDictionaries = $state<string[]>([]);
  let embeddingsReady = $state(false);
  let embeddingsLoading = $state(false);
  let isLoading = $state(false);
  
  onMount(async () => {
    await loadConversations();
    const dicts = await listDictionaries();
    availableDictionaries = dicts.map(d => d.filename);
  });
  
  async function loadConversations() {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        conversations = await response.json();
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }
  
  async function loadConversation(id: number) {
    try {
      isLoading = true;
      const response = await fetch(`/api/conversations/${id}`);
      if (response.ok) {
        currentConversation = await response.json();
        messages = currentConversation?.messages || [];
        // Ensure embeddings for this conversation level are loaded
        embeddingsReady = false;
        if (currentConversation?.wordsFile) {
          embeddingsLoading = true;
          embeddingsReady = await ensureEmbeddingsLoaded(currentConversation.wordsFile);
          embeddingsLoading = false;
        } else {
          embeddingsReady = true; // use default
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function createConversation() {
    if (!newConversationTitle || !newConversationInitialMessage) {
      alert('Please provide both a title and an initial message');
      return;
    }
    
    try {
      isLoading = true;
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
      body: JSON.stringify({
          title: newConversationTitle,
          initialMessage: newConversationInitialMessage,
          wordsFile: newConversationWordsFile
        })
      });
      
      if (response.ok) {
        const newConversation = await response.json();
        conversations = [newConversation, ...conversations];
        currentConversation = newConversation;
        messages = newConversation.messages;
        // Ensure embeddings before user continues
        embeddingsReady = false;
        embeddingsLoading = true;
        embeddingsReady = await ensureEmbeddingsLoaded(newConversation.wordsFile || 'B1.txt');
        embeddingsLoading = false;
        
        // Reset form
        newConversationTitle = '';
        newConversationInitialMessage = '';
        isCreatingConversation = false;
        
        // The AI response is now handled on the server
        // No need to call sendMessage again
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function sendMessage(content = newMessage, shouldClear = true) {
    if (!content || !currentConversation) return;
    
    try {
      isLoading = true;
      if (shouldClear) newMessage = '';
      
      const response = await fetch(`/api/conversations/${currentConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      if (response.ok) {
        const result = await response.json();
        await loadConversation(currentConversation.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function deleteConversation(id: number) {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        conversations = conversations.filter(conv => conv.id !== id);
        if (currentConversation && currentConversation.id === id) {
          currentConversation = null;
          messages = [];
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
  
  function handleTranscription(text: string) {
    newMessage = text;
  }
</script>

<div class="container">
  <div class="sidebar">
    <h2>Conversations</h2>
    <button onclick={() => isCreatingConversation = true} class="new-chat-btn">
      New Conversation
    </button>
    
    <div class="conversation-list">
      {#each conversations as conversation (conversation.id)}
        <div 
          aria-label={`Conversation ${conversation.title}`}
          role="button"
          tabindex="0"
          class="conversation-item" 
          class:active={currentConversation?.id === conversation.id}
          onclick={() => loadConversation(conversation.id)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              loadConversation(conversation.id);
            }
          }}
        >
          <span>{conversation.title}</span>
          <button 
            class="delete-btn" 
            onclick={(e) => { 
              e.stopPropagation(); 
              deleteConversation(conversation.id);
            }}
          >
            ×
          </button>
        </div>
      {/each}
      
      {#if conversations.length === 0}
        <p class="empty-state">No conversations yet</p>
      {/if}
    </div>
  </div>
  
  <div class="chat-container">
    {#if isCreatingConversation}
      <div class="new-conversation-form">
        <h2>Create New Conversation</h2>
        <div class="form-group">
          <label for="title">Title</label>
          <input 
            type="text" 
            id="title" 
            bind:value={newConversationTitle} 
            placeholder="Conversation title"
          />
        </div>
        
        <div class="form-group">
          <label for="initial-message">Initial Message (required)</label>
          <textarea 
            id="initial-message" 
            bind:value={newConversationInitialMessage} 
            rows="3"
          ></textarea>
          <small>This helps establish context for the conversation</small>
        </div>

        <div class="form-group">
          <label for="words-file">Dictionary file (under /currated_words/german)</label>
          {#if availableDictionaries.length}
            <select id="words-file" bind:value={newConversationWordsFile}>
              {#each availableDictionaries as f}
                <option value={f}>{f}</option>
              {/each}
            </select>
          {:else}
            <input 
              type="text" 
              id="words-file" 
              bind:value={newConversationWordsFile} 
              placeholder="B1.txt"
            />
          {/if}
          <small>Examples: B1.txt, A2.txt, custom.txt</small>
        </div>
        
        <div class="form-actions">
          <button 
            onclick={() => isCreatingConversation = false} 
            class="cancel-btn"
          >
            Cancel
          </button>
          <button 
            onclick={createConversation} 
            class="create-btn" 
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Conversation'}
          </button>
        </div>
      </div>
    {:else if currentConversation}
      <div class="chat-header">
        <h2>{currentConversation.title}</h2>
        {#if embeddingsLoading}
          <span class="badge">Loading embeddings…</span>
        {:else if !embeddingsReady}
          <span class="badge warn">Embeddings not ready</span>
        {:else}
          <span class="badge ok">Embeddings ready</span>
        {/if}
      </div>
      <div class="content-row">
        <div class="chat-col">
          <MessageList {messages} {isLoading} />
          <div class="message-input">
            <textarea 
              bind:value={newMessage} 
              placeholder="Type your message..." 
              onkeydown={handleKeyDown}
              disabled={isLoading || !embeddingsReady}
            ></textarea>
            <div class="input-controls">
              <MicrophoneButton 
                onTranscription={handleTranscription}
                disabled={isLoading || !embeddingsReady}
              />
              <button 
                onclick={() => sendMessage()} 
                disabled={!newMessage || isLoading || !embeddingsReady}
              >
                Send
              </button>
            </div>
          </div>
        </div>
        <ConversationTools wordsFile={currentConversation.wordsFile || 'B1.txt'} messageText={newMessage} />
      </div>
    {:else}
      <div class="empty-chat">
        <h2>No conversation selected</h2>
        <p>Select a conversation from the sidebar or create a new one</p>
        <button onclick={() => isCreatingConversation = true} class="new-chat-btn">
          New Conversation
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .container {
    display: flex;
    height: 100vh;
    max-height: 100vh;
    overflow: hidden;
  }
  
  .sidebar {
    width: 300px;
    border-right: 1px solid #ddd;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    background-color: #f8f9fa;
  }
  
  .chat-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    overflow: hidden;
  }
  .content-row {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 1rem;
    height: calc(100% - 64px);
  }
  .chat-col { display: flex; flex-direction: column; overflow: hidden; }
  
  .conversation-list {
    overflow-y: auto;
    margin-top: 1rem;
  }
  
  .conversation-item {
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 0.5rem;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background-color 0.2s;
  }
  
  .conversation-item:hover {
    background-color: #e9ecef;
  }
  
  .conversation-item.active {
    background-color: #e2e6ea;
    font-weight: 500;
  }
  
  .delete-btn {
    background: none;
    border: none;
    color: #dc3545;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0 0.5rem;
    opacity: 0.6;
  }
  
  .delete-btn:hover {
    opacity: 1;
  }
  
  .new-chat-btn {
    padding: 0.75rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    margin-bottom: 1rem;
  }
  
  .new-chat-btn:hover {
    background-color: #0069d9;
  }
  

  
  .message-input {
    display: flex;
    gap: 0.5rem;
    padding: 1rem 0;
    border-top: 1px solid #ddd;
  }
  
  .message-input textarea {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    resize: none;
    min-height: 60px;
  }
  
  .input-controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .input-controls button {
    padding: 0 1.5rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    height: 48px;
  }
  
  .input-controls button:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
  
  .empty-state {
    color: #6c757d;
    text-align: center;
    margin-top: 2rem;
  }
  
  .empty-chat {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #6c757d;
  }
  
  .empty-chat button {
    margin-top: 1rem;
  }
  
  .chat-header {
    padding-bottom: 1rem;
    border-bottom: 1px solid #ddd;
    margin-bottom: 1rem;
  }
  

  
  .new-conversation-form {
    padding: 1rem;
    border-radius: 8px;
    background-color: #f8f9fa;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 8px;
  }
  
  .form-group small {
    display: block;
    margin-top: 0.25rem;
    color: #6c757d;
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  
  .cancel-btn {
    padding: 0.75rem 1.5rem;
    background-color: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
  }
  
  .create-btn {
    padding: 0.75rem 1.5rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .badge {
    margin-left: 1rem;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    background: #eee;
    font-size: 0.85rem;
  }
  .badge.ok { background: #e6f7ed; color: #217a3c; }
  .badge.warn { background: #fff4e5; color: #8a4b08; }
  
  .create-btn:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
  

</style>
