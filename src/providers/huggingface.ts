// src/providers/huggingface.ts
import { HfInference } from '@huggingface/inference';
import { LLMProvider } from './base';

export class HuggingFaceProvider implements LLMProvider {
  private client: HfInference;
  private model: string;

  constructor(apiKey: string, model = 'gpt2') {
    this.client = new HfInference(apiKey);
    this.model = model;
  }

  async analyze(prompt: string): Promise<string> {
    try {
      const response = await this.client.textGeneration({
        model: this.model,
        inputs: prompt,
        parameters: {
          max_length: 500,
          temperature: 0.7
        }
      });
      return response.generated_text;
    } catch (error) {
      throw new Error(`HuggingFace analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

