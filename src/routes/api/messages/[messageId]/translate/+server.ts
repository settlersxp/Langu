import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { OLLAMA_API_URL } from '$env/static/private';

const prisma = new PrismaClient();

// POST to translate a message
export const POST: RequestHandler = async ({ params }) => {
  const { messageId } = params;
  
  // Get the message to translate
  const message = await prisma.message.findUnique({
    where: {
      id: parseInt(messageId)
    }
  });
  
  if (!message) {
    return json({ error: 'Message not found' }, { status: 404 });
  }
  
  // If translation already exists, return it
  if (message.translation) {
    return json({ translation: message.translation });
  }
  
  try {
    // Create translation request to Ollama with minimal temperature
    const translationRequest = {
      model: 'llama3',
      prompt: `Translate the following German text to English. Provide only the translation, no explanations or additional text:

German: ${message.content}

English:`,
      stream: false,
      options: {
        temperature: 0.1  // Very low temperature for consistent translations
      }
    };
    
    const response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(translationRequest)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const result = await response.json();
    const translation = result.response.trim();
    
    // Save translation to database
    const updatedMessage = await prisma.message.update({
      where: {
        id: parseInt(messageId)
      },
      data: {
        translation: translation
      }
    });

    return json({ translation: updatedMessage.translation });
  } catch (error) {
    console.error('Error translating message:', error);
    return json({ error: 'Failed to translate message' }, { status: 500 });
  }
};