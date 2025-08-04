import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET a specific conversation with its messages
export const GET: RequestHandler = async ({ params }) => {
  const { conversationId } = params;
  
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: parseInt(conversationId)
    },
    include: {
      messages: {
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  });
  
  if (!conversation) {
    return json({ error: 'Conversation not found' }, { status: 404 });
  }
  
  return json(conversation);
};

// DELETE a conversation
export const DELETE: RequestHandler = async ({ params }) => {
  const { conversationId } = params;
  
  await prisma.conversation.delete({
    where: {
      id: parseInt(conversationId)
    }
  });
  
  return json({ success: true });
}; 