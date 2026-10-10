
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

// const supabaseAnonKey =
//   process.env
//     .NEXT_PUBLIC_SUPABASE_ANON_KEY;

// const paystackSecretKey =
//   process.env
//     .PAYSTACK_SECRET_KEY;


// if (!supabaseUrl) {
//   throw new Error(
//     "NEXT_PUBLIC_SUPABASE_URL is missing."
//   );
// }


// if (!supabaseAnonKey) {
//   throw new Error(
//     "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing."
//   );
// }


// if (!paystackSecretKey) {
//   throw new Error(
//     "PAYSTACK_SECRET_KEY is missing."
//   );
// }


// const supabase =
//   createClient(
//     supabaseUrl,
//     supabaseAnonKey,
//     {
//       auth: {
//         autoRefreshToken: false,
//         persistSession: false,
//       },
//     }
//   );


// export async function POST(
//   req: NextRequest
// ) {
//   try {

//     /*
//      * Get the access token
//      * sent from the frontend.
//      */
//     const authHeader =
//       req.headers.get(
//         "Authorization"
//       );


//     if (!authHeader) {
//       return NextResponse.json(
//         {
//           success: false,
//           error:
//             "Authorization header is missing.",
//         },
//         {
//           status: 401,
//         }
//       );
//     }


//     const token =
//       authHeader.replace(
//         "Bearer ",
//         ""
//       );


//     /*
//      * Confirm that the user
//      * is authenticated.
//      */
//     const {
//       data: {
//         user,
//       },
//       error: authError,
//     } =
//       await supabase
//         .auth
//         .getUser(
//           token
//         );


//     if (
//       authError ||
//       !user
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           error:
//             "Invalid or expired session.",
//         },
//         {
//           status: 401,
//         }
//       );
//     }


//     /*
//      * Get funding information.
//      */
//     const {
//       amount,
//       callback_url,
//     } =
//       await req.json();


//     const fundingAmount =
//       Number(
//         amount
//       );


//     if (
//       !Number.isFinite(
//         fundingAmount
//       ) ||
//       fundingAmount < 100
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           error:
//             "Minimum funding amount is ₦100.",
//         },
//         {
//           status: 400,
//         }
//       );
//     }


//     if (
//       !callback_url
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           error:
//             "Callback URL is required.",
//         },
//         {
//           status: 400,
//         }
//       );
//     }


//     /*
//      * Generate a payment
//      * reference on Paystack.
//      */
//     const paystackResponse =
//       await fetch(
//         "https://api.paystack.co/transaction/initialize",
//         {
//           method:
//             "POST",

//           headers: {
//             Authorization:
//               `Bearer ${paystackSecretKey}`,

//             "Content-Type":
//               "application/json",
//           },

//           body:
//             JSON.stringify({
//               email:
//                 user.email,

//               /*
//                * Paystack accepts
//                * the amount in kobo.
//                */
//               amount:
//                 Math.round(
//                   fundingAmount *
//                   100
//                 ),

//               callback_url,

//               metadata: {
//                 /*
//                  * This identifies
//                  * the authenticated
//                  * GigPlace user.
//                  */
//                 user_id:
//                   user.id,

//                 purpose:
//                   "wallet_funding",

//                 custom_fields: [
//                   {
//                     display_name:
//                       "User ID",

//                     variable_name:
//                       "user_id",

//                     value:
//                       user.id,
//                   },
//                 ],
//               },
//             }),
//         }
//       );


//     const result =
//       await paystackResponse
//         .json();


//     /*
//      * Log the response during
//      * development.
//      */
//     console.log(
//       "Paystack initialization:",
//       {
//         status:
//           result.status,

//         message:
//           result.message,

//         reference:
//           result.data
//             ?.reference,
//       }
//     );


//     if (
//       !paystackResponse.ok ||
//       !result.status
//     ) {
//       return NextResponse.json(
//         {
//           success: false,

//           error:
//             result.message ||
//             "Unable to initialize payment.",
//         },
//         {
//           status: 400,
//         }
//       );
//     }


//     return NextResponse.json(
//       {
//         success: true,

//         data:
//           result.data,
//       }
//     );

//   } catch (
//     error: unknown
//   ) {

//     console.error(
//       "Fund wallet API error:",
//       error
//     );


//     return NextResponse.json(
//       {
//         success: false,

//         error:
//           error instanceof Error
//             ? error.message
//             : "Unable to initialize wallet funding.",
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
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

const authClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const adminClient =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

