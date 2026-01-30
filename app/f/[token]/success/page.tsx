import Link from 'next/link'

export default function FormSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 mb-6 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Dziękujemy!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Formularz został pomyślnie wypełniony i zapisany.
        </p>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Możesz teraz zamknąć tę stronę.
        </p>

        {/* Footer */}
        <div className="mt-12 text-sm text-gray-500 dark:text-gray-400">
          Powered by <span className="font-semibold text-purple-600">Docvue</span>
        </div>
      </div>
    </div>
  )
}
