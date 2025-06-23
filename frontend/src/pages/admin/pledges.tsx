import Head from 'next/head'
import { useAccount } from 'wagmi'
import PendingPledges from '@/components/Admin/PendingPledges'
import Link from 'next/link'

export default function AdminPledgesPage() {
  const { address, isConnected } = useAccount()

  // Simple admin check (in production, this should be more robust)
  const isAdmin = address && (
    address.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase() ||
    address.toLowerCase() === '0x...' // Add your admin address here
  )

  if (!isConnected || !isAdmin) {
    return (
      <>
        <Head>
          <title>Admin Pledges - RAT System</title>
        </Head>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Administrator privileges required</p>
          <Link href="/" className="text-primary-600 hover:text-primary-700">
            Return to Dashboard
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Manage Pledges - RAT System</title>
        <meta name="description" content="Admin interface for managing asset pledges" />
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Asset Pledges</h1>
            <p className="text-gray-600 mt-2">
              Review, approve, or reject pending asset pledges from users
            </p>
          </div>
          <Link
            href="/admin"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Back to Admin Dashboard
          </Link>
        </div>

        <PendingPledges />

        {/* Admin Guidelines */}
        <div className="bg-yellow-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4">Review Guidelines</h3>
          <div className="space-y-2 text-yellow-800">
            <p className="flex items-start space-x-2">
              <span>•</span>
              <span>Verify asset documentation and authenticity before approval</span>
            </p>
            <p className="flex items-start space-x-2">
              <span>•</span>
              <span>Cross-check estimated values with market data when possible</span>
            </p>
            <p className="flex items-start space-x-2">
              <span>•</span>
              <span>Consider asset liquidity and potential for value fluctuation</span>
            </p>
            <p className="flex items-start space-x-2">
              <span>•</span>
              <span>Provide clear rejection reasons to help users improve their submissions</span>
            </p>
            <p className="flex items-start space-x-2">
              <span>•</span>
              <span>Approved value determines the amount of RAT tokens to be minted</span>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}