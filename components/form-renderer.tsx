'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import SignaturePad from '@/components/ui/signature-pad'
import { DatePicker } from '@/components/ui/date-picker'
import type { Form, FormField } from '@/types/database'

interface FormRendererProps {
  form: Form
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  isSubmitting?: boolean
}

export function FormRenderer({ form, onSubmit, isSubmitting }: FormRendererProps) {
  const { register, handleSubmit, formState: { errors }, control } = useForm()
  const fields = (form.schema as any)?.fields || []

  const renderField = (field: FormField) => {
    const commonClasses = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"

    switch (field.type) {
      case 'Input':
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return (
          <input
            {...register(field.name, { required: field.required })}
            type={field.type === 'Input' ? 'text' : field.type}
            placeholder={field.placeholder}
            disabled={field.disabled}
            className={commonClasses}
          />
        )
      
      case 'Textarea':
      case 'textarea':
        return (
          <textarea
            {...register(field.name, { required: field.required })}
            placeholder={field.placeholder}
            disabled={field.disabled}
            rows={4}
            className={commonClasses}
          />
        )

      case 'Select':
      case 'select':
        return (
          <div className="relative">
            <select
              {...register(field.name, { required: field.required })}
              disabled={field.disabled}
              className={`${commonClasses} appearance-none`}
            >
              <option value="">{field.placeholder || 'Wybierz...'}</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )

      case 'checkbox_group':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
                <input
                  {...register(field.name, { required: field.required })}
                  type="checkbox"
                  value={option.value}
                  disabled={field.disabled}
                  className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 transition-all"
                />
                <span className="text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition-colors">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        )

      case 'Checkbox':
      case 'checkbox':
        // Single boolean checkbox (e.g. for constents)
        return (
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              {...register(field.name, { required: field.required })}
              type="checkbox"
              disabled={field.disabled}
              className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 transition-all"
            />
            <span className="text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition-colors">
              {field.label}
            </span>
          </label>
        )

      case 'Radio':
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
                <input
                  {...register(field.name, { required: field.required })}
                  type="radio"
                  value={option.value}
                  disabled={field.disabled}
                  className="w-5 h-5 border-gray-300 text-purple-600 focus:ring-purple-500 transition-all"
                />
                <span className="text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition-colors">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        )

      case 'Date':
      case 'date':
        return (
          <Controller
            control={control}
            name={field.name}
            rules={{ required: field.required }}
            render={({ field: { value, onChange } }) => (
              <DatePicker
                date={value ? new Date(value) : undefined}
                setDate={(date) => onChange(date ? date.toISOString() : '')}
                placeholder={field.placeholder || "Wybierz datę"}
                disabled={field.disabled}
              />
            )}
          />
        )

      case 'signature':
      case 'Signature':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={{ required: field.required }}
            render={({ field: { value, onChange } }) => (
              <SignaturePad
                value={value}
                onChange={onChange}
                disabled={field.disabled}
              />
            )}
          />
        )

      case 'separator':
        return (
          <div className="p-4 rounded-xl border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/10 prose dark:prose-invert max-w-none">
            <p className="text-gray-900 dark:text-purple-100 font-medium whitespace-pre-wrap text-base leading-relaxed m-0">
              {field.label}
            </p>
          </div>
        )

      default:
        return (
          <input
            {...register(field.name, { required: field.required })}
            type="text"
            placeholder={field.placeholder}
            disabled={field.disabled}
            className={commonClasses}
          />
        )
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {fields.map((field: FormField) => (
        <div key={field.name}>
          {field.type !== 'checkbox' && field.type !== 'separator' && (
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          {renderField(field)}
          {field.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {field.description}
            </p>
          )}
          {errors[field.name] && (
            <p className="mt-1 text-sm text-red-500">
              To pole jest wymagane
            </p>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 px-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Wysyłanie...' : 'Wyślij formularz'}
      </button>
    </form>
  )
}
