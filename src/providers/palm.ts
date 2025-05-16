// src/providers/palm.ts
import { TextServiceClient } from '@google-ai/generativelanguage';
import { GoogleAuth } from 'google-auth-library';
import { LLMProvider } from './base';

export class PaLMProvider implements LLMProvider {
  private client: TextServiceClient;
  private model: string;

  constructor(apiKey: string, model = 'models/text-bison-001') {
    this.client = new TextServiceClient({
      authClient: new GoogleAuth().fromAPIKey(apiKey),
    });
    this.model = model;
  }

  async analyze(prompt: string): Promise<string> {
    try {
      const [response] = await this.client.generateText({
        model: this.model,
        prompt: { text: prompt }
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No response from PaLM');
      }

      return response.candidates[0].output || 'No analysis available';
    } catch (error) {
      throw new Error(`PaLM analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
