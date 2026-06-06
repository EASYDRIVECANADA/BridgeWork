import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });
}

function errorResponse(message: string, status = 500) {
  return jsonResponse({ success: false, message }, { status });
}

function createSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin environment is not configured");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
type DbRecord = Record<string, any>;

const LEGACY_API_BASE_URL = Deno.env.get("LEGACY_API_BASE_URL")?.replace(/\/+$/, "");
const PLATFORM_COMMISSION_RATE = Number.parseFloat(Deno.env.get("PLATFORM_COMMISSION_RATE") || "0.13");
const FUNCTION_PREFIXES = ["/functions/v1/bridgework-api", "/bridgework-api"];
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
const VALID_PERMISSION_KEYS = [
  "revenue",
  "services",
  "categories",
  "pro_applications",
  "profile_updates",
  "invitations",
  "payouts",
  "quotations",
  "quote_assignments",
  "quote_requests",
  "guest_quotes",
  "proofs",
  "support_chat",
  "disputes",
];

function getRoutePath(url: URL) {
  for (const prefix of FUNCTION_PREFIXES) {
    if (url.pathname === prefix) return "/";
    if (url.pathname.startsWith(`${prefix}/`)) {
      return url.pathname.slice(prefix.length);
    }
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

function generateInvitationToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function authenticateAdmin(req: Request, supabase: SupabaseAdmin, requireSuperAdmin = false) {
  const auth = await authenticateUser(req, supabase);
  if (auth.response) return auth;

  const profile = auth.profile!;
  if (profile.role !== "admin") {
    return { response: errorResponse("Insufficient permissions", 403) };
  }

  if (requireSuperAdmin && !profile.is_superadmin) {
    return { response: errorResponse("SuperAdmin access required", 403) };
  }

  return auth;
}

async function authenticateUser(req: Request, supabase: SupabaseAdmin) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { response: errorResponse("Authentication token required", 401) };
  }

  const token = authHeader.slice("Bearer ".length);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user) {
    return { response: errorResponse("Invalid or expired token", 401) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { response: errorResponse("User profile not found", 404) };
  }

  if (!profile.is_active) {
    return { response: errorResponse("Your account was deactivated", 403) };
  }

  return { user, profile };
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
    return "Password must contain at least one uppercase letter, one number, and one special character";
  }
  return null;
}

function validateAdminPermissions(adminPermissions: unknown) {
  if (adminPermissions === null || adminPermissions === undefined) return null;
  if (typeof adminPermissions !== "object" || Array.isArray(adminPermissions)) {
    return "admin_permissions must be a JSON object";
  }

  const invalidKeys = Object.keys(adminPermissions).filter((key) => !VALID_PERMISSION_KEYS.includes(key));
  if (invalidKeys.length > 0) {
    return `Invalid permission keys: ${invalidKeys.join(", ")}`;
  }

  for (const [key, value] of Object.entries(adminPermissions)) {
    if (typeof value !== "boolean") {
      return `Permission "${key}" must be a boolean`;
    }
  }

  return null;
}

async function writeAuditLog(
  supabase: SupabaseAdmin,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {},
) {
  await supabase.from("audit_log").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: String(targetId),
    details,
  });
}

async function getProProfile(
  supabase: SupabaseAdmin,
  userId: string,
  select = "id, user_id, service_categories",
): Promise<DbRecord | null> {
  const { data, error } = await supabase
    .from("pro_profiles")
    .select(select)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as DbRecord;
}

async function createNotification(
  supabase: SupabaseAdmin,
  userId: string,
  notification: { type: string; title: string; message: string; link?: string; data?: Record<string, unknown> },
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    link: notification.link || null,
    data: notification.data || {},
  });
}

function parsePositiveAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number.parseFloat(String(value || ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function buildExtendedQuotationNotes(body: Record<string, unknown>) {
  const { notes, your_price, duration_unit, materials_list } = body;
  if (materials_list || your_price || duration_unit) {
    return JSON.stringify({
      original_notes: notes || "",
      your_price: your_price ? Number.parseFloat(String(your_price)) : null,
      duration_unit: duration_unit || "minutes",
      materials_list: materials_list || [],
    });
  }
  return notes || null;
}

async function getTaxRate(supabase: SupabaseAdmin, serviceType = "quote") {
  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "tax_rate")
      .eq("service_type", serviceType)
      .single();

    if (error || !data) return 0.13;
    const value = Number.parseFloat(String(data.value));
    return Number.isFinite(value) ? value / 100 : 0.13;
  } catch {
    return 0.13;
  }
}

function parseMoney(value: unknown) {
  const amount = typeof value === "number" ? value : Number.parseFloat(String(value || 0));
  return Number.isFinite(amount) ? amount : 0;
}

function roundMoney(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

function percentLabel(rate: number) {
  return `${(rate * 100).toFixed(0)}%`;
}

function relatedOne(value: unknown): DbRecord | null {
  if (Array.isArray(value)) return (value[0] as DbRecord | undefined) || null;
  return (value as DbRecord | null) || null;
}

function appendStripeParam(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null) return;
  if (typeof value === "object" && !Array.isArray(value)) {
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      appendStripeParam(params, `${key}[${childKey}]`, childValue);
    }
    return;
  }
  params.append(key, String(value));
}

function buildStripeBody(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    appendStripeParam(params, key, value);
  }
  return params;
}

async function stripePaymentIntentRequest(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {},
): Promise<DbRecord> {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    throw Object.assign(new Error("Stripe is not configured"), { statusCode: 401 });
  }

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      ...(options.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: options.body ? buildStripeBody(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as DbRecord).error?.message || `Stripe request failed with status ${response.status}`;
    throw Object.assign(new Error(message), {
      statusCode: response.status,
      type: (data as DbRecord).error?.type,
      code: (data as DbRecord).error?.code,
    });
  }

  return data as DbRecord;
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) throw new Error("Stripe webhook secret is not configured");
  if (!signatureHeader) throw new Error("No signatures found matching the expected signature for payload.");

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, ...value] = part.split("=");
      return [key, value.join("=")];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) throw new Error("No signatures found matching the expected signature for payload.");

  const expected = await hmacSha256Hex(webhookSecret, `${timestamp}.${rawBody}`);
  if (!timingSafeEqualHex(expected, signature)) {
    throw new Error("No signatures found matching the expected signature for payload.");
  }
}

async function handlePaymentHeld(supabase: SupabaseAdmin, paymentIntent: DbRecord) {
  const { data: transaction } = await supabase
    .from("transactions")
    .update({ status: "held" })
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .select()
    .single();

  if (!transaction) return;

  await supabase
    .from("bookings")
    .update({ payment_held_at: new Date().toISOString() })
    .eq("id", transaction.booking_id);

  await createNotification(supabase, transaction.user_id, {
    type: "payment",
    title: "Payment Authorized",
    message: "Your payment has been authorized and is being held. It will only be charged after you confirm the job is complete.",
    link: `/bookings/${transaction.booking_id}`,
  });
}

async function handlePaymentSuccess(supabase: SupabaseAdmin, paymentIntent: DbRecord) {
  const { data: transaction } = await supabase
    .from("transactions")
    .update({
      status: "succeeded",
      stripe_charge_id: paymentIntent.latest_charge || null,
    })
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .select()
    .single();

  if (!transaction) return;

  await createNotification(supabase, transaction.user_id, {
    type: "payment",
    title: "Payment Charged",
    message: "Your payment has been charged. Thank you for confirming the job!",
    link: `/bookings/${transaction.booking_id}`,
  });
}

async function handlePaymentFailure(supabase: SupabaseAdmin, paymentIntent: DbRecord) {
  const { data: transaction } = await supabase
    .from("transactions")
    .update({ status: "failed" })
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .select()
    .single();

  if (!transaction) return;

  await createNotification(supabase, transaction.user_id, {
    type: "payment",
    title: "Payment Failed",
    message: "Your payment could not be processed. Please try again.",
    link: `/bookings/${transaction.booking_id}`,
  });
}

async function handlePaymentCanceled(supabase: SupabaseAdmin, paymentIntent: DbRecord) {
  const isExpired = paymentIntent.cancellation_reason === "automatic";
  const { data: transaction } = await supabase
    .from("transactions")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .select()
    .single();

  if (!transaction) return;

  const bookingUpdate: Record<string, unknown> = { refunded_at: new Date().toISOString() };
  if (isExpired) bookingUpdate.status = "cancelled";

  await supabase.from("bookings").update(bookingUpdate).eq("id", transaction.booking_id);

  await createNotification(supabase, transaction.user_id, {
    type: "payment",
    title: isExpired ? "Payment Hold Expired" : "Payment Refunded",
    message: isExpired
      ? "Your payment hold has expired after 7 days and was automatically released. No charges were made to your card."
      : "Your held payment has been released back to your card.",
    link: "/my-jobs",
  });

  if (isExpired) {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("is_active", true);

    const adminNotifications = (admins || []).map((admin) => ({
      user_id: admin.id,
      type: "admin",
      title: "Payment Hold Expired (Auto)",
      message: `A payment hold for booking ${transaction.booking_id} expired after 7 days. The hold was automatically released by Stripe.`,
      link: "/admin/revenue",
    }));
    if (adminNotifications.length > 0) await supabase.from("notifications").insert(adminNotifications);
  }
}

