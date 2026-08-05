"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";

import {
  supabase,
} from "@/lib/supabase";


type Transaction = {
  id: string;
  reference: string | null;
  transaction_type: string;
  direction: "credit" | "debit";
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
};


export default function WalletPage() {

  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    fundingLoading,
    setFundingLoading,
  ] = useState(false);


  const [
    transactions,
    setTransactions,
  ] = useState<Transaction[]>(
    []
  );


  const [
    balance,
    setBalance,
  ] = useState(0);


  const [
    amount,
    setAmount,
  ] = useState(1000);


  const [
    message,
    setMessage,
  ] = useState("");


  const [
    error,
    setError,
  ] = useState("");


  const pollingRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(null);


  /*
   * Load wallet balance
   * and transaction history.
   */
  const loadData =
    async () => {

      try {

        setLoading(true);

        setError("");


        const {
          data: {
            user,
          },
          error: userError,
        } =
          await supabase
            .auth
            .getUser();


        if (
          userError ||
          !user
        ) {

          throw new Error(
            "Please log in to access your wallet."
          );

        }


        /*
         * Load wallet.
         */
        const {
          data: walletData,
          error: walletError,
        } =
          await supabase
            .from("wallets")
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
            "Wallet query error:",
            walletError
          );

          throw new Error(
            walletError.message
          );

        }


        setBalance(
          Number(
            walletData
              ?.available_balance ||
            0
          )
        );


        /*
         * Load transaction history.
         */
        const {
          data: txData,
          error: txError,
        } =
          await supabase
            .from(
              "transactions"
            )
            .select(`
              id,
              reference,
              transaction_type,
              direction,
              amount,
              status,
              description,
              created_at
            `)
            .eq(
              "user_id",
              user.id
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(10);


        if (
          txError
        ) {

          console.error(
            "Transaction query error:",
            txError
          );

          throw new Error(
            txError.message
          );

        }


        setTransactions(
          (
            txData ||
            []
          ) as Transaction[]
        );


      } catch (
        err: unknown
      ) {

        console.error(
          "Load wallet data error:",
          err
        );


        setError(
          err instanceof Error
            ? err.message
            : "Failed to load wallet data."
        );


      } finally {

        setLoading(
          false
        );

      }

    };


  useEffect(
    () => {

      loadData();


      return () => {

        if (
          pollingRef.current
        ) {

          clearInterval(
            pollingRef.current
          );

        }

      };

    },
    []
  );


  /*
   * Start Paystack payment.
   */
  const fundWallet =
    async () => {

      try {

        setFundingLoading(
          true
        );

        setError("");

        setMessage("");


        if (
          amount < 100
        ) {

          throw new Error(
            "Minimum funding amount is ₦100."
          );

        }


        const {
          data: {
            session,
          },
          error: sessionError,
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


        const response =
          await fetch(
            "/api/fund-wallet",
            {

              method:
                "POST",

              headers: {

                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${session.access_token}`,

              },

              body:
                JSON.stringify(
                  {

                    amount,

                    callback_url:
                      `${window.location.origin}/advertiser/dashboard/wallet/success`,

                  }
                ),

            }
          );


        const result =
          await response.json();


        if (
          !response.ok ||
          !result.success
        ) {

          throw new Error(
            result.error ||
            "Failed to initialize payment."
          );

        }


        const paymentUrl =
          result
            ?.data
            ?.authorization_url;


        if (
          !paymentUrl
        ) {

          throw new Error(
            "Paystack did not return a payment URL."
          );

        }


        window.location.href =
          paymentUrl;


      } catch (
        err: unknown
      ) {

        console.error(
          "Wallet funding error:",
          err
        );


        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );


      } finally {

        setFundingLoading(
          false
        );

      }

    };


  if (
    loading
  ) {

    return (

      <div className="flex min-h-[500px] items-center justify-center">

        <div className="flex flex-col items-center gap-4">

          <Loader2
            className="animate-spin text-[#0B3939]"
            size={38}
          />

          <p className="text-sm font-medium text-slate-500">

            Loading wallet...

          </p>

        </div>

      </div>

    );

  }


  return (

    <div className="mx-auto max-w-5xl space-y-10 pb-12">


      {/* Wallet balance */}

      <div className="rounded-3xl bg-gradient-to-br from-[#0B3939] to-[#082F2F] p-8 text-white shadow-lg">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm font-medium text-white/70">

              AVAILABLE BALANCE

            </p>

            <p className="mt-2 text-5xl font-bold">

              ₦
              {balance.toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits:
                    2,
                }
              )}

            </p>

          </div>


          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={
                loadData
              }
              disabled={
                loading
              }
              className="rounded-xl bg-white/10 p-3 transition hover:bg-white/20 disabled:opacity-50"
            >

              <RefreshCw
                size={20}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

            </button>


            <div className="rounded-2xl bg-white/10 p-4">

              <Wallet
                size={36}
              />

            </div>

          </div>

        </div>

      </div>


      {/* Fund wallet */}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="bg-[#0B3939] px-7 py-8 text-white">

          <h2 className="text-2xl font-bold">

            Fund Your Wallet

          </h2>

          <p className="mt-1 text-white/75">

            Pay securely through Paystack.

          </p>

        </div>


        <div className="p-7">

          <label className="mb-2 block text-sm font-medium text-slate-600">

            Amount (₦)

          </label>


          <input
            type="number"
            min={100}
            step={100}
            value={amount}
            onChange={
              (event) => {

                setAmount(
                  Math.max(
                    100,
                    Number(
                      event.target.value
                    ) || 100
                  )
                );

              }
            }
            className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-3xl font-bold outline-none focus:border-[#0B3939]"
          />


          <button
            type="button"
            onClick={
              fundWallet
            }
            disabled={
              fundingLoading
            }
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#0B3939] py-4 font-semibold text-white transition hover:bg-[#082F2F] disabled:opacity-60"
          >

            {fundingLoading ? (

              <>

                <Loader2
                  size={20}
                  className="animate-spin"
                />

                Redirecting...

              </>

            ) : (

              <>

                Continue to Payment

                <ArrowRight
                  size={20}
                />

              </>

            )}

          </button>

        </div>

      </div>


      {/* Transactions */}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b px-7 py-5">

          <h2 className="text-xl font-semibold text-slate-900">

            Transaction History

          </h2>

        </div>


        <div className="divide-y">

          {transactions.length === 0 ? (

            <div className="py-16 text-center text-slate-500">

              No transactions yet.

            </div>

          ) : (

            transactions.map(
              (tx) => (

                <div
                  key={
                    tx.id
                  }
                  className="flex items-center justify-between px-7 py-5"
                >

                  <div className="flex items-center gap-4">

                    <div
                      className={
                        `rounded-full p-3 ${
                          tx.direction ===
                          "credit"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-red-100 text-red-600"
                        }`
                      }
                    >

                      {tx.direction ===
                      "credit" ? (

                        <ArrowDownRight
                          size={20}
                        />

                      ) : (

                        <ArrowUpRight
                          size={20}
                        />

                      )}

                    </div>


                    <div>

                      <p className="font-medium">

                        {
                          tx.description ||
                          "Wallet transaction"
                        }

                      </p>


                      <p className="text-xs text-slate-500">

                        {
                          new Date(
                            tx.created_at
                          )
                          .toLocaleDateString(
                            "en-NG"
                          )
                        }

                      </p>

                    </div>

                  </div>


                  <div className="text-right">

                    <p
                      className={
                        tx.direction ===
                        "credit"
                          ? "font-bold text-emerald-600"
                          : "font-bold text-red-600"
                      }
                    >

                      {
                        tx.direction ===
                        "credit"
                          ? "+"
                          : "-"
                      }

                      ₦

                      {
                        Number(
                          tx.amount
                        )
                        .toLocaleString(
                          "en-NG"
                        )
                      }

                    </p>


                    <p className="text-xs capitalize text-slate-500">

                      {
                        tx.status
                      }

                    </p>

                  </div>

                </div>

              )
            )

          )}

        </div>

      </div>


      {/* Success message */}

      {message && (

        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-emerald-800 shadow-lg">

          <CheckCircle2
            size={18}
          />

          {message}

        </div>

      )}


      {/* Error message */}

      {error && (

        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-red-50 p-4 text-red-700 shadow-lg">

          {error}

        </div>

      )}

    </div>

  );

}