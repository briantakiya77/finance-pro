import { createReadStream, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import { createAIProvider } from './ai-provider.js';
import { AIOrchestrator } from './ai-orchestrator.js';
import { getServerConfig } from './config.js';
import { assertRateLimit } from './rate-limit.js';
import { createAuthenticatedSupabaseContext } from './supabase.js';

const config = getServerConfig();
const provider = createAIProvider(config);
const distPath = resolve(process.cwd(), 'dist');
const requestBodyLimitBytes = 16 * 1024;

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(payload));
}

function applyCors(request: IncomingMessage, response: ServerResponse) {
  const origin = request.headers.origin;

  if (!config.frontendUrl || !origin) {
    return;
  }

  if (origin === config.frontendUrl) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Vary', 'Origin');
  }
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > requestBodyLimitBytes) {
      throw new Error('request body too large');
    }

    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as unknown;
}

function handleHealth(response: ServerResponse) {
  sendJson(response, 200, {
    ok: true
  });
}

async function handleFinancialAssistant(request: IncomingMessage, response: ServerResponse) {
  const requestId = randomUUID();
  const startedAt = Date.now();

  try {
    const requestContext = await createAuthenticatedSupabaseContext(
      config,
      request.headers.authorization
    );
    assertRateLimit(requestContext.userId, config.aiRateLimitPerMinute);

    const body = await readJsonBody(request);
    const result = await new AIOrchestrator(provider, requestContext).handleChat(
      body as { conversationId?: string | null; message: string }
    );

    console.info(
      JSON.stringify({
        provider: config.aiProvider,
        requestId,
        status: 'ok',
        tookMs: Date.now() - startedAt,
        tool: 'financial_assistant'
      })
    );

    sendJson(response, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'assistant unavailable';
    const statusCode =
      message === 'rate limit exceeded'
        ? 429
        : message === 'authenticated user required'
          ? 401
          : message === 'request not allowed'
            ? 400
            : message === 'message length invalid' || message === 'request body too large'
              ? 400
              : 503;

    console.error(
      JSON.stringify({
        error: message,
        provider: config.aiProvider,
        requestId,
        status: 'error',
        tookMs: Date.now() - startedAt
      })
    );

    sendJson(response, statusCode, {
      error:
        statusCode === 401
          ? 'UNAUTHENTICATED'
          : statusCode === 429
            ? 'AI_RATE_LIMIT'
            : statusCode === 400
              ? 'AI_REQUEST_INVALID'
              : 'AI_ASSISTANT_UNAVAILABLE',
      message:
        statusCode === 401
          ? 'Sua sessao nao e valida para consultar a assistente financeira.'
          : statusCode === 429
            ? 'Voce atingiu o limite temporario de consultas da assistente. Tente novamente em instantes.'
            : statusCode === 400
              ? 'Nao foi possivel processar a sua pergunta.'
              : 'Nao foi possivel concluir a analise agora.'
    });
  }
}

async function serveStatic(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const normalizedPath = decodeURIComponent(url.pathname);
  const requestedPath = normalizedPath === '/' ? '/index.html' : normalizedPath;
  const filePath = resolve(join(distPath, requestedPath));

  if (!filePath.startsWith(distPath)) {
    response.writeHead(403);
    response.end();
    return;
  }

  const resolvedFilePath = existsSync(filePath) ? filePath : join(distPath, 'index.html');
  const extension = extname(resolvedFilePath);

  response.writeHead(200, {
    'Content-Type': contentTypes[extension] ?? 'application/octet-stream'
  });

  if (resolvedFilePath.endsWith('index.html')) {
    response.end(await readFile(resolvedFilePath));
    return;
  }

  createReadStream(resolvedFilePath).pipe(response);
}

const server = createServer(async (request, response) => {
  applyCors(request, response);

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === 'GET' && (request.url === '/api/health' || request.url === '/health')) {
    handleHealth(response);
    return;
  }

  if (
    request.method === 'POST' &&
    (request.url === '/api/ai/financial-assistant' || request.url === '/api/ai/chat')
  ) {
    await handleFinancialAssistant(request, response);
    return;
  }

  if (request.method === 'GET') {
    await serveStatic(request, response);
    return;
  }

  sendJson(response, 405, {
    error: 'method not allowed'
  });
});

server.listen(config.port, () => {
  console.info(`Finance Pro server listening on ${config.port}`);
});