async function handleInvoiceCheckoutCompleted(supabase: SupabaseAdmin, session: DbRecord) {
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId) return;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, total, amount_paid, customer_id")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return;

  const amountPaid = session.amount_total ? parseMoney(session.amount_total) / 100 : parseMoney(invoice.total);
  const newAmountPaid = parseMoney(invoice.amount_paid) + amountPaid;
  const amountDue = Math.max(0, parseMoney(invoice.total) - newAmountPaid);
  const isPaid = amountDue <= 0.01;

  await supabase
    .from("invoices")
    .update({
      status: isPaid ? "paid" : "partially_paid",
      amount_paid: newAmountPaid,
      amount_due: amountDue,
      payment_method: "stripe",
      paid_at: isPaid ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  if (invoice.customer_id) {
    await createNotification(supabase, invoice.customer_id, {
      type: "payment",
      title: isPaid ? "Invoice Paid" : "Partial Payment Received",
      message: isPaid
        ? `Your invoice ${session.metadata?.invoice_number} has been paid in full.`
        : `A partial payment of $${amountPaid.toFixed(2)} was received for invoice ${session.metadata?.invoice_number}.`,
      link: `/dashboard/invoices/${invoiceId}`,
      data: { invoice_id: invoiceId },
    });
  }
}

async function handleStripeWebhook(req: Request, supabase: SupabaseAdmin) {
  const rawBody = await req.text();

  try {
    await verifyStripeWebhookSignature(rawBody, req.headers.get("stripe-signature"));
  } catch (error) {
    return new Response(`Webhook Error: ${(error as Error).message}`, {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  const event = JSON.parse(rawBody) as DbRecord;
  const { data: existingEvent } = await supabase
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (existingEvent) return jsonResponse({ received: true });

  await supabase.from("stripe_webhook_events").insert({ id: event.id, event_type: event.type });

  const object = event.data?.object as DbRecord;
  switch (event.type) {
    case 'payment_intent.amount_capturable_updated':
      await handlePaymentHeld(supabase, object);
      break;
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(supabase, object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(supabase, object);
      break;
    case 'payment_intent.canceled':
      await handlePaymentCanceled(supabase, object);
      break;
    case 'checkout.session.completed':
      if (object.metadata?.type === "invoice") {
        await handleInvoiceCheckoutCompleted(supabase, object);
      }
      break;
    default:
      break;
  }

  return jsonResponse({ received: true });
}

async function getStripeConnectTransferEligibility(proProfile: DbRecord) {
  if (!proProfile.stripe_account_id || proProfile.payout_method !== "stripe_connect") {
    return { eligible: false };
  }

  try {
    const account = await stripePaymentIntentRequest(`/accounts/${proProfile.stripe_account_id}`);
    const transfersCapability = account.capabilities?.transfers;
    const stripeBalanceTransfersCapability = account.capabilities?.["stripe_balance.stripe_transfers"];
    const transfersEnabled = transfersCapability === "active"
      || stripeBalanceTransfersCapability === "active"
      || (!transfersCapability && !stripeBalanceTransfersCapability);

    return {
      eligible: !!account.charges_enabled && !!account.payouts_enabled && transfersEnabled,
    };
  } catch {
    return { eligible: false };
  }
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

function getClientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || null;
}

async function handleAuthRequest(req: Request, url: URL, supabase: SupabaseAdmin) {
  const pathname = getRoutePath(url);
  if (!pathname.startsWith("/api/auth")) return null;

  if (pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readJson(req);
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) return errorResponse("Invalid email or password", 401);
    const normalizedEmail = email.toLowerCase();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: recentFailures } = await supabase
      .from("login_attempts")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("success", false)
      .gte("attempted_at", fifteenMinutesAgo);

    if (recentFailures && recentFailures.length >= 5) {
      return errorResponse("Too many failed login attempts. Please try again in 15 minutes.", 429);
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

    if (error || !data?.user || !data?.session) {
      await supabase.from("login_attempts").insert({
        email: normalizedEmail,
        ip_address: getClientIp(req),
        success: false,
      });
      return errorResponse("Invalid email or password", 401);
    }

    await supabase.from("login_attempts").insert({
      email: normalizedEmail,
      ip_address: getClientIp(req),
      success: true,
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profile && !profile.is_active) {
      return errorResponse("Your account was deactivated", 403);
    }

    await supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);

    return jsonResponse({
      success: true,
      message: "Login successful",
      data: {
        user: data.user,
        profile,
        session: data.session,
      },
    });
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    return jsonResponse({ success: true, message: "Logged out successfully" });
  }

  if (pathname === "/api/auth/refresh" && req.method === "POST") {
    const body = await readJson(req);
    const { refresh_token } = body as { refresh_token?: string };
    if (!refresh_token) return errorResponse("Refresh token required", 400);

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error || !data?.session) return errorResponse("Invalid refresh token", 401);

    return jsonResponse({
      success: true,
      message: "Token refreshed",
      data: { session: data.session },
    });
  }

  if (pathname === "/api/auth/me" && req.method === "GET") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;
    return jsonResponse({ success: true, data: { user: auth.user, profile: auth.profile } });
  }

  if (pathname === "/api/auth/profile" && req.method === "PATCH") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;

    const body = await readJson(req);
    const allowedFields = ["full_name", "phone", "address", "city", "state", "zip_code", "avatar_url"];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates[field] = (body as Record<string, unknown>)[field];
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", auth.user!.id)
      .select()
      .single();

    if (error) return errorResponse("Failed to update profile", 500);
    return jsonResponse({ success: true, message: "Profile updated successfully", data: { profile: data } });
  }

  if (pathname === "/api/auth/change-password" && req.method === "POST") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;

    const body = await readJson(req);
    const { current_password, new_password } = body as { current_password?: string; new_password?: string };
    if (!current_password) return errorResponse("Current password is required", 400);
    const passwordError = validatePassword(new_password);
    if (passwordError) return errorResponse(passwordError, 400);

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: auth.user!.email || auth.profile!.email,
      password: current_password,
    });
    if (verifyError) return errorResponse("Current password is incorrect", 401);

    const { error } = await supabase.auth.admin.updateUserById(auth.user!.id, { password: new_password });
    if (error) return errorResponse(error.message, 400);

    return jsonResponse({ success: true, message: "Password changed successfully" });
  }

  return null;
}

