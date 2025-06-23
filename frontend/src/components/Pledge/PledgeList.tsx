import { useState } from 'react'
import { useAccount } from 'wagmi'
import { usePledgeManager } from '@/hooks/usePledgeManager'
import { formatEther, getStatusText, getStatusColor } from '@/lib/contracts'
import Card from '@/components/UI/Card'
import Badge from '@/components/UI/Badge'
import LoadingSpinner from '@/components/UI/LoadingSpinner'
import Modal from '@/components/UI/Modal'

interface PledgeDetails {
  pledger: string
  assetDescription: string
  estimatedValue: string
  documentHash: string
  status: number
  ratTokensIssued: string
  pledgeTime: number
  approvalTime: number
  autoStaked: boolean
  assetAddress: string
  marketValueAtApproval: string
}

const PledgeList = () => {
  const { address, isConnected } = useAccount()
  const { useGetUserPledges, useGetPledge } = usePledgeManager()
  
  const [selectedPledgeId, setSelectedPledgeId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: pledgeIds, isLoading } = useGetUserPledges()
  const { data: selectedPledge } = useGetPledge(selectedPledgeId || 0)

  if (!isConnected) {
    return (
      <Card title="My Pledges" className="text-center">
        <p className="text-gray-600">Connect your wallet to view your pledges</p>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card title="My Pledges" className="text-center">
        <LoadingSpinner size="lg" />
      </Card>
    )
  }

  if (!pledgeIds || pledgeIds.length === 0) {
    return (
      <Card title="My Pledges" className="text-center">
        <p className="text-gray-600">You haven't made any pledges yet</p>
      </Card>
    )
  }

  const handleViewDetails = (pledgeId: number) => {
    setSelectedPledgeId(pledgeId)
    setIsModalOpen(true)
  }

  const formatPledgeDetails = (pledge: any): PledgeDetails => {
    return {
      pledger: pledge[0],
      assetDescription: pledge[1],
      estimatedValue: formatEther(pledge[2].toString()),
      documentHash: pledge[3],
      status: pledge[4],
      ratTokensIssued: formatEther(pledge[5].toString()),
      pledgeTime: pledge[6],
      approvalTime: pledge[7],
      autoStaked: pledge[8],
      assetAddress: pledge[9],
      marketValueAtApproval: formatEther(pledge[10].toString()),
    }
  }

  return (
    <>
      <Card title={`My Pledges (${pledgeIds.length})`}>
        <div className="space-y-4">
          {pledgeIds.map((pledgeId: any, index: number) => (
            <PledgeItem
              key={index}
              pledgeId={Number(pledgeId.toString())}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      </Card>

      {/* Pledge Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Pledge #${selectedPledgeId} Details`}
        maxWidth="lg"
      >
        {selectedPledge && (
          <PledgeDetailsContent pledge={formatPledgeDetails(selectedPledge)} />
        )}
      </Modal>
    </>
  )
}

const PledgeItem = ({ pledgeId, onViewDetails }: { pledgeId: number; onViewDetails: (id: number) => void }) => {
  const { useGetPledge } = usePledgeManager()
  const { data: pledge, isLoading } = useGetPledge(pledgeId)

  if (isLoading || !pledge) {
    return <div className="p-4 border rounded-lg animate-pulse bg-gray-50" />
  }

  const pledgeData = {
    assetDescription: pledge[1],
    estimatedValue: formatEther(pledge[2].toString()),
    status: pledge[4],
    pledgeTime: pledge[6],
    ratTokensIssued: formatEther(pledge[5].toString()),
  }

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{pledgeData.assetDescription}</h4>
          <p className="text-sm text-gray-600 mt-1">
            Value: ${pledgeData.estimatedValue} • 
            Pledged: {new Date(pledgeData.pledgeTime * 1000).toLocaleDateString()}
          </p>
          {pledgeData.status === 1 && (
            <p className="text-sm text-success-500 mt-1">
              RAT Issued: {pledgeData.ratTokensIssued}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={getStatusColor(pledgeData.status) as any}>
            {getStatusText(pledgeData.status)}
          </Badge>
          <button
            onClick={() => onViewDetails(pledgeId)}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}

const PledgeDetailsContent = ({ pledge }: { pledge: PledgeDetails }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Asset Description</label>
        <p className="mt-1 text-sm text-gray-900">{pledge.assetDescription}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Estimated Value</label>
          <p className="mt-1 text-sm text-gray-900">${pledge.estimatedValue}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <Badge variant={getStatusColor(pledge.status) as any} className="mt-1">
            {getStatusText(pledge.status)}
          </Badge>
        </div>
      </div>

      {pledge.status === 1 && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">RAT Tokens Issued</label>
            <p className="mt-1 text-sm text-gray-900">{pledge.ratTokensIssued} RAT</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Auto-Staked</label>
            <Badge variant={pledge.autoStaked ? 'success' : 'secondary'} className="mt-1">
              {pledge.autoStaked ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Document Reference</label>
        <p className="mt-1 text-sm text-gray-900 break-all">{pledge.documentHash}</p>
      </div>

      {pledge.assetAddress !== '0x0000000000000000000000000000000000000000' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Asset Address</label>
          <p className="mt-1 text-sm text-gray-900 font-mono break-all">{pledge.assetAddress}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Pledge Date</label>
          <p className="mt-1 text-sm text-gray-900">
            {new Date(pledge.pledgeTime * 1000).toLocaleString()}
          </p>
        </div>
        {pledge.approvalTime > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Approval Date</label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(pledge.approvalTime * 1000).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {pledge.marketValueAtApproval !== '0' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Market Value at Approval</label>
          <p className="mt-1 text-sm text-gray-900">${pledge.marketValueAtApproval}</p>
        </div>
      )}
    </div>
  )
}

export default PledgeList