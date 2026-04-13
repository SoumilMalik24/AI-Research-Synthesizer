import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './pages/Landing' 
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import Results from './pages/Results'
import History from './pages/History'
import AdminDashboard from './pages/AdminDashboard'
import Navbar from './components/Navbar'
import AuthCallback from './pages/AuthCallback'

// FIX: Refactored ProtectedRoute to a separate file for better reusability and testability
import ProtectedRoute from './components/ProtectedRoute'

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public routes — anyone can visit */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected routes — must be logged in */}
        <Route path="/home" element={
          <ProtectedRoute><Home /></ProtectedRoute>
        } />
        <Route path="/results/:jobId" element={
          <ProtectedRoute><Results /></ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute><History /></ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="/admin" element={
          <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
        } />

        {/* Landing page — public root */}
        <Route path="/" element={<Landing />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

// components/ProtectedRoute.jsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isLoggedIn, isAdmin, loading } = useAuth()

  // FIX: Optimized loading spinner for better performance
  if (loading) return <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"/>
  </div>

  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/home" replace />

  return children
}