import './features/cart'
import { useAuthBootstrap } from './features/auth'
import AppRoutes from './routes'
import { InstallCard } from './components/pwa'

export default function App() {
  useAuthBootstrap()
  return (
    <div className="min-h-screen">
      <AppRoutes />
      <div className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <InstallCard />
      </div>
    </div>
  )
}
