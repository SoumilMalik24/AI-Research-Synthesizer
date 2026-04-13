import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Read tokens from the URL parameters
    const access_token = searchParams.get('access_token')
    const refresh_token = searchParams.get('refresh_token')
    const role = searchParams.get('role')

    // FIX: Implement token validation logic before using them in the `login` function
    const isValidToken = (token) => {
      // Add token validation logic here
      return token && typeof token === 'string' && token.length > 0
    }

    if (isValidToken(access_token) && isValidToken(refresh_token)) {
      // Same login function used for email login
      login({ access_token, refresh_token, role })
      navigate('/home', { replace: true })
    } else {
      // Something went wrong — send to login
      navigate('/login', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen bg-theme-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin text-theme-primary mx-auto mb-3" />
        <p className="text-theme-secondary">Completing sign in...</p>
      </div>
    </div>
  )
}