// Move all interfaces to the top for better organization
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

let globalConfig: SmartErrorConfig = {
  model: "gpt-3.5-turbo",
  collectStackTrace: true,
  mockMode: false
  };

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

// Add custom error types
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

// Initialize OpenAI
let openai: OpenAI;

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
    const response = await openai.chat.completions.create({
      model: globalConfig.model || DEFAULT_MODEL,
      messages: [{ 
        role: "user", 
        content: generatePrompt(error, context)
      }],
    });

    errorInfo.analysis = response.choices[0].message?.content || 'No analysis available';
    return errorInfo;

  } catch (analyzeError) {
    const errorMessage = analyzeError instanceof Error ? analyzeError.message : 'Unknown error';
    throw new SmartErrorLensAnalysisError(
      `Error analysis failed: ${errorMessage}`
    );
  }
}

// Separate prompt generation
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

// Add mock analysis function
function getMockAnalysis(error: Error, context: any) {
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