import { useContractRead, useContractWrite } from 'wagmi'
import { parseEther } from 'ethers/lib/utils'
import { CONTRACT_ADDRESSES, PLEDGE_MANAGER_ABI } from '@/lib/contracts'
import { useAccount } from 'wagmi'

export const usePledgeManager = () => {
  const { address } = useAccount()

  // Read functions
  const useGetUserPledges = () => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
      abi: PLEDGE_MANAGER_ABI,
      functionName: 'getUserPledges',
      args: [address],
      enabled: !!address,
    })
  }

  const useGetUserRATBalance = () => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
      abi: PLEDGE_MANAGER_ABI,
      functionName: 'getUserRATBalance',
      args: [address],
      enabled: !!address,
    })
  }

  const useGetUserTotalRAT = () => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
      abi: PLEDGE_MANAGER_ABI,
      functionName: 'getUserTotalRAT',
      args: [address],
      enabled: !!address,
    })
  }

  const useGetPledge = (pledgeId: number) => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
      abi: PLEDGE_MANAGER_ABI,
      functionName: 'pledges',
      args: [pledgeId],
      enabled: !!pledgeId,
    })
  }

  const useGetNextPledgeId = () => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
      abi: PLEDGE_MANAGER_ABI,
      functionName: 'nextPledgeId',
    })
  }

  const useValidatePledgeValue = (pledgeId: number) => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
      abi: PLEDGE_MANAGER_ABI,
      functionName: 'validatePledgeValue',
      args: [pledgeId],
      enabled: !!pledgeId,
    })
  }

  // Write functions
  const usePledgeAsset = () => {
    return useContractWrite({
      address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
      abi: PLEDGE_MANAGER_ABI,
      functionName: 'pledgeAsset',
    })
  }

  const useApproveAsset = () => {
    return useContractWrite({
      address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
      abi: PLEDGE_MANAGER_ABI,
      functionName: 'approveAsset',
    })
  }

  const useRejectAsset = () => {
    return useContractWrite({
      address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
      abi: PLEDGE_MANAGER_ABI,
      functionName: 'rejectAsset',
    })
  }

  const useAdminSwapRATForUser = () => {
    return useContractWrite({
      address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
      abi: PLEDGE_MANAGER_ABI,
      functionName: 'adminSwapRATForUser',
    })
  }

  return {
    // Read hooks
    useGetUserPledges,
    useGetUserRATBalance,
    useGetUserTotalRAT,
    useGetPledge,
    useGetNextPledgeId,
    useValidatePledgeValue,
    // Write hooks
    usePledgeAsset,
    useApproveAsset,
    useRejectAsset,
    useAdminSwapRATForUser,
  }
}