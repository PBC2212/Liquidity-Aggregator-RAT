import { useContractRead } from 'wagmi'
import { formatEther, formatUSDT } from '@/lib/contracts'
import { CONTRACT_ADDRESSES, RAT_TOKEN_ABI, PLEDGE_MANAGER_ABI, RAT_STAKING_POOL_ABI, LIQUIDITY_AGGREGATOR_ABI } from '@/lib/contracts'
import Card from '@/components/UI/Card'
import LoadingSpinner from '@/components/UI/LoadingSpinner'

const SystemStats = () => {
  // RAT Token stats
  const { data: totalSupply, isLoading: loadingSupply } = useContractRead({
    address: CONTRACT_ADDRESSES.RATToken as `0x${string}`,
    abi: RAT_TOKEN_ABI,
    functionName: 'totalSupply',
  })

  const { data: maxSupply } = useContractRead({
    address: CONTRACT_ADDRESSES.RATToken as `0x${string}`,
    abi: RAT_TOKEN_ABI,
    functionName: 'MAX_SUPPLY',
  })

  // Pledge Manager stats
  const { data: totalRATInCustody } = useContractRead({
    address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
    abi: PLEDGE_MANAGER_ABI,
    functionName: 'totalRATInCustody',
  })

  const { data: nextPledgeId } = useContractRead({
    address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
    abi: PLEDGE_MANAGER_ABI,
    functionName: 'nextPledgeId',
  })

  // Staking Pool stats
  const { data: poolStats } = useContractRead({
    address: CONTRACT_ADDRESSES.RATStakingPool as `0x${string}`,
    abi: RAT_STAKING_POOL_ABI,
    functionName: 'getPoolStats',
  })

  // Liquidity Aggregator stats
  const { data: aggregatorStats } = useContractRead({
    address: CONTRACT_ADDRESSES.LiquidityAggregator as `0x${string}`,
    abi: LIQUIDITY_AGGREGATOR_ABI,
    functionName: 'getAggregatorStats',
  })

  if (loadingSupply) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const utilizationRate = totalSupply && maxSupply 
    ? (Number(formatEther(totalSupply.toString())) / Number(formatEther(maxSupply.toString())) * 100).toFixed(2)
    : '0'

  const totalPledges = nextPledgeId ? Number(nextPledgeId.toString()) - 1 : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* RAT Token Stats */}
      <Card title="RAT Token" className="text-center">
        <div className="space-y-2">
          <div>
            <p className="text-2xl font-bold text-primary-600">
              {totalSupply ? formatEther(totalSupply.toString()) : '0'}
            </p>
            <p className="text-sm text-gray-600">Total Supply</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">{utilizationRate}%</p>
            <p className="text-sm text-gray-600">Utilization</p>
          </div>
        </div>
      </Card>

      {/* Pledge Stats */}
      <Card title="Pledges" className="text-center">
        <div className="space-y-2">
          <div>
            <p className="text-2xl font-bold text-success-500">{totalPledges}</p>
            <p className="text-sm text-gray-600">Total Pledges</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">
              {totalRATInCustody ? formatEther(totalRATInCustody.toString()) : '0'}
            </p>
            <p className="text-sm text-gray-600">RAT in Custody</p>
          </div>
        </div>
      </Card>

      {/* Staking Stats */}
      <Card title="Staking Pool" className="text-center">
        <div className="space-y-2">
          <div>
            <p className="text-2xl font-bold text-warning-500">
              {poolStats ? formatEther(poolStats[0].toString()) : '0'}
            </p>
            <p className="text-sm text-gray-600">Total Staked</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">
              {poolStats ? formatUSDT(poolStats[1].toString()) : '0'}
            </p>
            <p className="text-sm text-gray-600">Yield Distributed</p>
          </div>
        </div>
      </Card>

      {/* Liquidity Stats */}
      <Card title="Liquidity Pool" className="text-center">
        <div className="space-y-2">
          <div>
            <p className="text-2xl font-bold text-error-500">
              {aggregatorStats ? formatUSDT(aggregatorStats[0].toString()) : '0'}
            </p>
            <p className="text-sm text-gray-600">USDT Aggregated</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">
              {aggregatorStats ? formatUSDT(aggregatorStats[2].toString()) : '0'}
            </p>
            <p className="text-sm text-gray-600">Current Balance</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default SystemStats