// app/api/fund-wallet/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";


const supabaseUrl =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env
    .NEXT_PUBLIC_SUPABASE_ANON_KEY;

const paystackSecretKey =
  process.env
    .PAYSTACK_SECRET_KEY;


if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is missing."
  );
}


if (!supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing."
  );
}


if (!paystackSecretKey) {
  throw new Error(
    "PAYSTACK_SECRET_KEY is missing."
  );
}


const supabase =
  createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );


export async function POST(
  req: NextRequest
) {
  try {

    /*
     * Get the access token
     * sent from the frontend.
     */
    const authHeader =
      req.headers.get(
        "Authorization"
      );


    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authorization header is missing.",
        },
        {
          status: 401,
        }
      );
    }


    const token =
      authHeader.replace(
        "Bearer ",
        ""
      );


    /*
     * Confirm that the user
     * is authenticated.
     */
    const {
      data: {
        user,
      },
      error: authError,
    } =
      await supabase
        .auth
        .getUser(
          token
        );


    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }


    /*
     * Get funding information.
     */
    const {
      amount,
      callback_url,
    } =
      await req.json();


    const fundingAmount =
      Number(
        amount
      );


    if (
      !Number.isFinite(
        fundingAmount
      ) ||
      fundingAmount < 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Minimum funding amount is ₦100.",
        },
        {
          status: 400,
        }
      );
    }


    if (
      !callback_url
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Callback URL is required.",
        },
        {
          status: 400,
        }
      );
    }


    /*
     * Generate a payment
     * reference on Paystack.
     */
    const paystackResponse =
      await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${paystackSecretKey}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              email:
                user.email,

              /*
               * Paystack accepts
               * the amount in kobo.
               */
              amount:
                Math.round(
                  fundingAmount *
                  100
                ),

              callback_url,

              metadata: {
                /*
                 * This identifies
                 * the authenticated
                 * GigPlace user.
                 */
                user_id:
                  user.id,

                purpose:
                  "wallet_funding",

                custom_fields: [
                  {
                    display_name:
                      "User ID",

                    variable_name:
                      "user_id",

                    value:
                      user.id,
                  },
                ],
              },
            }),
        }
      );


    const result =
      await paystackResponse
        .json();


    /*
     * Log the response during
     * development.
     */
    console.log(
      "Paystack initialization:",
      {
        status:
          result.status,

        message:
          result.message,

        reference:
          result.data
            ?.reference,
      }
    );


    if (
      !paystackResponse.ok ||
      !result.status
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            result.message ||
            "Unable to initialize payment.",
        },
        {
          status: 400,
        }
      );
    }


    return NextResponse.json(
      {
        success: true,

        data:
          result.data,
      }
    );

  } catch (
    error: unknown
  ) {

    console.error(
      "Fund wallet API error:",
      error
    );


    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to initialize wallet funding.",
      },
      {
        status: 500,
      }
    );
  }
}