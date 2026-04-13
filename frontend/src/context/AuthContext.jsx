import { createContext, useContext, useState, useEffect } from 'react'
import jwt_decode from 'jwt-decode' // FIX: Import jwt-decode to decode JWT tokens
import jwt from 'jsonwebtoken' // FIX: Import jsonwebtoken to verify JWT tokens

// Step 1: Create the context — think of it as a "global variable" for React
const AuthContext = createContext(null)

// Step 2: The Provider wraps your whole app and holds the actual state
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)      // the logged-in user object
  const [loading, setLoading] = useState(true) // are we checking if user is logged in?

  // When the app first loads, check if there's a stored token
  // If yes, decode it to get the user info — no API call needed
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      try {
        // FIX: Verify the token signature before decoding
        const verified = jwt.verify(token, 'your-256-bit-secret') // Replace with your secret
        if (verified) {
          const payload = jwt_decode(token)

          // Check if token is expired
          if (payload.exp * 1000 > Date.now()) {
            setUser({ id: payload.sub, role: payload.role })
          } else {
            // Token expired — clear it
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
          }
        }
      } catch (error) {
        // FIX: Log errors for debugging
        console.error('Token verification failed:', error)
        localStorage.removeItem('access_token')
      }
    }
    setLoading(false)
  }, [])

  // FIX: Add event listener for storage changes to handle token updates
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('access_token')
      if (token) {
        try {
          const verified = jwt.verify(token, 'your-256-bit-secret') // Replace with your secret
          if (verified) {
            const payload = jwt_decode(token)
            if (payload.exp * 1000 > Date.now()) {
              setUser({ id: payload.sub, role: payload.role })
            } else {
              setUser(null)
            }
          }
        } catch (error) {
          console.error('Token verification failed:', error)
          setUser(null)
        }
      } else {
        setUser(null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const login = (tokens) => {
    // Store tokens
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)

    // FIX: Verify the token signature before decoding
    try {
      const verified = jwt.verify(tokens.access_token, 'your-256-bit-secret') // Replace with your secret
      if (verified) {
        const payload = jwt_decode(tokens.access_token)
        setUser({ id: payload.sub, role: tokens.role })
      }
    } catch (error) {
      console.error('Token verification failed:', error)
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  const isAdmin = user?.role === 'admin'
  const isLoggedIn = !!user  // !! converts to boolean

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  )
}

// Step 3: Custom hook — any component calls useAuth() to get the context
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}