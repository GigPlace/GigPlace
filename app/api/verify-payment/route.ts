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
| Supabase admin client
|--------------------------------------------------------------------------
|
| This runs only on the server.
| It bypasses RLS.
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


export async function GET(
  request: NextRequest
) {

  try {

    /*
    |--------------------------------------------------------------------------
    | Get payment reference
    |--------------------------------------------------------------------------
    */

    const reference =
      request
        .nextUrl
        .searchParams
        .get(
          "reference"
        );


    if (
      !reference
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment reference is missing.",
        },
        {
          status: 400,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Check whether payment was already processed
    |--------------------------------------------------------------------------
    */

    const {
      data:
        existingTransaction,

      error:
        transactionError,
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
          status
          `
        )
        .eq(
          "reference",
          reference
        )
        .maybeSingle();


    if (
      transactionError
    ) {

      console.error(
        "Transaction lookup error:",
        transactionError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            transactionError.message,
        },
        {
          status: 500,
        }
      );

    }


    /*
     * If already credited,
     * return the current balance.
     */
    if (
      existingTransaction
    ) {

      const {
        data:
          existingWallet,

        error:
          walletError,
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
            existingTransaction.user_id
          )
          .maybeSingle();


      if (
        walletError
      ) {

        console.error(
          "Wallet lookup error:",
          walletError
        );

      }


      return NextResponse.json(
        {
          success: true,

          alreadyProcessed:
            true,

          message:
            "This payment has already been credited.",

          balance:
            Number(
              existingWallet
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
            "Unable to verify payment.",
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
    | Confirm payment status
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
    | Get user ID from Paystack metadata
    |--------------------------------------------------------------------------
    */

    const userId =
      payment
        ?.metadata
        ?.user_id;


    if (
      !userId
    ) {

      console.error(
        "No user ID found in Paystack metadata:",
        reference
      );

      return NextResponse.json(
        {
          success: false,

          error:
            "User ID was not found in payment metadata.",
        },
        {
          status: 400,
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
            "Invalid payment amount.",
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
    */

    const {
      data:
        creditResult,

      error:
        creditError,
    } =
      await supabaseAdmin
        .rpc(
          "credit_wallet",
          {
            p_user_id:
              userId,

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
    | Return updated balance
    |--------------------------------------------------------------------------
    */

    const {
      data:
        updatedWallet,

      error:
        updatedWalletError,
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
          userId
        )
        .maybeSingle();


    if (
      updatedWalletError
    ) {

      console.error(
        "Updated wallet error:",
        updatedWalletError
      );

    }


    return NextResponse.json(
      {
        success: true,

        message:
          "Payment verified and wallet credited successfully.",

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
      "Wallet verification error:",
      error
    );


    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Wallet payment verification failed.",
      },
      {
        status: 500,
      }
    );

  }

}