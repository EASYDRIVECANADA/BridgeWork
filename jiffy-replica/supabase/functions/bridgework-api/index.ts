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

const LEGACY_API_BASE_URL = Deno.env.get("LEGACY_API_BASE_URL")?.replace(/\/+$/, "");
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

  return proxyToLegacy(req, url);
});
