// src/providers/index.ts
import { HuggingFaceProvider } from './huggingface';
import { OpenAIProvider } from './openai';
import { MockProvider } from './mock';
import { PaLMProvider } from './palm';
import { AnthropicProvider } from './anthropic';
import { LLMProvider } from './base';

export const providers: Record<string, new (apiKey: string, model?: string) => LLMProvider> = {
  mock: MockProvider,
  openai: OpenAIProvider,
  huggingface: HuggingFaceProvider,
  palm: PaLMProvider,
  anthropic: AnthropicProvider
};
  
  export { LLMProvider };