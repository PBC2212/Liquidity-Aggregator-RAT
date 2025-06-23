import { useState } from 'react'
import { useAccount } from 'wagmi'
import { usePledgeManager } from '@/hooks/usePledgeManager'
import { useStakingPool } from '@/hooks/useStakingPool'
import { useLiquidityAggregator } from '@/hooks/useLiquidityAggregator'
import { formatEther, formatUSDT } from '@/lib/contracts'
import Card from '@/components/UI/Card'
import Button from '@/components/UI/Button'
import LoadingSpinner from '@/components/UI/LoadingSpinner'
import { toast } from 'react-hot-toast'

const AdminDashboard = () => {
  const { address, isConnected } = useAccount()
  const { useDistributeYield } = useStakingPool()
  const { useGetAggregatorStats, useProvideYieldToPool } = useLiquidityAggregator()
  
  const [yieldAmount, setYieldAmount] = useState('')

  const { data: aggregatorStats, isLoading: loadingStats } = useGetAggregatorStats()
  const { write: distributeYield, isLoading: distributingYield } = useDistributeYield()
  const { write: provideYield, isLoading: providingYield } = useProvideYieldToPool()

  // Simple admin check (in production, this should be more robust)
  const isAdmin = address && (
    address.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase() ||
    address.toLowerCase() === '0x...' // Add your admin address here
  )

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Connect your wallet to access admin features</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Access denied. Admin privileges required.</p>
      </div>
    )
  }

  if (loadingStats) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const handleDistributeYield = () => {
    distributeYield?.({
      onSuccess: () => {
        toast.success('Yield distributed successfully!')
      },
      onError: (error) => {
        toast.error('Failed to distribute yield')
        console.error('Distribution error:', error)
      },
    })
  }

  const handleProvideYield = () => {
    if (!yieldAmount || parseFloat(yieldAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      // Convert to USDT format (6 decimals)
      const amount = Math.floor(parseFloat(yieldAmount) * 10**6)
      
      provideYield?.({
        args: [amount],
        onSuccess: () => {
          toast.success('Yield provided to pool successfully!')
          setYieldAmount('')
        },
        onError: (error) => {
          toast.error('Failed to provide yield')
          console.error('Provide yield error:', error)
        },
      })
    } catch (error) {
      toast.error('Invalid amount')
    }
  }

  const totalUSDTAggregated = aggregatorStats ? formatUSDT(aggregatorStats[0].toString()) : '0'
  const totalYieldProvided = aggregatorStats ? formatUSDT(aggregatorStats[1].toString()) : '0'
  const currentUSDTBalance = aggregatorStats ? formatUSDT(aggregatorStats[2].toString()) : '0'
  const autoYieldEnabled = aggregatorStats ? aggregatorStats[4] : false
  const yieldPercentage = aggregatorStats ? (Number(aggregatorStats[3].toString()) / 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <span className="text-sm text-green-600 font-medium">Admin Access Granted</span>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="USDT Aggregated" className="text-center">
          <p className="text-3xl font-bold text-primary-600">{totalUSDTAggregated}</p>
          <p className="text-sm text-gray-600">Total USDT Processed</p>
        </Card>
        
        <Card title="Yield Provided" className="text-center">
          <p className="text-3xl font-bold text-success-500">{totalYieldProvided}</p>
          <p className="text-sm text-gray-600">Total Yield to Staking</p>
        </Card>
        
        <Card title="Current Balance" className="text-center">
          <p className="text-3xl font-bold text-warning-500">{currentUSDTBalance}</p>
          <p className="text-sm text-gray-600">Available USDT</p>
        </Card>
      </div>

      {/* Admin Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Yield Management">
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Auto Yield:</span>
                <span className={`text-sm ${autoYieldEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  {autoYieldEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Yield Percentage:</span>
                <span className="text-sm">{yieldPercentage}%</span>
              </div>
            </div>

            <Button
              onClick={handleDistributeYield}
              loading={distributingYield}
              className="w-full"
              variant="success"
            >
              Distribute Pending Yield
            </Button>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Provide Yield to Pool (USDT)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Amount"
                  value={yieldAmount}
                  onChange={(e) => setYieldAmount(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <Button
                  onClick={handleProvideYield}
                  loading={providingYield}
                  disabled={parseFloat(currentUSDTBalance) === 0}
                >
                  Provide
                </Button>
              </div>
              <button
                onClick={() => setYieldAmount(currentUSDTBalance)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Use all available USDT
              </button>
            </div>
          </div>
        </Card>

        <Card title="Quick Actions">
          <div className="space-y-3">
            <Button className="w-full" variant="primary">
              View Pending Pledges
            </Button>
            <Button className="w-full" variant="secondary">
              Manage Users
            </Button>
            <Button className="w-full" variant="secondary">
              System Configuration
            </Button>
            <Button className="w-full" variant="warning">
              Add Liquidity
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard