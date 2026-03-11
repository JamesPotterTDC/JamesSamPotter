'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
