/**
 * Service for getting contextually relevant words from the curated list
 * using the Python embedding-based word selector
 */
import { WORD_SELECTOR_API_URL } from '$env/static/private';

export interface WordSelectorRequest {
  context: string;
  top_k?: number;
}

export interface TopicWordsRequest {
  topics: string[];
  words_per_topic?: number;
}

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

/**
 * Get contextually relevant words based on conversation context
 */
export async function getRelevantWords(
  context: string, 
  topK: number = 80
): Promise<string[]> {
  try {
    const response = await fetch(`${WORD_SELECTOR_API_URL}/relevant-words`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        context,
        top_k: topK
      })
    });

    if (!response.ok) {
      throw new Error(`Word selector API error: ${response.statusText}`);
    }

    const data: WordSelectorResponse = await response.json();
    return data.relevant_words;
  } catch (error) {
    console.error('Error calling word selector API:', error);
    // Fallback: return empty array so the system can still work
    return [];
  }
}

/**
 * Get relevant words based on multiple topics
 */
export async function getWordsByTopics(
  topics: string[], 
  wordsPerTopic: number = 30
): Promise<string[]> {
  try {
    const response = await fetch(`${WORD_SELECTOR_API_URL}/words-by-topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topics,
        words_per_topic: wordsPerTopic
      })
    });

    if (!response.ok) {
      throw new Error(`Word selector API error: ${response.statusText}`);
    }

    const data: WordSelectorResponse = await response.json();
    return data.relevant_words;
  } catch (error) {
    console.error('Error calling word selector API:', error);
    return [];
  }
}

/**
 * Validate a German phrase and get its curated word score
 */
export async function validatePhrase(phrase: string): Promise<ValidationResponse | null> {
  try {
    const response = await fetch(`${WORD_SELECTOR_API_URL}/validate-phrase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phrase })
    });

    if (!response.ok) {
      throw new Error(`Validation API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error validating phrase:', error);
    return null;
  }
}

/**
 * Get relevant words AND validate a response in one call
 */
export async function analyzeWithSuggestions(
  context: string,
  response: string,
  topK: number = 80
): Promise<AnalysisResponse | null> {
  try {
    const apiResponse = await fetch(`${WORD_SELECTOR_API_URL}/analyze-with-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        context,
        response,
        top_k: topK
      })
    });

    if (!apiResponse.ok) {
      throw new Error(`Analysis API error: ${apiResponse.statusText}`);
    }

    return await apiResponse.json();
  } catch (error) {
    console.error('Error in analysis with suggestions:', error);
    return null;
  }
}

/**
 * Check if the word selector service is healthy
 */
export async function checkWordSelectorHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${WORD_SELECTOR_API_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Word selector service health check failed:', error);
    return false;
  }
}