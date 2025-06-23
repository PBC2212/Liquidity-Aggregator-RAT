import { useContractRead, useContractWrite } from 'wagmi'
import { CONTRACT_ADDRESSES, LIQUIDITY_AGGREGATOR_ABI } from '@/lib/contracts'

export const useLiquidityAggregator = () => {
  // Read functions
  const useGetAggregatorStats = () => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.LiquidityAggregator as `0x${string}`,
      abi: LIQUIDITY_AGGREGATOR_ABI,
      functionName: 'getAggregatorStats',
    })
  }

  const useGetBestQuote = (amountIn: string, tokenIn: string, tokenOut: string) => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.LiquidityAggregator as `0x${string}`,
      abi: LIQUIDITY_AGGREGATOR_ABI,
      functionName: 'getBestQuote',
      args: [amountIn, tokenIn, tokenOut],
      enabled: !!amountIn && !!tokenIn && !!tokenOut,
    })
  }

  // Write functions
  const useAddETHLiquidity = () => {
    return useContractWrite({
      address: CONTRACT_ADDRESSES.LiquidityAggregator as `0x${string}`,
      abi: LIQUIDITY_AGGREGATOR_ABI,
      functionName: 'addETHLiquidity',
    })
  }

  const useProvideYieldToPool = () => {
    return useContractWrite({
      address: CONTRACT_ADDRESSES.LiquidityAggregator as `0x${string}`,
      abi: LIQUIDITY_AGGREGATOR_ABI,
      functionName: 'provideYieldToPool',
    })
  }

  return {
    // Read hooks
    useGetAggregatorStats,
    useGetBestQuote,
    // Write hooks
    useAddETHLiquidity,
    useProvideYieldToPool,
  }
}