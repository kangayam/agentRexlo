'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

export default function NewClientPage() {
  const router = useRouter()

  const [firmName,     setFirmName]     = useState('')
  const [gstin,        setGstin]        = useState('')
  const [email,        setEmail]        = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')
  const [fieldErrors,  setFieldErrors]  = useState<Record<string, string>>({})

  const handleGstinChange = (v: string) => {
    setGstin(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!firmName.trim())               errs.firmName = 'Firm name is required'
    if (!/^[A-Z0-9]{15}$/.test(gstin)) errs.gstin    = 'Must be exactly 15 alphanumeric characters'
    if (!email.trim())                  errs.email    = 'Contact email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email address'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/clients', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:       'create',
          firmName:     firmName.trim(),
          primaryGstin: gstin,
          contactEmail: email.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      router.push(`/ca/clients/${data.client.id}`)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-8 py-6 max-w-xl">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-slate-400 mb-6">
        <button
          onClick={() => router.push('/ca/clients')}
          className="hover:text-slate-600 transition-colors"
        >
          Client Portfolio
        </button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 font-medium">Add Client</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Add New Client</h1>
        <p className="text-xs text-slate-500 mt-1">
          An invite email will be sent to the client so they can set up their portal account.
        </p>
      </div>

      {/* Form card */}
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
              onChange={e => { setFirmName(e.target.value); setFieldErrors(p => ({ ...p, firmName: '' })) }}
              placeholder="e.g. Sharma Traders Pvt Ltd"
              className={`w-full h-10 px-3 text-sm border rounded-lg bg-white text-slate-900
                         placeholder:text-slate-400 focus:outline-none focus:ring-2
                         transition-colors
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
            <input
              type="text"
              value={gstin}
              onChange={e => { handleGstinChange(e.target.value); setFieldErrors(p => ({ ...p, gstin: '' })) }}
              placeholder="e.g. 27AABCU9603R1ZX"
              maxLength={15}
              className={`w-full h-10 px-3 text-sm font-mono border rounded-lg bg-white text-slate-900
                         placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2
                         transition-colors
                         ${fieldErrors.gstin
                           ? 'border-red-400 focus:ring-red-100'
                           : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-400'}`}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {gstin.length}/15 characters
              {gstin.length === 15 && (
                <span className="ml-2 text-green-600 font-medium">✓ Correct length</span>
              )}
            </p>
            {fieldErrors.gstin && (
              <p className="text-xs text-red-600 mt-0.5">{fieldErrors.gstin}</p>
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
              onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })) }}
              placeholder="e.g. accounts@sharmatraders.com"
              className={`w-full h-10 px-3 text-sm border rounded-lg bg-white text-slate-900
                         placeholder:text-slate-400 focus:outline-none focus:ring-2
                         transition-colors
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

          {/* API-level error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3
                            text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push('/ca/clients')}
              className="flex-1 h-10 rounded-xl border border-slate-200 bg-white
                         text-slate-700 text-sm font-medium hover:bg-slate-50
                         transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-sm
                         font-semibold hover:bg-slate-800 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adding Client…' : 'Add Client & Send Invite'}
            </button>
          </div>

        </form>
      </div>

      {/* Info note */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3
                      flex gap-3 text-xs text-blue-700 leading-relaxed">
        <span className="flex-shrink-0 mt-0.5">ℹ</span>
        <span>
          The client will receive an invite email with a link to set up their portal account.
          The invite expires in <strong>7 days</strong>. You can resend it from the client
          detail page if needed.
        </span>
      </div>

    </div>
  )
}
