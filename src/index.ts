// src/index.ts
import 'openai/shims/node';
import "reflect-metadata";
import { providers, LLMProvider } from './providers';

const DEFAULT_MODEL = "gpt-3.5-turbo";

// Interfaces
export interface SmartErrorConfig {
  provider?: 'mock' | 'openai' | 'huggingface' | 'palm' | 'anthropic';
  apiKey?: string;
  model?: string;
  collectStackTrace?: boolean;
  customPrompt?: string;
  mockMode?: boolean;
}

interface ErrorAnalysis {
  error: {
    type: string;
    message: string;
    stack: string;
  };
  analysis: string;
  context: {
    method: string;
    arguments: any[];
  };
}

interface AnalysisContext {
  methodName: string;
  className: string;
  args: any[];
  [key: string]: any;
}

// Custom Error Types
export class SmartErrorLensConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmartErrorLensConfigError';
  }
}

export class SmartErrorLensAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmartErrorLensAnalysisError';
  }
}

// Global Configuration
let globalConfig: SmartErrorConfig = {
  provider: 'mock',
  model: DEFAULT_MODEL,
  collectStackTrace: true,
  mockMode: false
};

// Initialize Provider
let llmProvider: LLMProvider;

// Configure the package
export function configure(config: SmartErrorConfig) {
  try {
    globalConfig = { ...globalConfig, ...config };

    if (config.mockMode || !config.apiKey) {
      console.log('SmartErrorLens: Running in mock mode');
      llmProvider = new providers.mock('');
      return;
    }

    const providerName = config.provider || 'mock';
    const Provider = providers[providerName];
    
    if (!Provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    llmProvider = new Provider(config.apiKey);
  } catch (error) {
    console.warn('Provider initialization failed, falling back to mock mode');
    llmProvider = new providers.mock('');
    if (error instanceof Error) {
      throw new SmartErrorLensConfigError(`Configuration failed: ${error.message}`);
    }
  }
}

// Generate analysis prompt
function generatePrompt(error: Error, context: AnalysisContext): string {
  return `
    As an AI debugging assistant, analyze this error:
    
    Error Type: ${error.name}
    Error Message: ${error.message}
    Method: ${context.className}.${context.methodName}
    Stack Trace: ${error.stack}
    
    Please provide:
    1. Root cause analysis
    2. Potential solutions
    3. Best practices to prevent this error
    4. Code example for fix if possible
  `;
}

// Main decorator
export function SmartError(options: SmartErrorConfig = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const errorInfo = await analyzeError(error as Error, {
          methodName: propertyKey,
          className: target.constructor.name,
          args,
          ...options,
        });

        console.group("🔍 SmartErrorLens Analysis");
        console.error("❌ Error:", errorInfo.error);
        console.info("📝 Analysis:", errorInfo.analysis);
        console.info("📍 Context:", errorInfo.context);
        console.groupEnd();

        throw error;
      }
    };

    return descriptor;
  };
}

// Error analysis function
async function analyzeError(error: Error, context: AnalysisContext): Promise<ErrorAnalysis> {
  try {
    const stackTrace = error.stack || "";
    const errorMessage = error.message;

    // Create base error info
    const errorInfo: ErrorAnalysis = {
      error: {
        type: error.name,
        message: errorMessage,
        stack: stackTrace,
      },
      analysis: '',
      context: {
        method: `${context.className}.${context.methodName}`,
        arguments: context.args,
      },
    };

    try {
      errorInfo.analysis = await llmProvider.analyze(generatePrompt(error, context));
    } catch (aiError) {
      console.warn('Analysis failed, falling back to mock provider');
      errorInfo.analysis = await new providers.mock('').analyze(generatePrompt(error, context));
    }

    return errorInfo;

  } catch (analyzeError) {
    throw new SmartErrorLensAnalysisError(
      `Error analysis failed: ${analyzeError instanceof Error ? analyzeError.message : 'Unknown error'}`
    );
  }
}

export { providers };