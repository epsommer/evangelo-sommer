'use client'

import { useParams } from 'next/navigation'
import ClientServicesBilling from '@/components/ClientServicesBilling'

export default function ClientServicesBillingPage() {
  const params = useParams()
  const clientId = params.clientId as string

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClientServicesBilling clientId={clientId} />
      </div>
    </div>
  )
}