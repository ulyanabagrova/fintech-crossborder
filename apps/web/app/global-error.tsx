'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#010101] text-white flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h2 className="text-lg font-bold mb-2">Произошла ошибка</h2>
          <button
            onClick={() => reset()}
            className="bg-[#07c160] text-white px-4 py-2 rounded-lg text-sm"
          >
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  );
}