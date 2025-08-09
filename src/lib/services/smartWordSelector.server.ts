/**
 * Server-only word selector service that talks directly to the Python backend.
 */
import { WORD_SELECTOR_API_URL } from '$env/static/private';

export interface WordSelectorResponse {
  relevant_words: string[];
  count: number;
}

export interface ValidationResponse {
  phrase: string;
  percentage: number;
  score: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface AnalysisResponse {
  relevant_words: string[];
  word_count: number;
  response_validation: ValidationResponse;
}

export async function getRelevantWords(
  context: string,
  topK: number = 80,
  wordsFile?: string
): Promise<string[]> {
  const response = await fetch(`${WORD_SELECTOR_API_URL}/relevant-words`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, top_k: topK, words_file: wordsFile })
  });
  if (!response.ok) throw new Error(`Word selector API error: ${response.statusText}`);
  const data: WordSelectorResponse = await response.json();
  return data.relevant_words;
}

export async function getWordsByTopics(
  topics: string[],
  wordsPerTopic: number = 30,
  wordsFile?: string
): Promise<string[]> {
  const response = await fetch(`${WORD_SELECTOR_API_URL}/words-by-topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topics, words_per_topic: wordsPerTopic, words_file: wordsFile })
  });
  if (!response.ok) throw new Error(`Word selector API error: ${response.statusText}`);
  const data: WordSelectorResponse = await response.json();
  return data.relevant_words;
}

export async function validatePhraseServer(phrase: string, wordsFile?: string): Promise<ValidationResponse | null> {
  try {
    const response = await fetch(`${WORD_SELECTOR_API_URL}/validate-phrase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase, words_file: wordsFile })
    });
    if (!response.ok) throw new Error(`Validation API error: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Error validating phrase:', error);
    return null;
  }
}

export async function analyzeWithSuggestions(
  context: string,
  responseText: string,
  topK: number = 80,
  wordsFile?: string
): Promise<AnalysisResponse | null> {
  try {
    const apiResponse = await fetch(`${WORD_SELECTOR_API_URL}/analyze-with-suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, response: responseText, top_k: topK, words_file: wordsFile })
    });
    if (!apiResponse.ok) throw new Error(`Analysis API error: ${apiResponse.statusText}`);
    return await apiResponse.json();
  } catch (error) {
    console.error('Error in analysis with suggestions:', error);
    return null;
  }
}

export async function checkWordSelectorHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${WORD_SELECTOR_API_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Word selector service health check failed:', error);
    return false;
  }
}