function isAllowedCallbackUrl(value: string): boolean {
  try {
    const callback = new URL(value);

    if (
      process.env.NODE_ENV === 'production' &&
      callback.protocol !== 'https:'
    ) {
      return false;
    }

    const configuredUrls = [
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined,
    ].filter((url): url is string => Boolean(url));

    if (process.env.NODE_ENV !== 'production') {
      configuredUrls.push(
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      );
    }

    const allowedOrigins = configuredUrls.map(
      (url) => new URL(url).origin,
    );

    return allowedOrigins.includes(callback.origin);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey ||
      !paystackSecretKey ||
      !authClient ||
      !adminClient
    ) {
      console.error('Wallet funding environment variables are missing.');

      return NextResponse.json(
        { success: false, message: 'Payment service is not configured.' },
        { status: 500 },
      );
    }

    // Authenticate the current user.
    const authorization = req.headers.get('authorization');
    const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);

    if (!bearerMatch) {
      return NextResponse.json(
        { success: false, message: 'Authentication is required.' },
        { status: 401 },
      );
    }

    const token = bearerMatch[1].trim();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Your session is invalid or expired.' },
        { status: 401 },
      );
    }

    // Validate the request body.
    const body: unknown = await req.json();

    if (
      typeof body !== 'object' ||
      body === null ||
      !('amount' in body) ||
      !('callback_url' in body)
    ) {
      return NextResponse.json(
        { success: false, message: 'Amount and callback URL are required.' },
        { status: 400 },
      );
    }

    const { amount, callback_url } = body;

    if (
      (typeof amount !== 'number' && typeof amount !== 'string') ||
      (typeof amount === 'string' && amount.trim() === '')
    ) {
      return NextResponse.json(
        { success: false, message: 'Enter a valid funding amount.' },
        { status: 400 },
      );
    }

    const requestedAmount = Number(amount);
    const amountInKobo = Math.round(requestedAmount * 100);

    if (
      !Number.isFinite(requestedAmount) ||
      !Number.isSafeInteger(amountInKobo) ||
      requestedAmount < 100 ||
      Math.abs(requestedAmount * 100 - amountInKobo) > 0.000001
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'The minimum funding amount is ₦100.',
        },
        { status: 400 },
      );
    }

    if (
      typeof callback_url !== 'string' ||
      !isAllowedCallbackUrl(callback_url)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'The payment callback URL is invalid or not allowed.',
        },
        { status: 400 },
      );
    }

    // A verified email is required for Paystack checkout.
    if (!user.email) {
      return NextResponse.json(
        {
          success: false,
          message: 'Your account must have an email address to fund your wallet.',
        },
        { status: 400 },
      );
    }

    // Initialize the transaction with Paystack.
    const paystackResponse = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: amountInKobo,
          currency: 'NGN',
          callback_url,
          metadata: {
            user_id: user.id,
            purpose: 'wallet_funding',
            custom_fields: [
              {
                display_name: 'User ID',
                variable_name: 'user_id',
                value: user.id,
              },
            ],
          },
        }),
        cache: 'no-store',
      },
    );

    const paystackResult: {
      status?: boolean;
      message?: string;
      data?: {
        reference?: string;
        authorization_url?: string;
        access_code?: string;
      };
    } = await paystackResponse.json();

    const paymentData = paystackResult.data;
    const reference = paymentData?.reference;

    if (
      !paystackResponse.ok ||
      !paystackResult.status ||
      !reference ||
      !paymentData?.authorization_url
    ) {
      console.error('Paystack initialization failed:', {
        status: paystackResponse.status,
        message: paystackResult.message,
      });

      return NextResponse.json(
        {
          success: false,
          message: paystackResult.message || 'Unable to initialize payment.',
        },
        { status: 502 },
      );
    }

    // Store the funding request before giving the user the checkout URL.
    const { error: transactionError } = await adminClient
      .from('transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'wallet_funding',
        amount: amountInKobo / 100,
        direction: 'credit',
        status: 'pending',
        reference,
        description: 'Paystack wallet funding',
      });

    if (transactionError) {
      console.error('Unable to save funding transaction:', {
        code: transactionError.code,
        message: transactionError.message,
      });

      return NextResponse.json(
        {
          success: false,
          message:
            'The payment request could not be saved. Please try again.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment initialized successfully.',
      data: {
        reference,
        authorization_url: paymentData.authorization_url,
        access_code: paymentData.access_code,
      },
    });
  } catch (error: unknown) {
    console.error(
      'Fund wallet error:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    return NextResponse.json(
      { success: false, message: 'Unable to initialize wallet funding.' },
      { status: 500 },
    );
  }
}
