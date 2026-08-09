import type {
  AssistantConversationHistoryMessage,
  AssistantStructuredResponse,
  PurchaseSimulation
} from '../src/modules/ai/types/assistant.js';
import type { ServerConfig } from './config.js';
import { formatCurrency } from './money.js';
import type { FinancialContext } from './financial-context.js';

export type AIProviderRequest = {
  conversationHistory: AssistantConversationHistoryMessage[];
  context: FinancialContext;
  message: string;
  simulation?: PurchaseSimulation;
  systemPrompt: string;
};

export interface AIProvider {
  generateResponse(request: AIProviderRequest): Promise<AssistantStructuredResponse>;
}

type ProviderName = 'gemini' | 'openai';

type ProviderErrorLog = {
  errorCode?: number | string;
  errorStatus?: string;
  httpStatus?: number;
  message: string;
  model: string;
  provider: ProviderName;
  statusText?: string;
  tookMs: number;
};

class AIProviderError extends Error {
  constructor(message = 'assistant unavailable') {
    super(message);
    this.name = 'AIProviderError';
  }
}

function sanitizeProviderMessage(message: string, secrets: Array<string | undefined>) {
  const withoutBearer = message.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]');
  const withoutJwt = withoutBearer.replace(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    '[redacted-jwt]'
  );

  return secrets.reduce<string>((safeMessage, secret) => {
    if (!secret) {
      return safeMessage;
    }

    return safeMessage.split(secret).join('[redacted-secret]');
  }, withoutJwt).slice(0, 500);
}

function logProviderError(details: ProviderErrorLog, secrets: Array<string | undefined>) {
  console.error(
    JSON.stringify({
      errorCode: details.errorCode,
      errorStatus: details.errorStatus,
      event: 'AI provider error',
      httpStatus: details.httpStatus,
      message: sanitizeProviderMessage(details.message, secrets),
      model: details.model,
      provider: details.provider,
      status: 'error',
      statusText: details.statusText,
      tookMs: details.tookMs
    })
  );
}

async function readProviderErrorBody(response: Response) {
  try {
    return (await response.json()) as {
      error?: {
        code?: number | string;
        message?: string;
        status?: string;
      };
    };
  } catch {
    return {};
  }
}

async function handleProviderHttpError(params: {
  model: string;
  provider: ProviderName;
  response: Response;
  secrets: Array<string | undefined>;
  startedAt: number;
}): Promise<never> {
  const body = await readProviderErrorBody(params.response);

  logProviderError(
    {
      errorCode: body.error?.code,
      errorStatus: body.error?.status,
      httpStatus: params.response.status,
      message: body.error?.message ?? params.response.statusText,
      model: params.model,
      provider: params.provider,
      statusText: params.response.statusText,
      tookMs: Date.now() - params.startedAt
    },
    params.secrets
  );

  throw new AIProviderError();
}

function handleProviderThrownError(params: {
  error: unknown;
  model: string;
  provider: ProviderName;
  secrets: Array<string | undefined>;
  startedAt: number;
}): never {
  const error = params.error as { message?: string; name?: string };
  const isTimeout = error.name === 'AbortError';

  logProviderError(
    {
      errorStatus: isTimeout ? 'TIMEOUT' : error.name,
      message: isTimeout ? 'provider request timed out' : error.message ?? 'provider request failed',
      model: params.model,
      provider: params.provider,
      tookMs: Date.now() - params.startedAt
    },
    params.secrets
  );

  throw new AIProviderError();
}

function buildGroundedFallback(request: AIProviderRequest): AssistantStructuredResponse {
  if (request.simulation) {
    const scoreLabel: Record<string, string> = {
      attention: 'atencao',
      not_feasible: 'nao viavel',
      risky: 'risco',
      safe: 'seguro'
    };

    return {
      message: [
        `Conclusao: pelos dados atuais, a simulacao ficou como ${scoreLabel[request.simulation.decisionScore]}.`,
        `Impacto: ${request.simulation.installmentAmountLabel}.`,
        `Motivo: ${request.simulation.reasons.join(' ')}`,
        'A decisao final continua sendo sua; eu estou apenas organizando o impacto conhecido.'
      ].join('\n\n'),
      simulation: request.simulation,
      type: 'purchase_simulation'
    };
  }

  const monthlyPlan = request.context.monthlyPlan as
    | {
        realized_expense?: string;
        realized_income?: string;
        realized_savings?: string;
        spending_limit?: string | null;
      }
    | null;

  const summaryLines = [
    `Saldo total atual: ${formatCurrency(request.context.accounts.totalBalance)}.`,
    monthlyPlan
      ? `Neste mes, receitas realizadas somam ${formatCurrency(monthlyPlan.realized_income)} e despesas realizadas somam ${formatCurrency(monthlyPlan.realized_expense)}.`
      : 'Ainda nao encontrei planejamento mensal definido para esta competencia.',
    monthlyPlan?.spending_limit
      ? `Limite mensal planejado: ${formatCurrency(monthlyPlan.spending_limit)}.`
      : 'Sem limite mensal planejado.',
    request.context.upcomingCommitments.length
      ? `Existem ${request.context.upcomingCommitments.length} compromissos proximos monitorados.`
      : 'Nao encontrei compromissos proximos no horizonte consultado.'
  ];

  return {
    message: summaryLines.join('\n\n'),
    type: 'text'
  };
}

