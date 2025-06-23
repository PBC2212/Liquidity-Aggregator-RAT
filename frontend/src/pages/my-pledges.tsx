import Head from 'next/head'
import { useAccount } from 'wagmi'
import PledgeList from '@/components/Pledge/PledgeList'
import Link from 'next/link'
import Button from '@/components/UI/Button'

export default function MyPledgesPage() {
  const { isConnected } = useAccount()

  return (
    <>
      <Head>
        <title>My Pledges - RAT System</title>
        <meta name="description" content="View and manage your asset pledges" />
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Asset Pledges</h1>
            <p className="text-gray-600 mt-2">
              Track the status of your submitted asset pledges and view your RAT tokens
            </p>
          </div>
          <Link href="/pledge">
            <Button>Pledge New Asset</Button>
          </Link>
        </div>

        {isConnected ? (
          <PledgeList />
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 mb-6">
              Connect your wallet to view your pledges
            </p>
          </div>
        )}

        {/* Status Legend */}
        <div className="bg-white rounded-lg p-6 card-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Pending</p>
                <p className="text-sm text-gray-600">Under admin review</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Approved</p>
                <p className="text-sm text-gray-600">RAT tokens issued</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Rejected</p>
                <p className="text-sm text-gray-600">Not approved</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}