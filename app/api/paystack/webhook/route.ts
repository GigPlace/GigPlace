// app/api/paystack-webhook/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";

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
| Create Supabase Admin Client
|--------------------------------------------------------------------------
|
| The service-role key bypasses RLS.
| Never import this client into frontend code.
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


/*
|--------------------------------------------------------------------------
| Paystack Webhook
|--------------------------------------------------------------------------
*/

export async function POST(
  req: NextRequest
) {
  try {

    /*
    --------------------------------------------------------------
    Get the raw request body.

    Paystack requires the original body when checking the webhook
    signature. Do not use req.json() before this.
    --------------------------------------------------------------
    */

    const rawBody =
      await req.text();


    /*
    --------------------------------------------------------------
    Get Paystack signature
    --------------------------------------------------------------
    */

    const signature =
      req.headers.get(
        "x-paystack-signature"
      );


    if (!signature) {
      console.error(
        "Paystack signature is missing."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack signature is missing.",
        },
        {
          status: 400,
        }
      );
    }


    /*
    --------------------------------------------------------------
    Verify Paystack webhook signature
    --------------------------------------------------------------
    */

    const expectedSignature =
      crypto
        .createHmac(
          "sha512",
          paystackSecretKey as string
        )
        .update(
          rawBody
        )
        .digest(
          "hex"
        );


    if (
      signature !==
      expectedSignature
    ) {
      console.error(
        "Invalid Paystack webhook signature."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid Paystack signature.",
        },
        {
          status: 401,
        }
      );
    }


    /*
    --------------------------------------------------------------
    Convert the webhook body to JSON
    --------------------------------------------------------------
    */

    const event =
      JSON.parse(
        rawBody
      );


    console.log(
      "Paystack event received:",
      event.event
    );


    /*
    --------------------------------------------------------------
    Ignore events that are not successful payments
    --------------------------------------------------------------
    */

    if (
      event.event !==
      "charge.success"
    ) {
      return NextResponse.json(
        {
          success: true,
          received: true,
          message:
            `Event ${event.event} received but not processed.`,
        },
        {
          status: 200,
        }
      );
    }


    /*
    --------------------------------------------------------------
    Get payment information
    --------------------------------------------------------------
    */

    const payment =
      event.data;


    const reference =
      payment.reference;


    /*
    Paystack sends amounts in kobo.

    Example:
    100000 kobo = ₦1,000
    */

    const amountInNaira =
      Number(
        payment.amount
      ) / 100;


    const metadata =
      payment.metadata ||
      {};


    const userId =
      metadata.user_id;


    /*
    --------------------------------------------------------------
    Validate payment information
    --------------------------------------------------------------
    */

    if (!reference) {
      console.error(
        "Payment reference is missing."
      );

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


    if (!userId) {
      console.error(
        "User ID is missing from metadata.",
        {
          reference,
          metadata,
        }
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


    if (
      !Number.isFinite(
        amountInNaira
      ) ||
      amountInNaira <= 0
    ) {
      console.error(
        "Invalid payment amount:",
        payment.amount
      );

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
    --------------------------------------------------------------
    Check whether this payment was already processed
    --------------------------------------------------------------
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
          "id"
        )
        .eq(
          "reference",
          reference
        )
        .maybeSingle();


    if (existingError) {
      console.error(
        "Error checking transaction:",
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
    If the transaction already exists,
    do not credit the wallet again.
    */

    if (
      existingTransaction
    ) {
      console.log(
        "Payment was already processed:",
        reference
      );

      return NextResponse.json(
        {
          success: true,
          received: true,
          message:
            "Payment was already processed.",
        },
        {
          status: 200,
        }
      );
    }


    /*
    --------------------------------------------------------------
    Get the user's wallet
    --------------------------------------------------------------
    */

    const {
      data: wallet,
      error: walletError,
    } =
      await supabaseAdmin
        .from(
          "wallets"
        )
        .select(
          `
            id,
            available_balance
          `
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();


    if (walletError) {
      console.error(
        "Error loading wallet:",
        walletError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            walletError.message,
        },
        {
          status: 500,
        }
      );
    }


    /*
    --------------------------------------------------------------
    Create wallet if it does not exist
    --------------------------------------------------------------
    */

    if (!wallet) {

      const {
        error: createWalletError,
      } =
        await supabaseAdmin
          .from(
            "wallets"
          )
          .insert({
            user_id:
              userId,

            available_balance:
              amountInNaira,

            pending_balance:
              0,

            total_earned:
              0,

            total_withdrawn:
              0,
          });


      if (
        createWalletError
      ) {
        console.error(
          "Unable to create wallet:",
          createWalletError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              createWalletError.message,
          },
          {
            status: 500,
          }
        );
      }

    } else {

      /*
      ------------------------------------------------------------
      Update the existing wallet
      ------------------------------------------------------------
      */

      const currentBalance =
        Number(
          wallet.available_balance
        );


      const newBalance =
        currentBalance +
        amountInNaira;


      const {
        error: updateWalletError,
      } =
        await supabaseAdmin
          .from(
            "wallets"
          )
          .update({
            available_balance:
              newBalance,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "user_id",
            userId
          );


      if (
        updateWalletError
      ) {
        console.error(
          "Unable to update wallet:",
          updateWalletError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              updateWalletError.message,
          },
          {
            status: 500,
          }
        );
      }
    }


    /*
    --------------------------------------------------------------
    Insert transaction record

    Your database uses:

    transaction_type
    direction
    status = completed

    It does NOT use:

    type
    status = success
    --------------------------------------------------------------
    */

    const {
      error: transactionError,
    } =
      await supabaseAdmin
        .from(
          "transactions"
        )
        .insert({
          user_id:
            userId,

          transaction_type:
            "wallet_funding",

          amount:
            amountInNaira,

          direction:
            "credit",

          status:
            "completed",

          reference:
            reference,

          description:
            "Paystack wallet funding",
        });


    if (
      transactionError
    ) {
      console.error(
        "Unable to create transaction:",
        transactionError
      );

      /*
      The wallet has already been updated.
      Returning 500 would make Paystack retry
      the webhook and could create confusion.

      The reference is unique, so the duplicate
      protection will still prevent another
      transaction record.
      */

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
    --------------------------------------------------------------
    Success
    --------------------------------------------------------------
    */

    console.log(
      "Wallet funded successfully:",
      {
        userId,
        reference,
        amount:
          amountInNaira,
      }
    );


    return NextResponse.json(
      {
        success: true,
        received: true,

        message:
          "Wallet credited successfully.",

        data: {
          user_id:
            userId,

          reference,

          amount:
            amountInNaira,
        },
      },
      {
        status: 200,
      }
    );

  } catch (
    error: unknown
  ) {

    console.error(
      "Paystack webhook error:",
      error
    );


    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}