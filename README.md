# SmartErrorLens

AI-powered error analysis for TypeScript/Node.js applications.

## Installation

```bash
npm install smart-error-lens

// Using HuggingFace
configure({
  provider: 'huggingface',
  apiKey: 'your-huggingface-token',
  model: 'gpt2' // optional
});

// Using PaLM
configure({
  provider: 'palm',
  apiKey: 'your-palm-api-key',
  model: 'models/text-bison-001' // optional
});

// Using Anthropic
configure({
  provider: 'anthropic',
  apiKey: 'your-anthropic-key',
  model: 'claude-2' // optional
});
```
