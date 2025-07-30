/*
This file contains the server-side logic for the single deck API.
*/

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import type { UpdateDeckInput } from '$lib/database/schema';

const prisma = new PrismaClient();

// Get a specific deck by ID
export const GET: RequestHandler = async ({ params }) => {
    const { deckId } = params;
    
    try {
        const id = parseInt(deckId);
        
        if (isNaN(id)) {
            return json({ error: 'Invalid deck ID' }, { status: 400 });
        }
        
        const deck = await prisma.deck.findUnique({
            where: { id },
            include: {
                sections: {
                    orderBy: { position: 'asc' }
                }
            }
        });
        
        if (!deck) {
            return json({ error: 'Deck not found' }, { status: 404 });
        }
        
        return json(deck);
    } catch (error) {
        console.error(`Error fetching deck ${deckId}:`, error);
        return json({ error: 'Failed to fetch deck' }, { status: 500 });
    }
};

// Update a deck
export const PUT: RequestHandler = async ({ params, request }) => {
    const { deckId } = params;
    
    try {
        const id = parseInt(deckId);
        
        if (isNaN(id)) {
            return json({ error: 'Invalid deck ID' }, { status: 400 });
        }
        
        const data = await request.json() as UpdateDeckInput;
        
        // Check if deck exists
        const existingDeck = await prisma.deck.findUnique({
            where: { id }
        });
        
        if (!existingDeck) {
            return json({ error: 'Deck not found' }, { status: 404 });
        }
        
        // Update the deck
        const updatedDeck = await prisma.deck.update({
            where: { id },
            data: {
                name: data.name !== undefined ? data.name : undefined,
                description: data.description !== undefined ? data.description : undefined,
                languageCode: data.languageCode !== undefined ? data.languageCode : undefined,
                languageName: data.languageName !== undefined ? data.languageName : undefined
            }
        });
        
        return json(updatedDeck);
    } catch (error) {
        console.error(`Error updating deck ${deckId}:`, error);
        return json({ error: 'Failed to update deck' }, { status: 500 });
    }
};

// Delete a deck
export const DELETE: RequestHandler = async ({ params }) => {
    const { deckId } = params;
    
    try {
        const id = parseInt(deckId);
        
        if (isNaN(id)) {
            return json({ error: 'Invalid deck ID' }, { status: 400 });
        }
        
        // Check if deck exists
        const existingDeck = await prisma.deck.findUnique({
            where: { id }
        });
        
        if (!existingDeck) {
            return json({ error: 'Deck not found' }, { status: 404 });
        }
        
        // Delete the deck (this will cascade delete all sections)
        await prisma.deck.delete({
            where: { id }
        });
        
        return json({ success: true });
    } catch (error) {
        console.error(`Error deleting deck ${deckId}:`, error);
        return json({ error: 'Failed to delete deck' }, { status: 500 });
    }
};