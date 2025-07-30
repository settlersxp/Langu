/*
This file contains the server-side logic for:
1) retrieving a single section from a deck ordered by position
2) playing the audio file 
3) updating the section position inside the deck

If the audio file cannot be found in the audio-cache folder 
then it will be downloaded from the TTS API. The name of the 
audio file is the section id + the language code. The audio file is cached in the 
audio-cache folder before it is played. Use the already configured 
voice from the VoiceSelector component.

When playing an audio file, the playCount is incremented.
The playCount of the Deck of this section is always equal to the lowest playCount of all sections in the deck.
*/

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { PrismaClient } from '@prisma/client';
import { selectedVoiceForeign } from '$lib/stores/voiceStore';
import { get } from 'svelte/store';
import { protos } from '@google-cloud/text-to-speech';

// Initialize Prisma client
const prisma = new PrismaClient();

// GET handler to retrieve a single section
export const GET: RequestHandler = async ({ params }) => {
  try {
    const sectionId = parseInt(params.sectionId);
    
    if (isNaN(sectionId)) {
      throw error(400, 'Invalid section ID');
    }
    
    const section = await prisma.section.findUnique({
      where: { id: sectionId }
    });
    
    if (!section) {
      throw error(404, 'Section not found');
    }
    
    return json(section);
  } catch (err) {
    console.error('Error retrieving section:', err);
    throw error(500, 'Failed to retrieve section');
  }
};

// POST handler to play audio and increment playCount
export const POST: RequestHandler = async ({ params, locals, request }) => {
  try {
    const sectionId = parseInt(params.sectionId);
    
    if (isNaN(sectionId)) {
      throw error(400, 'Invalid section ID');
    }
    
    // Get the section from the database
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { deck: true }
    });
    
    if (!section) {
      throw error(404, 'Section not found');
    }
    
    // Get the language code from the deck
    const languageCode = section.deck.languageCode;
    
    // Create audio file path
    const audioFileName = `${sectionId}_${languageCode}.mp3`;
    const audioCachePath = path.join(process.cwd(), 'audio-cache');
    const audioFilePath = path.join(audioCachePath, audioFileName);
    
    // Check if audio file exists in cache
    let audioExists = false;
    try {
      await fsPromises.access(audioFilePath);
      audioExists = true;
    } catch (e) {
      audioExists = false;
    }
    
    // If audio doesn't exist, generate it using TTS API
    if (!audioExists) {
      if (!locals.ttsClient) {
        throw error(500, 'TTS client not initialized');
      }
      
      // Get the voice from the request or use the selected voice found in the browser's cache under the key "selectedVoiceForeign"
      const body = await request.json().catch(() => ({}));
      const voice = body.voice || get(selectedVoiceForeign);
      console.log('voice', voice);
      
      if (!voice) {
        throw error(400, 'No voice selected');
      }
      
      // Set up the request
      const ttsRequest = {
        input: { text: section.foreignText },
        voice: {
          languageCode: voice.languageCodes[0],
          name: voice.name,
          ssmlGender: voice.ssmlGender
        },
        audioConfig: { audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3 }
      };
      
      // Generate speech
      const [response] = await locals.ttsClient.synthesizeSpeech(ttsRequest);
      
      // Ensure audio-cache directory exists
      await fsPromises.mkdir(audioCachePath, { recursive: true });
      
      // Save audio file to cache
      if (response.audioContent) {
        await fsPromises.writeFile(audioFilePath, response.audioContent);
      } else {
        throw error(500, 'No audio content received from TTS API');
      }
    }
    
    // Increment playCount for this section
    await prisma.section.update({
      where: { id: sectionId },
      data: { playCount: { increment: 1 } }
    });
    
    // Update the deck's playCount to be the minimum playCount of all its sections
    const sections = await prisma.section.findMany({
      where: { deckId: section.deckId },
      orderBy: { playCount: 'asc' }
    });
    
    if (sections.length > 0) {
      const minPlayCount = sections[0].playCount;
      
      await prisma.deck.update({
        where: { id: section.deckId },
        data: { playCount: minPlayCount }
      });
    }
    
    // Return the audio file
    const audioBuffer = await fsPromises.readFile(audioFilePath);
    
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mp3',
        'Content-Disposition': `attachment; filename="${audioFileName}"`
      }
    });
  } catch (err) {
    console.error('Error playing section audio:', err);
    throw error(500, 'Failed to play section audio');
  }
};

