import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')

        // Ask FastAPI for a new access token
        const response = await axios.post('/api/auth/refresh', {
          refresh_token: refreshToken
        })

        const { access_token } = response.data
        localStorage.setItem('access_token', access_token)

        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)

      } catch (refreshError) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// All the API functions your components will call
// Keeping them here means if the API changes, you fix it in ONE place

export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getGoogleUrl: () => api.get('/auth/google'),
}

export const researchAPI = {
  submitQuery: (data) => api.post('/research/query', data),
  getStatus: (jobId) => api.get(`/research/status/${jobId}`),
  getHistory: () => api.get('/research/history'),
}

export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  getJobs: (status) => api.get(`/admin/jobs${status ? `?status=${status}` : ''}`),
  getStats: () => api.get('/admin/stats'),
  updateRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }),
}

export default api