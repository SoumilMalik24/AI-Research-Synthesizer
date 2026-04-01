import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { researchAPI } from '../api/client'
import { Search, Globe, Zap, FileText, ArrowRight, Loader2 } from 'lucide-react'

export default function Home() {
  const [query, setQuery] = useState('')
  const [maxPapers, setMaxPapers] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setError('')
    setLoading(true)

    try {
      const response = await researchAPI.submitQuery({
        query: query.trim(),
        max_papers: maxPapers
      })
      // Once we get the job_id, navigate to the results page
      // The results page will poll the status until complete
      navigate(`/results/${response.data.job_id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start research. Try again.')
      setLoading(false)
    }
  }

  // Example queries the user can click to auto-fill
  const exampleQueries = [
    "Effects of sleep deprivation on memory consolidation",
    "Climate change impact on ocean biodiversity",
    "Machine learning in early cancer detection",
    "Mindfulness meditation and anxiety reduction",
  ]

  return (
    <div className="min-h-screen bg-[#F5F2EA]">

      {/* ── Hero Section ── */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#E8E6DE] mb-8">
          <Globe size={13} className="text-[#22C55E]" />
          <span className="text-sm font-medium text-[#6B6B67]">
            Synthesizes research across 10+ languages
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-extrabold text-[#1C1C1A] leading-tight mb-4">
          Research smarter,{' '}
          <span className="text-[#22C55E]">not harder</span>
        </h1>
        <p className="text-lg text-[#6B6B67] max-w-xl mx-auto mb-12 leading-relaxed">
          Ask a research question. Our AI agents search thousands of papers
          across languages, detect contradictions, and synthesize findings
          into a structured report.
        </p>

        {/* ── Search Form ── */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-[#E8E6DE] p-3 shadow-sm flex gap-3">
            <div className="flex-1 flex items-center gap-3 px-3">
              <Search size={18} className="text-[#B4B2A9] shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. effects of sleep deprivation on memory..."
                className="flex-1 bg-transparent text-[#1C1C1A] placeholder-[#B4B2A9] focus:outline-none text-base"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shrink-0"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Searching...</>
              ) : (
                <><Zap size={16} /> Synthesize</>
              )}
            </button>
          </div>

          {/* Paper count selector */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <span className="text-sm text-[#6B6B67]">Papers to analyze:</span>
            {[6, 10, 15, 20].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxPapers(n)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  maxPapers === n
                    ? 'bg-[#22C55E] text-white'
                    : 'bg-white border border-[#E8E6DE] text-[#6B6B67] hover:border-[#22C55E]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl max-w-2xl mx-auto">
            {error}
          </div>
        )}

        {/* Example queries */}
        <div className="mt-8">
          <p className="text-xs font-medium text-[#B4B2A9] uppercase tracking-widest mb-3">
            Try an example
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {exampleQueries.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="text-sm bg-white border border-[#E8E6DE] text-[#6B6B67] px-4 py-2 rounded-full hover:border-[#22C55E] hover:text-[#1C1C1A] transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold bg-[#22C55E] text-white px-3 py-1 rounded-full uppercase tracking-widest">
            How it works
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Search size={22} className="text-[#22C55E]" />,
              step: '01',
              title: 'Search across sources',
              desc: 'AI agents query arXiv and Semantic Scholar, pulling papers in 10+ languages simultaneously.'
            },
            {
              icon: <Globe size={22} className="text-[#22C55E]" />,
              step: '02',
              title: 'Translate and embed',
              desc: 'Every paper is translated to English and converted to semantic embeddings for cross-lingual comparison.'
            },
            {
              icon: <FileText size={22} className="text-[#22C55E]" />,
              step: '03',
              title: 'Synthesize and score',
              desc: 'The synthesis agent reads all papers, finds contradictions, and writes a structured report with confidence scores.'
            },
          ].map((item) => (
            <div key={item.step} className="bg-white rounded-2xl border border-[#E8E6DE] p-6 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-[#F0FDF4] rounded-xl flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="text-3xl font-black text-[#E8E6DE]">{item.step}</span>
              </div>
              <h3 className="font-bold text-[#1C1C1A] mb-2">{item.title}</h3>
              <p className="text-sm text-[#6B6B67] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}