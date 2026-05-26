import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/responses.ts";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

const LEGACY_API_BASE_URL = Deno.env.get("LEGACY_API_BASE_URL")?.replace(/\/+$/, "");
const FUNCTION_PREFIX = "/bridgework-api";

function getRoutePath(url: URL) {
  if (url.pathname === FUNCTION_PREFIX) return "/";
  if (url.pathname.startsWith(`${FUNCTION_PREFIX}/`)) {
    return url.pathname.slice(FUNCTION_PREFIX.length);
  }
  return url.pathname;
}

function parsePagination(url: URL) {
  const limit = Number.parseInt(url.searchParams.get("limit") || "50", 10);
  const offset = Number.parseInt(url.searchParams.get("offset") || "0", 10);
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 50,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
  };
}

async function handleServicesRequest(req: Request, url: URL, supabase: SupabaseAdmin) {
  const pathname = getRoutePath(url);

  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  if (pathname === "/api/services") {
    const { limit, offset } = parsePagination(url);
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    const salesChannel = url.searchParams.get("sales_channel");

    let query = supabase
      .from("services")
      .select("*, service_categories(id, name, slug)", { count: "exact" })
      .eq("is_active", true);

    if (salesChannel) query = query.eq("sales_channel", salesChannel);
    if (category) query = query.eq("category_id", category);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error, count } = await query
      .order("name")
      .range(offset, offset + limit - 1);

    if (error) return errorResponse("Failed to fetch services", 500);

    return jsonResponse({
      success: true,
      data: {
        services: data || [],
        pagination: { limit, offset, total: count },
      },
    });
  }

  if (pathname === "/api/services/search") {
    const q = url.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return errorResponse("Search query must be at least 2 characters", 400);
    }

    const { data, error } = await supabase
      .from("services")
      .select("id, name, slug, short_description, base_price, service_categories(slug)")
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,tags.cs.{${q}}`)
      .eq("is_active", true)
      .limit(10);

    if (error) return errorResponse("Search failed", 500);
    return jsonResponse({ success: true, data: { results: data || [] } });
  }

  if (pathname === "/api/services/categories") {
    const salesChannel = url.searchParams.get("sales_channel");
    let query = supabase
      .from("service_categories")
      .select("*")
      .eq("is_active", true);

    if (salesChannel) query = query.eq("sales_channel", salesChannel);

    const { data, error } = await query.order("display_order");
    if (error) return errorResponse("Failed to fetch categories", 500);

    return jsonResponse({ success: true, data: { categories: data || [] } });
  }

  const categoryMatch = pathname.match(/^\/api\/services\/categories\/([^/]+)$/);
  if (categoryMatch) {
    const { data, error } = await supabase
      .from("service_categories")
      .select("*, services(id, name, slug, short_description, base_price, is_active)")
      .eq("id", categoryMatch[1])
      .eq("is_active", true)
      .single();

    if (error || !data) return errorResponse("Category not found", 404);

    return jsonResponse({
      success: true,
      data: {
        category: {
          ...data,
          services: (data.services || []).filter((service: { is_active?: boolean }) => service.is_active),
        },
      },
    });
  }

  const serviceMatch = pathname.match(/^\/api\/services\/([^/]+)$/);
  if (serviceMatch) {
    const { data, error } = await supabase
      .from("services")
      .select("*, service_categories(id, name, slug, description)")
      .eq("id", serviceMatch[1])
      .eq("is_active", true)
      .single();

    if (error || !data) return errorResponse("Service not found", 404);
    return jsonResponse({ success: true, data: { service: data } });
  }

  return null;
}

async function proxyToLegacy(req: Request, url: URL) {
  if (!LEGACY_API_BASE_URL) {
    return errorResponse("Route is not migrated and LEGACY_API_BASE_URL is not configured", 501);
  }

  const targetUrl = `${LEGACY_API_BASE_URL}${getRoutePath(url)}${url.search}`;
  const headers = new Headers(req.headers);
  headers.delete("host");

  const method = req.method.toUpperCase();
  const response = await fetch(targetUrl, {
    method,
    headers,
    body: ["GET", "HEAD"].includes(method) ? undefined : await req.arrayBuffer(),
    redirect: "manual",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Access-Control-Allow-Headers", corsHeaders["Access-Control-Allow-Headers"]);
  responseHeaders.delete("content-length");
  responseHeaders.delete("content-encoding");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = getRoutePath(url);

  if (pathname === "/health") {
    return jsonResponse({
      success: true,
      message: "BridgeWork Edge API is running",
      timestamp: new Date().toISOString(),
      environment: Deno.env.get("ENVIRONMENT") || "edge",
    });
  }

  const supabase = createSupabaseAdmin();

  if (pathname.startsWith("/api/services")) {
    const response = await handleServicesRequest(req, url, supabase);
    if (response) return response;
  }

  return proxyToLegacy(req, url);
});