function buildProviderResponse(
  message: string,
  simulation: PurchaseSimulation | undefined
): AssistantStructuredResponse {
  if (simulation) {
    return {
      message,
      simulation,
      type: 'purchase_simulation'
    };
  }

  return {
    message,
    type: 'text'
  };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

export class MockAIProvider implements AIProvider {
  async generateResponse(request: AIProviderRequest) {
    return buildGroundedFallback(request);
  }
}

export class OpenAIProvider implements AIProvider {
  constructor(private readonly config: ServerConfig) {}

  async generateResponse(request: AIProviderRequest) {
    if (!this.config.aiApiKey) {
      return buildGroundedFallback(request);
    }

    const startedAt = Date.now();

    try {
      const response = await fetchWithTimeout(
        'https://api.openai.com/v1/responses',
        {
          body: JSON.stringify({
            input: [
              {
                content: request.systemPrompt,
                role: 'system'
              },
              ...request.conversationHistory.map((message) => ({
                content: message.content,
                role: message.role
              })),
              {
                content: JSON.stringify({
                  financialContext: request.context,
                  purchaseSimulation: request.simulation ?? null,
                  userMessage: request.message
                }),
                role: 'user'
              }
            ],
            max_output_tokens: 900,
            model: this.config.aiModel
          }),
          headers: {
            Authorization: `Bearer ${this.config.aiApiKey}`,
            'Content-Type': 'application/json'
          },
          method: 'POST'
        },
        this.config.aiRequestTimeoutMs
      );

      if (!response.ok) {
        await handleProviderHttpError({
          model: this.config.aiModel,
          provider: 'openai',
          response,
          secrets: [this.config.aiApiKey],
          startedAt
        });
      }

      const data = (await response.json()) as {
        output_text?: string;
      };

      return buildProviderResponse(data.output_text || buildGroundedFallback(request).message, request.simulation);
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }

      handleProviderThrownError({
        error,
        model: this.config.aiModel,
        provider: 'openai',
        secrets: [this.config.aiApiKey],
        startedAt
      });
    }
  }
}

export class GeminiProvider implements AIProvider {
  constructor(private readonly config: ServerConfig) {}

  async generateResponse(request: AIProviderRequest) {
    if (!this.config.aiApiKey) {
      return buildGroundedFallback(request);
    }

    const startedAt = Date.now();

    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.aiModel}:generateContent?key=${this.config.aiApiKey}`,
        {
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: request.systemPrompt
                }
              ]
            },
            contents: [
              ...request.conversationHistory.map((message) => ({
                parts: [
                  {
                    text: message.content
                  }
                ],
                role: message.role === 'assistant' ? 'model' : 'user'
              })),
              {
                role: 'user',
                parts: [
                  {
                    text: JSON.stringify({
                      financialContext: request.context,
                      purchaseSimulation: request.simulation ?? null,
                      userMessage: request.message
                    })
                  }
                ]
              }
            ],
            generationConfig: {
              maxOutputTokens: 900,
              temperature: 0.2
            }
          }),
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'POST'
        },
        this.config.aiRequestTimeoutMs
      );

      if (!response.ok) {
        await handleProviderHttpError({
          model: this.config.aiModel,
          provider: 'gemini',
          response,
          secrets: [this.config.aiApiKey],
          startedAt
        });
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      return buildProviderResponse(text || buildGroundedFallback(request).message, request.simulation);
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }

      handleProviderThrownError({
        error,
        model: this.config.aiModel,
        provider: 'gemini',
        secrets: [this.config.aiApiKey],
        startedAt
      });
    }
  }
}

export function createAIProvider(config: ServerConfig): AIProvider {
  if (config.aiProvider === 'openai') {
    return new OpenAIProvider(config);
  }

  if (config.aiProvider === 'gemini') {
    return new GeminiProvider(config);
  }

  return new MockAIProvider();
}
