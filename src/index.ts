// src/index.ts
import 'openai/shims/node'; 
import OpenAI from "openai";
import "reflect-metadata";

const DEFAULT_MODEL = "gpt-3.5-turbo";

interface SmartErrorConfig {
  apiKey?: string;
  model?: string;
  collectStackTrace?: boolean;
  customPrompt?: string;
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

let globalConfig: SmartErrorConfig = {
  model: DEFAULT_MODEL,
  collectStackTrace: true,
};

// Initialize OpenAI
let openai: OpenAI;

// Configure the package
export function configure(config: SmartErrorConfig) {
  globalConfig = { ...globalConfig, ...config };
  if (config.apiKey) {
    openai = new OpenAI({ apiKey: config.apiKey });
  }
}

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

async function analyzeError(
  error: Error,
  context: {
    methodName: string;
    className: string;
    args: any[];
    [key: string]: any;
  }
) {
  if (!openai) {
    throw new Error('SmartErrorLens: OpenAI configuration is missing. Please call configure() with your API key.');
  }

  const stackTrace = error.stack || "";
  const errorMessage = error.message;

  const prompt = `
    As an AI debugging assistant, analyze this error:
    
    Error Type: ${error.name}
    Error Message: ${errorMessage}
    Method: ${context.className}.${context.methodName}
    Stack Trace: ${stackTrace}
    
    Please provide:
    1. Root cause analysis
    2. Potential solutions
    3. Best practices to prevent this error
    4. Code example for fix if possible
  `;

  try {
    const response = await openai.chat.completions.create({
      model: globalConfig.model || "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    return {
      error: {
        type: error.name,
        message: errorMessage,
        stack: stackTrace,
      },
      analysis: response.choices[0].message?.content || 'No analysis available',
      context: {
        method: `${context.className}.${context.methodName}`,
        arguments: context.args,
      },
    };
  } catch (aiError) {
    return {
      error: {
        type: error.name,
        message: errorMessage,
        stack: stackTrace,
      },
      analysis: "Failed to get AI analysis",
      context: {
        method: `${context.className}.${context.methodName}`,
        arguments: context.args,
      },
    };
  }
}
