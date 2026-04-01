import { useState, useEffect } from 'react'
import { adminAPI } from '../api/client'
import {
  Users, Briefcase, DollarSign, TrendingUp,
  Loader2, CheckCircle, XCircle, Clock, ChevronDown
} from 'lucide-react'

// ── Stat card ──
function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E6DE] p-6 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-[#F0FDF4] rounded-xl flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-black text-[#1C1C1A] mb-1">{value}</p>
      <p className="text-sm font-medium text-[#6B6B67]">{label}</p>
      {sub && <p className="text-xs text-[#B4B2A9] mt-1">{sub}</p>}
    </div>
  )
}

// ── Status badge ──
function StatusBadge({ status }) {
  const styles = {
    completed: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
    failed:    'bg-red-50 text-red-600 border-red-200',
    running:   'bg-blue-50 text-blue-600 border-blue-200',
    pending:   'bg-[#F5F2EA] text-[#6B6B67] border-[#E8E6DE]',
  }
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  )
}

// ── Role badge ──
function RoleBadge({ role }) {
  const styles = {
    admin:      'bg-purple-50 text-purple-700 border-purple-200',
    researcher: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
    guest:      'bg-[#F5F2EA] text-[#6B6B67] border-[#E8E6DE]',
  }
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[role] || styles.guest}`}>
      {role}
    </span>
  )
}

export default function AdminDashboard() {
  const [stats, setStats]   = useState(null)
  const [users, setUsers]   = useState([])
  const [jobs, setJobs]     = useState([])
  const [tab, setTab]       = useState('overview')  // 'overview' | 'users' | 'jobs'
  const [loading, setLoading] = useState(true)
  const [jobFilter, setJobFilter] = useState('')
  const [updatingRole, setUpdatingRole] = useState(null) // user id being updated

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      // Run all 3 requests in parallel — faster than one by one
      const [statsRes, usersRes, jobsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
        adminAPI.getJobs(),
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data.users || [])
      setJobs(jobsRes.data.jobs || [])
    } catch (err) {
      console.error('Failed to load admin data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRole(userId)
    try {
      await adminAPI.updateRole(userId, newRole)
      // Update local state so UI reflects change instantly
      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ))
    } catch (err) {
      console.error('Failed to update role', err)
    } finally {
      setUpdatingRole(null)
    }
  }

  const filteredJobs = jobFilter
    ? jobs.filter(j => j.status === jobFilter)
    : jobs

  if (loading) return (
    <div className="min-h-screen bg-[#F5F2EA] flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-[#22C55E]" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5F2EA] pb-20">
      <div className="max-w-6xl mx-auto px-6 pt-12">

        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#1C1C1A] mb-1">Admin Dashboard</h1>
          <p className="text-[#6B6B67]">Platform overview and management</p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white border border-[#E8E6DE] rounded-2xl p-1.5 mb-8 w-fit">
          {['overview', 'users', 'jobs'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                tab === t
                  ? 'bg-[#1C1C1A] text-white'
                  : 'text-[#6B6B67] hover:text-[#1C1C1A]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === 'overview' && stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Users size={18} className="text-[#22C55E]" />}
                label="Total users"
                value={stats.total_users}
              />
              <StatCard
                icon={<Briefcase size={18} className="text-[#22C55E]" />}
                label="Total jobs"
                value={stats.total_jobs}
                sub={`${stats.success_rate_percent}% success rate`}
              />
              <StatCard
                icon={<DollarSign size={18} className="text-[#22C55E]" />}
                label="Total spend"
                value={`$${stats.total_cost_usd?.toFixed(3) || '0.000'}`}
                sub={`$${stats.avg_cost_per_job || 0} avg/job`}
              />
              <StatCard
                icon={<TrendingUp size={18} className="text-[#22C55E]" />}
                label="Tokens used"
                value={stats.total_tokens_used?.toLocaleString() || 0}
              />
            </div>

            {/* Jobs by status breakdown */}
            <div className="bg-white rounded-2xl border border-[#E8E6DE] p-6">
              <h2 className="font-bold text-[#1C1C1A] mb-4">Jobs by status</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(stats.jobs_by_status || {}).map(([status, count]) => (
                  <div
                    key={status}
                    onClick={() => { setTab('jobs'); setJobFilter(status) }}
                    className="bg-[#F5F2EA] rounded-xl p-4 cursor-pointer hover:bg-[#EDEAE0] transition-all"
                  >
                    <p className="text-2xl font-black text-[#1C1C1A] mb-1">{count}</p>
                    <StatusBadge status={status} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Users Tab ── */}
        {tab === 'users' && (
          <div className="bg-white rounded-2xl border border-[#E8E6DE] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F5F2EA]">
              <h2 className="font-bold text-[#1C1C1A]">All users ({users.length})</h2>
            </div>
            <div className="divide-y divide-[#F5F2EA]">
              {users.map((user) => (
                <div key={user.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1C1C1A] truncate">
                      {user.full_name || 'No name'}
                    </p>
                    <p className="text-sm text-[#6B6B67] truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <RoleBadge role={user.role} />
                      {user.google_user && (
                        <span className="text-xs text-[#B4B2A9]">Google account</span>
                      )}
                      {!user.is_active && (
                        <span className="text-xs text-red-500">Inactive</span>
                      )}
                    </div>
                  </div>

                  {/* Role selector */}
                  <div className="relative shrink-0">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={updatingRole === user.id}
                      className="appearance-none bg-[#F5F2EA] border border-[#E8E6DE] text-[#1C1C1A] text-sm font-medium px-3 py-2 pr-7 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22C55E] cursor-pointer disabled:opacity-50"
                    >
                      <option value="guest">Guest</option>
                      <option value="researcher">Researcher</option>
                      <option value="admin">Admin</option>
                    </select>
                    {updatingRole === user.id
                      ? <Loader2 size={12} className="animate-spin absolute right-2.5 top-3 text-[#6B6B67]" />
                      : <ChevronDown size={12} className="absolute right-2.5 top-3 text-[#6B6B67] pointer-events-none" />
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Jobs Tab ── */}
        {tab === 'jobs' && (
          <div>
            {/* Filter bar */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {['', 'pending', 'running', 'completed', 'failed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setJobFilter(f)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    jobFilter === f
                      ? 'bg-[#1C1C1A] text-white'
                      : 'bg-white border border-[#E8E6DE] text-[#6B6B67] hover:border-[#22C55E]'
                  }`}
                >
                  {f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E6DE] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F5F2EA]">
                <h2 className="font-bold text-[#1C1C1A]">
                  {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
                  {jobFilter ? ` — ${jobFilter}` : ''}
                </h2>
              </div>
              <div className="divide-y divide-[#F5F2EA]">
                {filteredJobs.length === 0 && (
                  <div className="px-6 py-12 text-center text-[#B4B2A9] text-sm">
                    No jobs found
                  </div>
                )}
                {filteredJobs.map((job) => (
                  <div key={job.job_id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1C1C1A] truncate mb-1.5">
                          {job.query}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <StatusBadge status={job.status} />
                          <span className="text-xs text-[#B4B2A9]">
                            {new Date(job.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </span>
                          {job.total_cost_usd && (
                            <span className="text-xs text-[#B4B2A9]">
                              ${job.total_cost_usd.toFixed(4)}
                            </span>
                          )}
                          <span className="text-xs text-[#B4B2A9] font-mono">
                            user: {job.user_id.slice(0, 8)}...
                          </span>
                        </div>
                        {job.error_message && (
                          <p className="text-xs text-red-500 mt-1.5 bg-red-50 px-3 py-1.5 rounded-lg">
                            {job.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}