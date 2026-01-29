import Link from 'next/link'

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 px-4">
      <div className="text-center">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 mb-6 animate-bounce">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Dziękujemy!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Twój formularz został pomyślnie wysłany. Gabinet otrzyma Twoje odpowiedzi.
        </p>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 max-w-sm mx-auto border border-white/20">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Możesz teraz zamknąć tę stronę lub wrócić do formularza.
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Wróć
          </button>
        </div>

        {/* Footer */}
        <p className="text-sm text-gray-400 mt-8">
          Powered by Beauty Docs
        </p>
      </div>
    </div>
  )
}
