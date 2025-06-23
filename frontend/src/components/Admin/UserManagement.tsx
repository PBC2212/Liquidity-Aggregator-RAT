import { useState } from 'react'
import { useContractRead } from 'wagmi'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { usePledgeManager } from '@/hooks/usePledgeManager'
import { useStakingPool } from '@/hooks/useStakingPool'
import { CONTRACT_ADDRESSES, PLEDGE_MANAGER_ABI, formatEther, formatUSDT } from '@/lib/contracts'
import { toast } from 'react-hot-toast'
import Card from '@/components/UI/Card'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Modal from '@/components/UI/Modal'

const UserManagement = () => {
  const [selectedUser, setSelectedUser] = useState('')
  const [userDetails, setUserDetails] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'stake' | 'swap'>('stake')
  const [amount, setAmount] = useState('')
  const [minUSDT, setMinUSDT] = useState('')

  const { useAdminSwapRATForUser } = usePledgeManager()
  const { useAdminStakeForUser } = useStakingPool()

  const { write: adminSwap, isLoading: swappingForUser } = useAdminSwapRATForUser()
  const { write: adminStake, isLoading: stakingForUser } = useAdminStakeForUser()

  // Get user details when address is entered
  const { data: userRAT } = useContractRead({
    address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
    abi: PLEDGE_MANAGER_ABI,
    functionName: 'getUserTotalRAT',
    args: [selectedUser],
    enabled: !!selectedUser && selectedUser.length === 42,
  })

  const { data: userPledges } = useContractRead({
    address: CONTRACT_ADDRESSES.PledgeManager as `0x${string}`,
    abi: PLEDGE_MANAGER_ABI,
    functionName: 'getUserPledges',
    args: [selectedUser],
    enabled: !!selectedUser && selectedUser.length === 42,
  })

  const handleLookupUser = () => {
    if (!selectedUser || selectedUser.length !== 42) {
      toast.error('Please enter a valid Ethereum address')
      return
    }

    if (userRAT) {
      setUserDetails({
        address: selectedUser,
        custodyBalance: formatEther(userRAT[0].toString()),
        stakedBalance: formatEther(userRAT[1].toString()),
        totalBalance: formatEther(userRAT[2].toString()),
        pledgeCount: userPledges ? userPledges.length : 0,
      })
    }
  }

  const handleStakeForUser = () => {
    setModalType('stake')
    setAmount('')
    setIsModalOpen(true)
  }

  const handleSwapForUser = () => {
    setModalType('swap')
    setAmount('')
    setMinUSDT('')
    setIsModalOpen(true)
  }

  const executeStake = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount to stake')
      return
    }

    try {
      const stakeAmount = parseEther(amount)
      adminStake?.({
        args: [selectedUser, stakeAmount],
        onSuccess: () => {
          toast.success('Successfully staked RAT for user!')
          setIsModalOpen(false)
          setAmount('')
          handleLookupUser() // Refresh user data
        },
        onError: (error) => {
          toast.error('Failed to stake RAT for user')
          console.error('Admin stake error:', error)
        },
      })
    } catch (error) {
      toast.error('Invalid amount')
    }
  }

  const executeSwap = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid RAT amount')
      return
    }
    if (!minUSDT || parseFloat(minUSDT) <= 0) {
      toast.error('Please enter a valid minimum USDT amount')
      return
    }

    try {
      const ratAmount = parseEther(amount)
      const minUSDTAmount = parseUnits(minUSDT, 6) // USDT has 6 decimals
      
      adminSwap?.({
        args: [selectedUser, ratAmount, minUSDTAmount, '0x'], // Empty swap data for now
        onSuccess: () => {
          toast.success('Successfully executed swap for user!')
          setIsModalOpen(false)
          setAmount('')
          setMinUSDT('')
          handleLookupUser() // Refresh user data
        },
        onError: (error) => {
          toast.error('Failed to execute swap for user')
          console.error('Admin swap error:', error)
        },
      })
    } catch (error) {
      toast.error('Invalid input values')
    }
  }

  return (
    <>
      <div className="space-y-6">
        <Card title="User Management" subtitle="Manage user accounts and perform admin actions">
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter user address (0x...)"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleLookupUser}>
                Lookup User
              </Button>
            </div>

            {userDetails && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">User Details</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Address:</p>
                    <p className="font-mono text-sm">{userDetails.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Pledges:</p>
                    <p className="font-medium">{userDetails.pledgeCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">RAT in Custody:</p>
                    <p className="font-medium">{userDetails.custodyBalance} RAT</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">RAT Staked:</p>
                    <p className="font-medium text-success-500">{userDetails.stakedBalance} RAT</p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={handleStakeForUser}
                    variant="success"
                    disabled={parseFloat(userDetails.custodyBalance) === 0}
                  >
                    Stake RAT for User
                  </Button>
                  <Button
                    onClick={handleSwapForUser}
                    variant="warning"
                    disabled={parseFloat(userDetails.custodyBalance) === 0}
                  >
                    Execute Swap for User
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalType === 'stake' ? 'Stake RAT for User' : 'Execute Swap for User'}
        maxWidth="md"
      >
        {userDetails && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">User: {userDetails.address}</p>
              <p className="text-sm text-gray-600">
                Available in Custody: {userDetails.custodyBalance} RAT
              </p>
            </div>

            {modalType === 'stake' ? (
              <div className="space-y-4">
                <Input
                  label="Amount to Stake (RAT)"
                  type="number"
                  step="0.0001"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="flex space-x-3">
                  <Button
                    onClick={executeStake}
                    loading={stakingForUser}
                    variant="success"
                    className="flex-1"
                  >
                    Stake for User
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
                <Input
                  label="RAT Amount to Swap"
                  type="number"
                  step="0.0001"
                  placeholder="Enter RAT amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Input
                  label="Minimum USDT to Receive"
                  type="number"
                  step="0.01"
                  placeholder="Enter minimum USDT"
                  value={minUSDT}
                  onChange={(e) => setMinUSDT(e.target.value)}
                  helperText="Slippage protection - transaction will fail if less USDT is received"
                />
                <div className="flex space-x-3">
                  <Button
                    onClick={executeSwap}
                    loading={swappingForUser}
                    variant="warning"
                    className="flex-1"
                  >
                    Execute Swap
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

export default UserManagement