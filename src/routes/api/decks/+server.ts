/*
This file contains the server-side logic for the decks API.
*/

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import type { CreateDeckInput } from '$lib/models/deck';

const prisma = new PrismaClient();

// Get all decks
export const GET: RequestHandler = async () => {
    try {
        const decks = await prisma.deck.findMany({
            orderBy: { id: 'desc' }
        });
        
        return json(decks);
    } catch (error) {
        console.error('Error fetching decks:', error);
        return json({ error: 'Failed to fetch decks' }, { status: 500 });
    }
};

// Create a new deck
export const POST: RequestHandler = async ({ request }) => {
    try {
        const data = await request.json() as CreateDeckInput;
        
        // Validate required fields
        if (!data.name || !data.languageCode || !data.languageName) {
            return json({ 
                error: 'Name, language code, and language name are required' 
            }, { status: 400 });
        }
        
        const newDeck = await prisma.deck.create({
            data: {
                name: data.name,
                description: data.description || '',
                languageCode: data.languageCode,
                languageName: data.languageName,
                playCount: 0
            }
        });
        
        return json(newDeck, { status: 201 });
    } catch (error) {
        console.error('Error creating deck:', error);
        return json({ error: 'Failed to create deck' }, { status: 500 });
    }
};