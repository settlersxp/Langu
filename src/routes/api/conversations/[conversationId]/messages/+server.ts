import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { createSystemPrompt, sendChatRequest, type OllamaMessage } from '$lib/services/ollama';

const prisma = new PrismaClient();

// POST to add a new message and get a response from Ollama
export const POST: RequestHandler = async ({ request, params }) => {
  const { conversationId } = params;
  const { content } = await request.json();
  
  if (!content) {
    return json({ error: 'Message content is required' }, { status: 400 });
  }

  // Get the conversation to retrieve system prompt and only the last 2 messages
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: parseInt(conversationId)
    },
    include: {
      messages: {
        orderBy: {
          createdAt: 'desc'
        },
        take: 4  // Only take the last 2 messages
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

  // Format messages for Ollama API
  const ollamaMessages: OllamaMessage[] = [
    { 
      role: 'system', 
      content: await createSystemPrompt(conversation.title)
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
    
    // Save the assistant's response
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: parseInt(conversationId),
        role: 'assistant',
        content: ollamaResponse.message.content
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