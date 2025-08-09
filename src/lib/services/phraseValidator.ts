import { WORD_SELECTOR_API_URL } from '$env/static/private';

export interface PhraseValidationResult {
  percentage: number;
}

export interface PhraseValidationError {
  error: string;
}

export async function validatePhrase(phrase: string, wordsFile?: string): Promise<number | null> {
  try {
    const response = await fetch(`${WORD_SELECTOR_API_URL}/validate-phrase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phrase, words_file: wordsFile })
    });

    if (!response.ok) {
      console.error('Phrase validation failed:', response.statusText);
      return null;
    }

    const result: any = await response.json();
    // Accept both { percentage } and full response
    return typeof result?.percentage === 'number' ? result.percentage : (result?.response_validation?.percentage ?? null);
  } catch (error) {
    console.error('Error calling phrase validator:', error);
    return null;
  }
}