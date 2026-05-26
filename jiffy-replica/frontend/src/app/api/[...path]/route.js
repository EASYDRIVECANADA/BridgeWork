const DEFAULT_LOCAL_BACKEND = 'http://localhost:5000';

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
]);

const getApiBaseUrl = () => {
  const edgeUrl = process.env.SUPABASE_EDGE_API_URL;
  if (edgeUrl) return edgeUrl.replace(/\/+$/, '');

  const legacyUrl = process.env.LEGACY_API_BASE_URL;
  if (legacyUrl) return legacyUrl.replace(/\/+$/, '');

  const publicLegacyUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicLegacyUrl) return publicLegacyUrl.replace(/\/+$/, '');

  if (process.env.NODE_ENV !== 'production') return DEFAULT_LOCAL_BACKEND;

  return null;
};

const buildTargetUrl = (request, pathSegments) => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return null;

  const sourceUrl = new URL(request.url);
  const apiPath = `/api/${pathSegments.join('/')}`;
  return `${baseUrl}${apiPath}${sourceUrl.search}`;
};

const buildForwardHeaders = (request) => {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!hopByHopHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
};

async function proxyRequest(request, context) {
  const targetUrl = buildTargetUrl(request, context.params.path || []);

  if (!targetUrl) {
    return Response.json(
      {
        success: false,
        message: 'API backend is not configured. Set SUPABASE_EDGE_API_URL for Netlify.',
      },
      { status: 502 }
    );
  }

  const method = request.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);
  const response = await fetch(targetUrl, {
    method,
    headers: buildForwardHeaders(request),
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
