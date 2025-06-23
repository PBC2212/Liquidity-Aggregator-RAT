import Head from 'next/head'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/router'
import AdminDashboard from '@/components/Admin/AdminDashboard'
import Link from 'next/link'

export default function AdminPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()

  // Simple admin check (in production, this should be more robust)
  const isAdmin = address && (
    address.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase() ||
    address.toLowerCase() === '0x...' // Add your admin address here
  )

  if (!isConnected) {
    return (
      <>
        <Head>
          <title>Admin Dashboard - RAT System</title>
        </Head>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h1>
          <p className="text-gray-600">Connect your wallet to access admin features</p>
        </div>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <Head>
          <title>Access Denied - RAT System</title>
        </Head>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have administrator privileges</p>
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
        <title>Admin Dashboard - RAT System</title>
        <meta name="description" content="Administrator dashboard for managing the RAT system" />
      </Head>

      <div className="space-y-6">
        {/* Admin Navigation */}
        <div className="bg-white rounded-lg card-shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Navigation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/pledges"
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all"
            >
              <h3 className="font-medium text-gray-900 mb-2">Manage Pledges</h3>
              <p className="text-sm text-gray-600">Review and approve/reject asset pledges</p>
            </Link>
            <Link
              href="/admin/users"
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all"
            >
              <h3 className="font-medium text-gray-900 mb-2">User Management</h3>
              <p className="text-sm text-gray-600">Manage users, stake RAT, execute swaps</p>
            </Link>
            <div className="block p-4 border border-gray-200 rounded-lg opacity-50">
              <h3 className="font-medium text-gray-900 mb-2">System Settings</h3>
              <p className="text-sm text-gray-600">Configure system parameters (Coming Soon)</p>
            </div>
          </div>
        </div>

        {/* Main Admin Dashboard */}
        <AdminDashboard />
      </div>
    </>
  )
}