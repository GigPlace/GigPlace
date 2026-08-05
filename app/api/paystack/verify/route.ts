import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * Get the user's access token.
     */
    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication token is missing.",
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
     * Validate the user with
     * the service-role client.
     */
    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin
        .auth
        .getUser(
          accessToken
        );

    if (
      authError ||
      !authData.user
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

    const user =
      authData.user;

    /*
     * Get the Paystack reference.
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
            "Payment reference is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Verify the payment on the
     * server. Never call Paystack
     * directly from the browser.
     */
    const paystackResponse =
      await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(
          reference
        )}`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },

          cache: "no-store",
        }
      );

    const paystackResult =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackResult.status
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            paystackResult.message ||
            "Paystack could not verify this payment.",
        },
        {
          status: 400,
        }
      );
    }

    const payment =
      paystackResult.data;

    /*
     * Only successful payments
     * can credit the wallet.
     */
    if (
      payment.status !==
      "success"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment has not been completed.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Make sure this payment
     * belongs to the logged-in user.
     */
    const paymentUserId =
      payment.metadata?.user_id;

    if (
      paymentUserId &&
      paymentUserId !==
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

    /*
     * Paystack returns amounts
     * in kobo.
     */
    const amountInNaira =
      Number(
        payment.amount
      ) / 100;

    if (
      !Number.isFinite(
        amountInNaira
      ) ||
      amountInNaira <= 0
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
     * Check whether this payment
     * was already credited.
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

    if (
      existingError
    ) {
      throw existingError;
    }

    if (
      existingTransaction
    ) {
      return NextResponse.json(
        {
          success: true,

          alreadyProcessed:
            true,

          message:
            "This payment has already been credited.",
        }
      );
    }

    /*
     * Use your database function
     * to update the wallet and
     * insert the transaction.
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
              user.id,

            p_amount:
              amountInNaira,

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
        "credit_wallet error:",
        creditError
      );

      throw creditError;
    }

    return NextResponse.json(
      {
        success: true,

        message:
          "Payment verified and wallet credited.",

        amount:
          amountInNaira,

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
            : "Unable to verify the payment.",
      },
      {
        status: 500,
      }
    );
  }
}