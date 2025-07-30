import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import type { CreateSectionInput } from '$lib/models/section';

/*
This file contains the server-side logic for retrieving all sections from a deck.
The sections are ordered by position.
*/

// Initialize Prisma client
const prisma = new PrismaClient();

export const GET: RequestHandler = async ({ url }) => {
  try {
    const deckId = url.searchParams.get('deckId');
    
    if (!deckId) {
      throw error(400, 'Deck ID is required');
    }
    
    const deckIdNum = parseInt(deckId);
    
    if (isNaN(deckIdNum)) {
      throw error(400, 'Invalid deck ID');
    }
    
    const sections = await prisma.section.findMany({
      where: { deckId: deckIdNum },
      orderBy: { position: 'asc' }
    });
    
    return json(sections);
  } catch (err) {
    console.error('Error retrieving sections:', err);
    throw error(500, 'Failed to retrieve sections');
  }
};

// POST endpoint to create a new section
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { deckId, foreignText, englishText, audioPath } = body as CreateSectionInput;
    
    if (!deckId || isNaN(deckId)) {
      throw error(400, 'Valid deck ID is required');
    }
    
    if (!foreignText || !englishText) {
      throw error(400, 'Foreign text and English text are required');
    }
    
    // Get the current highest position for this deck
    const highestPositionSection = await prisma.section.findFirst({
      where: { deckId },
      orderBy: { position: 'desc' }
    });
    
    const position = highestPositionSection ? highestPositionSection.position + 1 : 0;
    
    // Create the new section
    const newSection = await prisma.section.create({
      data: {
        deckId,
        foreignText,
        englishText,
        audioPath: audioPath || '',
        position,
        playCount: 0
      }
    });
    
    return json(newSection);
  } catch (err) {
    console.error('Error creating section:', err);
    throw error(500, 'Failed to create section');
  }
};