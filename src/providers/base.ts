// src/providers/base.ts
export interface LLMProvider {
    analyze(prompt: string): Promise<string>;
  }
  