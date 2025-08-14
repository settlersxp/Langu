import { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "../$types";
import { json } from "@sveltejs/kit";
import { promises as fs } from 'fs';
import { join } from "path";

const prisma = new PrismaClient();

// DELETE a message
export const DELETE: RequestHandler = async ({ params }: { params: any }) => {
  // Get the ID from the URL
  const messageId = params.messageId;

  // Get the text of the current messageId
  const message = await prisma.message.findUnique({
    where: { id: parseInt(messageId) }
  });

  if (!message) {
    return json({ error: 'Message not found' }, { status: 404 });
  }

  // Get all the other messages with the same text
  const otherMessages = await prisma.message.findMany({
    where: { content: message.content }
  });

  // If there are no other messages with the same text, delete the audio file
  if (otherMessages.length === 0) {
    const audioPath = message.audioPath;
    if (audioPath) {
      await fs.unlink(join(process.cwd(), 'static', audioPath));
    }
  }

  try {
    await prisma.message.delete({
      where: { id: parseInt(messageId) }
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return json({ error: 'Failed to delete message' }, { status: 500 });
  } finally {
    return json({ success: true });
  }
};