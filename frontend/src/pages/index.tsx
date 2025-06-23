import Head from 'next/head'
import { useAccount } from 'wagmi'
import SystemStats from '@/components/Dashboard/SystemStats'
import UserPortfolio from '@/components/Dashboard/UserPortfolio'

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <>
      <Head>
        <title>RAT Asset Pledge System</title>
        <meta name="description" content="Decentralized asset pledging with automated liquidity aggregation" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center py-12 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            RAT Asset Pledge System
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Pledge real-world assets, receive RAT tokens, and earn yields through our 
            automated liquidity aggregation and staking system.
          </p>
          {!isConnected && (
            <p className="text-primary-600 mt-4">
              Connect your wallet to get started
            </p>
          )}
        </div>

        {/* System Statistics */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">System Overview</h2>
          <SystemStats />
        </section>

        {/* User Portfolio */}
        {isConnected && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Portfolio</h2>
            <UserPortfolio />
          </section>
        )}

        {/* Features Section */}
        <section className="py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white rounded-lg card-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Asset Pledging</h3>
              <p className="text-gray-600">
                Pledge real-world assets for verification and receive RAT tokens in return
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg card-shadow">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Liquidity Aggregation</h3>
              <p className="text-gray-600">
                Automated USDT sourcing from multiple DEXs for optimal liquidity
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg card-shadow">
              <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Yield Generation</h3>
              <p className="text-gray-600">
                Stake RAT tokens and earn USDT yields from the liquidity pool
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}