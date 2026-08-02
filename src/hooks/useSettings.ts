import { useCallback, useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '../lib/storage';
import type { AppSettings } from '../types';

export function useSettings() {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    setApiKey(loadSettings().openaiApiKey);
  }, []);

  const persistApiKey = useCallback(() => {
    const settings: AppSettings = { openaiApiKey: apiKey.trim() };
    saveSettings(settings);
  }, [apiKey]);

  return {
    apiKey,
    setApiKey,
    persistApiKey,
    hasApiKey: Boolean(apiKey.trim()),
  };
}
