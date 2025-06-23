import { useAccount } from 'wagmi'
import { usePledgeManager } from '@/hooks/usePledgeManager'
import { useStakingPool } from '@/hooks/useStakingPool'
import { formatEther, formatUSDT } from '@/lib/contracts'
import Card from '@/components/UI/Card'
import Badge from '@/components/UI/Badge'
import LoadingSpinner from '@/components/UI/LoadingSpinner'

const UserPortfolio = () => {
  const { address, isConnected } = useAccount()
  const { useGetUserTotalRAT } = usePledgeManager()
  const { useGetUserStakeInfo, usePendingRewards } = useStakingPool()

  const { data: userRAT, isLoading: loadingRAT } = useGetUserTotalRAT()
  const { data: stakeInfo, isLoading: loadingStake } = useGetUserStakeInfo()
  const { data: pendingRewards, isLoading: loadingRewards } = usePendingRewards()

  if (!isConnected) {
    return (
      <Card title="Your Portfolio" className="text-center">
        <p className="text-gray-600">Connect your wallet to view your portfolio</p>
      </Card>
    )
  }

  if (loadingRAT || loadingStake || loadingRewards) {
    return (
      <Card title="Your Portfolio" className="text-center">
        <LoadingSpinner size="lg" />
      </Card>
    )
  }

  const custodyBalance = userRAT ? formatEther(userRAT[0].toString()) : '0'
  const stakedBalance = userRAT ? formatEther(userRAT[1].toString()) : '0'
  const totalBalance = userRAT ? formatEther(userRAT[2].toString()) : '0'
  const pendingUSDT = pendingRewards ? formatUSDT(pendingRewards.toString()) : '0'
  const totalClaimed = stakeInfo ? formatUSDT(stakeInfo[2].toString()) : '0'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* RAT Holdings */}
      <Card title="RAT Holdings">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">In Custody:</span>
            <span className="font-semibold">{custodyBalance} RAT</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Staked:</span>
            <span className="font-semibold text-success-500">{stakedBalance} RAT</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-800 font-medium">Total:</span>
              <span className="text-xl font-bold text-primary-600">{totalBalance} RAT</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Staking Rewards */}
      <Card title="Staking Rewards">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Pending Rewards:</span>
            <Badge variant="warning">{pendingUSDT} USDT</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Claimed:</span>
            <span className="font-semibold text-success-500">{totalClaimed} USDT</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Can Unstake:</span>
            <Badge variant={stakeInfo && stakeInfo[4] ? 'success' : 'error'}>
              {stakeInfo && stakeInfo[4] ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default UserPortfolio