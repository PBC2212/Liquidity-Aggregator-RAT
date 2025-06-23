import Head from 'next/head'
import { useAccount } from 'wagmi'
import PledgeForm from '@/components/Pledge/PledgeForm'

export default function PledgePage() {
  const { isConnected } = useAccount()

  return (
    <>
      <Head>
        <title>Pledge Asset - RAT System</title>
        <meta name="description" content="Pledge your real-world assets for verification and RAT token issuance" />
      </Head>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Pledge Your Asset</h1>
          <p className="text-gray-600">
            Submit your real-world asset for verification by our admin team. Once approved, 
            you'll receive RAT tokens equivalent to your asset's value.
          </p>
        </div>

        {isConnected ? (
          <PledgeForm />
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 mb-6">
              You need to connect your wallet to pledge an asset
            </p>
          </div>
        )}

        {/* Information Section */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">How It Works</h3>
          <div className="space-y-3 text-blue-800">
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <p>Submit your asset details including description, estimated value, and supporting documents</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <p>Our admin team reviews and verifies your asset information</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <p>Upon approval, RAT tokens are minted and held in custody (80% auto-staked by default)</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">4</span>
              <p>Start earning yields on your staked RAT tokens automatically</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}