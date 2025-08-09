/**
 * Client-side helpers. Do NOT import $env/static/private here.
 */
// No server secrets here; client-side only uses relative routes if needed.

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

export interface DictionaryInfo {
  filename: string;
  txt_path: string;
  pkl_exists: boolean;
  in_memory: boolean;
  words_count: number;
}

export async function listDictionaries(): Promise<DictionaryInfo[]> {
  try {
    // Proxy through a Svelte server route to avoid exposing private env
    const resp = await fetch(`/api/dictionaries`);
    if (!resp.ok) throw new Error('Failed to list dictionaries');
    const data = await resp.json();
    return data?.dictionaries ?? [];
  } catch (e) {
    console.error('listDictionaries error', e);
    return [];
  }
}

export async function ensureEmbeddingsLoaded(wordsFile: string): Promise<boolean> {
  try {
    // First check status via server route
    const statusResp = await fetch(`/api/embeddings/status?words_file=${encodeURIComponent(wordsFile)}`);
    if (statusResp.ok) {
      const status = await statusResp.json();
      if (status?.in_memory === true) return true;
    }
    // Trigger load if not in memory via server route
    const loadResp = await fetch(`/api/embeddings/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words_file: wordsFile })
    });
    if (!loadResp.ok) return false;
    const load = await loadResp.json();
    return Boolean(load?.loaded);
  } catch (e) {
    console.error('ensureEmbeddingsLoaded error', e);
    return false;
  }
}

/**
 * Get contextually relevant words based on conversation context
 */
export async function getRelevantWords(
  context: string, 
  topK: number = 80,
  wordsFile?: string
): Promise<string[]> {
  try {
    const response = await fetch(`/api/word-selector/relevant-words`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        context,
        top_k: topK,
        words_file: wordsFile
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
  wordsPerTopic: number = 30,
  wordsFile?: string
): Promise<string[]> {
  try {
    const response = await fetch(`/api/word-selector/words-by-topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topics,
        words_per_topic: wordsPerTopic,
        words_file: wordsFile
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
export async function validatePhrase(phrase: string, wordsFile?: string): Promise<ValidationResponse | null> {
  try {
    const response = await fetch(`/api/word-selector/validate-phrase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phrase, words_file: wordsFile })
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
  topK: number = 80,
  wordsFile?: string
): Promise<AnalysisResponse | null> {
  try {
    const apiResponse = await fetch(`/api/word-selector/analyze-with-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        context,
        response,
        top_k: topK,
        words_file: wordsFile
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
    const response = await fetch(`/api/word-selector/health`);
    return response.ok;
  } catch (error) {
    console.error('Word selector service health check failed:', error);
    return false;
  }
}