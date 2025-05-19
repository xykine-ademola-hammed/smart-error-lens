import 'openai/shims/node';
import "reflect-metadata";
import { providers, LLMProvider } from './providers';
import chalk from 'chalk'; // For colorful console output

const DEFAULT_MODEL = "gpt-3.5-turbo";

// Interfaces
export interface SmartErrorConfig {
  provider?: 'mock' | 'openai' | 'huggingface' | 'palm' | 'anthropic' | 'groq';
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
    sourceCode?: string;
  };
}

interface AnalysisContext {
  methodName: string;
  className: string;
  args: any[];
  sourceCode?: string;
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
  mockMode: false,
};

// Initialize Provider
let llmProvider: LLMProvider;

// Configure the package
export function configure(config: SmartErrorConfig) {
  try {
    globalConfig = { ...globalConfig, ...config };

    if (config.mockMode || !config.apiKey) {
      console.log(chalk.yellow('⚠️ SmartErrorLens: Running in mock mode'));
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
    console.warn(chalk.red('❌ Provider initialization failed, falling back to mock mode'));
    llmProvider = new providers.mock('');
    if (error instanceof Error) {
      throw new SmartErrorLensConfigError(`Configuration failed: ${error.message}`);
    }
  }
}

// Extract method source code
function getMethodSource(target: any, propertyKey: string): string | undefined {
  try {
    const method = target[propertyKey];
    return method.toString();
  } catch {
    return undefined;
  }
}

// Generate analysis prompt with source code
function generatePrompt(error: Error, context: AnalysisContext): string {
  const sourceCodeSection = context.sourceCode
    ? `
    Method Source Code:
    \`\`\`typescript
    ${context.sourceCode}
    \`\`\`
    `
    : 'Method Source Code: Not available';

  return `
    As an AI debugging assistant, analyze this error:

    Error Type: ${error.name}
    Error Message: ${error.message}
    Method: ${context.className}.${context.methodName}
    Stack Trace: ${error.stack || 'Not available'}
    ${sourceCodeSection}

    Please provide:
    1. Root cause analysis
    2. Potential solutions
    3. Best practices to prevent this error
    4. Code example for fix if possible
  `;
}

// Method Flow Diagram
const methodFlowDiagram = `
graph TD
    A[Method Execution] -->|Throws Error| B[SmartError Decorator]
    B --> C[Analyze Error]
    C -->|Calls| D[LLM Provider]
    D -->|Generates| E[Prompt with Source Code]
    E --> F[AI Analysis]
    F --> G[Formatted Output]
    G --> H[Throw Original Error]
`;

// Main decorator
export function SmartError(options: SmartErrorConfig = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const sourceCode = getMethodSource(target, propertyKey);

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const errorInfo = await analyzeError(error as Error, {
          methodName: propertyKey,
          className: target.constructor.name,
          args,
          sourceCode,
          ...options,
        });

        // Beautiful console output
        console.group(chalk.cyan('🔍 SmartErrorLens Analysis'));
        console.error(chalk.red(`❌ Error: ${errorInfo.error.type}`));
        console.error(chalk.red(`   Message: ${errorInfo.error.message}`));
        console.info(chalk.blue('📝 Analysis:'));
        console.info(errorInfo.analysis);
        console.info(chalk.green('📍 Context:'));
        console.info(`   Method: ${errorInfo.context.method}`);
        console.info(`   Arguments:`, errorInfo.context.arguments);
        if (errorInfo.context.sourceCode) {
          console.info(chalk.yellow('📜 Source Code:'));
          console.info(errorInfo.context.sourceCode);
        }
        console.info(chalk.magenta('📊 Method Flow:'));
        console.info(methodFlowDiagram);
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
    const stackTrace = globalConfig.collectStackTrace ? error.stack || '' : '';
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
        sourceCode: context.sourceCode,
      },
    };

    try {
      errorInfo.analysis = await llmProvider.analyze(generatePrompt(error, context));
    } catch (aiError) {
      console.warn(chalk.yellow('⚠️ Analysis failed, falling back to mock provider'), aiError);
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