import type {
  AssistantConversationHistoryMessage,
  AssistantStructuredResponse,
  FinancialAssistantStructuredData,
  PurchaseSimulation
} from '../src/modules/ai/types/assistant.js';
import { financialAssistantDataSchema } from './ai-schema.js';
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
      data: {
        recommendation: request.simulation.simulationFeasible
          ? 'A compra parece administravel apenas se continuar cabendo nos compromissos e no orcamento monitorado.'
          : 'A compra merece cautela porque o impacto estimado supera a folga financeira atual.',
        insights: request.simulation.reasons.slice(0, 3),
        simulation: {
          installmentAmount: request.simulation.cashflowImpact[0]?.amount,
          installments: request.simulation.installments,
          purchaseAmount: request.simulation.purchaseAmount,
          safeToSpendAfter: request.simulation.planningImpact.remainingAfterPurchase ?? undefined,
          safeToSpendBefore: request.context.monthlyPlan?.safe_to_spend ?? undefined
        },
        summary: `Pelos dados atuais, a simulacao ficou como ${scoreLabel[request.simulation.decisionScore]}.`,
        warnings: request.simulation.simulationFeasible
          ? []
          : ['O impacto estimado ultrapassa a capacidade segura ou o limite analisado.']
      },
      message: [
        `Resumo: pelos dados atuais, a simulacao ficou como ${scoreLabel[request.simulation.decisionScore]}.`,
        `Recomendacao: ${
          request.simulation.simulationFeasible
            ? 'avance apenas se essa compra continuar confortavel frente aos compromissos do mes.'
            : 'evite seguir agora sem ajustar fluxo, limite ou orcamento.'
        }`,
        request.simulation.reasons.join(' ')
      ].join('\n\n'),
      simulation: request.simulation,
      type: 'financial_assistant'
    };
  }
  const monthlyPlan = request.context.monthlyPlan;
  const warningItems =
    request.context.budgets.filter((budget) => budget.status !== 'within_limit').length > 0
      ? ['Ha categorias em alerta ou proximas de exceder o orcamento.']
      : [];

  return {
    data: {
      recommendation: monthlyPlan?.safe_to_spend
        ? 'Use a capacidade segura de gasto e os alertas de orcamento como referencia para suas decisoes deste mes.'
        : 'Defina um planejamento mensal para melhorar a precisao das proximas analises.',
      insights: [
        `Saldo total atual em contas: ${formatCurrency(request.context.balances.total)}.`,
        monthlyPlan
          ? `Capacidade segura de gasto no mes: ${formatCurrency(monthlyPlan.safe_to_spend)}.`
          : 'Ainda nao ha snapshot mensal consolidado para esta competencia.'
      ],
      summary: monthlyPlan
        ? `Voce tem ${formatCurrency(monthlyPlan.safe_to_spend)} de capacidade segura de gasto e saldo projetado de ${formatCurrency(monthlyPlan.projected_month_end_balance)} ate o fim do mes.`
        : 'Ainda nao encontrei um planejamento mensal consolidado para esta competencia.',
      warnings: warningItems
    },
    message: monthlyPlan
      ? `Resumo: voce tem ${formatCurrency(monthlyPlan.safe_to_spend)} de capacidade segura de gasto neste mes.\n\nRecomendacao: acompanhe as categorias em alerta antes de assumir novas despesas.\n\nInsight: saldo projetado no fim do mes em ${formatCurrency(monthlyPlan.projected_month_end_balance)}.`
      : 'Ainda nao encontrei um snapshot mensal consolidado suficiente para uma analise mais precisa.',
    type: 'financial_assistant'
  };
}

function normalizeAssistantMessage(data: FinancialAssistantStructuredData) {
  const insights = data.insights.length ? `Insights: ${data.insights.join(' ')}` : '';
  const warnings = data.warnings.length ? `Alertas: ${data.warnings.join(' ')}` : '';

  return {
    message: [data.summary, data.recommendation, insights, warnings].filter(Boolean).join('\n\n')
  };
}

function withBackendGrounding(
  data: FinancialAssistantStructuredData,
  fallback: AssistantStructuredResponse
): FinancialAssistantStructuredData {
  if (!fallback.simulation) {
    return data;
  }

  return {
    ...data,
    simulation: {
      installmentAmount:
        fallback.simulation.cashflowImpact[0]?.amount ?? data.simulation?.installmentAmount,
      installments: fallback.simulation.installments,
      purchaseAmount: fallback.simulation.purchaseAmount,
      safeToSpendAfter:
        fallback.simulation.planningImpact.safeToSpendAfterPurchase ?? data.simulation?.safeToSpendAfter,
      safeToSpendBefore:
        fallback.simulation.planningImpact.safeToSpendBeforePurchase ?? data.simulation?.safeToSpendBefore
    }
  };
}

function coerceStructuredData(
  rawText: string | undefined,
  fallback: AssistantStructuredResponse
): AssistantStructuredResponse {
  if (!rawText) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawText) as unknown;
    const result = financialAssistantDataSchema.safeParse(parsed);

    if (!result.success) {
      return fallback;
    }

    const groundedData = withBackendGrounding(result.data, fallback);

    return {
      data: groundedData,
      message: normalizeAssistantMessage(groundedData).message,
      simulation: fallback.simulation,
      type: 'financial_assistant'
    };
  } catch {
    return fallback;
  }
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
    const fallback = buildGroundedFallback(request);

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

      return coerceStructuredData(data.output_text, fallback);
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
    const fallback = buildGroundedFallback(request);

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

      return coerceStructuredData(text, fallback);
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
