// import {
//   NextRequest,
//   NextResponse,
// } from "next/server";

// import {
//   createClient,
// } from "@supabase/supabase-js";


// const supabaseUrl =
//   process.env
//     .NEXT_PUBLIC_SUPABASE_URL;

// const serviceRoleKey =
//   process.env
//     .SUPABASE_SERVICE_ROLE_KEY;

// const paystackSecretKey =
//   process.env
//     .PAYSTACK_SECRET_KEY;


// /*
// |--------------------------------------------------------------------------
// | Check environment variables
// |--------------------------------------------------------------------------
// */

// if (!supabaseUrl) {
//   throw new Error(
//     "NEXT_PUBLIC_SUPABASE_URL is missing."
//   );
// }

// if (!serviceRoleKey) {
//   throw new Error(
//     "SUPABASE_SERVICE_ROLE_KEY is missing."
//   );
// }

// if (!paystackSecretKey) {
//   throw new Error(
//     "PAYSTACK_SECRET_KEY is missing."
//   );
// }


// /*
// |--------------------------------------------------------------------------
// | Supabase admin client
// |--------------------------------------------------------------------------
// |
// | This runs only on the server.
// | It bypasses RLS.
// |
// */

// const supabaseAdmin =
//   createClient(
//     supabaseUrl,
//     serviceRoleKey,
//     {
//       auth: {
//         autoRefreshToken: false,
//         persistSession: false,
//       },
//     }
//   );


// export async function GET(
//   request: NextRequest
// ) {

//   try {

//     /*
//     |--------------------------------------------------------------------------
//     | Get payment reference
//     |--------------------------------------------------------------------------
//     */

//     const reference =
//       request
//         .nextUrl
//         .searchParams
//         .get(
//           "reference"
//         );


//     if (
//       !reference
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           error:
//             "Payment reference is missing.",
//         },
//         {
//           status: 400,
//         }
//       );
//     }


//     /*
//     |--------------------------------------------------------------------------
//     | Check whether payment was already processed
//     |--------------------------------------------------------------------------
//     */

//     const {
//       data:
//         existingTransaction,

//       error:
//         transactionError,
//     } =
//       await supabaseAdmin
//         .from(
//           "transactions"
//         )
//         .select(
//           `
//           id,
//           user_id,
//           amount,
//           status
//           `
//         )
//         .eq(
//           "reference",
//           reference
//         )
//         .maybeSingle();


//     if (
//       transactionError
//     ) {

//       console.error(
//         "Transaction lookup error:",
//         transactionError
//       );

//       return NextResponse.json(
//         {
//           success: false,
//           error:
//             transactionError.message,
//         },
//         {
//           status: 500,
//         }
//       );

//     }


//     /*
//      * If already credited,
//      * return the current balance.
//      */
//     if (
//       existingTransaction
//     ) {

//       const {
//         data:
//           existingWallet,

//         error:
//           walletError,
//       } =
//         await supabaseAdmin
//           .from(
//             "wallets"
//           )
//           .select(
//             "available_balance"
//           )
//           .eq(
//             "user_id",
//             existingTransaction.user_id
//           )
//           .maybeSingle();


//       if (
//         walletError
//       ) {

//         console.error(
//           "Wallet lookup error:",
//           walletError
//         );

//       }


//       return NextResponse.json(
//         {
//           success: true,

//           alreadyProcessed:
//             true,

//           message:
//             "This payment has already been credited.",

//           balance:
//             Number(
//               existingWallet
//                 ?.available_balance ||
//               0
//             ),
//         }
//       );

//     }


//     /*
//     |--------------------------------------------------------------------------
//     | Verify payment with Paystack
//     |--------------------------------------------------------------------------
//     */

//     const paystackResponse =
//       await fetch(
//         `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
//         {
//           method:
//             "GET",

//           headers: {
//             Authorization:
//               `Bearer ${paystackSecretKey}`,
//           },

//           cache:
//             "no-store",
//         }
//       );


//     const paystackResult =
//       await paystackResponse
//         .json();


//     if (
//       !paystackResponse.ok ||
//       !paystackResult.status
//     ) {

//       console.error(
//         "Paystack verification failed:",
//         paystackResult
//       );

//       return NextResponse.json(
//         {
//           success: false,

//           error:
//             paystackResult.message ||
//             "Unable to verify payment.",
//         },
//         {
//           status: 400,
//         }
//       );

//     }


//     const payment =
//       paystackResult.data;


//     /*
//     |--------------------------------------------------------------------------
//     | Confirm payment status
//     |--------------------------------------------------------------------------
//     */

//     if (
//       payment.status !==
//       "success"
//     ) {

//       return NextResponse.json(
//         {
//           success: false,

