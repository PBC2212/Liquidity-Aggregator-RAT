import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAccount } from 'wagmi'

const Header = () => {
  const router = useRouter()
  const { isConnected } = useAccount()

  const navigation = [
    { name: 'Dashboard', href: '/', current: router.pathname === '/' },
    { name: 'Pledge Asset', href: '/pledge', current: router.pathname === '/pledge' },
    { name: 'My Pledges', href: '/my-pledges', current: router.pathname === '/my-pledges' },
    { name: 'Staking', href: '/staking', current: router.pathname === '/staking' },
    { name: 'Admin', href: '/admin', current: router.pathname.startsWith('/admin') },
  ]

  return (
    <header className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary-600">
              RAT System
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  item.current
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                } px-3 py-2 text-sm font-medium transition-colors duration-200`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header