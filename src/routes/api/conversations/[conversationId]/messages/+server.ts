import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { createSystemPrompt, sendChatRequest, type OllamaMessage } from '$lib/services/ollama';
import { validatePhrase } from '$lib/services/phraseValidator';

const prisma = new PrismaClient();

// POST to add a new message and get a response from Ollama
export const POST: RequestHandler = async ({ request, params, locals }) => {
  const { conversationId } = params;
  const { content } = await request.json();
  
  if (!content) {
    return json({ error: 'Message content is required' }, { status: 400 });
  }

  // Get the conversation to retrieve system prompt and only the last 4 messages
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: parseInt(conversationId)
    },
    include: {
      messages: {
        orderBy: {
          createdAt: 'desc'
        },
        take: 4  // Only take the last 4 messages
      }
    }
  });
  
  if (!conversation) {
    return json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Save the user message
  const userMessage = await prisma.message.create({
    data: {
      conversationId: parseInt(conversationId),
      role: 'user',
      content
    }
  });

  // Create conversation context for smart word selection
  const recentMessages = conversation.messages.slice(-5); // Last 5 messages for context
  const conversationContext = `Topic: ${conversation.title}. Recent conversation: ${recentMessages.map(m => m.content).join(' ')} Current user message: ${content}`;

  // Format messages for Ollama API
  const ollamaMessages: OllamaMessage[] = [
    { 
      role: 'system', 
      content: await createSystemPrompt(conversation.title, conversationContext, conversation.wordsFile)
    },
    ...conversation.messages.reverse().map(msg => ({  // Reverse to get chronological order
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user', content }
  ];

  // console.log('ollamaMessages', ollamaMessages);

  // Call Ollama API
  try {
    const ollamaResponse = await sendChatRequest(ollamaMessages);
    
    // Validate the assistant's response
    const confidenceLevel = await validatePhrase(ollamaResponse.message.content, conversation.wordsFile);
    
    // Save the assistant's response
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: parseInt(conversationId),
        role: 'assistant',
        content: ollamaResponse.message.content,
        confidenceLevel: confidenceLevel
      }
    });

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: {
        id: parseInt(conversationId)
      },
      data: {
        updatedAt: new Date()
      }
    });

    return json({
      userMessage,
      assistantMessage
    });
  } catch (error) {
    console.error('Error calling Ollama API:', error);
    return json({ error: 'Failed to get response from LLM' }, { status: 500 });
  }
}; 