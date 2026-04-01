import { createContext, useContext, useState, useEffect } from 'react'

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
        // JWT has 3 parts separated by dots: header.payload.signature
        const payload = JSON.parse(atob(token.split('.')[1]))

        // Check if token is expired
        if (payload.exp * 1000 > Date.now()) {
          setUser({ id: payload.sub, role: payload.role })
        } else {
          // Token expired — clear it
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
      } catch {
        localStorage.removeItem('access_token')
      }
    }
    setLoading(false)
  }, [])

  const login = (tokens) => {
    // Store tokens
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)

    // Decode the token to get user info
    const payload = JSON.parse(atob(tokens.access_token.split('.')[1]))
    setUser({ id: payload.sub, role: tokens.role })
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