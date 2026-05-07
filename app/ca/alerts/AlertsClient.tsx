'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Bell, Upload, Check, Send } from 'lucide-react'
import { formatINR } from '@/lib/format'

export type AlertType = 'ITC_RISK' | 'NO_UPLOAD' | 'NO_TALLY' | 'AGING_90'
export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  clientId: string
  clientName: string
  gstin: string
  period: string
  itcAtRisk: number
  unmatchedCount: number
  daysUntil14th: number
  lastRemindedAt: string | null
  hasImsUpload: boolean
  hasTallyUpload: boolean
}

interface Notification {
  id: string
  type: string
  message: string
  isRead: boolean
  createdAt: string
}

interface Props {
  urgentAlerts: Alert[]
  notifications: Notification[]
  totalItcAtRisk: number
  clientsNeedingAction: number
  daysUntil14th: number
}

const ALERT_TITLE: Record<AlertType, (a: Alert) => string> = {
  ITC_RISK:  a => `${a.clientName} — ${a.unmatchedCount} unmatched invoice${a.unmatchedCount !== 1 ? 's' : ''}`,
  NO_UPLOAD: a => `${a.clientName} — No data uploaded for ${a.period}`,
  NO_TALLY:  a => `${a.clientName} — Tally data missing for ${a.period}`,
  AGING_90:  a => `${a.clientName} — 90+ day ITC at risk of permanent loss`,
}

const ALERT_DESC: Record<AlertType, string> = {
  ITC_RISK:  'Invoices are unmatched in GSTR-2B. Client needs to take action on GSTN before the 14th.',
  NO_UPLOAD: 'No IMS JSON uploaded for this period. Reconciliation cannot run without data.',
  NO_TALLY:  'IMS JSON uploaded but Tally CSV is missing. Upload Tally data to start reconciliation.',
  AGING_90:  'ITC has been unrecovered for over 90 days. Supplier may never file — permanent loss risk.',
}

const BORDER_COLOR: Record<AlertSeverity, string> = {
  critical: 'border-l-red-500 bg-red-50/30',
  warning:  'border-l-amber-400',
  info:     'border-l-blue-500',
}

const ICON_STYLE: Record<AlertSeverity, { bg: string; color: string }> = {
  critical: { bg: 'bg-red-50',   color: 'text-red-500' },
  warning:  { bg: 'bg-amber-50', color: 'text-amber-500' },
  info:     { bg: 'bg-blue-50',  color: 'text-blue-500' },
}

