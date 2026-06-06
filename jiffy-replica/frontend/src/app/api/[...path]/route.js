const DEFAULT_LOCAL_BACKEND = 'http://localhost:5000';

const MIGRATED_EDGE_ROUTES = [
  /^\/api\/services(?:\/|$)/,
  /^\/api\/admin-invitations(?:\/|$)/,
  /^\/api\/admin\/invitations(?:\/|$)/,
  /^\/api\/admin\/manage-admins(?:\/|$)/,
  /^\/api\/auth\/(?:login|logout|refresh|me|profile|change-password)$/,
  /^\/api\/bookings(?:\/|$)/,
  /^\/api\/quotes-invoices(?:\/|$)/,
  /^\/api\/payments(?:\/|$)/,
];

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

const cleanBaseUrl = (url) => url?.replace(/\/+$/, '') || null;

const getEdgeApiBaseUrl = () => {
  const edgeUrl = process.env.SUPABASE_EDGE_API_URL;
  return cleanBaseUrl(edgeUrl);
};

const getLegacyApiBaseUrl = () => {
  const legacyUrl = process.env.LEGACY_API_BASE_URL;
  if (legacyUrl) return cleanBaseUrl(legacyUrl);

  const publicLegacyUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicLegacyUrl) return cleanBaseUrl(publicLegacyUrl);

  if (process.env.NODE_ENV !== 'production') return DEFAULT_LOCAL_BACKEND;

  return null;
};

const isMigratedApiPath = (apiPath) => MIGRATED_EDGE_ROUTES.some((route) => route.test(apiPath));

const getMigratedApiBaseUrl = (apiPath) => {
  const edgeUrl = getEdgeApiBaseUrl();
  if (edgeUrl && isMigratedApiPath(apiPath)) return edgeUrl;

  const legacyUrl = getLegacyApiBaseUrl();
  if (legacyUrl) return legacyUrl;

  return edgeUrl;
};

const buildTargetUrl = (request, pathSegments) => {
  const apiPath = `/api/${pathSegments.join('/')}`;
  const baseUrl = getMigratedApiBaseUrl(apiPath);
  if (!baseUrl) return null;

  const sourceUrl = new URL(request.url);
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
        message: 'API backend is not configured. Set SUPABASE_EDGE_API_URL and LEGACY_API_BASE_URL for Netlify.',
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
