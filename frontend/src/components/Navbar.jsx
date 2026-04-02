import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut, History, LayoutDashboard, FlaskConical, Home } from 'lucide-react'

export default function Navbar() {
  const { isLoggedIn, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-50 bg-[#F5F2EA] border-b border-[#E8E6DE]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo — goes to landing page regardless of login status */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#22C55E] rounded-lg flex items-center justify-center">
            <FlaskConical size={16} className="text-white" />
          </div>
          <span className="font-bold text-[#1C1C1A] text-lg tracking-tight">
            Research<span className="text-[#22C55E]">Synth</span>
          </span>
        </Link>

        {/* Nav links — only show when logged in */}
        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            <Link
              to="/home"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-[#6B6B67] hover:text-[#1C1C1A] hover:bg-white transition-all"
            >
              <Home size={15} />
              Home
            </Link>

            <Link
              to="/history"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-[#6B6B67] hover:text-[#1C1C1A] hover:bg-white transition-all"
            >
              <History size={15} />
              History
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-[#6B6B67] hover:text-[#1C1C1A] hover:bg-white transition-all"
              >
                <LayoutDashboard size={15} />
                Admin
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-[#6B6B67] hover:text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2 rounded-full text-sm font-medium text-[#6B6B67] hover:text-[#1C1C1A] transition-all"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="px-5 py-2 rounded-full text-sm font-semibold bg-[#1C1C1A] text-white hover:bg-[#22C55E] transition-all"
            >
              Get started
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}