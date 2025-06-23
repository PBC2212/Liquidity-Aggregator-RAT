import Head from 'next/head'
import { useAccount } from 'wagmi'
import StakingDashboard from '@/components/Staking/StakingDashboard'

export default function StakingPage() {
  const { isConnected } = useAccount()

  return (
    <>
      <Head>
        <title>Staking - RAT System</title>
        <meta name="description" content="Stake RAT tokens and earn USDT yields" />
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">RAT Token Staking</h1>
          <p className="text-gray-600 mt-2">
            Stake your RAT tokens to earn USDT yields from the liquidity aggregation pool
          </p>
        </div>

        {isConnected ? (
          <StakingDashboard />
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 mb-6">
              Connect your wallet to access staking features
            </p>
          </div>
        )}

        {/* Staking Information */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Staking Benefits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Earn USDT Yields</h4>
              <p className="text-gray-600 text-sm">
                Staked RAT tokens earn USDT yields generated from the liquidity aggregation system. 
                Yields are distributed automatically and can be claimed at any time.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Auto-Staking Available</h4>
              <p className="text-gray-600 text-sm">
                When you pledge assets, 80% of your RAT tokens are automatically staked to start 
                earning yields immediately. You can manage your staking position anytime.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">7-Day Lock Period</h4>
              <p className="text-gray-600 text-sm">
                Newly staked tokens have a 7-day lock period before they can be unstaked. 
                This helps maintain pool stability and reward long-term stakers.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">No Minimum Required</h4>
              <p className="text-gray-600 text-sm">
                You can stake any amount of RAT tokens (minimum 1 RAT). The more you stake, 
                the more yields you earn proportionally.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}