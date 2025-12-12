export interface Clause {
  title: string;
  meaning: string;
}

export interface KeyEntities {
  names: string[];
  dates: string[];
  amounts: string[];
  parties: string[];
  addresses: string[];
}

export interface LegalSummary {
  category: string;
  summary: string[];
  clauses: Clause[];
  key_entities: KeyEntities;
  recommendations: string[];
  confidence: number;
}

export interface SuspiciousElement {
  text: string;
  reason: string;
  confidence: number;
}

export interface Contradiction {
  quote: string;
  explanation: string;
}

export interface FraudAnalysis {
  fraud_score: number;
  suspicious_elements: SuspiciousElement[];
  contradictions: Contradiction[];
  why: string[];
  action: string;
}

export interface FullAnalysisResult {
  legalSummary: LegalSummary;
  fraudAnalysis: FraudAnalysis;
}

export type AnalysisStatus = 'idle' | 'analyzing' | 'complete' | 'error';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  sources?: { title: string; uri: string }[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  fileName: string;
  fraud_score: number;
  category?: string;
  summary_snippet: string;
  data: FullAnalysisResult;
}

export interface User {
  id: string;
  name: string;
  email: string;
}