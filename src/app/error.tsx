"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md space-y-6">
        <div className="text-6xl">⚠</div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Something broke on this page. Try again, or go back to the home page.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-[11px] text-slate-400">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-full bg-violet-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 sm:w-auto"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