async function handleAdminInvitationRequest(req: Request, url: URL, supabase: SupabaseAdmin) {
  const pathname = getRoutePath(url);

  const verifyMatch = pathname.match(/^\/api\/admin-invitations\/verify\/([^/]+)$/);
  if (verifyMatch && req.method === "GET") {
    const { data: invitation, error } = await supabase
      .from("admin_invitations")
      .select("*")
      .eq("token", verifyMatch[1])
      .single();

    if (error || !invitation) return errorResponse("Invalid invitation token", 404);

    if (new Date(invitation.expires_at) < new Date()) {
      await supabase.from("admin_invitations").update({ status: "expired" }).eq("id", invitation.id);
      return errorResponse("This invitation has expired", 400);
    }

    if (invitation.status === "accepted") return errorResponse("This invitation has already been used", 400);
    if (invitation.status === "cancelled") return errorResponse("This invitation has been cancelled", 400);

    return jsonResponse({
      success: true,
      data: {
        email: invitation.email,
        full_name: invitation.full_name,
        phone: invitation.phone,
      },
    });
  }

  if (pathname === "/api/admin-invitations/accept" && req.method === "POST") {
    const body = await readJson(req);
    const { token, password } = body as { token?: string; password?: string };
    const passwordError = validatePassword(password);
    if (passwordError) return errorResponse(passwordError, 400);

    const { data: invitation, error: invError } = await supabase
      .from("admin_invitations")
      .select("*")
      .eq("token", token || "")
      .single();

    if (invError || !invitation) return errorResponse("Invalid invitation token", 404);
    if (new Date(invitation.expires_at) < new Date()) return errorResponse("This invitation has expired", 400);
    if (invitation.status !== "pending") return errorResponse("This invitation is no longer valid", 400);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: invitation.full_name,
        phone: invitation.phone,
        role: "admin",
      },
    });

    if (authError || !authData?.user) return errorResponse(authError?.message || "Failed to create admin account", 500);

    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      email: invitation.email,
      full_name: invitation.full_name,
      phone: invitation.phone,
      role: "admin",
      admin_permissions: invitation.admin_permissions || null,
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return errorResponse("Failed to create admin profile", 500);
    }

    await supabase.from("admin_invitations").update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    }).eq("id", invitation.id);

    return jsonResponse({
      success: true,
      message: "Admin account created successfully",
      data: { user: { id: authData.user.id, email: authData.user.email } },
    });
  }

  if (!pathname.startsWith("/api/admin/invitations")) return null;

  const auth = await authenticateAdmin(req, supabase);
  if (auth.response) return auth.response;
  const profile = auth.profile!;

  if (pathname === "/api/admin/invitations" && req.method === "GET") {
    const { data, error } = await supabase
      .from("admin_invitations")
      .select("*, invited_by_profile:profiles!admin_invitations_invited_by_fkey(id, full_name, email)")
      .order("created_at", { ascending: false });

    if (error) return errorResponse("Failed to fetch invitations", 500);
    return jsonResponse({ success: true, data: { invitations: data || [] } });
  }

  if (pathname === "/api/admin/invitations/admin-accounts" && req.method === "GET") {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, is_superadmin, admin_permissions, is_active, created_at, last_login_at")
      .eq("role", "admin")
      .order("created_at", { ascending: false });

    if (error) return errorResponse("Failed to fetch admin accounts", 500);
    return jsonResponse({ success: true, data: { admins: data || [] } });
  }

  if (pathname === "/api/admin/invitations" && req.method === "POST") {
    const body = await readJson(req);
    const { email, full_name, phone, admin_permissions } = body as {
      email?: string;
      full_name?: string;
      phone?: string;
      admin_permissions?: Record<string, boolean>;
    };

    if (!email || !full_name) return errorResponse("Email and full name are required", 400);
    const permissionsError = validateAdminPermissions(admin_permissions);
    if (permissionsError) return errorResponse(permissionsError, 400);

    const normalizedEmail = email.toLowerCase();
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, email, role")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      return errorResponse(
        existingProfile.role === "admin"
          ? "This email is already registered as an admin"
          : "This email is already registered. Please use a different email.",
        400,
      );
    }

    const { data: existingInvitation } = await supabase
      .from("admin_invitations")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvitation) return errorResponse("An invitation has already been sent to this email", 400);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = generateInvitationToken();
    const { data: invitation, error } = await supabase
      .from("admin_invitations")
      .insert({
        email: normalizedEmail,
        full_name,
        phone,
        invited_by: profile.id,
        token,
        expires_at: expiresAt.toISOString(),
        status: "pending",
        admin_permissions: admin_permissions || null,
      })
      .select()
      .single();

    if (error) return errorResponse("Failed to create invitation", 500);

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://bridgeworkservices.com";
    const invitationUrl = `${frontendUrl}/admin-signup?token=${token}`;
    await writeAuditLog(supabase, profile.id, "create_invitation", "admin_invitation", invitation.id, {
      email: normalizedEmail,
      full_name,
    });

    return jsonResponse({
      success: true,
      message: "Invitation sent successfully",
      data: { invitation, invitation_url: invitationUrl },
    }, { status: 201 });
  }

  if (pathname === "/api/admin/invitations/direct-create" && req.method === "POST") {
    const body = await readJson(req);
    const { email, full_name, phone, password, admin_permissions } = body as {
      email?: string;
      full_name?: string;
      phone?: string;
      password?: string;
      admin_permissions?: Record<string, boolean>;
    };

    if (!email || !full_name || !password) return errorResponse("Email, full name, and password are required", 400);
    const passwordError = validatePassword(password);
    if (passwordError) return errorResponse(passwordError, 400);
    const permissionsError = validateAdminPermissions(admin_permissions);
    if (permissionsError) return errorResponse(permissionsError, 400);

    const normalizedEmail = email.toLowerCase();
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, email, role")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      return errorResponse(
        existingProfile.role === "admin"
          ? "This email is already registered as an admin"
          : "This email is already registered. Please use a different email.",
        400,
      );
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone: phone || null, role: "admin" },
    });

    if (authError || !authData?.user) return errorResponse(authError?.message || "Failed to create admin account", 500);

    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      email: normalizedEmail,
      full_name,
      phone: phone || null,
      role: "admin",
      admin_permissions: admin_permissions || null,
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return errorResponse("Failed to create admin profile", 500);
    }

    await writeAuditLog(supabase, profile.id, "direct_create_admin", "admin", authData.user.id, {
      email: normalizedEmail,
      full_name,
    });

    return jsonResponse({
      success: true,
      message: "Admin account created successfully",
      data: { user: { id: authData.user.id, email: authData.user.email, full_name } },
    }, { status: 201 });
  }

  return null;
}

