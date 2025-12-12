import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { FullAnalysisResult } from "../types";

const apiKey = process.env.API_KEY || '';

// Define the schema for the legal summary module
const legalSummarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      description: "The specific category of the document. Choose from: 'Real Estate', 'Finance', 'Employment', 'Legal Contract', 'Invoice', 'Scam Check', 'Personal', or 'Other'."
    },
    summary: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-5 bullet points explaining the document in simple English."
    },
    clauses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          meaning: { type: Type.STRING, description: "Plain English explanation, one sentence." }
        },
        required: ["title", "meaning"]
      }
    },
    key_entities: {
      type: Type.OBJECT,
      properties: {
        names: { type: Type.ARRAY, items: { type: Type.STRING } },
        dates: { type: Type.ARRAY, items: { type: Type.STRING } },
        amounts: { type: Type.ARRAY, items: { type: Type.STRING } },
        parties: { type: Type.ARRAY, items: { type: Type.STRING } },
        addresses: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["names", "dates", "amounts", "parties", "addresses"]
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 practical user actions."
    },
    confidence: {
      type: Type.INTEGER,
      description: "Confidence in the analysis (0-100)."
    }
  },
  required: ["category", "summary", "clauses", "key_entities", "recommendations", "confidence"]
};

// Define the schema for the fraud analysis module
const fraudAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    fraud_score: {
      type: Type.INTEGER,
      description: "0 = low risk, 100 = highly suspicious."
    },
    suspicious_elements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          reason: { type: Type.STRING },
          confidence: { type: Type.INTEGER }
        },
        required: ["text", "reason", "confidence"]
      }
    },
    contradictions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ["quote", "explanation"]
      }
    },
    why: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Short reasoning (3-6 bullet chain of thought)."
    },
    action: {
      type: Type.STRING,
      description: "1-sentence immediate action recommendation."
    }
  },
  required: ["fraud_score", "suspicious_elements", "contradictions", "why", "action"]
};

// Combined Schema
const fullAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    legalSummary: legalSummarySchema,
    fraudAnalysis: fraudAnalysisSchema
  },
  required: ["legalSummary", "fraudAnalysis"]
};

const getAIClient = () => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeDocument = async (
  fileBase64: string,
  mimeType: string
): Promise<FullAnalysisResult> => {
  const ai = getAIClient();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64,
            },
          },
          {
            text: `Analyze this document. 
            
            Module 1: Legal Summarizer
            Provide a plain-English summary, categorize the document type (e.g. Real Estate, Finance), explain key clauses, extract entities, and give recommendations.
            
            Module 2: Fraud & Risk Analyzer
            Evaluate fraud risk, text inconsistencies, and suspicious elements.
            
            If this is a screenshot of a text message or email, look for common scam patterns (urgency, overpayment, verify codes).
            
            Return the result strictly in JSON format matching the schema provided.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: fullAnalysisSchema,
        systemInstruction: "You are LegalSense, an expert legal AI designed to provide clarity on contracts and detect fraud. Do not invent facts. If information is missing, use 'unknown'. Use plain English, not legal jargon. Be protective of the user.",
        temperature: 0.2,
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from AI");
    }

    return JSON.parse(jsonText) as FullAnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const createChatSession = (fileBase64: string, mimeType: string): Chat => {
  const ai = getAIClient();
  
  return ai.chats.create({
    model: "gemini-3-pro-preview", // Upgraded to Pro for complex reasoning in Chat
    history: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: fileBase64 } },
          { text: "Here is the document I need help with." }
        ]
      },
      {
        role: "model",
        parts: [{ text: "I have read the document. I am ready to answer your questions about its clauses, risks, or specific terms. I can also verify facts using Google Search. How can I help?" }]
      }
    ],
    config: {
      tools: [{ googleSearch: {} }], // Added Google Search Grounding
      systemInstruction: `You are LegalSense, a simplified legal assistant. Your goal is to make complex legal documents strictly easy to understand.

      RULES FOR RESPONSES:
      1. BE BRIEF: Keep answers extremely short and crisp. No long paragraphs.
      2. PLAIN ENGLISH: Explain like the user is 12 years old. Absolutely no legal jargon.
      3. DIRECT: Start with the direct answer immediately. Don't say "Based on the document..." just say the answer.
      4. FORMATTING: Use bullet points heavily.
      5. SCOPE: Answer based only on the provided document and Google Search results.
      
      If you find a risk, state it clearly in one sentence.
      Disclaimer: You are an AI, not a lawyer.`
    }
  });
};