// src/app/auth/signin/page.tsx
"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("admin-login", {
        email: email,
        redirect: false,
      });

      if (result?.error) {
        setError("Access denied. Only admin@evangelosommer.com is authorized.");
      } else if (result?.ok) {
        const session = await getSession();
        if (session) {
          router.push("/dashboard");
        } else {
          setError("Sign-in failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-off-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 bg-gold flex items-center justify-center">
            <span className="text-2xl font-bold text-dark-grey font-space-grotesk">ES</span>
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
            COMMAND CENTER | MSCRMS
          </h2>
          <p className="mt-2 text-center text-sm text-medium-grey font-space-grotesk">
            Multi-Service Client Relationship Management
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative block w-full px-4 py-3 border-2 border-light-grey text-dark-grey font-space-grotesk focus:outline-none focus:border-gold transition-colors duration-200"
              placeholder="username"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="group relative w-full flex justify-center py-3 px-4 border-2 border-transparent text-sm font-bold font-space-grotesk uppercase tracking-wide text-dark-grey bg-gold hover:bg-gold-dark focus:outline-none transition-colors duration-200 disabled:bg-light-grey disabled:cursor-not-allowed disabled:text-medium-grey"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-b-2 border-dark-grey"></div>
              ) : (
                "Access System"
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-500 text-red-700">
              <p className="text-sm font-space-grotesk">{error}</p>
            </div>
          )}
        </form>

        <div className="text-center">
          <Link href="/" className="text-sm text-gold hover:text-gold-dark font-space-grotesk uppercase tracking-wide">
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
