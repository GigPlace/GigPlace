import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing.");
if (!supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
if (!paystackSecretKey) throw new Error("PAYSTACK_SECRET_KEY is missing.");

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in again." },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace("Bearer ", "");

    // Verify user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      console.error("User verification error:", userError);
      return NextResponse.json(
        { success: false, error: "Your login session is invalid. Please log in again." },
        { status: 401 }
      );
    }

    // Check if user already has a funding account
    const { data: existingAccount, error: existingError } = await supabaseAdmin
      .from("virtual_accounts")
      .select(`
        id,
        account_number,
        account_name,
        bank_name,
        is_active
      `)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      console.error("Existing account query error:", existingError);
      return NextResponse.json(
        { success: false, error: existingError.message },
        { status: 500 }
      );
    }

    if (existingAccount) {
      return NextResponse.json({
        success: true,
        message: "Your funding account already exists.",
        account: existingAccount,
      });
    }

    // Get user profile (full_name only)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Profile query error:", profileError);
      return NextResponse.json(
        { success: false, error: `Unable to load your profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    const fullName = profile?.full_name ||
                     (user.user_metadata as any)?.full_name ||
                     "GigPlace User";

    const email = user.email;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Your account does not have an email address." },
        { status: 400 }
      );
    }

    // === Create Paystack Customer ===
    const customerResponse = await fetch("https://api.paystack.co/customer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        first_name: fullName.split(" ")[0] || "GigPlace",
        last_name: fullName.split(" ").slice(1).join(" ") || "User",
      }),
    });

    const customerResult = await customerResponse.json();

    if (!customerResponse.ok || !customerResult.status) {
      console.error("Paystack customer error:", customerResult);
      return NextResponse.json(
        { success: false, error: customerResult.message || "Failed to create Paystack customer." },
        { status: 500 }
      );
    }

    // === Create Dedicated Virtual Account ===
    const accountResponse = await fetch("https://api.paystack.co/dedicated_account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: customerResult.data.customer_code,
        preferred_bank: "wema-bank",
      }),
    });

    const accountResult = await accountResponse.json();

    if (!accountResponse.ok || !accountResult.status) {
      console.error("Paystack dedicated account error:", accountResult);

      const errorMsg = accountResult.message?.toLowerCase() || "";

      if (errorMsg.includes("dedicated nuban is not available")) {
        return NextResponse.json(
          {
            success: false,
            error: "Dedicated funding accounts are not yet available for your business. Please complete your business verification on Paystack or contact their support.",
            code: "DVA_NOT_ENABLED",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { success: false, error: accountResult.message || "Failed to create funding account." },
        { status: 500 }
      );
    }

    const paystackAccount = accountResult.data;

    // === Save account to Supabase ===
    const { data: savedAccount, error: saveError } = await supabaseAdmin
      .from("virtual_accounts")
      .insert({
        user_id: user.id,
        account_number: paystackAccount.account_number,
        account_name: paystackAccount.account_name,
        bank_name: paystackAccount.bank?.name || "Paystack",
        paystack_customer_code: customerResult.data.customer_code,
        paystack_account_id: String(paystackAccount.id),
        is_active: true,
      })
      .select(`
        id,
        account_number,
        account_name,
        bank_name,
        is_active
      `)
      .single();

    if (saveError) {
      console.error("Save virtual account error:", saveError);
      return NextResponse.json(
        {
          success: false,
          error: `Paystack account created but failed to save: ${saveError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your funding account was created successfully.",
        account: savedAccount,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create funding account route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}