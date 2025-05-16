// src/providers/huggingface.ts
import { HfInference } from '@huggingface/inference';
import { LLMProvider } from './base';

export class HuggingFaceProvider implements LLMProvider {
  private client: HfInference;
  private model: string;

  constructor(apiKey: string, model = 'facebook/opt-1.3b') {  // Changed default model
    this.client = new HfInference(apiKey);
    this.model = model;
  }

  async analyze(prompt: string): Promise<string> {
    try {
      // Using text-generation task
      const response = await this.client.textGeneration({
        model: this.model,
        inputs: prompt,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.7,
          top_p: 0.95,
          return_full_text: false
        }
      });

      return response.generated_text || 'No analysis available';
    } catch (error) {
      // Try alternative model if first one fails
      try {
        const fallbackModel = 'bigscience/bloom-560m';
        console.warn(`Falling back to ${fallbackModel}`);
        
        const response = await this.client.textGeneration({
          model: fallbackModel,
          inputs: prompt,
          parameters: {
            max_new_tokens: 250,
            temperature: 0.7,
            return_full_text: false
          }
        });

        return response.generated_text || 'No analysis available';
      } catch (fallbackError) {
        throw new Error(`HuggingFace analysis failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
      }
    }
  }
}