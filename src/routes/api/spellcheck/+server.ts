import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendGenerateRequest } from '$lib/services/llm';

// POST to check grammar and spelling
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return json({ error: 'Text is required' }, { status: 400 });
    }

    // Create grammar check request using the LLM
    const prompt = `Please check the following German text for grammar, spelling, and language errors. If the text is correct, respond with "The text is grammatically correct." If there are errors, provide a clear explanation of what is wrong and how to fix it.

Text to check: "${text}"

Analysis:`;
    
    const result = await sendGenerateRequest({
      model: '', // Will use default model
      prompt,
      stream: false,
      options: {
        temperature: 0.3  // Low temperature for consistent analysis
      }
    });

    return json({ result: result.response });
  } catch (error) {
    console.error('Error checking grammar:', error);
    return json({ error: 'Failed to check grammar' }, { status: 500 });
  }
};
