import { useState } from 'react'
import { useAccount } from 'wagmi'
import { parseEther } from 'ethers/lib/utils'
import { usePledgeManager } from '@/hooks/usePledgeManager'
import { toast } from 'react-hot-toast'
import Card from '@/components/UI/Card'
import Input from '@/components/UI/Input'
import Button from '@/components/UI/Button'

const PledgeForm = () => {
  const { isConnected } = useAccount()
  const { usePledgeAsset } = usePledgeManager()
  const { write: pledgeAsset, isLoading } = usePledgeAsset()

  const [formData, setFormData] = useState({
    assetDescription: '',
    estimatedValue: '',
    documentHash: '',
    assetAddress: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.assetDescription.trim()) {
      newErrors.assetDescription = 'Asset description is required'
    }

    if (!formData.estimatedValue.trim()) {
      newErrors.estimatedValue = 'Estimated value is required'
    } else if (isNaN(Number(formData.estimatedValue)) || Number(formData.estimatedValue) <= 0) {
      newErrors.estimatedValue = 'Please enter a valid positive number'
    }

    if (!formData.documentHash.trim()) {
      newErrors.documentHash = 'Document hash/reference is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected) {
      toast.error('Please connect your wallet')
      return
    }

    if (!validateForm()) {
      return
    }

    try {
      const estimatedValueWei = parseEther(formData.estimatedValue)
      
      pledgeAsset?.({
        args: [
          formData.assetDescription,
          estimatedValueWei,
          formData.documentHash,
          formData.assetAddress || '0x0000000000000000000000000000000000000000',
        ],
        onSuccess: (data) => {
          toast.success('Asset pledged successfully!')
          console.log('Transaction:', data)
          // Reset form
          setFormData({
            assetDescription: '',
            estimatedValue: '',
            documentHash: '',
            assetAddress: '',
          })
        },
        onError: (error) => {
          toast.error('Failed to pledge asset')
          console.error('Error:', error)
        },
      })
    } catch (error) {
      toast.error('Invalid input values')
      console.error('Form error:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Card title="Pledge New Asset" subtitle="Submit your real-world asset for verification and RAT token issuance">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Asset Description"
          placeholder="e.g., Real Estate Property in Miami"
          value={formData.assetDescription}
          onChange={(e) => handleInputChange('assetDescription', e.target.value)}
          error={errors.assetDescription}
          helperText="Provide a clear description of your asset"
        />

        <Input
          label="Estimated Value (USD)"
          type="number"
          step="0.01"
          placeholder="50000"
          value={formData.estimatedValue}
          onChange={(e) => handleInputChange('estimatedValue', e.target.value)}
          error={errors.estimatedValue}
          helperText="Enter the estimated USD value of your asset"
        />

        <Input
          label="Document Hash/Reference"
          placeholder="QmHash123... or document reference"
          value={formData.documentHash}
          onChange={(e) => handleInputChange('documentHash', e.target.value)}
          error={errors.documentHash}
          helperText="IPFS hash, document URL, or reference ID for verification"
        />

        <Input
          label="Asset Address (Optional)"
          placeholder="0x... (for tokenized assets)"
          value={formData.assetAddress}
          onChange={(e) => handleInputChange('assetAddress', e.target.value)}
          helperText="Contract address if your asset is already tokenized"
        />

        <Button
          type="submit"
          loading={isLoading}
          disabled={!isConnected}
          className="w-full"
        >
          {!isConnected ? 'Connect Wallet to Pledge' : 'Submit Asset Pledge'}
        </Button>

        {!isConnected && (
          <p className="text-sm text-gray-600 text-center">
            You need to connect your wallet to pledge an asset
          </p>
        )}
      </form>
    </Card>
  )
}

export default PledgeForm