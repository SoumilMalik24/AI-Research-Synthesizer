import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api/client'
import { FlaskConical, ArrowUpRight } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  // useState — a variable that when changed, re-renders the component
  // every setEmail() call updates the variable AND refreshes what you see
  // that's why the input shows what you type in real time

  const handleSubmit = async (e) => {
    e.preventDefault()  // stops the browser from refreshing on form submit
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login({ email, password })
      login(response.data)       // saves tokens, sets user in context
      navigate('/home')          // redirect to home page
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const response = await authAPI.getGoogleUrl()
      window.location.href = response.data.url  // redirect to Google
    } catch (err) {
      setError('Could not connect to Google. Try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F2EA] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#E8E6DE] mb-6">
            <FlaskConical size={14} className="text-[#22C55E]" />
            <span className="text-sm font-medium text-[#6B6B67]">Research Synthesizer</span>
          </div>
          <h1 className="text-4xl font-extrabold text-[#1C1C1A] leading-tight mb-2">
            Welcome back
          </h1>
          <p className="text-[#6B6B67]">Sign in to continue your research</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E8E6DE] p-8 shadow-sm">

          {/* Google login button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[#E8E6DE] hover:bg-[#F5F2EA] transition-all font-medium text-[#1C1C1A] mb-6"
          >
            {/* Google SVG icon */}
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#E8E6DE]"/>
            <span className="text-xs text-[#6B6B67] font-medium">or</span>
            <div className="flex-1 h-px bg-[#E8E6DE]"/>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1C1A] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-[#E8E6DE] bg-[#F5F2EA] text-[#1C1C1A] placeholder-[#B4B2A9] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1C1C1A] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border border-[#E8E6DE] bg-[#F5F2EA] text-[#1C1C1A] placeholder-[#B4B2A9] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-60 text-white font-semibold py-3 rounded-full transition-all mt-2"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Signup link */}
        <p className="text-center text-sm text-[#6B6B67] mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-[#1C1C1A] hover:text-[#22C55E] transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}