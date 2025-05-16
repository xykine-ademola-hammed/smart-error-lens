// src/index.ts
import 'openai/shims/node'; 
import OpenAI from "openai";
import "reflect-metadata";

const DEFAULT_MODEL = "gpt-3.5-turbo";

// Interfaces
export interface SmartErrorConfig {
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
  model: DEFAULT_MODEL,
  collectStackTrace: true,
  mockMode: false
};

// Initialize OpenAI
let openai: OpenAI;

// Configure the package
export function configure(config: SmartErrorConfig) {
  try {
    globalConfig = { ...globalConfig, ...config };
    
    if (config.mockMode) {
      console.log('SmartErrorLens: Running in mock mode');
      return;
    }
    
    if (!config.apiKey) {
      console.warn('SmartErrorLens: No API key provided. Using mock mode.');
      globalConfig.mockMode = true;
      return;
    }

    openai = new OpenAI({ apiKey: config.apiKey });
  } catch (error) {
    if (error instanceof Error) {
      throw new SmartErrorLensConfigError(`Configuration failed: ${error.message}`);
    } else {
      throw new SmartErrorLensConfigError('Configuration failed: Unknown error');
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

// Mock analysis generation
function getMockAnalysis(error: Error, context: AnalysisContext): string {
  return `
    🔍 Mock Error Analysis:
    
    Error Type: ${error.name}
    Error Message: ${error.message}
    Location: ${context.className}.${context.methodName}
    
    Root Cause Analysis:
    - This appears to be a ${error.name} error
    - The error occurred in the ${context.methodName} method
    - Common cause: Invalid input or missing validation
    
    Potential Solutions:
    1. Validate input parameters before processing
    2. Add appropriate error checks
    3. Implement proper error handling
    
    Best Practices:
    - Always validate input data
    - Use type checking when necessary
    - Implement proper error boundaries
    
    Example Fix:
    try {
      // Validate input
      if (!inputData) throw new Error('Input is required');
      
      // Process data
      processData(inputData);
    } catch (error) {
      // Handle error appropriately
      logger.error(error);
      throw new Error('Processing failed: ' + error.message);
    }
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

    // If in mock mode or no OpenAI instance, return mock analysis
    if (globalConfig.mockMode || !openai) {
      errorInfo.analysis = getMockAnalysis(error, context);
      return errorInfo;
    }

    // OpenAI analysis
    try {
      const response = await openai.chat.completions.create({
        model: globalConfig.model || DEFAULT_MODEL,
        messages: [{ 
          role: "user", 
          content: generatePrompt(error, context)
        }],
      });

      errorInfo.analysis = response.choices[0].message?.content || 'No analysis available';
    } catch (aiError) {
      console.warn('OpenAI analysis failed, falling back to mock analysis ----', aiError);
      errorInfo.analysis = getMockAnalysis(error, context);
    }

    return errorInfo;

  } catch (analyzeError) {
    throw new SmartErrorLensAnalysisError(
      `Error analysis failed: ${analyzeError instanceof Error ? analyzeError.message : 'Unknown error'}`
    );
  }
}