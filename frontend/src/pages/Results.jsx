import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { researchAPI } from '../api/client'
import {
  Loader2, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, ArrowLeft,
  Globe, AlertTriangle, BookOpen, DollarSign, Zap
} from 'lucide-react'

// ── Small reusable components ──

// Confidence bar — shows a colored bar based on score
function ConfidenceBar({ score }) {
  const percent = Math.round(score * 100)
  const color = percent >= 80 ? '#22C55E' : percent >= 60 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-[#F5F2EA] rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
      <span className="text-sm font-semibold" style={{ color }}>
        {percent}%
      </span>
    </div>
  )
}

// Single finding card — collapsible
function FindingCard({ finding, index }) {
  const [open, setOpen] = useState(index === 0) // first card open by default

  return (
    <div className="bg-white rounded-2xl border border-[#E8E6DE] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-[#F5F2EA] transition-all text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs font-bold text-[#B4B2A9] w-6 shrink-0">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="font-semibold text-[#1C1C1A] truncate">{finding.theme}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span className="text-sm font-medium text-[#22C55E]">
            {Math.round(finding.confidence * 100)}% confidence
          </span>
          {open ? <ChevronUp size={16} className="text-[#B4B2A9]" /> : <ChevronDown size={16} className="text-[#B4B2A9]" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[#F5F2EA]">
          <p className="text-[#6B6B67] leading-relaxed mt-4 mb-4">{finding.summary}</p>
          <ConfidenceBar score={finding.confidence} />

          <div className="grid md:grid-cols-2 gap-3 mt-4">
            {finding.supporting_papers?.length > 0 && (
              <div className="bg-[#F0FDF4] rounded-xl p-3">
                <p className="text-xs font-semibold text-[#15803D] mb-2 uppercase tracking-wide">
                  Supporting papers
                </p>
                {finding.supporting_papers.map((p, i) => (
                  <p key={i} className="text-xs text-[#166534] mb-1">• {p}</p>
                ))}
              </div>
            )}
            {finding.contradicting_papers?.length > 0 && (
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-600 mb-2 uppercase tracking-wide">
                  Contradicting papers
                </p>
                {finding.contradicting_papers.map((p, i) => (
                  <p key={i} className="text-xs text-red-500 mb-1">• {p}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Results Page ──
export default function Results() {
  const { jobId } = useParams()   // gets the job ID from the URL
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)

  // useRef stores the interval ID so we can clear it later
  // We use ref instead of state because changing it shouldn't re-render the component
  const pollInterval = useRef(null)

  useEffect(() => {
    // Fetch status immediately on page load
    fetchStatus()

    // Then poll every 5 seconds
    pollInterval.current = setInterval(fetchStatus, 5000)

    // Cleanup — when user leaves this page, stop polling
    // Without this, the interval keeps running even after navigation
    return () => clearInterval(pollInterval.current)
  }, [jobId])

  useEffect(() => {
    if (job?.status !== 'running') return
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [job?.status])

  const fetchStatus = async () => {
    try {
      const response = await researchAPI.getStatus(jobId)
      const data = response.data
      setJob(data)

      // If job is done (either way), stop polling
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(pollInterval.current)
      }
    } catch (err) {
      setError('Could not fetch job status.')
      clearInterval(pollInterval.current)
    }
  }

  // ── Loading state ──
  if (!job) return (
    <div className="min-h-screen bg-[#F5F2EA] flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin text-[#22C55E] mx-auto mb-3" />
        <p className="text-[#6B6B67]">Loading research job...</p>
      </div>
    </div>
  )

  // ── Pending / Running state ──
  if (job.status === 'pending' || job.status === 'running') return (
    <div className="min-h-screen bg-[#F5F2EA] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-[#E8E6DE] p-10 max-w-md w-full text-center shadow-sm">
        <div className="w-16 h-16 bg-[#F0FDF4] rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 size={28} className="animate-spin text-[#22C55E]" />
        </div>
        <h2 className="text-xl font-bold text-[#1C1C1A] mb-2">
          {job.status === 'pending' ? 'Starting up...' : 'Agents working...'}
        </h2>
        <p className="text-[#6B6B67] text-sm mb-6 leading-relaxed">
          {job.status === 'pending'
            ? 'Your research job is queued and will start shortly.'
            : 'Searching papers, translating, and synthesizing findings. This takes 30–60 seconds.'}
        </p>
        <div className="bg-[#F5F2EA] rounded-xl p-4 text-left">
          <p className="text-xs font-medium text-[#B4B2A9] uppercase tracking-widest mb-1">Query</p>
          <p className="text-sm text-[#1C1C1A] font-medium">"{job.query}"</p>
        </div>

        {/* Animated steps — based on elapsed time */}
        <div className="mt-6 space-y-2 text-left">
          {[
            {
              label: 'Searching arXiv + Semantic Scholar',
              // search starts immediately
              done: job.status === 'running' && elapsed >= 2,
              active: job.status === 'running' && elapsed < 2,
            },
            {
              label: 'Translating and embedding papers',
              // translation starts ~10 seconds in
              done: job.status === 'running' && elapsed >= 20,
              active: job.status === 'running' && elapsed >= 2 && elapsed < 20,
            },
            {
              label: 'Synthesizing report',
              // synthesis starts ~20 seconds in
              done: job.status === 'completed',
              active: job.status === 'running' && elapsed >= 20,
            },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                step.done
                  ? 'bg-[#22C55E]'
                  : step.active
                  ? 'bg-[#22C55E] opacity-60'
                  : 'bg-[#E8E6DE]'
              }`}>
                {step.done
                  ? <CheckCircle size={12} className="text-white" />
                  : step.active
                  ? <Loader2 size={10} className="text-white animate-spin" />
                  : <Clock size={10} className="text-[#B4B2A9]" />
                }
              </div>
              <span className={`text-sm transition-all ${
                step.done
                  ? 'text-[#1C1C1A] font-medium'
                  : step.active
                  ? 'text-[#1C1C1A]'
                  : 'text-[#B4B2A9]'
              }`}>
                {step.label}
              </span>
              {step.active && (
                <span className="text-xs text-[#22C55E] font-medium ml-auto">
                  in progress...
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Failed state ──
  if (job.status === 'failed') return (
    <div className="min-h-screen bg-[#F5F2EA] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-red-200 p-10 max-w-md w-full text-center shadow-sm">
        <XCircle size={40} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#1C1C1A] mb-2">Research failed</h2>
        <p className="text-[#6B6B67] text-sm mb-4">{job.error_message || 'An unexpected error occurred.'}</p>
        <button
          onClick={() => navigate('/home')}
          className="bg-[#22C55E] text-white px-6 py-2.5 rounded-full font-semibold hover:bg-[#16A34A] transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  )

  // ── Completed state ──
  const report = job.report

  return (
    <div className="min-h-screen bg-[#F5F2EA] pb-20">
      <div className="max-w-4xl mx-auto px-6 pt-10">

        {/* Back button */}
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-sm text-[#6B6B67] hover:text-[#1C1C1A] transition-colors mb-8"
        >
          <ArrowLeft size={15} />
          New research
        </button>

        {/* ── Report Header ── */}
        <div className="bg-white rounded-2xl border border-[#E8E6DE] p-8 mb-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-[#22C55E]" />
                <span className="text-xs font-semibold text-[#22C55E] uppercase tracking-widest">
                  Synthesis complete
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#1C1C1A] mb-4 leading-tight">
                {report.query}
              </h1>
              <p className="text-[#6B6B67] leading-relaxed">{report.executive_summary}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#F5F2EA]">
            {[
              { icon: <BookOpen size={14} />, label: 'Papers analyzed', value: report.papers_analyzed },
              { icon: <Globe size={14} />, label: 'Languages', value: report.languages_covered?.join(', ') || 'en' },
              { icon: <AlertTriangle size={14} />, label: 'Contradictions', value: report.contradictions_detected?.length || 0 },
              { icon: <DollarSign size={14} />, label: 'Cost', value: job.total_cost_usd ? `$${job.total_cost_usd.toFixed(4)}` : '—' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#F5F2EA] rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-[#6B6B67] mb-1">
                  {stat.icon}
                  <span className="text-xs">{stat.label}</span>
                </div>
                <p className="font-bold text-[#1C1C1A] text-sm">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Overall confidence */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#6B6B67]">Overall confidence</span>
            </div>
            <ConfidenceBar score={report.overall_confidence} />
          </div>
        </div>

        {/* ── Key Findings ── */}
        {report.key_findings?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#1C1C1A] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#22C55E] rounded-lg flex items-center justify-center">
                <Zap size={12} className="text-white" />
              </span>
              Key Findings
            </h2>
            <div className="space-y-3">
              {report.key_findings.map((finding, i) => (
                <FindingCard key={i} finding={finding} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* ── Contradictions ── */}
        {report.contradictions_detected?.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-amber-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} />
              Contradictions Detected
            </h2>
            <div className="space-y-2">
              {report.contradictions_detected.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-amber-400 font-bold mt-0.5">→</span>
                  <p className="text-sm text-amber-800 leading-relaxed">{c}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}