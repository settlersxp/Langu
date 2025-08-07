<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Message {
    id: number;
    conversationId: number;
    role: 'user' | 'assistant';
    content: string;
    confidenceLevel?: number;
    createdAt: string;
  }
  
  interface Conversation {
    id: number;
    title: string;
    systemPrompt: string;
    createdAt: string;
    updatedAt: string;
    messages: Message[];
  }
  
  let conversations = $state<Conversation[]>([]);
  let currentConversation = $state<Conversation | null>(null);
  let messages = $state<Message[]>([]);
  let newMessage = $state('');
  let newConversationTitle = $state('');
  let newConversationInitialMessage = $state('');
  let isCreatingConversation = $state(false);
  let isLoading = $state(false);
  
  onMount(async () => {
    await loadConversations();
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
          initialMessage: newConversationInitialMessage
        })
      });
      
      if (response.ok) {
        const newConversation = await response.json();
        conversations = [newConversation, ...conversations];
        currentConversation = newConversation;
        messages = newConversation.messages;
        
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
            placeholder="Write a short message to start the conversation"
            rows="3"
          ></textarea>
          <small>This helps establish context for the conversation</small>
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
      </div>
      
      <div class="messages">
        {#each messages as message (message.id)}
          <div class="message {message.role}">
            <div class="message-content">
              {message.content}
            </div>
            {#if message.role === 'assistant' && message.confidenceLevel !== undefined && message.confidenceLevel !== null}
              <div class="confidence-level">
                <span class="confidence-label">Confidence:</span>
                <span class="confidence-value" class:low={message.confidenceLevel < 70} class:medium={message.confidenceLevel >= 70 && message.confidenceLevel < 85} class:high={message.confidenceLevel >= 85}>
                  {message.confidenceLevel.toFixed(1)}%
                </span>
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
      
      <div class="message-input">
        <textarea 
          bind:value={newMessage} 
          placeholder="Type your message..." 
          onkeydown={handleKeyDown}
          disabled={isLoading}
        ></textarea>
        <button 
          onclick={() => sendMessage()} 
          disabled={!newMessage || isLoading}
        >
          Send
        </button>
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
  
  .confidence-level {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    opacity: 0.8;
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
  
  .message-input button {
    padding: 0 1.5rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
  
  .message-input button:disabled {
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
  
  .system-prompt {
    font-size: 0.9rem;
    color: #6c757d;
    margin-top: 0.5rem;
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
  
  .create-btn:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
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
