import { useMemo } from 'react'
import { useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'

export const useContract = (contractName: keyof typeof CONTRACT_ADDRESSES) => {
  const address = CONTRACT_ADDRESSES[contractName]
  
  return useMemo(() => ({
    address,
    isValid: !!address,
  }), [address])
}

export const useContractRead = (
  contractName: keyof typeof CONTRACT_ADDRESSES,
  functionName: string,
  args?: any[],
  abi?: any[]
) => {
  const { address } = useContract(contractName)
  
  return useContractRead({
    address: address as `0x${string}`,
    abi,
    functionName,
    args,
    enabled: !!address,
  })
}

export const useContractWrite = (
  contractName: keyof typeof CONTRACT_ADDRESSES,
  functionName: string,
  abi?: any[]
) => {
  const { address } = useContract(contractName)
  
  const { config } = usePrepareContractWrite({
    address: address as `0x${string}`,
    abi,
    functionName,
    enabled: !!address,
  })
  
  return useContractWrite(config)
}