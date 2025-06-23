import { useState } from 'react'
import { useContractRead } from 'wagmi'
import { parseEther } from 'ethers/lib/utils'
import { usePledgeManager } from '@/hooks/usePledgeManager'
import { CONTRACT_ADDRESSES, PLEDGE_MANAGER_ABI, formatEther } from '@/lib/contracts'
import { toast } from 'react-hot-toast'
import Card from '@/components/UI/Card'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Badge from '@/components/UI/Badge'
import Modal from '@/components/UI/Modal'
import LoadingSpinner from '@/components/UI/LoadingSpinner'

const PendingPledges = () => {
  const { useApproveAsset, useRejectAsset } = usePledgeManager()
  const [selectedPledge, setSelectedPledge] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [approvalValue, setApprovalValue] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [modalType, setModalType] = useState<'approve' | 'reject'>('approve')

  const { write: approveAsset, isLoading: approvingAsset } = useApproveAsset()
  const { write: rejectAsset, isLoading: rejectingAsset } = useRejectAsset()

  // Get next pledge ID to determine range to check
  const { data: nextPledgeId } = useContractRead({
    address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
    abi: PLEDGE_MANAGER_ABI,
    functionName: 'nextPledgeId',
  })

  const maxPledgeId = nextPledgeId ? Number(nextPledgeId.toString()) - 1 : 0
  const pledgeIds = Array.from({ length: Math.min(maxPledgeId, 20) }, (_, i) => i + 1)

  const handleApprove = (pledge: any, pledgeId: number) => {
    setSelectedPledge({ ...pledge, id: pledgeId })
    setModalType('approve')
    setApprovalValue(formatEther(pledge[2].toString())) // Set estimated value as default
    setIsModalOpen(true)
  }

  const handleReject = (pledge: any, pledgeId: number) => {
    setSelectedPledge({ ...pledge, id: pledgeId })
    setModalType('reject')
    setRejectionReason('')
    setIsModalOpen(true)
  }

  const executeApproval = () => {
    if (!approvalValue || parseFloat(approvalValue) <= 0) {
      toast.error('Please enter a valid approval value')
      return
    }

    try {
      const value = parseEther(approvalValue)
      approveAsset?.({
        args: [selectedPledge.id, value],
        onSuccess: () => {
          toast.success('Asset approved successfully!')
          setIsModalOpen(false)
          setSelectedPledge(null)
        },
        onError: (error) => {
          toast.error('Failed to approve asset')
          console.error('Approval error:', error)
        },
      })
    } catch (error) {
      toast.error('Invalid approval value')
    }
  }

  const executeRejection = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    rejectAsset?.({
      args: [selectedPledge.id, rejectionReason],
      onSuccess: () => {
        toast.success('Asset rejected successfully!')
        setIsModalOpen(false)
        setSelectedPledge(null)
      },
      onError: (error) => {
        toast.error('Failed to reject asset')
        console.error('Rejection error:', error)
      },
    })
  }

  return (
    <>
      <Card title="Pending Asset Pledges" subtitle="Review and approve or reject asset pledges">
        <div className="space-y-4">
          {pledgeIds.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No pledges found</p>
          ) : (
            pledgeIds.map((pledgeId) => (
              <PendingPledgeItem
                key={pledgeId}
                pledgeId={pledgeId}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))
          )}
        </div>
      </Card>

      {/* Approval/Rejection Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalType === 'approve' ? 'Approve Asset Pledge' : 'Reject Asset Pledge'}
        maxWidth="md"
      >
        {selectedPledge && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">Asset Details</h4>
              <p className="text-sm text-gray-600 mt-1">{selectedPledge[1]}</p>
              <p className="text-sm text-gray-600">
                Estimated Value: ${formatEther(selectedPledge[2].toString())}
              </p>
            </div>

            {modalType === 'approve' ? (
              <div className="space-y-4">
                <Input
                  label="Approved Value (USD)"
                  type="number"
                  step="0.01"
                  placeholder="Enter approved value"
                  value={approvalValue}
                  onChange={(e) => setApprovalValue(e.target.value)}
                  helperText="This will determine the amount of RAT tokens to mint"
                />
                <div className="flex space-x-3">
                  <Button
                    onClick={executeApproval}
                    loading={approvingAsset}
                    variant="success"
                    className="flex-1"
                  >
                    Approve Asset
                  </Button>
                  <Button
                    onClick={() => setIsModalOpen(false)}
                    variant="secondary"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rejection Reason
                  </label>
                  <textarea
                    placeholder="Provide a reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    onClick={executeRejection}
                    loading={rejectingAsset}
                    variant="error"
                    className="flex-1"
                  >
                    Reject Asset
                  </Button>
                  <Button
                    onClick={() => setIsModalOpen(false)}
                    variant="secondary"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}

const PendingPledgeItem = ({ 
  pledgeId, 
  onApprove, 
  onReject 
}: { 
  pledgeId: number
  onApprove: (pledge: any, id: number) => void
  onReject: (pledge: any, id: number) => void
}) => {
  const { data: pledge, isLoading } = useContractRead({
    address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
    abi: PLEDGE_MANAGER_ABI,
    functionName: 'pledges',
    args: [pledgeId],
  })

  if (isLoading) {
    return <div className="p-4 border rounded-lg animate-pulse bg-gray-50" />
  }

  if (!pledge || pledge[4] !== 0) { // Only show pending pledges (status = 0)
    return null
  }

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="font-medium text-gray-900">Pledge #{pledgeId}</h4>
            <Badge variant="warning">Pending</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            <strong>Asset:</strong> {pledge[1]}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            <strong>Value:</strong> ${formatEther(pledge[2].toString())}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            <strong>Pledger:</strong> {pledge[0]}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            <strong>Document:</strong> {pledge[3]}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Date:</strong> {new Date(Number(pledge[6].toString()) * 1000).toLocaleDateString()}
          </p>
        </div>
        <div className="flex space-x-2 ml-4">
          <Button
            onClick={() => onApprove(pledge, pledgeId)}
            variant="success"
            size="sm"
          >
            Approve
          </Button>
          <Button
            onClick={() => onReject(pledge, pledgeId)}
            variant="error"
            size="sm"
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PendingPledges