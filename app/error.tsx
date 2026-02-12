"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-100 font-mono p-8">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-serif font-bold text-amber-500 mb-4">
          Something went wrong
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {error.message || "An unexpected error occurred. Your saves are safe in local storage."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.replace("/")}
            className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold px-4 py-2 rounded transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}
