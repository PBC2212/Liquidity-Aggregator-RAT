import Head from 'next/head'
import { useAccount } from 'wagmi'
import UserManagement from '@/components/Admin/UserManagement'
import Link from 'next/link'

export default function AdminUsersPage() {
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
          <title>Admin Users - RAT System</title>
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
        <title>User Management - RAT System</title>
        <meta name="description" content="Admin interface for managing users and performing admin actions" />
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-2">
              Manage user accounts, stake RAT tokens, and execute swaps on behalf of users
            </p>
          </div>
          <Link
            href="/admin"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Back to Admin Dashboard
          </Link>
        </div>

        <UserManagement />

        {/* Admin Actions Info */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Admin Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Stake RAT for User</h4>
              <p className="text-sm">
                Move RAT tokens from a user's custody balance to the staking pool. 
                This starts earning yields for the user automatically.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Execute Swap for User</h4>
              <p className="text-sm">
                Convert user's RAT tokens to USDT through the liquidity aggregator. 
                Specify minimum USDT to receive for slippage protection.
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-red-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">⚠️ Security Notice</h3>
          <p className="text-red-800 text-sm">
            Admin actions directly affect user balances and should only be performed 
            with explicit user consent or as part of the agreed system operations. 
            Always verify user requests before executing admin-only functions.
          </p>
        </div>
      </div>
    </>
  )
}