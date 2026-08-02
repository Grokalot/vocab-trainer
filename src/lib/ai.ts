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

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const { openaiApiKey } = loadSettings();
  if (!openaiApiKey) {
    throw new Error('Add your OpenAI API key in Settings to use AI features.');
  }

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
    throw new Error(`OpenAI request failed: ${errorText}`);
  }

  const data = (await response.json()) as OpenAIChatCompletionResponse;
  return data.choices[0].message.content;
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
