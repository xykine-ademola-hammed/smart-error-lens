import { Groq } from 'groq-sdk';
import { LLMProvider } from './base';

export class GroqProvider implements LLMProvider {
  private client: Groq;
  private model: string;
  
  constructor(apiKey: string, model = 'mixtral-8x7b') {
    this.client = new Groq({
      apiKey: apiKey
    });
    this.model = model;
  }

  async analyze(prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        messages: [  {
            role: 'system',
            content: 'You are an expert software developer analyzing code errors. Provide detailed, actionable insights.'
        },
        {
            role: "user",
            content: prompt
          }],
        // model: this.model || "meta-llama/llama-4-scout-17b-16e-instruct",
        model: this.model,
        temperature: 0.3, // Lower temperature for more focused responses
        max_tokens: 1024,
      });

      return response.choices[0]?.message?.content || ''

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Groq API Error: ${error.message}`);
      } else {
        throw new Error('Groq API Error: An unknown error occurred');
      }
    }
  }

  
}

