'use client'

import { useState } from 'react'
import type { Form } from '@/types/database'

interface ShareFormModalProps {
  form: Form
  isOpen: boolean
  onClose: () => void
}

export function ShareFormModal({ form, isOpen, onClose }: ShareFormModalProps) {
  const [copied, setCopied] = useState(false)
  
  if (!isOpen) return null

  const formUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${form.id}`
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(formUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Formularz: ${form.title}`)
    const body = encodeURIComponent(`Cześć!\n\nProszę o wypełnienie formularza:\n${formUrl}\n\nDziękujemy!`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const handleSmsShare = () => {
    const body = encodeURIComponent(`Wypełnij formularz ${form.title}: ${formUrl}`)
    window.location.href = `sms:?body=${body}`
  }

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: form.title,
          text: `Wypełnij formularz: ${form.title}`,
          url: formUrl,
        })
      } catch {
        // User cancelled or error
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Udostępnij formularz
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {form.title}
        </p>

        {/* Link Copy */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link do formularza
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formUrl}
              readOnly
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-3 rounded-xl font-medium transition-all ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {copied ? '✓' : 'Kopiuj'}
            </button>
          </div>
        </div>

        {/* Share Options */}
        <div className="space-y-3">
          <button
            onClick={handleEmailShare}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Wyślij przez Email
          </button>

          <button
            onClick={handleSmsShare}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Wyślij SMS
          </button>

          {'share' in navigator && (
            <button
              onClick={handleWebShare}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Udostępnij...
            </button>
          )}
        </div>

        {/* QR Code placeholder - can be generated with a library */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            💡 Pokaż ten link na tablecie, by klient mógł go zeskanować
          </p>
        </div>
      </div>
    </div>
  )
}
