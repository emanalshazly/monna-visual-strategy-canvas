import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import type { AnalysisProvider } from '../contracts.js';
import { FakeAnalysisProvider } from './fake-analysis-provider.js';
import { GeminiAnalysisProvider } from './gemini-analysis-provider.js';
import { OpenAIAnalysisProvider } from './openai-analysis-provider.js';

export function createProvider(env: NodeJS.ProcessEnv = process.env): AnalysisProvider {
  const selected = env.AI_PROVIDER || 'gemini';
  if (selected === 'gemini') {
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required when AI_PROVIDER=gemini');
    return new GeminiAnalysisProvider(new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) as never);
  }
  if (selected === 'openai') {
    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
    return new OpenAIAnalysisProvider(new OpenAI({ apiKey: env.OPENAI_API_KEY }) as never);
  }
  if (selected === 'fake' && env.NODE_ENV !== 'production') return new FakeAnalysisProvider();
  throw new Error(`Unsupported AI_PROVIDER: ${selected}`);
}
