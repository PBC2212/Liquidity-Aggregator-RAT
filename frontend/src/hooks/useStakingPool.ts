import { useContractRead, useContractWrite } from 'wagmi'
import { CONTRACT_ADDRESSES, RAT_STAKING_POOL_ABI } from '@/lib/contracts'
import { useAccount } from 'wagmi'

export const useStakingPool = () => {
  const { address } = useAccount()

  // Read functions
  const useGetUserStakeInfo = () => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.RATStakingPool as `0x${string}`,
      abi: RAT_STAKING_POOL_ABI,
      functionName: 'getUserStakeInfo',
      args: [address],
      enabled: !!address,
    })
  }

  const useGetPoolStats = () => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.RATStakingPool as `0x${string}`,
      abi: RAT_STAKING_POOL_ABI,
      functionName: 'getPoolStats',
    })
  }

  const usePendingRewards = () => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.RATStakingPool as `0x${string}`,
      abi: RAT_STAKING_POOL_ABI,
      functionName: 'pendingRewards',
      args: [address],
      enabled: !!address,
    })
  }

  // Write functions
  const useStakeRAT = () => {
    return useContractWrite({
      address: CONTRACT_ADDRESSES.RATStakingPool as `0x${string}`,
      abi: RAT_STAKING_POOL_ABI,
      functionName: 'stakeRAT',
    })
  }

  const useUnstakeRAT = () => {
    return useContractWrite({
      address: CONTRACT_ADDRESSES.RATStakingPool as `0x${string}`,
      abi: RAT_STAKING_POOL_ABI,
      functionName: 'unstakeRAT',
    })
  }

  const useClaimRewards = () => {
    return useContractWrite({
      address: CONTRACT_ADDRESSES.RATStakingPool as `0x${string}`,
      abi: RAT_STAKING_POOL_ABI,
      functionName: 'claimRewards',
    })
  }

  const useAdminStakeForUser = () => {
    return useContractWrite({
      address: CONTRACT_ADDRESSES.RATStakingPool as `0x${string}`,
      abi: RAT_STAKING_POOL_ABI,
      functionName: 'adminStakeForUser',
    })
  }

  const useDistributeYield = () => {
    return useContractWrite({
      address: CONTRACT_ADDRESSES.RATStakingPool as `0x${string}`,
      abi: RAT_STAKING_POOL_ABI,
      functionName: 'distributeYield',
    })
  }

  return {
    // Read hooks
    useGetUserStakeInfo,
    useGetPoolStats,
    usePendingRewards,
    // Write hooks
    useStakeRAT,
    useUnstakeRAT,
    useClaimRewards,
    useAdminStakeForUser,
    useDistributeYield,
  }
}