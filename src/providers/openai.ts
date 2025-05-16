// src/providers/openai.ts
import OpenAI from 'openai';
import { LLMProvider } from './base';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async analyze(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0].message?.content || 'No analysis available';
  }
}