async function handleAdminManageRequest(req: Request, url: URL, supabase: SupabaseAdmin) {
  const pathname = getRoutePath(url);
  if (!pathname.startsWith("/api/admin/manage-admins")) return null;

  const auth = await authenticateAdmin(req, supabase, true);
  if (auth.response) return auth.response;
  const profile = auth.profile!;

  if (pathname === "/api/admin/manage-admins/admins" && req.method === "GET") {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, is_superadmin, admin_permissions, is_active, created_at, last_login_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true });

    if (error) return errorResponse("Failed to fetch admins", 500);
    return jsonResponse({ success: true, data: { admins: data || [] } });
  }

  const permissionsMatch = pathname.match(/^\/api\/admin\/manage-admins\/admins\/([^/]+)\/permissions$/);
  if (permissionsMatch && req.method === "PATCH") {
    const body = await readJson(req);
    const { admin_permissions } = body as { admin_permissions?: Record<string, boolean> | null };
    const permissionsError = validateAdminPermissions(admin_permissions);
    if (permissionsError) return errorResponse(permissionsError, 400);

    const id = permissionsMatch[1];
    const { data: target, error: fetchError } = await supabase
      .from("profiles")
      .select("is_superadmin, email, role")
      .eq("id", id)
      .single();

    if (fetchError || !target) return errorResponse("Admin not found", 404);
    if (target.role !== "admin") return errorResponse("Target user is not an admin", 400);
    if (target.is_superadmin) return errorResponse("Cannot modify SuperAdmin permissions", 403);

    const { data, error } = await supabase
      .from("profiles")
      .update({ admin_permissions, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, email, full_name, is_superadmin, admin_permissions, is_active")
      .single();

    if (error) return errorResponse("Failed to update permissions", 500);

    await writeAuditLog(supabase, profile.id, "update_permissions", "admin", id, { admin_permissions });
    return jsonResponse({
      success: true,
      message: "Permissions updated successfully",
      data: { admin: data },
    });
  }

  return null;
}

async function handleBookingsRequest(req: Request, url: URL, supabase: SupabaseAdmin) {
  const pathname = getRoutePath(url);
  if (!pathname.startsWith("/api/bookings")) return null;

  if (pathname === "/api/bookings/pro/quote-requests" && req.method === "GET") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;
    if (auth.profile!.role !== "pro") return errorResponse("Insufficient permissions", 403);

    const proProfile = await getProProfile(supabase, auth.user!.id);
    if (!proProfile) return errorResponse("Pro profile not found", 403);

    const { data: assignments, error: assignError } = await supabase
      .from("quote_assignments")
      .select("booking_id, status")
      .eq("pro_id", proProfile.id)
      .in("status", ["invited", "viewed", "quoted", "selected", "accepted"]);

    if (assignError) {
      return jsonResponse({ success: true, data: { bookings: [], pro_id: proProfile.id } });
    }

    if (!assignments || assignments.length === 0) {
      return jsonResponse({ success: true, data: { bookings: [], pro_id: proProfile.id } });
    }

    const assignedBookingIds = assignments.map((assignment: { booking_id: string }) => assignment.booking_id);
    const assignmentMap = assignments.reduce((acc: Record<string, string>, assignment: { booking_id: string; status: string }) => {
      acc[assignment.booking_id] = assignment.status;
      return acc;
    }, {});

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (id, name, category_id, image_url),
        profiles!bookings_user_id_fkey (id, full_name, avatar_url)
      `)
      .in("id", assignedBookingIds)
      .in("status", ["awaiting_quotes", "accepted", "in_progress", "completed"])
      .order("created_at", { ascending: false });

    if (bookingsError) return errorResponse("Failed to fetch quote requests", 500);

    const bookingIds = (bookings || []).map((booking: { id: string }) => booking.id);
    const quotationsMap: Record<string, Array<Record<string, unknown>>> = {};

    if (bookingIds.length > 0) {
      const { data: quotations } = await supabase
        .from("booking_quotations")
        .select("id, booking_id, pro_id, status, quoted_price, counter_offer_price, counter_offer_message, counter_offered_at")
        .in("booking_id", bookingIds);

      (quotations || []).forEach((quotation: Record<string, unknown>) => {
        const bookingId = String(quotation.booking_id);
        if (!quotationsMap[bookingId]) quotationsMap[bookingId] = [];
        quotationsMap[bookingId].push(quotation);
      });
    }

    const enrichedBookings = (bookings || [])
      .map((booking: Record<string, unknown>) => {
        const bookingId = String(booking.id);
        const bookingQuotations = quotationsMap[bookingId] || [];
        const myQuote = bookingQuotations.find((quote) => quote.pro_id === proProfile.id);
        const isDirectAssignment = booking.status !== "awaiting_quotes" && !myQuote && booking.pro_id === proProfile.id;
        const canSubmitQuote = booking.status === "awaiting_quotes" && !myQuote;
        const canEditQuote = booking.status === "awaiting_quotes" && !!myQuote;

        return {
          ...booking,
          assignment_status: assignmentMap[bookingId] || "invited",
          has_submitted_quote: !!myQuote,
          my_quote_id: myQuote?.id || null,
          my_quote_status: myQuote?.status || null,
          my_quoted_price: myQuote?.quoted_price || null,
          my_counter_offer_price: myQuote?.counter_offer_price || null,
          my_counter_offer_message: myQuote?.counter_offer_message || null,
          is_direct_assignment: isDirectAssignment,
          can_submit_quote: canSubmitQuote,
          can_edit_quote: canEditQuote,
          total_quotes: bookingQuotations.length,
        };
      })
      .filter((booking: { is_direct_assignment?: boolean }) => !booking.is_direct_assignment);

    return jsonResponse({
      success: true,
      data: {
        bookings: enrichedBookings,
        pro_id: proProfile.id,
      },
    });
  }

  const quoteRequestDetailMatch = pathname.match(/^\/api\/bookings\/pro\/quote-requests\/([^/]+)$/);
  if (quoteRequestDetailMatch && req.method === "GET") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;
    if (auth.profile!.role !== "pro") return errorResponse("Insufficient permissions", 403);

    const proProfile = await getProProfile(supabase, auth.user!.id, "id, user_id, business_name");
    if (!proProfile) return errorResponse("Pro profile not found", 403);

    const bookingId = quoteRequestDetailMatch[1];
    const { data: assignment, error: assignmentError } = await supabase
      .from("quote_assignments")
      .select("id, status")
      .eq("booking_id", bookingId)
      .eq("pro_id", proProfile.id)
      .maybeSingle();

    if (assignmentError) return errorResponse("Failed to fetch quote request", 500);
    if (!assignment || assignment.status === "declined") {
      return errorResponse("Quote request not found or not assigned to you", 404);
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (id, name, category_id, image_url, description),
        profiles!bookings_user_id_fkey (id, full_name, avatar_url, phone)
      `)
      .eq("id", bookingId)
      .in("status", ["awaiting_quotes", "accepted", "in_progress", "completed"])
      .single();

    if (bookingError || !booking) {
      return errorResponse("Quote request not found or no longer available", 404);
    }

    if (assignment.status === "invited") {
      await supabase
        .from("quote_assignments")
        .update({ status: "viewed", updated_at: new Date().toISOString() })
        .eq("id", assignment.id);
    }

    const { data: existingQuote } = await supabase
      .from("booking_quotations")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("pro_id", proProfile.id)
      .maybeSingle();

    const isDirectAssignment = booking.status !== "awaiting_quotes" && !existingQuote && booking.pro_id === proProfile.id;
    const canSubmitQuote = booking.status === "awaiting_quotes" && !existingQuote;
    const canEditQuote = booking.status === "awaiting_quotes" && !!existingQuote;

    return jsonResponse({
      success: true,
      data: {
        booking,
        my_quotation: existingQuote || null,
        pro_id: proProfile.id,
        assignment_status: assignment.status,
        is_direct_assignment: isDirectAssignment,
        can_submit_quote: canSubmitQuote,
        can_edit_quote: canEditQuote,
      },
    });
  }

  const declineQuoteAssignmentMatch = pathname.match(/^\/api\/bookings\/pro\/quote-requests\/([^/]+)\/decline$/);
  if (declineQuoteAssignmentMatch && req.method === "POST") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;
    if (auth.profile!.role !== "pro") return errorResponse("Insufficient permissions", 403);

    const proProfile = await getProProfile(supabase, auth.user!.id, "id");
    if (!proProfile) return errorResponse("Pro profile not found", 403);

    const bookingId = declineQuoteAssignmentMatch[1];
    const { data: assignment, error: assignError } = await supabase
      .from("quote_assignments")
      .select("id, status")
      .eq("booking_id", bookingId)
      .eq("pro_id", proProfile.id)
      .maybeSingle();

    if (assignError) return errorResponse("Failed to find assignment", 500);
    if (!assignment) return errorResponse("Assignment not found", 404);
    if (!["invited", "viewed"].includes(assignment.status)) {
      return errorResponse("Cannot decline this assignment in its current state", 400);
    }

    const { error: updateError } = await supabase
      .from("quote_assignments")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("id", assignment.id);

    if (updateError) return errorResponse("Failed to decline assignment", 500);
    return jsonResponse({ success: true, message: "Assignment declined successfully" });
  }

  const submitQuotationMatch = pathname.match(/^\/api\/bookings\/pro\/quote-requests\/([^/]+)\/submit$/);
  if (submitQuotationMatch && req.method === "POST") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;
    if (auth.profile!.role !== "pro") return errorResponse("Insufficient permissions", 403);

    const body = await readJson(req) as Record<string, unknown>;
    const quotedPrice = parsePositiveAmount(body.quoted_price);
    const workPrice = parsePositiveAmount(body.your_price || body.quoted_price);
    if (!workPrice) return errorResponse("A valid price greater than 0 is required", 400);
    if (!quotedPrice) return errorResponse("A valid price greater than 0 is required", 400);

    const proProfile = await getProProfile(supabase, auth.user!.id, "id, user_id, business_name");
    if (!proProfile) return errorResponse("Pro profile not found", 403);

    const bookingId = submitQuotationMatch[1];
    const { data: assignment, error: assignmentError } = await supabase
      .from("quote_assignments")
      .select("id, status")
      .eq("booking_id", bookingId)
      .eq("pro_id", proProfile.id)
      .maybeSingle();

    if (assignmentError) return errorResponse("Failed to submit quotation", 500);
    if (!assignment || assignment.status === "declined") {
      return errorResponse("This quote request is not assigned to you.", 403);
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, services (name)")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) return errorResponse("Quote request not found", 404);
    if (booking.status !== "awaiting_quotes") {
      return errorResponse("This quote request is no longer accepting quotes.", 409);
    }

    const { data: existingQuote } = await supabase
      .from("booking_quotations")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("pro_id", proProfile.id)
      .maybeSingle();

    const quotationPayload = {
      quoted_price: quotedPrice,
      description: body.description || null,
      estimated_duration: body.estimated_duration || null,
      materials_included: body.materials_included || false,
      warranty_info: body.warranty_info || null,
      notes: buildExtendedQuotationNotes(body),
      status: "pending_admin_review",
      updated_at: new Date().toISOString(),
    };

    let quotation: Record<string, unknown> | null = null;
    let quotationError: { code?: string; message?: string } | null = null;

    if (existingQuote) {
      const updateResult = await supabase
        .from("booking_quotations")
        .update(quotationPayload)
        .eq("id", existingQuote.id)
        .select()
        .single();

      quotation = updateResult.data;
      quotationError = updateResult.error;

      if (quotationError?.code === "23514") {
        const fallbackResult = await supabase
          .from("booking_quotations")
          .update({ ...quotationPayload, status: "pending" })
          .eq("id", existingQuote.id)
          .select()
          .single();
        quotation = fallbackResult.data;
        quotationError = fallbackResult.error;
      }

      await supabase
        .from("booking_quotations")
        .update({
          admin_price: null,
          commission_amount: null,
          commission_rate: null,
          admin_approved_at: null,
          admin_approved_by: null,
          admin_review_notes: null,
        })
        .eq("id", existingQuote.id);
    } else {
      const insertPayload = {
        booking_id: bookingId,
        pro_id: proProfile.id,
        ...quotationPayload,
      };
      const insertResult = await supabase
        .from("booking_quotations")
        .insert(insertPayload)
        .select()
        .single();

      quotation = insertResult.data;
      quotationError = insertResult.error;

      if (quotationError?.code === "23514") {
        const fallbackResult = await supabase
          .from("booking_quotations")
          .insert({ ...insertPayload, status: "pending" })
          .select()
          .single();
        quotation = fallbackResult.data;
        quotationError = fallbackResult.error;
      }
    }

    if (quotationError || !quotation) return errorResponse("Failed to submit quotation", 500);

    await supabase
      .from("quote_assignments")
      .update({ status: "quoted", updated_at: new Date().toISOString() })
      .eq("id", assignment.id);

    const serviceName = booking.service_name || booking.services?.name || "this request";
    await createNotification(supabase, proProfile.user_id, {
      type: "booking",
      title: "Quote Submitted - Under Review",
      message: `Your quote of $${quotedPrice.toFixed(2)} for ${serviceName} has been submitted and is under review. You'll be notified once it's forwarded to the customer.`,
      link: "/pro-dashboard/quote-requests",
      data: { booking_id: bookingId, quotation_id: quotation.id },
    });

    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    for (const admin of admins || []) {
      await createNotification(supabase, admin.id, {
        type: "system",
        title: "New Quote Needs Review",
        message: `${proProfile.business_name || "A pro"} submitted a quote of $${quotedPrice.toFixed(2)} for ${serviceName}. Review and set commission before forwarding to the customer.`,
        link: "/admin/quotations",
        data: { booking_id: bookingId, quotation_id: quotation.id, type: "pending_admin_review" },
      });
    }

    return jsonResponse({
      success: true,
      message: existingQuote
        ? "Quotation updated successfully. It is now under review by the BridgeWork team."
        : "Quotation submitted successfully! It is now under review by the BridgeWork team before being forwarded to the customer.",
      data: { quotation },
    }, { status: existingQuote ? 200 : 201 });
  }

  if (pathname === "/api/bookings/pro/my-quotations" && req.method === "GET") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;
    if (auth.profile!.role !== "pro") return errorResponse("Insufficient permissions", 403);

    const proProfile = await getProProfile(supabase, auth.user!.id, "id");
    if (!proProfile) return errorResponse("Pro profile not found", 403);

    const { data: quotations, error } = await supabase
      .from("booking_quotations")
      .select(`
        *,
        bookings!booking_quotations_booking_id_fkey (
          id,
          booking_number,
          service_name,
          address,
          city,
          state,
          scheduled_date,
          scheduled_time,
          status,
          profiles!bookings_user_id_fkey (full_name)
        )
      `)
      .eq("pro_id", proProfile.id)
      .order("created_at", { ascending: false });

    if (error) return errorResponse("Failed to fetch quotations", 500);
    return jsonResponse({ success: true, data: { quotations } });
  }

  const respondCounterOfferMatch = pathname.match(/^\/api\/bookings\/pro\/quotations\/([^/]+)\/respond-counter-offer$/);
  if (respondCounterOfferMatch && req.method === "POST") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;
    if (auth.profile!.role !== "pro") return errorResponse("Insufficient permissions", 403);

    const body = await readJson(req) as { action?: string };
    if (!["accept", "decline"].includes(body.action || "")) {
      return errorResponse('Action must be "accept" or "decline"', 400);
    }

    const quotationId = respondCounterOfferMatch[1];
    const { data: quotation, error: quotationError } = await supabase
      .from("booking_quotations")
      .select(`
        *,
        pro_profiles (
          id,
          user_id,
          business_name
        )
      `)
      .eq("id", quotationId)
      .single();

    if (quotationError || !quotation) return errorResponse("Quotation not found", 404);
    if (quotation.pro_profiles?.user_id !== auth.user!.id) {
      return errorResponse("You can only respond to your own quotations", 403);
    }
    if (quotation.status !== "counter_offered") {
      return errorResponse("This quotation does not have a pending counter-offer", 400);
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select("*, services (name)")
      .eq("id", quotation.booking_id)
      .single();

    if (body.action === "accept") {
      const { error: updateError } = await supabase
        .from("booking_quotations")
        .update({
          quoted_price: quotation.counter_offer_price,
          status: "pending",
          counter_offer_price: null,
          counter_offer_message: null,
          counter_offered_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quotationId);

      if (updateError) return errorResponse("Failed to accept counter-offer", 500);

      if (booking) {
        await createNotification(supabase, booking.user_id, {
          type: "booking",
          title: "Counter-Offer Accepted!",
          message: `${quotation.pro_profiles?.business_name || "A pro"} accepted your counter-offer of $${Number.parseFloat(String(quotation.counter_offer_price)).toFixed(2)} for ${booking.service_name}. You can now accept the revised quote.`,
          link: "/my-jobs",
          data: { booking_id: quotation.booking_id, quotation_id: quotationId },
        });
      }

      return jsonResponse({
        success: true,
        message: "Counter-offer accepted! Your quote has been updated.",
        data: { new_price: quotation.counter_offer_price },
      });
    }

    const { error: updateError } = await supabase
      .from("booking_quotations")
      .update({
        status: "pending",
        counter_offer_price: null,
        counter_offer_message: null,
        counter_offered_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quotationId);

    if (updateError) return errorResponse("Failed to decline counter-offer", 500);

    if (booking) {
      await createNotification(supabase, booking.user_id, {
        type: "booking",
        title: "Counter-Offer Declined",
        message: `${quotation.pro_profiles?.business_name || "A pro"} declined your counter-offer for ${booking.service_name}. You can still accept their original quote or submit another counter-offer.`,
        link: "/my-jobs",
        data: { booking_id: quotation.booking_id, quotation_id: quotationId },
      });
    }

    return jsonResponse({
      success: true,
      message: "Counter-offer declined. Your original quote remains active.",
      data: { original_price: quotation.quoted_price },
    });
  }

  // GET "/api/bookings/:id/quotations"
  const homeownerBookingQuotationsMatch = pathname.match(/^\/api\/bookings\/([^/]+)\/quotations$/);
  if (homeownerBookingQuotationsMatch && req.method === "GET") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;

    const bookingId = homeownerBookingQuotationsMatch[1];
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, user_id, status, service_name")
      .eq("id", bookingId)
      .eq("user_id", auth.user!.id)
      .single();

    if (bookingError || !booking) return errorResponse("Booking not found", 404);

    const { data: quotations, error } = await supabase
      .from("booking_quotations")
      .select(`
        *,
        pro_profiles (
          id,
          user_id,
          business_name,
          bio,
          rating,
          total_reviews
        )
      `)
      .eq("booking_id", bookingId)
      .neq("status", "pending_admin_review")
      .order("created_at", { ascending: false });

    if (error) return errorResponse("Failed to fetch quotations", 500);
    return jsonResponse({ success: true, data: { booking, quotations: quotations || [] } });
  }

  // POST "/api/bookings/:bookingId/quotations/:quotationId/accept"
  const homeownerAcceptQuotationMatch = pathname.match(/^\/api\/bookings\/([^/]+)\/quotations\/([^/]+)\/accept$/);
  if (homeownerAcceptQuotationMatch && req.method === "POST") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;

    const bookingId = homeownerAcceptQuotationMatch[1];
    const quotationId = homeownerAcceptQuotationMatch[2];
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (name),
        profiles!bookings_user_id_fkey (full_name)
      `)
      .eq("id", bookingId)
      .eq("user_id", auth.user!.id)
      .single();

    if (bookingError || !booking) return errorResponse("Booking not found", 404);
    if (booking.status !== "awaiting_quotes") {
      return errorResponse("This booking is no longer accepting quotes", 400);
    }

    const { data: quotation, error: quotationError } = await supabase
      .from("booking_quotations")
      .select(`
        *,
        pro_profiles (
          id,
          user_id,
          business_name
        )
      `)
      .eq("id", quotationId)
      .eq("booking_id", bookingId)
      .single();

    if (quotationError || !quotation) return errorResponse("Quotation not found", 404);
    if (quotation.status !== "pending") return errorResponse("This quotation is no longer available", 400);

    const price = Number.parseFloat(String(quotation.admin_price || quotation.quoted_price));
    const taxRateDecimal = await getTaxRate(supabase, "quote");
    const tax = price * taxRateDecimal;
    const finalPrice = price + tax;

    const { error: updateQuotationError } = await supabase
      .from("booking_quotations")
      .update({
        status: "selected",
        selected_at: new Date().toISOString(),
      })
      .eq("id", quotationId);

    if (updateQuotationError) return errorResponse("Failed to accept quotation", 500);

    await supabase
      .from("booking_quotations")
      .update({ status: "rejected" })
      .eq("booking_id", bookingId)
      .neq("id", quotationId)
      .eq("status", "pending");

    const { data: updatedBooking, error: updateBookingError } = await supabase
      .from("bookings")
      .update({
        status: "accepted",
        selected_quotation_id: quotation.id,
        pro_id: quotation.pro_id,
        base_price: price,
        tax,
        total_price: finalPrice,
        quote_set_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("status", "awaiting_quotes")
      .select()
      .single();

    if (updateBookingError || !updatedBooking) {
      await supabase
        .from("booking_quotations")
        .update({ status: "pending", selected_at: null })
        .eq("id", quotationId);
      return errorResponse("This booking has already been updated. Please refresh and try again.", 409);
    }

    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id")
      .eq("booking_id", bookingId)
      .limit(1)
      .maybeSingle();

    if (!existingInvoice) {
      const issueDate = new Date().toISOString();
      const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const recipientName = booking.profiles?.full_name || "Customer";
      const recipientAddress = [booking.address, booking.city, booking.state, booking.zip_code].filter(Boolean).join(", ");
      const itemDescription = quotation.description || `Accepted quote for ${booking.service_name}`;
      let yourPrice = price;
      let materialsList: Array<Record<string, unknown>> = [];

      if (quotation.notes) {
        try {
          const parsed = JSON.parse(String(quotation.notes));
          if (parsed && typeof parsed === "object" && "original_notes" in parsed) {
            if (parsed.your_price != null) yourPrice = Number.parseFloat(String(parsed.your_price));
            if (Array.isArray(parsed.materials_list)) materialsList = parsed.materials_list;
          }
        } catch {
          materialsList = [];
        }
      }

      const invoiceItems = [
        {
          service: booking.service_name || "Service",
          description: itemDescription,
          qty: 1,
          unit_cost: yourPrice,
          total: yourPrice,
        },
      ];

      for (const material of materialsList) {
        const materialPrice = Number.parseFloat(String(material.price || 0));
        if (material.name && materialPrice > 0) {
          invoiceItems.push({
            service: "Materials",
            description: String(material.name),
            qty: 1,
            unit_cost: materialPrice,
            total: materialPrice,
          });
        }
      }

      await supabase.from("invoices").insert({
        booking_id: bookingId,
        invoice_number: `INV-${Date.now()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
        issue_date: issueDate,
        due_date: dueDate,
        subject: `${booking.service_name} Service Invoice`,
        recipient_name: recipientName,
        recipient_address: recipientAddress,
        notes: "Auto-generated when the homeowner accepted the selected quote.",
        tax_rate: taxRateDecimal,
        subtotal: price,
        tax,
        total: finalPrice,
        items: invoiceItems,
      });
    }

    await createNotification(supabase, quotation.pro_profiles?.user_id, {
      type: "booking",
      title: "Quote Accepted! Start Working",
      message: `Your quote of $${price.toFixed(2)} for ${booking.service_name} has been accepted by the customer. Complete the job and submit proof of work.`,
      link: "/pro-dashboard",
      data: { booking_id: bookingId, quotation_id: quotationId },
    });

    await createNotification(supabase, auth.user!.id, {
      type: "booking",
      title: "Quote Accepted - Job Started!",
      message: `You've accepted ${quotation.pro_profiles?.business_name || "the pro"}'s quote for ${booking.service_name}. Total: $${finalPrice.toFixed(2)}. You'll pay after reviewing their proof of work.`,
      link: "/my-jobs",
      data: { booking_id: bookingId, quotation_id: quotationId },
    });

    const { data: rejectedQuotations } = await supabase
      .from("booking_quotations")
      .select("pro_profiles (user_id, business_name)")
      .eq("booking_id", bookingId)
      .eq("status", "rejected");

    for (const rejected of rejectedQuotations || []) {
      const rejectedPro = Array.isArray(rejected.pro_profiles) ? rejected.pro_profiles[0] : rejected.pro_profiles;
      if (rejectedPro?.user_id) {
        await createNotification(supabase, rejectedPro.user_id, {
          type: "booking",
          title: "Quote Not Selected",
          message: `The customer chose another pro for ${booking.service_name}. Keep submitting quotes for other jobs!`,
          link: "/pro-dashboard/quote-requests",
          data: { booking_id: bookingId },
        });
      }
    }

    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    for (const admin of admins || []) {
      await createNotification(supabase, admin.id, {
        type: "system",
        title: "Quote Accepted by Customer",
        message: `Customer accepted ${quotation.pro_profiles?.business_name || "a pro"}'s quote of $${price.toFixed(2)} for ${booking.service_name}.`,
        link: "/admin/quotations",
        data: { booking_id: bookingId, quotation_id: quotationId },
      });
    }

    return jsonResponse({
      success: true,
      message: "Quote accepted successfully! The pro has been notified to start the job.",
      data: {
        quotation: { ...quotation, status: "selected" },
        booking: { ...booking, status: "accepted", total_price: finalPrice },
      },
    });
  }

  const homeownerCounterOfferMatch = pathname.match(/^\/api\/bookings\/([^/]+)\/quotations\/([^/]+)\/counter-offer$/);
  if (homeownerCounterOfferMatch && req.method === "POST") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;

    const body = await readJson(req) as { price?: unknown; message?: string };
    const counterPrice = parsePositiveAmount(body.price);
    if (!counterPrice) return errorResponse("Please provide a valid counter-offer price", 400);

    const bookingId = homeownerCounterOfferMatch[1];
    const quotationId = homeownerCounterOfferMatch[2];
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, services (name)")
      .eq("id", bookingId)
      .eq("user_id", auth.user!.id)
      .single();

    if (bookingError || !booking) return errorResponse("Booking not found", 404);
    if (booking.status !== "awaiting_quotes") {
      return errorResponse("This booking is no longer accepting quotes", 400);
    }

    const { data: quotation, error: quotationError } = await supabase
      .from("booking_quotations")
      .select(`
        *,
        pro_profiles (
          id,
          user_id,
          business_name
        )
      `)
      .eq("id", quotationId)
      .eq("booking_id", bookingId)
      .single();

    if (quotationError || !quotation) return errorResponse("Quotation not found", 404);
    if (quotation.status !== "pending") {
      return errorResponse("This quotation is not available for counter-offers", 400);
    }

    const { error: updateError } = await supabase
      .from("booking_quotations")
      .update({
        status: "counter_offered",
        counter_offer_price: counterPrice,
        counter_offer_message: body.message || null,
        counter_offered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", quotationId);

    if (updateError) return errorResponse("Failed to send counter-offer", 500);

    await createNotification(supabase, quotation.pro_profiles?.user_id, {
      type: "booking",
      title: "Counter-Offer Received",
      message: `The customer has counter-offered $${counterPrice.toFixed(2)} for ${booking.service_name}. Your original quote was $${Number.parseFloat(String(quotation.quoted_price)).toFixed(2)}.`,
      link: `/pro-dashboard/quote-requests/${bookingId}`,
      data: { booking_id: bookingId, quotation_id: quotationId },
    });

    return jsonResponse({
      success: true,
      message: "Counter-offer sent! The pro will be notified.",
      data: {
        quotation_id: quotationId,
        counter_offer_price: counterPrice,
      },
    });
  }

  return proxyToLegacy(req, url);
}

