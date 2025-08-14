/**
 * Abstract LLM service that can work with different providers (Ollama, Qwen)
 */

import { LLM_API_URL, CHAT_MODEL_NAME } from '$env/static/private';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
  };
}

export interface LLMGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
  };
}

export interface LLMResponse {
  model: string;
  message: LLMMessage;
  done: boolean;
}

export interface LLMGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

/**
 * Abstract base class for LLM providers
 */
abstract class LLMProvider {
  protected apiUrl: string;
  protected modelName: string;

  constructor(apiUrl: string, modelName: string) {
    this.apiUrl = apiUrl;
    this.modelName = modelName;
  }

  abstract formatMessages(messages: LLMMessage[]): string;
  abstract formatPrompt(prompt: string): string;
  abstract processResponse(response: string): string;
  abstract sendChatRequest(messages: LLMMessage[]): Promise<LLMResponse>;
  abstract sendGenerateRequest(request: LLMGenerateRequest): Promise<LLMGenerateResponse>;
}

/**
 * Ollama provider with Llama 3.1 template formatting
 */
class OllamaProvider extends LLMProvider {
  formatMessages(messages: LLMMessage[]): string {
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

  formatPrompt(prompt: string): string {
    return prompt; // No additional formatting needed for simple prompts
  }

  processResponse(response: string): string {
    return response.trim();
  }

  async sendChatRequest(messages: LLMMessage[]): Promise<LLMResponse> {
    const prompt = this.formatMessages(messages);

    const body = {
      model: this.modelName,
      prompt,
      stream: false
    };

    try {
      const response = await fetch(`${this.apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const result: LLMGenerateResponse = await response.json();

      // Convert back to chat format for compatibility
      return {
        model: result.model,
        message: {
          role: 'assistant',
          content: this.processResponse(result.response)
        },
        done: result.done
      };
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      throw error;
    }
  }

  async sendGenerateRequest(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
    const body = {
      model: request.model || this.modelName,
      prompt: this.formatPrompt(request.prompt),
      stream: request.stream || false,
      options: request.options
    };

    try {
      const response = await fetch(`${this.apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const result: LLMGenerateResponse = await response.json();

      return {
        model: result.model,
        response: this.processResponse(result.response),
        done: result.done
      };
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      throw error;
    }
  }
}

/**
 * Qwen provider with Qwen formatting and thinking removal
 */
class QwenProvider extends LLMProvider {
  formatMessages(messages: LLMMessage[]): string {
    let prompt = '';

    for (const message of messages) {
      if (message.role === 'system') {
        prompt += `<|im_start|>system\n${message.content}<|im_end|>\n`;
      } else if (message.role === 'user') {
        prompt += `<|im_start|>user\n${message.content}<|im_end|>\n`;
      } else if (message.role === 'assistant') {
        prompt += `<|im_start|>assistant\n${message.content}<|im_end|>\n`;
      }
    }

    // Add the final assistant header to prompt for response
    prompt += `<|im_start|>assistant\n`;

    return prompt;
  }

  formatPrompt(prompt: string): string {
    return prompt; // No additional formatting needed for simple prompts
  }

  processResponse(response: string): string {
    // Remove thinking blocks from Qwen responses
    let processed = response.trim();
    
    // Remove <thinking>...</thinking> blocks
    processed = processed.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');

    // Remove <think>...</think> blocks
    processed = processed.replace(/<think>[\s\S]*?<\/think>/g, '');
    
    // Remove any remaining thinking patterns that might be formatted differently
    processed = processed.replace(/\[thinking\][\s\S]*?\[\/thinking\]/g, '');
    processed = processed.replace(/思考：[\s\S]*?(?=\n\n|\n[A-Z]|$)/g, '');
    
    // Clean up extra whitespace
    processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    return processed;
  }

  async sendChatRequest(messages: LLMMessage[]): Promise<LLMResponse> {
    const prompt = this.formatMessages(messages);

    const body = {
      model: this.modelName,
      prompt,
      stream: false
    };

    try {
      const response = await fetch(`${this.apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Qwen API error: ${response.statusText}`);
      }

      const result: LLMGenerateResponse = await response.json();

      // Convert back to chat format for compatibility
      return {
        model: result.model,
        message: {
          role: 'assistant',
          content: this.processResponse(result.response)
        },
        done: result.done
      };
    } catch (error) {
      console.error('Error calling Qwen API:', error);
      throw error;
    }
  }

  async sendGenerateRequest(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
    const body = {
      model: request.model || this.modelName,
      prompt: this.formatPrompt(request.prompt),
      stream: request.stream || false,
      options: request.options
    };

    try {
      const response = await fetch(`${this.apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Qwen API error: ${response.statusText}`);
      }

      const result: LLMGenerateResponse = await response.json();

      return {
        model: result.model,
        response: this.processResponse(result.response),
        done: result.done
      };
    } catch (error) {
      console.error('Error calling Qwen API:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create the appropriate LLM provider based on model name
 */
function createLLMProvider(): LLMProvider {
  const modelName = CHAT_MODEL_NAME.toLowerCase();
  
  if (modelName.includes('qwen')) {
    return new QwenProvider(LLM_API_URL, CHAT_MODEL_NAME);
  } else {
    // Default to Ollama for Llama models and others
    return new OllamaProvider(LLM_API_URL, CHAT_MODEL_NAME);
  }
}

// Export the singleton instance
export const llmProvider = createLLMProvider();

// Export convenience functions that match the original ollama.ts interface
export async function sendChatRequest(messages: LLMMessage[]): Promise<LLMResponse> {
  return llmProvider.sendChatRequest(messages);
}

export async function sendGenerateRequest(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
  return llmProvider.sendGenerateRequest(request);
}
