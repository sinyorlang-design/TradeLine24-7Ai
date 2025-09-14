import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  PHONE = "+15878839797",
  ORG_NAME = "Apex Business Systems",
  AGENT_NAME = "Nova",
  LOCALE = "en-CA",
  TAGLINE_ON = "true",
  TEMPLATE = "Hi, this is {{biz}} support, powered by TradeLine 24/7! I'm {{agent}}, always here to help.",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE");
  process.exit(1);
}

// Use SUPABASE_URL directly - it should already be the full URL
const supabaseUrl = SUPABASE_URL;

const supa = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

// basic slugify
function slugify(s) {
  return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

(async () => {
  // 1) ensure org exists (insert-or-select)
  const orgSlug = slugify(ORG_NAME);
  // Try select first
  let { data: org, error: selErr } = await supa
    .from("organizations")
    .select("id")
    .eq("name", ORG_NAME)
    .limit(1)
    .maybeSingle();

  if (!org && !selErr) {
    const { error: insErr } = await supa
      .from("organizations")
      .insert([{ name: ORG_NAME, slug: orgSlug, settings: {} }]);
    if (insErr && insErr.code !== '23505') { // 23505 is unique constraint violation
      console.error("Failed to ensure organization:", insErr.message);
      process.exit(1);
    }
    // Re-fetch after insert attempt
    ({ data: org } = await supa
      .from("organizations")
      .select("id")
      .eq("name", ORG_NAME)
      .limit(1)
      .single());
  }
  
  if (selErr && selErr.code !== 'PGRST116') { // PGRST116 is "no rows found"
    console.error("Error selecting organization:", selErr.message);
    process.exit(1);
  }
  
  if (!org?.id) {
    console.error("Organization id not found after upsert.");
    process.exit(1);
  }

  // 2) upsert hotline row
  const upsertPayload = {
    phone_e164: PHONE,
    org_id: org.id,
    agent_name: AGENT_NAME,
    locale: LOCALE,
    tagline_on: String(TAGLINE_ON).toLowerCase() === "true",
    greeting_template: TEMPLATE,
  };

  const { error: upErr } = await supa
    .from("hotline_numbers")
    .upsert(upsertPayload, { onConflict: "phone_e164" });
  if (upErr) {
    console.error("Failed to upsert hotline:", upErr.message);
    process.exit(1);
  }

  // 3) verify via RPC
  const { data: greeting, error: rpcErr } = await supa.rpc("resolve_greeting", {
    p_phone_e164: PHONE,
  });
  if (rpcErr) {
    console.error("resolve_greeting RPC failed:", rpcErr.message);
    process.exit(1);
  }

  console.log(greeting || "(no greeting returned)");
})();