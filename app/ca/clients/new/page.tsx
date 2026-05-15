'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Plus, X } from 'lucide-react'
import { getStateFromGstin } from '@/lib/gstin-state'

const GSTIN_REGEX = /^[A-Z0-9]{15}$/
const MAX_ADDITIONAL = 10

function normalizeGstin(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15)
}

function GstinInput({
  value,
  onChange,
  onRemove,
  error,
  placeholder,
  isPrimary,
  inputId,
}: {
  value:       string
  onChange:    (v: string) => void
  onRemove?:   () => void
  error?:      string
  placeholder: string
  isPrimary:   boolean
  inputId?:    string
}) {
  const state   = getStateFromGstin(value)
  const isValid = GSTIN_REGEX.test(value)
  const errorId = inputId ? `${inputId}-error` : undefined

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id={inputId}
            type="text"
            value={value}
            onChange={e => onChange(normalizeGstin(e.target.value))}
            placeholder={placeholder}
            maxLength={15}
            aria-required={isPrimary}
            aria-invalid={!!error}
            aria-describedby={error && errorId ? errorId : undefined}
            className={`w-full h-10 px-3 pr-24 text-sm font-mono border rounded-lg bg-white
                       text-slate-900 placeholder:text-slate-400 placeholder:font-sans
                       focus:outline-none focus:ring-2 transition-colors
                       ${error
                         ? 'border-red-400 focus:ring-red-100'
                         : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-400'}`}
          />
          {state && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]
                             font-medium text-slate-400 pointer-events-none whitespace-nowrap">
              {state}
            </span>
          )}
        </div>

        {isPrimary ? (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50
                           text-blue-600 border border-blue-200 whitespace-nowrap">
            Primary
          </span>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove GSTIN"
            className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center
                       justify-center text-slate-400 hover:text-red-500 hover:border-red-200
                       hover:bg-red-50 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isPrimary && !error && (
        <p className="text-[11px] text-slate-400 mt-1">
          {value.length}/15 characters
          {isValid && <span className="ml-2 text-green-600 font-medium">✓</span>}
        </p>
      )}
      {error && <p id={errorId} className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export default function NewClientPage() {
  const router = useRouter()

  const [firmName,          setFirmName]          = useState('')
  const [primaryGstin,      setPrimaryGstin]      = useState('')
  const [additionalGstins,  setAdditionalGstins]  = useState<{ id: number; value: string }[]>([])
  const nextId = useRef(0)
  const [email,             setEmail]             = useState('')
  const [submitting,        setSubmitting]        = useState(false)
  const [apiError,          setApiError]          = useState('')
  const [fieldErrors,       setFieldErrors]       = useState<Record<string, string>>({})
  const [additionalErrors,  setAdditionalErrors]  = useState<string[]>([])

  function clearFieldError(key: string) {
    setFieldErrors(p => ({ ...p, [key]: '' }))
  }

  function handleAddGstin() {
    if (additionalGstins.length >= MAX_ADDITIONAL) return
    setAdditionalGstins(p => [...p, { id: nextId.current++, value: '' }])
    setAdditionalErrors(p => [...p, ''])
  }

  function handleAdditionalChange(index: number, value: string) {
    setAdditionalGstins(p => p.map((g, i) => i === index ? { ...g, value: normalizeGstin(value) } : g))
    setAdditionalErrors(p => p.map((e, i) => i === index ? '' : e))
  }

  function handleRemoveGstin(index: number) {
    setAdditionalGstins(p => p.filter((_, i) => i !== index))
    setAdditionalErrors(p => p.filter((_, i) => i !== index))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    let valid = true

    if (!firmName.trim()) { errs.firmName = 'Firm name is required'; valid = false }

    if (!GSTIN_REGEX.test(primaryGstin)) {
      errs.primaryGstin = 'Must be exactly 15 alphanumeric characters'
      valid = false
    }

    if (!email.trim()) { errs.email = 'Contact email is required'; valid = false }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Invalid email address'
      valid = false
    }

    setFieldErrors(errs)

    const addErrs = additionalGstins.map((g, i) => {
      if (!GSTIN_REGEX.test(g.value)) return 'Must be exactly 15 alphanumeric characters'
      if (g.value === primaryGstin) return 'Duplicate of primary GSTIN'
      if (additionalGstins.findIndex((x, j) => x.value === g.value && j !== i) !== -1) return 'Duplicate GSTIN'
      return ''
    })
    setAdditionalErrors(addErrs)
    if (addErrs.some(e => e !== '')) valid = false

    return valid
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/clients', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:           'create',
          firmName:         firmName.trim(),
          primaryGstin,
          additionalGstins: additionalGstins.filter(g => g.value.length > 0).map(g => g.value),
          contactEmail:     email.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setApiError(data.error ?? 'Something went wrong.'); return }
      router.push(`/ca/clients/${data.client.id}`)
    } catch {
      setApiError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-8 py-6 max-w-xl">

      <nav className="flex items-center gap-1 text-xs text-slate-400 mb-6">
        <button onClick={() => router.push('/ca/clients')}
                className="hover:text-slate-600 transition-colors">
          Client Portfolio
        </button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 font-medium">Add Client</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Add New Client</h1>
        <p className="text-xs text-slate-500 mt-1">
          An invite email will be sent to the client so they can set up their portal account.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Firm name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Firm / Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firmName}
              onChange={e => { setFirmName(e.target.value); clearFieldError('firmName') }}
              placeholder="e.g. Sharma Traders Pvt Ltd"
              className={`w-full h-10 px-3 text-sm border rounded-lg bg-white text-slate-900
                         placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors
                         ${fieldErrors.firmName
                           ? 'border-red-400 focus:ring-red-100'
                           : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-400'}`}
            />
            {fieldErrors.firmName && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.firmName}</p>
            )}
          </div>

          {/* Primary GSTIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Primary GSTIN <span className="text-red-500">*</span>
            </label>
            <GstinInput
              value={primaryGstin}
              onChange={v => { setPrimaryGstin(v); clearFieldError('primaryGstin') }}
              error={fieldErrors.primaryGstin}
              placeholder="e.g. 27AABCU9603R1ZX"
              isPrimary
              inputId="primary-gstin"
            />
          </div>

          {/* Additional GSTINs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Additional GSTINs
                <span className="ml-1.5 text-[10px] font-normal text-slate-400">(optional)</span>
              </label>
              {additionalGstins.length > 0 && (
                <span className="text-[10px] font-medium text-slate-400">
                  {additionalGstins.length} added
                </span>
              )}
            </div>

            {additionalGstins.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-2">
                <div className="divide-y divide-slate-100">
                  {additionalGstins.map((g, i) => (
                    <div key={g.id} className="px-3 py-2.5">
                      <GstinInput
                        value={g.value}
                        onChange={v => handleAdditionalChange(i, v)}
                        onRemove={() => handleRemoveGstin(i)}
                        error={additionalErrors[i]}
                        placeholder="e.g. 29AABCU9603R1ZX"
                        isPrimary={false}
                        inputId={`additional-gstin-${g.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {additionalGstins.length < MAX_ADDITIONAL && (
              <button
                type="button"
                onClick={handleAddGstin}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500
                           hover:text-slate-700 border border-dashed border-slate-300
                           hover:border-slate-400 rounded-lg px-3 h-8 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add another state GSTIN
              </button>
            )}

            {additionalGstins.length === MAX_ADDITIONAL && (
              <p className="text-[11px] text-slate-400">
                Maximum of {MAX_ADDITIONAL} additional GSTINs reached.
              </p>
            )}
          </div>

          {/* Contact email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Contact Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); clearFieldError('email') }}
              placeholder="e.g. accounts@sharmatraders.com"
              className={`w-full h-10 px-3 text-sm border rounded-lg bg-white text-slate-900
                         placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors
                         ${fieldErrors.email
                           ? 'border-red-400 focus:ring-red-100'
                           : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-400'}`}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              An invite link will be sent to this address.
            </p>
          </div>

          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push('/ca/clients')}
              className="flex-1 h-10 rounded-xl border border-slate-200 bg-white
                         text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-sm font-semibold
                         hover:bg-slate-800 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adding Client…' : 'Add Client & Send Invite'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3
                      flex gap-3 text-xs text-blue-700 leading-relaxed">
        <span className="flex-shrink-0 mt-0.5">ℹ</span>
        <span>
          The client will receive an invite email to set up their portal account.
          The invite expires in <strong>7 days</strong>. You can resend it from the
          client detail page. Additional GSTINs can also be added later from the
          client detail page.
        </span>
      </div>

    </div>
  )
}