async function handleQuotesInvoicesRequest(req: Request, url: URL, _supabase: SupabaseAdmin) {
  const pathname = getRoutePath(url);
  if (!pathname.startsWith("/api/quotes-invoices")) return null;

  return proxyToLegacy(req, url);
}

async function handlePaymentsRequest(req: Request, url: URL, supabase: SupabaseAdmin) {
  const pathname = getRoutePath(url);
  if (!pathname.startsWith("/api/payments")) return null;

  if (pathname === "/api/payments/webhook" && req.method === "POST") {
    return handleStripeWebhook(req, supabase);
  }

  const createPaymentIntentMatch = pathname === "/api/payments/create-intent";
  if (createPaymentIntentMatch && req.method === "POST") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;

    try {
      const body = await readJson(req) as { booking_id?: string };
      if (!body.booking_id) return errorResponse("booking_id is required", 400);

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("*, transactions(id, status)")
        .eq("id", body.booking_id)
        .eq("user_id", auth.user!.id)
        .single();

      if (bookingError || !booking) return errorResponse("Booking not found", 404);
      if (!["pending", "accepted", "proof_submitted"].includes(booking.status)) {
        return errorResponse("Payment is not available for this booking status.", 400);
      }

      const transactions = Array.isArray(booking.transactions) ? booking.transactions : [];
      const alreadyPaid = transactions.some((transaction: DbRecord) => (
        transaction.status === "succeeded" || transaction.status === "held"
      ));
      if (alreadyPaid) return errorResponse("Payment has already been made for this booking.", 400);

      let customerId = auth.profile?.stripe_customer_id || null;
      if (customerId) {
        try {
          await stripePaymentIntentRequest(`/customers/${customerId}`);
        } catch {
          customerId = null;
        }
      }

      if (!customerId) {
        const customer = await stripePaymentIntentRequest("/customers", {
          method: "POST",
          body: {
            email: auth.user!.email,
            metadata: { user_id: auth.user!.id },
          },
        });
        customerId = String(customer.id);
        await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", auth.user!.id);
      }

      const finalAmount = parseMoney(booking.updated_total_price || booking.total_price);
      if (!finalAmount || finalAmount <= 0) {
        return errorResponse("No price has been set for this booking yet. Payment will be available after a quote is accepted and the pro completes the work.", 400);
      }

      const paymentIntentParams: Record<string, unknown> = {
        amount: Math.round(finalAmount * 100),
        currency: "cad",
        customer: customerId,
        capture_method: "manual",
        metadata: {
          booking_id: booking.id,
          user_id: auth.user!.id,
          has_additional_invoice: booking.has_additional_invoice || false,
        },
        description: `Payment hold for ${booking.service_name}`,
      };

      if (booking.pro_id) {
        const { data: proProfile } = await supabase
          .from("pro_profiles")
          .select("id, stripe_account_id, commission_rate, payout_method")
          .eq("id", booking.pro_id)
          .single();

        if ((proProfile as DbRecord | null)?.stripe_account_id && (proProfile as DbRecord).payout_method === "stripe_connect") {
          const pro = proProfile as DbRecord;
          const commissionRate = pro.commission_rate != null ? parseMoney(pro.commission_rate) : PLATFORM_COMMISSION_RATE;
          const applicationFee = Math.round(parseMoney(booking.base_price || booking.total_price) * commissionRate * 100);
          const eligibility = await getStripeConnectTransferEligibility(pro);
          if (eligibility.eligible) {
            paymentIntentParams.application_fee_amount = applicationFee;
            paymentIntentParams.transfer_data = { destination: pro.stripe_account_id };
          }
        }
      }

      let paymentIntent: DbRecord;
      try {
        paymentIntent = await stripePaymentIntentRequest("/payment_intents", {
          method: "POST",
          body: paymentIntentParams,
        });
      } catch (stripeError) {
        const err = stripeError as Error & { code?: string };
        if (err.code !== "insufficient_capabilities_for_transfer" || !paymentIntentParams.transfer_data) {
          throw stripeError;
        }
        delete paymentIntentParams.transfer_data;
        delete paymentIntentParams.application_fee_amount;
        paymentIntent = await stripePaymentIntentRequest("/payment_intents", {
          method: "POST",
          body: paymentIntentParams,
        });
      }

      await supabase.from("transactions").insert({
        booking_id: booking.id,
        user_id: auth.user!.id,
        pro_id: booking.pro_id || null,
        stripe_payment_intent_id: paymentIntent.id,
        amount: booking.total_price,
        status: "pending",
        description: `Payment hold for ${booking.service_name}`,
      });

      return jsonResponse({
        success: true,
        data: {
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
        },
      });
    } catch (error) {
      const err = error as Error & { statusCode?: number; type?: string };
      const isStripeAuthError = err.type === "StripeAuthenticationError" || err.statusCode === 401;
      return jsonResponse({
        success: false,
        message: isStripeAuthError
          ? "Payments are temporarily unavailable because Stripe is not configured correctly."
          : "Failed to create payment intent",
        debug: Deno.env.get("ENVIRONMENT") !== "production" ? err.message : undefined,
      }, { status: 500 });
    }
  }

  const confirmPaymentMatch = pathname === "/api/payments/confirm-payment";
  if (confirmPaymentMatch && req.method === "POST") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;

    try {
      const body = await readJson(req) as { payment_intent_id?: string; booking_id?: string };
      if (!body.payment_intent_id || !body.booking_id) {
        return errorResponse("payment_intent_id and booking_id are required", 400);
      }

      const paymentIntent = await stripePaymentIntentRequest(`/payment_intents/${body.payment_intent_id}`);

      if (paymentIntent.status === "requires_capture") {
        const { data: transaction } = await supabase
          .from("transactions")
          .update({ status: "held" })
          .eq("stripe_payment_intent_id", body.payment_intent_id)
          .eq("user_id", auth.user!.id)
          .select()
          .single();

        await supabase
          .from("bookings")
          .update({ payment_held_at: new Date().toISOString() })
          .eq("id", body.booking_id)
          .eq("user_id", auth.user!.id);

        return jsonResponse({
          success: true,
          data: { transaction, status: "held" },
        });
      }

      if (paymentIntent.status === "succeeded") {
        const { data: transaction } = await supabase
          .from("transactions")
          .update({
            status: "succeeded",
            stripe_charge_id: paymentIntent.latest_charge || null,
          })
          .eq("stripe_payment_intent_id", body.payment_intent_id)
          .eq("user_id", auth.user!.id)
          .select()
          .single();

        return jsonResponse({
          success: true,
          data: { transaction, status: "confirmed" },
        });
      }

      return errorResponse(`Payment not in expected state. Status: ${paymentIntent.status}`, 400);
    } catch {
      return errorResponse("Failed to confirm payment", 500);
    }
  }

  const capturePaymentMatch = pathname === "/api/payments/capture";
  if (capturePaymentMatch && req.method === "POST") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;

    try {
      const body = await readJson(req) as { booking_id?: string };
      if (!body.booking_id) return errorResponse("booking_id is required", 400);

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("*, transactions(id, status, stripe_payment_intent_id, amount, metadata)")
        .eq("id", body.booking_id)
        .eq("user_id", auth.user!.id)
        .single();

      if (bookingError || !booking) return errorResponse("Booking not found", 404);

      if (booking.status === "completed") {
        return jsonResponse({
          success: true,
          message: "Job is already completed.",
          data: { status: "already_completed" },
        });
      }

      const transactions = Array.isArray(booking.transactions) ? booking.transactions as DbRecord[] : [];
      const heldTx = transactions.find((transaction) => transaction.status === "held");

      if (!heldTx) {
        const succeededTx = transactions.find((transaction) => transaction.status === "succeeded");
        if (succeededTx) {
          await supabase
            .from("bookings")
            .update({
              status: "completed",
              user_confirmed_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            })
            .eq("id", body.booking_id);

          return jsonResponse({
            success: true,
            message: "Payment already captured. Job marked as completed.",
            data: { status: "captured" },
          });
        }

        return errorResponse("No held payment found for this booking.", 400);
      }

      if (!booking.proof_submitted_at) {
        return errorResponse("Cannot release payment - the pro has not submitted proof of work yet.", 400);
      }

      const paymentIntent = await stripePaymentIntentRequest(
        `/payment_intents/${heldTx.stripe_payment_intent_id}/capture`,
        { method: "POST" },
      );

      let transferId: string | null = null;
      if (booking.pro_id) {
        try {
          const { data: proProfile } = await supabase
            .from("pro_profiles")
            .select("id, user_id, stripe_account_id, commission_rate, payout_method, etransfer_email")
            .eq("id", booking.pro_id)
            .single();

          if (proProfile) {
            const pro = proProfile as DbRecord;
            const commissionRate = pro.commission_rate != null ? parseMoney(pro.commission_rate) : PLATFORM_COMMISSION_RATE;
            const capturedAmount = parseMoney(paymentIntent.amount_received);
            const platformFee = Math.round(capturedAmount * commissionRate);
            const proShare = capturedAmount - platformFee;
            let useStripeConnect = false;

            if (pro.payout_method === "stripe_connect" && pro.stripe_account_id && !paymentIntent.transfer_data) {
              const eligibility = await getStripeConnectTransferEligibility(pro);
              useStripeConnect = eligibility.eligible;
            }

            if (proShare > 0 && useStripeConnect) {
              const transfer = await stripePaymentIntentRequest("/transfers", {
                method: "POST",
                body: {
                  amount: proShare,
                  currency: paymentIntent.currency,
                  destination: pro.stripe_account_id,
                  source_transaction: paymentIntent.latest_charge,
                  metadata: {
                    booking_id: booking.id,
                    commission_rate: String(commissionRate),
                    platform_fee_cents: String(platformFee),
                  },
                  description: `Pro payout for booking ${booking.booking_number || booking.id}`,
                },
              });
              transferId = String(transfer.id);

              await supabase.from("pro_payouts").insert({
                pro_profile_id: pro.id,
                user_id: pro.user_id,
                type: "earning",
                booking_id: booking.id,
                transaction_id: heldTx.id,
                amount: proShare / 100,
                platform_fee: platformFee / 100,
                commission_rate: commissionRate,
                payout_method: 'stripe_transfer',
                payout_reference: transfer.id,
                paid_at: new Date().toISOString(),
                status: "completed",
              });
            } else if (proShare > 0) {
              await supabase.from("pro_payouts").insert({
                pro_profile_id: pro.id,
                user_id: pro.user_id,
                type: "earning",
                booking_id: booking.id,
                transaction_id: heldTx.id,
                amount: proShare / 100,
                platform_fee: platformFee / 100,
                commission_rate: commissionRate,
                status: "completed",
              });
            }
          }
        } catch {
          // Stripe has already captured. Payout ledger failures must not block the customer response.
        }
      }

      const txUpdateData: Record<string, unknown> = {
        status: "succeeded",
        stripe_charge_id: paymentIntent.latest_charge || null,
      };
      if (transferId) {
        txUpdateData.metadata = { ...(heldTx.metadata || {}), transfer_id: transferId };
      }

      await supabase.from("transactions").update(txUpdateData).eq("id", heldTx.id);

      await supabase
        .from("bookings")
        .update({
          status: "completed",
          user_confirmed_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", body.booking_id);

      const capturedTotal = parseMoney(paymentIntent.amount_received) / 100;
      await supabase
        .from("invoices")
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          amount_paid: capturedTotal,
          amount_due: 0,
        })
        .eq("booking_id", body.booking_id)
        .in("status", ["draft", "sent", "partially_paid", "overdue"]);

      if (booking.pro_id) {
        try {
          const { data: currentPro } = await supabase
            .from("pro_profiles")
            .select("completed_jobs, total_jobs, user_id")
            .eq("id", booking.pro_id)
            .single();

          if (currentPro) {
            await supabase
              .from("pro_profiles")
              .update({
                completed_jobs: ((currentPro as DbRecord).completed_jobs || 0) + 1,
                total_jobs: ((currentPro as DbRecord).total_jobs || 0) + 1,
              })
              .eq("id", booking.pro_id);

            await createNotification(supabase, (currentPro as DbRecord).user_id, {
              type: "payment",
              title: "Payment Released",
              message: `The customer confirmed the job is complete. Payment of $${heldTx.amount} has been captured.`,
              link: `/pro/bookings/${body.booking_id}`,
              data: { booking_id: body.booking_id },
            });
          }
        } catch {
          // Stripe has already captured. Pro stats and notifications are best-effort.
        }
      }

      return jsonResponse({
        success: true,
        message: "Payment released. Job marked as completed.",
        data: { status: "captured" },
      });
    } catch {
      return errorResponse("Failed to capture payment", 500);
    }
  }

  if (pathname === "/api/payments/transactions" && req.method === "GET") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;

    const { limit, offset } = parsePagination(url);
    const { data, error, count } = await supabase
      .from("transactions")
      .select(`
        *,
        bookings (
          booking_number,
          service_name
        )
      `, { count: "exact" })
      .eq("user_id", auth.user!.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return errorResponse("Failed to fetch transaction history", 500);

    return jsonResponse({
      success: true,
      data: {
        transactions: data || [],
        pagination: {
          limit,
          offset,
          total: count,
        },
      },
    });
  }

  if (pathname === "/api/payments/connect/commission-rate" && req.method === "GET") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;

    let proRate: number | null = null;
    const { data: proProfile } = await supabase
      .from("pro_profiles")
      .select("commission_rate")
      .eq("user_id", auth.user!.id)
      .maybeSingle();

    if ((proProfile as DbRecord | null)?.commission_rate != null) {
      proRate = parseMoney((proProfile as DbRecord).commission_rate);
    }

    const rate = proRate != null ? proRate : PLATFORM_COMMISSION_RATE;
    return jsonResponse({
      success: true,
      data: {
        rate,
        percentage: percentLabel(rate),
        is_custom_rate: proRate != null,
        platform_default: PLATFORM_COMMISSION_RATE,
      },
    });
  }

  if (pathname === "/api/payments/connect/status" && req.method === "GET") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;
    if (auth.profile?.role !== "pro") return errorResponse("Insufficient permissions", 403);

    const proProfile = await getProProfile(supabase, auth.user!.id, "stripe_account_id");
    if (!proProfile) return errorResponse("Pro profile not found", 404);

    if (!proProfile.stripe_account_id) {
      return jsonResponse({
        success: true,
        data: {
          connected: false,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
          account_id: null,
        },
      });
    }

    return proxyToLegacy(req, url);
  }

  if (pathname === "/api/payments/connect/earnings" && req.method === "GET") {
    const auth = await authenticateUser(req, supabase);
    if (auth.response) return auth.response;
    if (auth.profile?.role !== "pro") return errorResponse("Insufficient permissions", 403);

    const proProfile = await getProProfile(supabase, auth.user!.id, "id, commission_rate");
    if (!proProfile) return errorResponse("Pro profile not found", 404);

    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        bookings (
          booking_number,
          service_name,
          base_price,
          total_price,
          tax,
          discount
        )
      `)
      .eq("pro_id", proProfile.id)
      .order("created_at", { ascending: false });

    if (error) return errorResponse("Failed to fetch earnings", 500);

    const transactions = (data || []) as DbRecord[];
    const succeeded = transactions.filter((transaction) => transaction.status === "succeeded");
    const pending = transactions.filter((transaction) => transaction.status === "pending");
    const commissionRate = proProfile.commission_rate != null
      ? parseMoney(proProfile.commission_rate)
      : PLATFORM_COMMISSION_RATE;

    const calculateProShare = (transaction: DbRecord) => {
      const booking = relatedOne(transaction.bookings);
      const basePrice = parseMoney(booking?.base_price || transaction.amount);
      return basePrice * (1 - commissionRate);
    };

    const totalEarnings = succeeded.reduce((sum, transaction) => sum + calculateProShare(transaction), 0);
    const pendingEarnings = pending.reduce((sum, transaction) => sum + calculateProShare(transaction), 0);

    return jsonResponse({
      success: true,
      data: {
        total_earnings: roundMoney(totalEarnings),
        pending_earnings: roundMoney(pendingEarnings),
        total_jobs_paid: succeeded.length,
        pending_jobs: pending.length,
        commission_rate: commissionRate,
        is_custom_rate: proProfile.commission_rate != null,
        transactions: transactions.slice(0, 20),
      },
    });
  }

  if (pathname === "/api/payments/admin/revenue" && req.method === "GET") {
    const auth = await authenticateAdmin(req, supabase);
    if (auth.response) return auth.response;

    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        bookings (
          booking_number,
          service_name,
          base_price,
          total_price,
          tax,
          discount,
          pro_id
        )
      `)
      .order("created_at", { ascending: false });

    if (error) return errorResponse("Failed to fetch revenue data", 500);

    const transactions = (data || []) as DbRecord[];
    const succeeded = transactions.filter((transaction) => transaction.status === "succeeded");
    const pending = transactions.filter((transaction) => transaction.status === "pending");
    const failed = transactions.filter((transaction) => transaction.status === "failed");
    const totalRevenue = succeeded.reduce((sum, transaction) => sum + parseMoney(transaction.amount), 0);
    const platformFees = succeeded.reduce((sum, transaction) => {
      const booking = relatedOne(transaction.bookings);
      const base = parseMoney(booking?.base_price || transaction.amount);
      return sum + base * PLATFORM_COMMISSION_RATE;
    }, 0);
    const proPayouts = totalRevenue - platformFees;
    const pendingAmount = pending.reduce((sum, transaction) => sum + parseMoney(transaction.amount), 0);

    return jsonResponse({
      success: true,
      data: {
        total_revenue: roundMoney(totalRevenue),
        platform_fees: roundMoney(platformFees),
        pro_payouts: roundMoney(proPayouts),
        pending_amount: roundMoney(pendingAmount),
        total_transactions: transactions.length,
        succeeded_count: succeeded.length,
        pending_count: pending.length,
        failed_count: failed.length,
        commission_rate: PLATFORM_COMMISSION_RATE,
        recent_transactions: transactions.slice(0, 50),
      },
    });
  }

  // Route is still handled by the legacy payments backend until cancel-hold,
  // dispute, refund, guest quote checkout, and Connect link flows are ported and smoke-tested.
  return proxyToLegacy(req, url);
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

  if (pathname.startsWith("/api/auth")) {
    const response = await handleAuthRequest(req, url, supabase);
    if (response) return response;
  }

  if (pathname.startsWith("/api/admin-invitations") || pathname.startsWith("/api/admin/invitations")) {
    const response = await handleAdminInvitationRequest(req, url, supabase);
    if (response) return response;
  }

  if (pathname.startsWith("/api/admin/manage-admins")) {
    const response = await handleAdminManageRequest(req, url, supabase);
    if (response) return response;
  }

  if (pathname.startsWith("/api/bookings")) {
    const response = await handleBookingsRequest(req, url, supabase);
    if (response) return response;
  }

  if (pathname.startsWith("/api/quotes-invoices")) {
    const response = await handleQuotesInvoicesRequest(req, url, supabase);
    if (response) return response;
  }

  if (pathname.startsWith("/api/payments")) {
    const response = await handlePaymentsRequest(req, url, supabase);
    if (response) return response;
  }

  return proxyToLegacy(req, url);
});
