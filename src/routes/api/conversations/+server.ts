import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { createSystemPrompt, sendChatRequest, type OllamaMessage } from '$lib/services/ollama';

const prisma = new PrismaClient();

// GET all conversations
export const GET: RequestHandler = async () => {
  const conversations = await prisma.conversation.findMany({
    orderBy: {
      updatedAt: 'desc'
    }
  });
  
  return json(conversations);
};

// POST to create a new conversation
export const POST: RequestHandler = async ({ request }) => {
  const { title, initialMessage } = await request.json();
  
  if (!title || !initialMessage) {
    return json({ error: 'Title and initial message are required' }, { status: 400 });
  }

  const conversation = await prisma.conversation.create({
    data: {
      title,
      messages: {
        create: {
          role: 'user',
          content: initialMessage
        }
      }
    },
    include: {
      messages: true
    }
  });

  // Send the initial message to the AI
  const ollamaMessages: OllamaMessage[] = [
    { 
      role: 'system', 
      content: await createSystemPrompt(title)
    },
    { role: 'user', content: initialMessage }
  ];

  try {
    const ollamaResponse = await sendChatRequest(ollamaMessages);
    
    // Save the assistant's response
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: ollamaResponse.message.content
      }
    });

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: {
        id: conversation.id
      },
      data: {
        updatedAt: new Date()
      }
    });

    // Return the updated conversation with both messages
    return json({
      ...conversation,
      messages: [...conversation.messages, assistantMessage]
    });
  } catch (error) {
    console.error('Error calling Ollama API:', error);
    // Still return the conversation even if AI response fails
    return json(conversation);
  }
}; 