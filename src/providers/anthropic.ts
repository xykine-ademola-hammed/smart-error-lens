// src/providers/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from './base';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-2') {
    this.client = new Anthropic({
      apiKey: apiKey,
    });
    this.model = model;
  }

  async analyze(prompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });

      return response.content.map(block => block.type).join('');
    } catch (error) {
      throw new Error(`Anthropic analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}