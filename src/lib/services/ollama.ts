/**
 * Service for interacting with the Ollama API
 */

import { getRelevantWords } from './smartWordSelector.js';
import { OLLAMA_API_URL } from '$env/static/private';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
}

export interface OllamaResponse {
  model: string;
  message: OllamaMessage;
  done: boolean;
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

/**
 * Convert messages array to Llama 3.1 template format
 */
function formatLlamaPrompt(messages: OllamaMessage[]): string {
  let prompt = '';
  
  for (const message of messages) {
    if (message.role === 'system') {
      // System message is already formatted with proper tags in createSystemPrompt
      prompt += message.content;
    } else if (message.role === 'user') {
      prompt += `<|start_header_id|>user<|end_header_id|>

${message.content}<|eot_id|>`;
    } else if (message.role === 'assistant') {
      prompt += `<|start_header_id|>assistant<|end_header_id|>

${message.content}<|eot_id|>`;
    }
  }
  
  // Add the final assistant header to prompt for response
  prompt += `<|start_header_id|>assistant<|end_header_id|>

`;
  
  return prompt;
}

/**
 * Send a chat request to the Ollama API using native Llama template format
 */
export async function sendChatRequest(messages: OllamaMessage[]): Promise<OllamaResponse> {
  const prompt = formatLlamaPrompt(messages);
  
  const body = {
    model: 'llama3', // Using Llama 3 model
    prompt,
    stream: false
  };
  
  console.log('Llama template prompt:', prompt);
  
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const result: OllamaGenerateResponse = await response.json();
    
    // Convert back to chat format for compatibility
    return {
      model: result.model,
      message: {
        role: 'assistant',
        content: result.response
      },
      done: result.done
    };
  } catch (error) {
    console.error('Error calling Ollama API:', error);
    throw error;
  }
} 

export async function createSystemPrompt(title: string, conversationContext?: string): Promise<string> {
  let wordListText = `You should use words included in the Goethe B1 list of words.`;
  
  // Try to get contextually relevant words
  if (conversationContext) {
    try {
      const relevantWords = await getRelevantWords(conversationContext, 80);
      if (relevantWords.length > 0) {
        wordListText = `You must mostly use words from this contextually relevant list: ${relevantWords.join(', ')}.`;
        console.log(`Using ${relevantWords.length} contextually relevant words`);
      }
    } catch (error) {
      console.warn('Failed to get relevant words, using fallback:', error);
    }
  }
  
  const systemContent = `Always provide short answers with under 20 words. You are a helpful assistant which replies only in German. ${wordListText} The topic of the conversation is ${title}. Try to formulate the answer in a way to continue the conversation.`;
  
  // Return the formatted system prompt with Llama 3.1 template tags
  return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

${systemContent}<|eot_id|>`;
}