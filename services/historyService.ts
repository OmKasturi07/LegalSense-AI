import { HistoryItem, FullAnalysisResult } from '../types';

const getStorageKey = (userId: string) => {
  return `legalsense_history_${userId}`;
};

export const getHistory = (userId?: string): HistoryItem[] => {
  if (!userId) return []; // Guest history is disabled
  
  try {
    const key = getStorageKey(userId);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveHistoryItem = (
  fileName: string, 
  result: FullAnalysisResult,
  userId?: string
): HistoryItem[] => {
  if (!userId) return []; // Guest history saving is disabled

  const history = getHistory(userId);
  
  const newItem: HistoryItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    timestamp: Date.now(),
    fileName,
    fraud_score: result.fraudAnalysis.fraud_score,
    category: result.legalSummary.category || "General",
    summary_snippet: result.legalSummary.summary[0] || "No summary available",
    data: result
  };
  
  // Prepend new item
  const updated = [newItem, ...history];
  
  // Limit to 20 items to avoid localStorage quota issues
  const trimmed = updated.slice(0, 20);

  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (e) {
    console.error("Failed to save history - likely quota exceeded", e);
  }
  
  return trimmed;
};

export const deleteHistoryItem = (id: string, userId?: string): HistoryItem[] => {
  if (!userId) return [];

  const history = getHistory(userId);
  const updated = history.filter(item => item.id !== id);
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to update history", e);
  }
  return updated;
};

export const clearHistory = (userId?: string): [] => {
  if (!userId) return [];
  
  const key = getStorageKey(userId);
  localStorage.removeItem(key);
  return [];
};