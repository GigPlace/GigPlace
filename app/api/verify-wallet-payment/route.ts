// app/api/verify-payment/route.ts

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

const serviceRoleKey =
  process.env
    .SUPABASE_SERVICE_ROLE_KEY;

const paystackSecretKey =
  process.env
    .PAYSTACK_SECRET_KEY;


/*
|--------------------------------------------------------------------------
| Check environment variables
|--------------------------------------------------------------------------
*/

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is missing."
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is missing."
  );
}

if (!paystackSecretKey) {
  throw new Error(
    "PAYSTACK_SECRET_KEY is missing."
  );
}


/*
|--------------------------------------------------------------------------
| Server-side Supabase client
|--------------------------------------------------------------------------
|
| This client bypasses RLS.
|
| Never import this client into a
| frontend/client component.
|
*/

const supabaseAdmin =
  createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );


export async function POST(
  request: NextRequest
) {
  try {

    /*
    |--------------------------------------------------------------------------
    | Get authenticated user
    |--------------------------------------------------------------------------
    */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (!authorization) {
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


    const accessToken =
      authorization.replace(
        "Bearer ",
        ""
      );


    /*
     * Verify the user's Supabase
     * session using the access token.
     */
    const {
      data: userData,
      error: userError,
    } =
      await supabaseAdmin
        .auth
        .getUser(
          accessToken
        );


    if (
      userError ||
      !userData.user
    ) {
      console.error(
        "Session verification error:",
        userError
      );

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


    const user =
      userData.user;


    /*
    |--------------------------------------------------------------------------
    | Get payment reference
    |--------------------------------------------------------------------------
    */

    const body =
      await request.json();


    const reference =
      body.reference;


    if (
      !reference ||
      typeof reference !==
        "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid payment reference is required.",
        },
        {
          status: 400,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Check if payment was already credited
    |--------------------------------------------------------------------------
    */

    const {
      data: existingTransaction,
      error: existingError,
    } =
      await supabaseAdmin
        .from(
          "transactions"
        )
        .select(
          `
          id,
          user_id,
          amount,
          status,
          direction
          `
        )
        .eq(
          "reference",
          reference
        )
        .maybeSingle();


    if (
      existingError
    ) {
      console.error(
        "Transaction lookup error:",
        existingError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            existingError.message,
        },
        {
          status: 500,
        }
      );
    }


    /*
     * Payment was already processed.
     *
     * Return success instead of
     * crediting the wallet again.
     */
    if (
      existingTransaction
    ) {

      if (
        existingTransaction.user_id !==
        user.id
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This payment does not belong to the current user.",
          },
          {
            status: 403,
          }
        );
      }


      const {
        data: wallet,
      } =
        await supabaseAdmin
          .from(
            "wallets"
          )
          .select(
            "available_balance"
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();


      return NextResponse.json(
        {
          success: true,

          alreadyProcessed:
            true,

          message:
            "This payment has already been credited.",

          balance:
            Number(
              wallet
                ?.available_balance ||
              0
            ),
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Verify payment with Paystack
    |--------------------------------------------------------------------------
    |
    | This request happens on the
    | Next.js server.
    |
    | Do not call Paystack directly
    | from the browser.
    |
    */

    const paystackResponse =
      await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method:
            "GET",

          headers: {
            Authorization:
              `Bearer ${paystackSecretKey}`,

            "Content-Type":
              "application/json",
          },

          cache:
            "no-store",
        }
      );


    const paystackResult =
      await paystackResponse
        .json();


    if (
      !paystackResponse.ok ||
      !paystackResult.status
    ) {
      console.error(
        "Paystack verification failed:",
        paystackResult
      );

      return NextResponse.json(
        {
          success: false,

          error:
            paystackResult.message ||
            "Unable to verify payment with Paystack.",
        },
        {
          status: 400,
        }
      );
    }


    const payment =
      paystackResult.data;


    /*
    |--------------------------------------------------------------------------
    | Validate successful payment
    |--------------------------------------------------------------------------
    */

    if (
      payment.status !==
      "success"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            `Payment is not successful. Current status: ${payment.status}`,
        },
        {
          status: 400,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Confirm payment belongs to user
    |--------------------------------------------------------------------------
    */

    const paymentUserId =
      payment
        ?.metadata
        ?.user_id;


    if (
      paymentUserId &&
      paymentUserId !==
        user.id
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "This payment belongs to another user.",
        },
        {
          status: 403,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Convert kobo to naira
    |--------------------------------------------------------------------------
    */

    const amount =
      Number(
        payment.amount
      ) / 100;


    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "The payment amount is invalid.",
        },
        {
          status: 400,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Credit wallet
    |--------------------------------------------------------------------------
    |
    | Your transactions table uses:
    |
    | transaction_type
    | direction
    | status
    |
    | Therefore, do NOT use:
    |
    | type
    |
    */

    const {
      data: creditResult,
      error: creditError,
    } =
      await supabaseAdmin
        .rpc(
          "credit_wallet",
          {
            p_user_id:
              user.id,

            p_amount:
              amount,

            p_reference:
              reference,

            p_description:
              "Paystack wallet funding",
          }
        );


    if (
      creditError
    ) {
      console.error(
        "Wallet credit error:",
        creditError
      );

      return NextResponse.json(
        {
          success: false,

          error:
            creditError.message,
        },
        {
          status: 500,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Get updated wallet balance
    |--------------------------------------------------------------------------
    */

    const {
      data: updatedWallet,
      error: walletError,
    } =
      await supabaseAdmin
        .from(
          "wallets"
        )
        .select(
          "available_balance"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();


    if (
      walletError
    ) {
      console.error(
        "Updated wallet lookup error:",
        walletError
      );
    }


    console.log(
      "Wallet payment verified and credited:",
      {
        userId:
          user.id,

        reference,

        amount,
      }
    );


    return NextResponse.json(
      {
        success: true,

        message:
          "Payment verified and wallet credited.",

        amount,

        balance:
          Number(
            updatedWallet
              ?.available_balance ||
            0
          ),

        data:
          creditResult,
      }
    );

  } catch (
    error: unknown
  ) {

    console.error(
      "Payment verification error:",
      error
    );


    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Payment verification failed.",
      },
      {
        status: 500,
      }
    );
  }
}