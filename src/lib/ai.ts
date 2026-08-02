import type {
  DefinitionResponse,
  OpenAIChatCompletionResponse,
  ReviewResponse,
  ReviewResult,
  Word,
} from '../types';
import {
  fetchDictionaryComDefinition,
  getBundledDefinition,
  loadBundledDefinitions,
} from './dictionaryCom';
import { resolveStoredDefinition } from './definitions';
import {
  loadSettings,
  saveDictionaryDefinition,
} from './storage';

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatOpenAIError(status: number, errorText: string): string {
  let detail = errorText;
  try {
    const parsed = JSON.parse(errorText) as { error?: { message?: string; type?: string } };
    if (parsed.error?.message) {
      detail = parsed.error.message;
    }
  } catch {
    // Keep raw error text when it is not JSON.
  }

  if (RETRYABLE_STATUS.has(status)) {
    return `OpenAI is temporarily unavailable (${detail}). Your answer was kept — try Submit again.`;
  }

  return `OpenAI request failed: ${detail}`;
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const { openaiApiKey } = loadSettings();
  if (!openaiApiKey) {
    throw new Error('Add your OpenAI API key in Settings to use AI features.');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-5.6-luna',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(formatOpenAIError(response.status, errorText));

        if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
          lastError = error;
          await sleep(BASE_RETRY_DELAY_MS * 2 ** attempt);
          continue;
        }

        throw error;
      }

      const data = (await response.json()) as OpenAIChatCompletionResponse;
      return data.choices[0].message.content;
    } catch (err) {
      const isNetworkError = err instanceof TypeError;
      if (isNetworkError && attempt < MAX_RETRIES) {
        lastError = err instanceof Error ? err : new Error('Network error');
        await sleep(BASE_RETRY_DELAY_MS * 2 ** attempt);
        continue;
      }

      throw err instanceof Error ? err : new Error('OpenAI request failed.');
    }
  }

  throw lastError ?? new Error('OpenAI request failed after retries.');
}

export async function fetchDefinition(word: string): Promise<string> {
  const fromDictionary = await fetchDictionaryComDefinition(word);
  if (fromDictionary) return fromDictionary;

  const bundled = getBundledDefinition(word);
  if (bundled) return bundled;

  const content = await callOpenAI(
    `You define vocabulary words for learners. Give the most common, general dictionary sense — not regional dishes, obscure proper nouns, or highly specialized jargon unless that is the only meaning. Respond with JSON: {"definition": "..."}`,
    `Define the word "${word}" in one clear sentence suitable for vocabulary study.`,
  );
  const parsed = JSON.parse(content) as DefinitionResponse;
  return parsed.definition;
}

export async function fetchGptDefinition(word: string): Promise<string> {
  const content = await callOpenAI(
    `You define vocabulary words for learners. Give a concise definition covering the most common usages — one or two short sentences. Prefer general dictionary senses over regional, obscure, or highly specialized meanings unless those are the only senses. Respond with JSON: {"definition": "..."}`,
    `Define the word "${word}" concisely for vocabulary study.`,
  );
  const parsed = JSON.parse(content) as DefinitionResponse;
  return parsed.definition.trim();
}

export async function loadWordEntries(words: string[]): Promise<Word[]> {
  await loadBundledDefinitions();

  const entries = await Promise.all(
    words.map(async (word): Promise<Word> => {
      const cached = resolveStoredDefinition(word);
      if (cached) {
        return { word, definition: cached };
      }

      const definition = await fetchDefinition(word);
      saveDictionaryDefinition(word, definition);
      return { word, definition };
    }),
  );
  return entries;
}

export async function scoreAttempt(
  word: string,
  correctDefinition: string,
  userAnswer: string,
): Promise<ReviewResult> {
  const content = await callOpenAI(
    `You score vocabulary recall attempts. Compare the user's definition to the reference.
Score 0-100 where 100 means fully correct meaning (wording can differ).
Respond with JSON: {"score": number, "feedback": "brief encouraging feedback"}`,
    `Word: ${word}
Reference definition: ${correctDefinition}
User's attempt: ${userAnswer}`,
  );

  const parsed = JSON.parse(content) as ReviewResponse;
  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    feedback: parsed.feedback,
  };
}

export { loadBundledDefinitions, refreshDefinitionsForWords } from './dictionaryCom';
export { isCustomDefinition, saveDictionaryDefinition } from './storage';
