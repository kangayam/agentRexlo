'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ActingAsBannerProps {
  firmName: string
  clientId: string
}

export function ActingAsBanner({ firmName, clientId }: ActingAsBannerProps) {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  const handleExit = async () => {
    setExiting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/acting-as`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/ca/dashboard')
      }
    } catch {
      // network failure — reset so user can retry
    } finally {
      setExiting(false)
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
      <span className="text-sm text-amber-800 font-medium">
        Acting as <strong>{firmName}</strong>
      </span>
      <Button variant="outline" size="sm" onClick={handleExit} disabled={exiting}>
        {exiting ? 'Exiting…' : 'Exit'}
      </Button>
    </div>
  )
}