export function AlertsClient({
  urgentAlerts,
  notifications,
  totalItcAtRisk,
  clientsNeedingAction,
  daysUntil14th,
}: Props) {
  const [filter, setFilter]               = useState<string>('all')
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set())
  const [sending, setSending]             = useState<string | null>(null)
  const [notifs, setNotifs]               = useState(notifications)

  const filteredAlerts = urgentAlerts.filter(a => {
    if (filter === 'all')          return true
    if (filter === 'high-value')   return a.itcAtRisk >= 100_000
    if (filter === 'not-reminded') return !a.lastRemindedAt
    if (filter === 'reminded')     return !!a.lastRemindedAt
    return true
  })

  const remindersToday = urgentAlerts.filter(a => {
    if (!a.lastRemindedAt) return false
    return new Date(a.lastRemindedAt).toDateString() === new Date().toDateString()
  }).length

  const handleSendReminder = async (alertId: string, clientId: string) => {
    setSending(alertId)
    try {
      await fetch('/api/ca/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      setSentReminders(prev => new Set([...prev, alertId]))
    } catch (err) {
      console.error('Reminder failed:', err)
    }
    setSending(null)
  }

  const handleSendAll = async () => {
    const unsent = filteredAlerts.filter(
      a => !sentReminders.has(a.id) && (a.type === 'ITC_RISK' || a.type === 'AGING_90'),
    )
    for (const alert of unsent) {
      await handleSendReminder(alert.id, alert.clientId)
    }
  }

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  return (
    <div className="px-8 py-6">

      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Alerts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {urgentAlerts.length} alert{urgentAlerts.length !== 1 ? 's' : ''} require your attention
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg
                       bg-white border border-slate-200 text-slate-600
                       text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Mark all read
          </button>
          <button
            onClick={handleSendAll}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg
                       bg-red-600 text-white text-xs font-semibold
                       hover:bg-red-700 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Send all reminders
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {([
          { val: `₹${formatINR(totalItcAtRisk)}`, label: 'Total ITC at risk · pre-14th',  color: 'text-red-600' },
          { val: String(clientsNeedingAction),      label: 'Clients needing action',         color: 'text-slate-900' },
          { val: String(Math.max(0, daysUntil14th)),label: 'Days until IMS lock (14th)',     color: 'text-amber-600' },
          { val: String(remindersToday),             label: 'Reminders sent today',           color: 'text-green-600' },
        ] as const).map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className={`text-xl font-extrabold font-mono tracking-tight ${s.color}`}>
              {s.val}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            ⚡ Urgent ITC Alerts
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
              {urgentAlerts.length} active
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            IMS locks on 14th — {daysUntil14th} day{daysUntil14th !== 1 ? 's' : ''} remaining
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {([
          { key: 'all',          label: `All (${urgentAlerts.length})` },
          { key: 'high-value',   label: '₹1L+ value' },
          { key: 'not-reminded', label: 'Not reminded' },
          { key: 'reminded',     label: 'Reminded' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                        ${filter === tab.key
                          ? 'bg-red-50 text-red-600'
                          : 'text-slate-500 hover:bg-slate-100'
                        }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert cards */}
      <div className="flex flex-col gap-2.5 mb-8">
        {filteredAlerts.map(alert => {
          const isSent    = sentReminders.has(alert.id)
          const isSending = sending === alert.id
          const iconStyle = ICON_STYLE[alert.severity]

          return (
            <div
              key={alert.id}
              className={`bg-white border border-slate-200 border-l-[3px] rounded-xl p-4
                          flex items-start gap-3 ${BORDER_COLOR[alert.severity]}
                          ${isSent ? 'opacity-60' : ''}`}
            >
              {/* Icon */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center
                               flex-shrink-0 mt-0.5 ${iconStyle.bg}`}>
                <AlertTriangle className={`w-4 h-4 ${iconStyle.color}`} />
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  {ALERT_TITLE[alert.type](alert)}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {ALERT_DESC[alert.type]}
                </p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {alert.itcAtRisk > 0 && (
                    <span className="text-xs font-bold font-mono text-red-600">
                      ₹{formatINR(alert.itcAtRisk)} at risk
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                                   ${isSent
                                     ? 'bg-green-50 text-green-600'
                                     : alert.lastRemindedAt
                                       ? 'bg-amber-50 text-amber-600'
                                       : 'bg-red-50 text-red-600'
                                   }`}>
                    {isSent
                      ? 'Reminder sent ✓'
                      : alert.lastRemindedAt
                        ? 'Reminded previously'
                        : 'Not reminded'
                    }
                  </span>
                  <span className="text-[10px] text-slate-400">{alert.period}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {daysUntil14th >= 0 && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md
                                   ${daysUntil14th <= 3
                                     ? 'bg-red-50 text-red-600'
                                     : 'bg-amber-50 text-amber-600'
                                   }`}>
                    {daysUntil14th}d left
                  </span>
                )}

                {(alert.type === 'ITC_RISK' || alert.type === 'AGING_90') && (
                  <button
                    onClick={() => handleSendReminder(alert.id, alert.clientId)}
                    disabled={isSent || isSending}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors
                                ${isSent
                                  ? 'bg-green-50 text-green-600 cursor-default'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                  >
                    {isSending ? 'Sending…'
                      : isSent ? '✓ Sent'
                      : alert.lastRemindedAt ? 'Re-send Reminder'
                      : 'Send Reminder'
                    }
                  </button>
                )}

                {(alert.type === 'NO_UPLOAD' || alert.type === 'NO_TALLY') && (
                  <button
                    onClick={() => handleSendReminder(alert.id, alert.clientId)}
                    disabled={isSent || isSending}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg
                               bg-blue-50 text-blue-600 border border-blue-200
                               hover:bg-blue-100 transition-colors"
                  >
                    {isSent ? '✓ Notified' : 'Notify Client'}
                  </button>
                )}

                <Link
                  href={`/ca/clients/${alert.clientId}?tab=analytics`}
                  className="text-xs font-medium text-slate-500
                             hover:text-slate-700 hover:underline"
                >
                  View Client →
                </Link>
              </div>
            </div>
          )
        })}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No alerts match this filter</p>
          </div>
        )}
      </div>

      {/* Notification log */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            Notifications
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {notifs.length} total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            System events, reminders sent, uploads completed
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="text-xs text-blue-600 font-medium hover:underline"
        >
          Mark all read
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {notifs.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifs.map((notif, i) => (
            <div key={notif.id}>
              <div className={`flex items-center gap-3 px-4 py-3
                              hover:bg-slate-50 transition-colors
                              ${!notif.isRead ? 'bg-slate-50/50' : ''}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0
                                ${!notif.isRead
                                  ? 'bg-blue-500'
                                  : 'bg-transparent border-2 border-slate-200'
                                }`} />
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                                ${notif.type === 'CA_NOTIFY_CLIENT'
                                  ? 'bg-blue-50'
                                  : notif.type === 'CLIENT_UPLOADED' || notif.type === 'CLIENT_COMPLETED'
                                    ? 'bg-green-50'
                                    : 'bg-slate-50'
                                }`}>
                  {notif.type === 'CA_NOTIFY_CLIENT' && (
                    <Bell className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  {(notif.type === 'CLIENT_UPLOADED' || notif.type === 'CLIENT_COMPLETED') && (
                    <Upload className="w-3.5 h-3.5 text-green-600" />
                  )}
                  {notif.type === 'UPLOAD_FAILED' && (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium
                                ${!notif.isRead ? 'text-slate-900' : 'text-slate-500'}`}>
                    {notif.message}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 flex-shrink-0">
                  {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
              {i < notifs.length - 1 && <div className="h-px bg-slate-100 mx-4" />}
            </div>
          ))
        )}
      </div>

    </div>
  )
}
