/**
 * Service for interacting with LLM APIs (Ollama, Qwen, etc.)
 * This service maintains backward compatibility while using the new LLM abstraction
 */

// Server-side: use server-only word selector (private env allowed)
import { getRelevantWords } from './smartWordSelector.server.js';
import { CHAT_MODEL_NAME } from '$env/static/private';
import { sendChatRequest as llmSendChatRequest, type LLMMessage, type LLMResponse } from './llm.js';

// Re-export types for backward compatibility
export interface OllamaMessage extends LLMMessage {}
export interface OllamaResponse extends LLMResponse {}

// Legacy interfaces for backward compatibility
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

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

/**
 * Send a chat request using the LLM abstraction layer
 * Maintains backward compatibility with the original function signature
 */
export async function sendChatRequest(messages: OllamaMessage[]): Promise<OllamaResponse> {
  return llmSendChatRequest(messages);
}

export async function createSystemPrompt(title: string, conversationContext?: string, wordsFile?: string): Promise<string> {
  let wordListText = `You should use words included in the Goethe B1 list of words.`;

  // Try to get contextually relevant words
  if (conversationContext) {
    try {
      const relevantWords = await getRelevantWords(conversationContext, 80, wordsFile);
      if (relevantWords.length > 0) {
        wordListText = `You must mostly use words from this contextually relevant list: ${relevantWords.join(', ')}.`;
        // console.log(`Using ${relevantWords.length} contextually relevant words`);
      }
    } catch (error) {
      console.warn('Failed to get relevant words, using fallback:', error);
    }
  }

  const systemContent = `Always provide short answers with under 20 words. You are a helpful assistant which replies only in German. ${wordListText} The topic of the conversation is ${title}. Try to formulate the answer in a way to continue the conversation.`;

  // Format the system prompt based on the model type
  const modelName = CHAT_MODEL_NAME.toLowerCase();
  
  if (modelName.includes('qwen')) {
    // Qwen format
    return `<|im_start|>system\n${systemContent}<|im_end|>\n`;
  } else {
    // Ollama/Llama format
    return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

${systemContent}<|eot_id|>`;
  }
}