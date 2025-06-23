import { useState } from 'react'
import { useAccount } from 'wagmi'
import { parseEther } from 'ethers/lib/utils'
import { useStakingPool } from '@/hooks/useStakingPool'
import { usePledgeManager } from '@/hooks/usePledgeManager'
import { formatEther, formatUSDT } from '@/lib/contracts'
import { toast } from 'react-hot-toast'
import Card from '@/components/UI/Card'
import Input from '@/components/UI/Input'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import LoadingSpinner from '@/components/UI/LoadingSpinner'

const StakingDashboard = () => {
  const { isConnected } = useAccount()
  const { useGetUserStakeInfo, usePendingRewards, useGetPoolStats, useStakeRAT, useUnstakeRAT, useClaimRewards } = useStakingPool()
  const { useGetUserRATBalance } = usePledgeManager()

  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')

  const { data: stakeInfo, isLoading: loadingStake, refetch: refetchStake } = useGetUserStakeInfo()
  const { data: pendingRewards, refetch: refetchRewards } = usePendingRewards()
  const { data: poolStats, isLoading: loadingPool } = useGetPoolStats()
  const { data: custodyBalance, refetch: refetchBalance } = useGetUserRATBalance()

  const { write: stakeRAT, isLoading: stakingRAT } = useStakeRAT()
  const { write: unstakeRAT, isLoading: unstakingRAT } = useUnstakeRAT()
  const { write: claimRewards, isLoading: claimingRewards } = useClaimRewards()

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Connect your wallet to access staking features</p>
      </div>
    )
  }

  if (loadingStake || loadingPool) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const handleStake = () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error('Please enter a valid amount to stake')
      return
    }

    try {
      const amount = parseEther(stakeAmount)
      stakeRAT?.({
        args: [amount],
        onSuccess: () => {
          toast.success('RAT tokens staked successfully!')
          setStakeAmount('')
          refetchStake()
          refetchBalance()
          refetchRewards()
        },
        onError: (error) => {
          toast.error('Failed to stake RAT tokens')
          console.error('Staking error:', error)
        },
      })
    } catch (error) {
      toast.error('Invalid amount')
    }
  }

  const handleUnstake = () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      toast.error('Please enter a valid amount to unstake')
      return
    }

    try {
      const amount = parseEther(unstakeAmount)
      unstakeRAT?.({
        args: [amount],
        onSuccess: () => {
          toast.success('RAT tokens unstaked successfully!')
          setUnstakeAmount('')
          refetchStake()
          refetchBalance()
          refetchRewards()
        },
        onError: (error) => {
          toast.error('Failed to unstake RAT tokens')
          console.error('Unstaking error:', error)
        },
      })
    } catch (error) {
      toast.error('Invalid amount')
    }
  }

  const handleClaimRewards = () => {
    claimRewards?.({
      onSuccess: () => {
        toast.success('Rewards claimed successfully!')
        refetchStake()
        refetchRewards()
      },
      onError: (error) => {
        toast.error('Failed to claim rewards')
        console.error('Claim error:', error)
      },
    })
  }

  const stakedAmount = stakeInfo ? formatEther(stakeInfo[0].toString()) : '0'
  const pendingUSDT = pendingRewards ? formatUSDT(pendingRewards.toString()) : '0'
  const totalClaimed = stakeInfo ? formatUSDT(stakeInfo[2].toString()) : '0'
  const canUnstake = stakeInfo ? stakeInfo[4] : false
  const custodyRAT = custodyBalance ? formatEther(custodyBalance.toString()) : '0'

  const poolTotalStaked = poolStats ? formatEther(poolStats[0].toString()) : '0'
  const poolTotalYield = poolStats ? formatUSDT(poolStats[1].toString()) : '0'
  const poolPendingYield = poolStats ? formatUSDT(poolStats[2].toString()) : '0'
  const poolAPY = poolStats ? (Number(poolStats[3].toString()) / 100).toFixed(2) : '0'

  return (
    <div className="space-y-6">
      {/* Pool Overview */}
      <Card title="Staking Pool Overview">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{poolTotalStaked}</p>
            <p className="text-sm text-gray-600">Total Staked</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success-500">{poolAPY}%</p>
            <p className="text-sm text-gray-600">Current APY</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-warning-500">{poolTotalYield}</p>
            <p className="text-sm text-gray-600">Total Yield Paid</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-error-500">{poolPendingYield}</p>
            <p className="text-sm text-gray-600">Pending Yield</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Staking Position */}
        <Card title="Your Staking Position">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Staked Amount:</span>
              <span className="font-semibold">{stakedAmount} RAT</span>
            </div>
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
              <Badge variant={canUnstake ? 'success' : 'error'}>
                {canUnstake ? 'Yes' : 'Locked'}
              </Badge>
            </div>
            
            {parseFloat(pendingUSDT) > 0 && (
              <Button
                onClick={handleClaimRewards}
                loading={claimingRewards}
                variant="success"
                className="w-full mt-4"
              >
                Claim {pendingUSDT} USDT
              </Button>
            )}
          </div>
        </Card>

        {/* Staking Actions */}
        <Card title="Staking Actions">
          <div className="space-y-6">
            {/* Stake RAT */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Stake RAT Tokens</h4>
              <p className="text-sm text-gray-600 mb-4">
                Available in custody: {custodyRAT} RAT
              </p>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Amount to stake"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleStake}
                  loading={stakingRAT}
                  disabled={parseFloat(custodyRAT) === 0}
                >
                  Stake
                </Button>
              </div>
              <button
                onClick={() => setStakeAmount(custodyRAT)}
                className="text-sm text-primary-600 hover:text-primary-700 mt-1"
              >
                Stake all available
              </button>
            </div>

            {/* Unstake RAT */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Unstake RAT Tokens</h4>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Amount to unstake"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleUnstake}
                  loading={unstakingRAT}
                  disabled={!canUnstake || parseFloat(stakedAmount) === 0}
                  variant="secondary"
                >
                  Unstake
                </Button>
              </div>
              <button
                onClick={() => setUnstakeAmount(stakedAmount)}
                className="text-sm text-primary-600 hover:text-primary-700 mt-1"
                disabled={!canUnstake}
              >
                Unstake all
              </button>
              {!canUnstake && parseFloat(stakedAmount) > 0 && (
                <p className="text-sm text-error-500 mt-1">
                  Unstaking is locked for 7 days after staking
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default StakingDashboard