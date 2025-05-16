// src/providers/mock.ts
import { LLMProvider } from './base';

export class MockProvider implements LLMProvider {
    constructor(apiKey?: string) {}
  
    async analyze(prompt: string): Promise<string> {
      return `Mock Analysis: This is a simulated response for the prompt "${prompt}"`;
    }
  }