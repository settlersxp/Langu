/**
 * Service for interacting with the Ollama API
 */

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
}

export interface OllamaResponse {
  model: string;
  message: OllamaMessage;
  done: boolean;
}

/**
 * Send a chat request to the Ollama API
 */
export async function sendChatRequest(messages: OllamaMessage[]): Promise<OllamaResponse> {
  const body = {
    model: 'llama3', // Default model
    messages,
    stream: false
  }
  console.log('body', body);
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling Ollama API:', error);
    throw error;
  }
} 

export async function createSystemPrompt(title: string): Promise<string> {
  return `Always provide short answers with under 30 words. You are a helpful assistant which replies only in German with words included in the Goethe A1 list of words. The topic of the conversation is ${title}. Try to formulate the answer in a way to continue the conversation.`;
}