// PUT handler to update section position
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const sectionId = parseInt(params.sectionId);
    
    if (isNaN(sectionId)) {
      throw error(400, 'Invalid section ID');
    }
    
    const body = await request.json();
    const { position } = body;
    
    if (position === undefined || isNaN(position)) {
      throw error(400, 'Invalid position');
    }
    
    const updatedSection = await prisma.section.update({
      where: { id: sectionId },
      data: { position }
    });
    
    return json(updatedSection);
  } catch (err) {
    console.error('Error updating section position:', err);
    throw error(500, 'Failed to update section position');
  }
};

// PATCH handler to update section content and invalidate cache if needed
export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const sectionId = parseInt(params.sectionId);
    
    if (isNaN(sectionId)) {
      throw error(400, 'Invalid section ID');
    }
    
    // Get the current section to check if it exists
    const currentSection = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { deck: true }
    });
    
    if (!currentSection) {
      throw error(404, 'Section not found');
    }
    
    // Parse the request body
    const body = await request.json();
    const { foreignText, englishText, invalidateCache } = body;
    
    if (!foreignText || !englishText) {
      throw error(400, 'Foreign text and English text are required');
    }
    
    // Update the section
    const updatedSection = await prisma.section.update({
      where: { id: sectionId },
      data: {
        foreignText,
        englishText
      }
    });
    
    // If cache invalidation is requested (because foreign text changed), delete the audio file
    if (invalidateCache) {
      try {
        const languageCode = currentSection.deck.languageCode;
        const audioFileName = `${sectionId}_${languageCode}.mp3`;
        const audioCachePath = path.join(process.cwd(), 'audio-cache');
        const audioFilePath = path.join(audioCachePath, audioFileName);
        
        // Check if file exists and delete it
        await fsPromises.access(audioFilePath);
        await fsPromises.unlink(audioFilePath);
        
        console.log(`Invalidated audio cache for section ${sectionId}`);
      } catch (err) {
        // If the file doesn't exist or can't be deleted, just log it
        console.log(`No audio cache to invalidate for section ${sectionId} or error deleting it`);
      }
    }
    
    return json(updatedSection);
  } catch (err) {
    console.error('Error updating section:', err);
    throw error(500, 'Failed to update section');
  }
};

// DELETE handler to remove a section
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const sectionId = parseInt(params.sectionId);
    
    if (isNaN(sectionId)) {
      throw error(400, 'Invalid section ID');
    }
    
    // Get the section to check if it exists and to get its deck ID
    const section = await prisma.section.findUnique({
      where: { id: sectionId }
    });
    
    if (!section) {
      throw error(404, 'Section not found');
    }
    
    // Delete the section
    await prisma.section.delete({
      where: { id: sectionId }
    });
    
    // Try to delete the audio file if it exists
    try {
      // Get the deck to get the language code
      const deck = await prisma.deck.findUnique({
        where: { id: section.deckId }
      });
      
      if (deck) {
        const audioFileName = `${sectionId}_${deck.languageCode}.mp3`;
        const audioCachePath = path.join(process.cwd(), 'audio-cache');
        const audioFilePath = path.join(audioCachePath, audioFileName);
        
        // Check if file exists and delete it
        await fsPromises.access(audioFilePath);
        await fsPromises.unlink(audioFilePath);
      }
    } catch (err) {
      // Ignore errors when trying to delete the audio file
      // The section is already deleted from the database
      console.log('Audio file not found or could not be deleted');
    }
    
    // Update positions of remaining sections in the deck
    const remainingSections = await prisma.section.findMany({
      where: { deckId: section.deckId },
      orderBy: { position: 'asc' }
    });
    
    // Update positions to be sequential
    for (let i = 0; i < remainingSections.length; i++) {
      if (remainingSections[i].position !== i) {
        await prisma.section.update({
          where: { id: remainingSections[i].id },
          data: { position: i }
        });
      }
    }
    
    // Update the deck's playCount to be the minimum playCount of all its sections
    if (remainingSections.length > 0) {
      const minPlayCount = remainingSections.reduce(
        (min, section) => Math.min(min, section.playCount),
        remainingSections[0].playCount
      );
      
      await prisma.deck.update({
        where: { id: section.deckId },
        data: { playCount: minPlayCount }
      });
    }
    
    return json({ success: true });
  } catch (err) {
    console.error('Error deleting section:', err);
    throw error(500, 'Failed to delete section');
  }
};