//           error:
//             `Payment is not successful. Current status: ${payment.status}`,
//         },
//         {
//           status: 400,
//         }
//       );

//     }


//     /*
//     |--------------------------------------------------------------------------
//     | Get user ID from Paystack metadata
//     |--------------------------------------------------------------------------
//     */

//     const userId =
//       payment
//         ?.metadata
//         ?.user_id;


//     if (
//       !userId
//     ) {

//       console.error(
//         "No user ID found in Paystack metadata:",
//         reference
//       );

//       return NextResponse.json(
//         {
//           success: false,

//           error:
//             "User ID was not found in payment metadata.",
//         },
//         {
//           status: 400,
//         }
//       );

//     }


//     /*
//     |--------------------------------------------------------------------------
//     | Convert kobo to naira
//     |--------------------------------------------------------------------------
//     */

//     const amount =
//       Number(
//         payment.amount
//       ) / 100;


//     if (
//       !Number.isFinite(
//         amount
//       ) ||
//       amount <= 0
//     ) {

//       return NextResponse.json(
//         {
//           success: false,

//           error:
//             "Invalid payment amount.",
//         },
//         {
//           status: 400,
//         }
//       );

//     }


//     /*
//     |--------------------------------------------------------------------------
//     | Credit wallet
//     |--------------------------------------------------------------------------
//     */

//     const {
//       data:
//         creditResult,

//       error:
//         creditError,
//     } =
//       await supabaseAdmin
//         .rpc(
//           "credit_wallet",
//           {
//             p_user_id:
//               userId,

//             p_amount:
//               amount,

//             p_reference:
//               reference,

//             p_description:
//               "Paystack wallet funding",
//           }
//         );


//     if (
//       creditError
//     ) {

//       console.error(
//         "Wallet credit error:",
//         creditError
//       );

//       return NextResponse.json(
//         {
//           success: false,

//           error:
//             creditError.message,
//         },
//         {
//           status: 500,
//         }
//       );

//     }


//     /*
//     |--------------------------------------------------------------------------
//     | Return updated balance
//     |--------------------------------------------------------------------------
//     */

//     const {
//       data:
//         updatedWallet,

//       error:
//         updatedWalletError,
//     } =
//       await supabaseAdmin
//         .from(
//           "wallets"
//         )
//         .select(
//           "available_balance"
//         )
//         .eq(
//           "user_id",
//           userId
//         )
//         .maybeSingle();


//     if (
//       updatedWalletError
//     ) {

//       console.error(
//         "Updated wallet error:",
//         updatedWalletError
//       );

//     }


//     return NextResponse.json(
//       {
//         success: true,

//         message:
//           "Payment verified and wallet credited successfully.",

//         amount,

//         balance:
//           Number(
//             updatedWallet
//               ?.available_balance ||
//             0
//           ),

//         data:
//           creditResult,
//       }
//     );

//   } catch (
//     error: unknown
//   ) {

//     console.error(
//       "Wallet verification error:",
//       error
//     );


//     return NextResponse.json(
//       {
//         success: false,

//         error:
//           error instanceof Error
//             ? error.message
//             : "Wallet payment verification failed.",
//       },
//       {
//         status: 500,
//       }
//     );

//   }

// }



import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

const adminClient =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

type FundingTransaction = {
  id: string;
  user_id: string;
  amount: number | string;
  status: string;
  transaction_type: string;
  direction: string;
};

type PaystackVerificationResponse = {
  status?: boolean;
  message?: string;
  data?: {
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    metadata?: {
      user_id?: string;
      purpose?: string;
    } | null;
  };
};

