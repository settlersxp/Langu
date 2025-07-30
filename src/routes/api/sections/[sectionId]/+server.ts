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
import { selectedVoiceForeign, selectedVoiceEnglish } from '$lib/stores/voiceStore';
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
    
    // Parse request body to get language preference and voice
    const body = await request.json().catch(() => ({}));
    const language = body.language || 'foreign'; // Default to foreign if not specified
    
    // Get the text to synthesize based on language
    const textToSynthesize = language === 'foreign' ? section.foreignText : section.englishText;
    
    // Get the language code - for foreign text use the deck's language code, for English use 'en-US'
    const languageCode = language === 'foreign' ? section.deck.languageCode : 'en-US';
    
    // Create audio file path with language indicator
    const audioFileName = `${sectionId}_${language}_${languageCode}.mp3`;
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
      
      // Get the voice from the request or use the selected voice found in the browser's cache
      const voice = body.voice || get(language === 'foreign' ? selectedVoiceForeign : selectedVoiceEnglish);
      console.log(`Using ${language} voice:`, voice);
      
      if (!voice) {
        throw error(400, `No ${language} voice selected`);
      }
      
      // Set up the request
      const ttsRequest = {
        input: { text: textToSynthesize },
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
    const { foreignText, englishText, invalidateForeignCache, invalidateEnglishCache } = body;
    
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
    
    // If foreign cache invalidation is requested, delete the foreign audio file
    if (invalidateForeignCache) {
      try {
        const languageCode = currentSection.deck.languageCode;
        const audioFileName = `${sectionId}_foreign_${languageCode}.mp3`;
        const audioCachePath = path.join(process.cwd(), 'audio-cache');
        const audioFilePath = path.join(audioCachePath, audioFileName);
        
        // Check if file exists and delete it
        await fsPromises.access(audioFilePath);
        await fsPromises.unlink(audioFilePath);
        
        console.log(`Invalidated foreign audio cache for section ${sectionId}`);
      } catch (err) {
        // If the file doesn't exist or can't be deleted, just log it
        console.log(`No foreign audio cache to invalidate for section ${sectionId} or error deleting it`);
      }
      
      // Also try to delete the old format audio file (for backward compatibility)
      try {
        const languageCode = currentSection.deck.languageCode;
        const audioFileName = `${sectionId}_${languageCode}.mp3`;
        const audioCachePath = path.join(process.cwd(), 'audio-cache');
        const audioFilePath = path.join(audioCachePath, audioFileName);
        
        await fsPromises.access(audioFilePath);
        await fsPromises.unlink(audioFilePath);
      } catch (err) {
        // Ignore errors for old format
      }
    }
    
    // If English cache invalidation is requested, delete the English audio file
    if (invalidateEnglishCache) {
      try {
        const audioFileName = `${sectionId}_english_en-US.mp3`;
        const audioCachePath = path.join(process.cwd(), 'audio-cache');
        const audioFilePath = path.join(audioCachePath, audioFileName);
        
        // Check if file exists and delete it
        await fsPromises.access(audioFilePath);
        await fsPromises.unlink(audioFilePath);
        
        console.log(`Invalidated English audio cache for section ${sectionId}`);
      } catch (err) {
        // If the file doesn't exist or can't be deleted, just log it
        console.log(`No English audio cache to invalidate for section ${sectionId} or error deleting it`);
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
      where: { id: sectionId },
      include: { deck: true }
    });
    
    if (!section) {
      throw error(404, 'Section not found');
    }
    
    // Delete the section
    await prisma.section.delete({
      where: { id: sectionId }
    });
    
    // Try to delete both foreign and English audio files
    try {
      const languageCode = section.deck.languageCode;
      const audioCachePath = path.join(process.cwd(), 'audio-cache');
      
      // Delete foreign audio file
      const foreignAudioFileName = `${sectionId}_foreign_${languageCode}.mp3`;
      const foreignAudioFilePath = path.join(audioCachePath, foreignAudioFileName);
      
      try {
        await fsPromises.access(foreignAudioFilePath);
        await fsPromises.unlink(foreignAudioFilePath);
      } catch (e) {
        // Ignore if file doesn't exist
      }
      
      // Delete English audio file
      const englishAudioFileName = `${sectionId}_english_en-US.mp3`;
      const englishAudioFilePath = path.join(audioCachePath, englishAudioFileName);
      
      try {
        await fsPromises.access(englishAudioFilePath);
        await fsPromises.unlink(englishAudioFilePath);
      } catch (e) {
        // Ignore if file doesn't exist
      }
      
      // Try to delete old format audio file (for backward compatibility)
      const oldFormatAudioFileName = `${sectionId}_${languageCode}.mp3`;
      const oldFormatAudioFilePath = path.join(audioCachePath, oldFormatAudioFileName);
      
      try {
        await fsPromises.access(oldFormatAudioFilePath);
        await fsPromises.unlink(oldFormatAudioFilePath);
      } catch (e) {
        // Ignore if file doesn't exist
      }
    } catch (err) {
      // Ignore errors when trying to delete audio files
      console.log('Error deleting audio files:', err);
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