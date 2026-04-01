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

    if (access_token && refresh_token) {
      // Same login function used for email login
      login({ access_token, refresh_token, role })
      navigate('/home', { replace: true })
    } else {
      // Something went wrong — send to login
      navigate('/login', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#F5F2EA] flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin text-[#22C55E] mx-auto mb-3" />
        <p className="text-[#6B6B67]">Completing sign in...</p>
      </div>
    </div>
  )
}