export async function GET(req: NextRequest) {
  try {
    if (!adminClient || !paystackSecretKey) {
      console.error('Payment verification environment variables are missing.');

      return NextResponse.json(
        { success: false, message: 'Payment service is not configured.' },
        { status: 500 },
      );
    }

    const reference = req.nextUrl.searchParams.get('reference')?.trim();

    if (!reference || reference.length > 200) {
      return NextResponse.json(
        { success: false, message: 'A valid payment reference is required.' },
        { status: 400 },
      );
    }

    // Find the original funding request in our database.
    const { data: transactionData, error: transactionError } =
      await adminClient
        .from('transactions')
        .select(
          'id, user_id, amount, status, transaction_type, direction',
        )
        .eq('reference', reference)
        .maybeSingle();

    if (transactionError) {
      console.error('Transaction lookup failed:', transactionError.message);

      return NextResponse.json(
        { success: false, message: 'Unable to find the funding transaction.' },
        { status: 500 },
      );
    }

    if (!transactionData) {
      return NextResponse.json(
        {
          success: false,
          message: 'No funding transaction was found for this reference.',
        },
        { status: 404 },
      );
    }

    const transaction = transactionData as FundingTransaction;

    if (
      transaction.transaction_type !== 'wallet_funding' ||
      transaction.direction !== 'credit'
    ) {
      return NextResponse.json(
        { success: false, message: 'This is not a wallet-funding transaction.' },
        { status: 400 },
      );
    }

    // A completed transaction must not be credited again.
    if (transaction.status === 'completed') {
      const { data: wallet, error: walletError } = await adminClient
        .from('wallets')
        .select('available_balance')
        .eq('user_id', transaction.user_id)
        .maybeSingle();

      if (walletError) {
        console.error('Wallet lookup failed:', walletError.message);

        return NextResponse.json(
          {
            success: false,
            message: 'Payment was processed, but the balance could not be retrieved.',
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        message: 'This payment has already been processed.',
        data: {
          reference,
          balance: wallet?.available_balance ?? 0,
        },
      });
    }

    if (transaction.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          message: 'This funding transaction is not pending.',
        },
        { status: 409 },
      );
    }

    const expectedAmount = Number(transaction.amount);
    const expectedAmountInKobo = Math.round(expectedAmount * 100);

    if (
      !Number.isFinite(expectedAmount) ||
      expectedAmount <= 0 ||
      !Number.isSafeInteger(expectedAmountInKobo)
    ) {
      console.error('Invalid stored funding amount:', reference);

      return NextResponse.json(
        { success: false, message: 'The stored funding amount is invalid.' },
        { status: 500 },
      );
    }

    // Ask Paystack directly whether this reference was paid successfully.
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
    );

    const paystackResult: PaystackVerificationResponse =
      await paystackResponse.json();

    const payment = paystackResult.data;

    if (!paystackResponse.ok || !paystackResult.status || !payment) {
      console.error('Paystack verification failed:', {
        status: paystackResponse.status,
        message: paystackResult.message,
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Unable to verify this payment with Paystack.',
        },
        { status: 502 },
      );
    }

    if (payment.status !== 'success') {
      return NextResponse.json(
        {
          success: false,
          message: 'Paystack has not confirmed a successful payment.',
          paymentStatus: payment.status ?? 'unknown',
        },
        { status: 400 },
      );
    }

    // Confirm that Paystack's details match the saved funding request.
    if (
      payment.reference !== reference ||
      payment.currency !== 'NGN' ||
      payment.amount !== expectedAmountInKobo ||
      payment.metadata?.user_id !== transaction.user_id ||
      payment.metadata?.purpose !== 'wallet_funding'
    ) {
      console.error('Paystack payment details did not match:', reference);

      return NextResponse.json(
        {
          success: false,
          message:
            'The verified payment details do not match the funding request.',
        },
        { status: 400 },
      );
    }

    // The database function locks the pending transaction and credits
    // the wallet and completes the transaction atomically.
    const { data: creditResult, error: creditError } = await adminClient.rpc(
      'credit_wallet',
      {
        p_user_id: transaction.user_id,
        p_amount: expectedAmount,
        p_reference: reference,
        p_description: 'Paystack wallet funding',
      },
    );

    if (creditError) {
      console.error('Wallet credit failed:', creditError.message);

      return NextResponse.json(
        {
          success: false,
          message: 'Payment was verified, but wallet crediting failed. Please retry verification.',
        },
        { status: 500 },
      );
    }

    const result = creditResult as
      | {
          success?: boolean;
          message?: string;
          alreadyProcessed?: boolean;
          balance?: number;
        }
      | null;

    if (!result?.success) {
      console.error('Wallet credit was rejected:', result?.message);

      return NextResponse.json(
        {
          success: false,
          message: result?.message || 'The wallet could not be credited.',
        },
        { status: 409 },
      );
    }

    const { data: wallet, error: walletError } = await adminClient
      .from('wallets')
      .select('available_balance')
      .eq('user_id', transaction.user_id)
      .maybeSingle();

    if (walletError) {
      console.error('Balance lookup after credit failed:', walletError.message);

      // The credit may already have succeeded. The next verification
      // call will detect the completed transaction without crediting again.
      return NextResponse.json({
        success: true,
        message: 'Payment verified and processed.',
        data: {
          reference,
          balance: result.balance ?? null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed ?? false,
      message: result.message || 'Payment verified and wallet credited.',
      data: {
        reference,
        balance: wallet?.available_balance ?? result.balance ?? 0,
      },
    });
  } catch (error: unknown) {
    console.error(
      'Verify payment error:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    return NextResponse.json(
      { success: false, message: 'Unable to verify payment right now.' },
      { status: 500 },
    );
  }
}
