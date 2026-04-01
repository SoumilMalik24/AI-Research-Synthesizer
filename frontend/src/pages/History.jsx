import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { researchAPI } from '../api/client'
import { Clock, CheckCircle, XCircle, Loader2, ArrowRight, Search } from 'lucide-react'

// Status badge component
function StatusBadge({ status }) {
  const styles = {
    completed: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
    failed:    'bg-red-50 text-red-600 border-red-200',
    running:   'bg-blue-50 text-blue-600 border-blue-200',
    pending:   'bg-[#F5F2EA] text-[#6B6B67] border-[#E8E6DE]',
  }
  const icons = {
    completed: <CheckCircle size={11} />,
    failed:    <XCircle size={11} />,
    running:   <Loader2 size={11} className="animate-spin" />,
    pending:   <Clock size={11} />,
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status]}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function History() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // useEffect with empty [] = runs once when page loads
  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const response = await researchAPI.getHistory()
      setJobs(response.data.history || [])
    } catch (err) {
      console.error('Failed to load history', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F2EA] pb-20">
      <div className="max-w-3xl mx-auto px-6 pt-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#1C1C1A] mb-1">Research History</h1>
          <p className="text-[#6B6B67]">All your past research queries</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[#22C55E]" />
          </div>
        )}

        {/* Empty state */}
        {!loading && jobs.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#E8E6DE] p-12 text-center">
            <div className="w-14 h-14 bg-[#F5F2EA] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search size={22} className="text-[#B4B2A9]" />
            </div>
            <h3 className="font-bold text-[#1C1C1A] mb-2">No research yet</h3>
            <p className="text-sm text-[#6B6B67] mb-6">
              Submit your first research query to see it here.
            </p>
            <button
              onClick={() => navigate('/home')}
              className="bg-[#22C55E] text-white px-6 py-2.5 rounded-full font-semibold hover:bg-[#16A34A] transition-all"
            >
              Start researching
            </button>
          </div>
        )}

        {/* Job list */}
        {!loading && jobs.length > 0 && (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.job_id}
                onClick={() => job.status === 'completed' && navigate(`/results/${job.job_id}`)}
                className={`bg-white rounded-2xl border border-[#E8E6DE] p-5 flex items-center justify-between gap-4 transition-all ${
                  job.status === 'completed'
                    ? 'hover:shadow-md hover:border-[#22C55E] cursor-pointer'
                    : 'opacity-75'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1C1C1A] truncate mb-2">{job.query}</p>
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
                  </div>
                </div>
                {job.status === 'completed' && (
                  <ArrowRight size={18} className="text-[#B4B2A9] shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}