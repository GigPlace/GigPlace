"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  Loader2,
  Wallet,
  ArrowRight,
  XCircle,
} from "lucide-react";

import Link from "next/link";

import {
  supabase,
} from "@/lib/supabase";


type PageState =
  | "loading"
  | "success"
  | "error";


type VerifyPaymentResult = {
  success?: boolean;
  error?: string;
  message?: string;
  balance?: number;
  amount?: number;
  alreadyProcessed?: boolean;
};


export default function
WalletPaymentSuccessPage() {

  const [
    state,
    setState,
  ] =
    useState<PageState>(
      "loading"
    );


  const [
    message,
    setMessage,
  ] =
    useState(
      "Verifying your payment..."
    );


  const [
    balance,
    setBalance,
  ] =
    useState<number | null>(
      null
    );


  useEffect(
    () => {

      const verifyPayment =
        async () => {

          try {

            /*
             * Get the Paystack payment
             * reference from the callback URL.
             */
            const params =
              new URLSearchParams(
                window.location.search
              );


            const reference =
              params.get(
                "reference"
              ) ||
              params.get(
                "trxref"
              );


            console.log(
              "Paystack reference:",
              reference
            );


            if (
              !reference
            ) {

              throw new Error(
                "Payment reference was not found in the callback URL."
              );

            }


            /*
             * Get the authenticated
             * Supabase session.
             */
            const {
              data: {
                session,
              },
              error:
                sessionError,
            } =
              await supabase
                .auth
                .getSession();


            if (
              sessionError ||
              !session
            ) {

              throw new Error(
                "Your session has expired. Please log in again."
              );

            }


            console.log(
              "Sending GET request to /api/verify-payment",
              {
                reference,
              }
            );


            /*
             * Send the payment reference
             * to the Next.js API route.
             *
             * The backend route exports GET,
             * so the reference is sent as a
             * URL query parameter.
             */
            const response =
              await fetch(
                `/api/verify-payment?reference=${encodeURIComponent(reference)}`,
                {
                  method:
                    "GET",

                  headers: {
                    Authorization:
                      `Bearer ${session.access_token}`,
                  },

                  cache:
                    "no-store",
                }
              );


            /*
             * Read the response as text
             * first so HTML responses do
             * not crash JSON parsing.
             */
            const responseText =
              await response.text();


            console.log(
              "Verify payment API response:",
              {
                status:
                  response.status,

                statusText:
                  response.statusText,

                body:
                  responseText,
              }
            );


            /*
             * Declare the result once.
             */
            let result:
              VerifyPaymentResult;


            /*
             * Convert the API response
             * from text to JSON.
             */
            try {

              result =
                JSON.parse(
                  responseText
                );

            } catch {

              if (
                response.status ===
                405
              ) {

                throw new Error(
                  "The verification route was found, but the request method was not allowed. Confirm that app/api/verify-payment/route.ts exports a GET function."
                );

              }


              if (
                response.status ===
                404
              ) {

                throw new Error(
                  "The payment verification route was not found. Check that the file is located at app/api/verify-payment/route.ts."
                );

              }


              throw new Error(
                `The payment verification API returned a non-JSON response. Server status: ${response.status}.`
              );

            }


            /*
             * Handle errors returned
             * by the API route.
             */
            if (
              !response.ok ||
              !result.success
            ) {

              throw new Error(
                result.error ||
                result.message ||
                `Payment verification failed. Server status: ${response.status}.`
              );

            }


            /*
             * Update the wallet balance.
             */
            setBalance(
              Number(
                result.balance ||
                0
              )
            );


            /*
             * Display the API message.
             */
            setMessage(
              result.message ||
              "Your payment was verified and your wallet was funded."
            );


            setState(
              "success"
            );


          } catch (
            error: unknown
          ) {

            console.error(
              "Wallet payment verification error:",
              error
            );


            setMessage(
              error instanceof Error
                ? error.message
                : "Unable to verify your payment."
            );


            setState(
              "error"
            );

          }

        };


      verifyPayment();

    },
    []
  );


  return (

    <main className="flex min-h-screen items-center justify-center bg-[#F5F8F7] px-4 py-10">

      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">


        {/* Header */}

        <div className="bg-[#0B3939] px-8 py-9 text-center text-white">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">

            <Wallet
              size={32}
            />

          </div>


          <h1 className="mt-5 text-3xl font-bold">

            Wallet Funding

          </h1>


          <p className="mt-2 text-sm text-white/70">

            GigPlace payment confirmation

          </p>

        </div>


        <div className="p-8">


          {/* Loading State */}

          {state ===
            "loading" && (

            <div className="py-10 text-center">

              <Loader2
                size={48}
                className="mx-auto animate-spin text-[#0B3939]"
              />


              <h2 className="mt-6 text-xl font-bold text-slate-900">

                Verifying Payment

              </h2>


              <p className="mt-2 text-sm leading-6 text-slate-500">

                Please wait while we verify
                your payment and update
                your wallet.

              </p>

            </div>

          )}


          {/* Success State */}

          {state ===
            "success" && (

            <div className="text-center">

              <CheckCircle2
                size={64}
                className="mx-auto text-emerald-500"
              />


              <h2 className="mt-5 text-2xl font-bold text-slate-900">

                Payment Successful

              </h2>


              <p className="mt-3 text-sm leading-6 text-slate-500">

                {message}

              </p>


              {balance !==
                null && (

                <div className="mt-7 rounded-2xl bg-[#F5F8F7] p-6">

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">

                    Available Balance

                  </p>


                  <p className="mt-2 text-4xl font-bold text-[#0B3939]">

                    ₦

                    {balance
                      .toLocaleString(
                        "en-NG",
                        {
                          minimumFractionDigits:
                            0,

                          maximumFractionDigits:
                            2,
                        }
                      )}

                  </p>

                </div>

              )}


              <Link
                href="/advertiser/dashboard/wallet"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0B3939] px-6 py-4 font-semibold text-white transition hover:bg-[#082F2F]"
              >

                Go to Wallet

                <ArrowRight
                  size={19}
                />

              </Link>

            </div>

          )}


          {/* Error State */}

          {state ===
            "error" && (

            <div className="text-center">

              <XCircle
                size={64}
                className="mx-auto text-red-500"
              />


              <h2 className="mt-5 text-2xl font-bold text-slate-900">

                Payment Verification Failed

              </h2>


              <p className="mt-3 text-sm leading-6 text-slate-500">

                {message}

              </p>


              <Link
                href="/advertiser/dashboard/wallet"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0B3939] px-6 py-4 font-semibold text-white transition hover:bg-[#082F2F]"
              >

                Return to Wallet

                <ArrowRight
                  size={19}
                />

              </Link>

            </div>

          )}

        </div>

      </div>

    </main>

  );

}