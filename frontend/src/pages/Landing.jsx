import { useNavigate } from 'react-router-dom'
import { Globe, Zap, FileText, ArrowRight, CheckCircle, FlaskConical } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F5F2EA]">

      {/* ── Hero ── */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">

        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#E8E6DE] mb-8">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          <span className="text-sm font-medium text-[#6B6B67]">
            AI-powered cross-lingual research synthesis
          </span>
        </div>

        <h1 className="text-6xl md:text-7xl font-black text-[#1C1C1A] leading-[1.05] mb-6 tracking-tight">
          Research across
          <br />
          <span className="text-[#22C55E]">every language.</span>
        </h1>

        <p className="text-xl text-[#6B6B67] max-w-2xl mx-auto mb-10 leading-relaxed">
          Ask a research question. Our AI agents search thousands of papers
          in 10+ languages, detect contradictions between studies, and
          deliver a structured synthesis report in seconds.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={() => navigate('/signup')}
            className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold px-8 py-4 rounded-full transition-all text-base"
          >
            Start for free
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 bg-white border border-[#E8E6DE] text-[#1C1C1A] font-semibold px-8 py-4 rounded-full hover:border-[#22C55E] transition-all text-base"
          >
            Sign in
          </button>
        </div>
      </div>

      {/* ── Fake search preview ── */}
      <div className="max-w-2xl mx-auto px-6 pb-20">
        <div className="bg-white rounded-2xl border border-[#E8E6DE] p-4 shadow-sm">
          <div className="flex items-center gap-3 px-3 py-2 bg-[#F5F2EA] rounded-xl mb-3">
            <div className="w-4 h-4 rounded-full bg-[#E8E6DE]" />
            <span className="text-sm text-[#B4B2A9] flex-1">
              effects of sleep deprivation on memory...
            </span>
            <div className="bg-[#22C55E] text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
              Synthesize
            </div>
          </div>
          {/* Fake result preview */}
          <div className="space-y-2 px-1">
            {[
              { label: 'Executive summary', width: 'w-full', color: 'bg-[#F5F2EA]', h: 'h-3' },
              { label: '', width: 'w-4/5', color: 'bg-[#F5F2EA]', h: 'h-3' },
              { label: '', width: 'w-3/5', color: 'bg-[#F5F2EA]', h: 'h-3' },
            ].map((bar, i) => (
              <div key={i} className={`${bar.h} ${bar.width} ${bar.color} rounded-full`} />
            ))}
            <div className="flex gap-2 mt-3">
              {['Finding 01', 'Finding 02', 'Finding 03'].map((f) => (
                <div key={f} className="flex-1 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3">
                  <div className="h-2 w-16 bg-[#BBF7D0] rounded-full mb-2" />
                  <div className="h-2 w-full bg-[#DCFCE7] rounded-full mb-1" />
                  <div className="h-2 w-3/4 bg-[#DCFCE7] rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="bg-white border-t border-b border-[#E8E6DE] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold bg-[#22C55E] text-white px-3 py-1.5 rounded-full uppercase tracking-widest">
              How it works
            </span>
            <h2 className="text-3xl font-extrabold text-[#1C1C1A] mt-4">
              From question to insight in seconds
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Globe size={22} className="text-[#22C55E]" />,
                step: '01',
                title: 'Search globally',
                desc: 'AI agents query arXiv and Semantic Scholar, pulling papers in English, Chinese, Spanish, Arabic and more.'
              },
              {
                icon: <Zap size={22} className="text-[#22C55E]" />,
                step: '02',
                title: 'Translate and embed',
                desc: 'Every paper is translated and converted to semantic embeddings for true cross-lingual comparison.'
              },
              {
                icon: <FileText size={22} className="text-[#22C55E]" />,
                step: '03',
                title: 'Synthesize and score',
                desc: 'The synthesis agent detects contradictions, scores confidence, and writes a structured report.'
              },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-[#E8E6DE] p-6 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-[#F0FDF4] rounded-xl flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-4xl font-black text-[#F5F2EA]">{item.step}</span>
                </div>
                <h3 className="font-bold text-[#1C1C1A] mb-2 text-lg">{item.title}</h3>
                <p className="text-sm text-[#6B6B67] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features list ── */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] px-3 py-1.5 rounded-full">
              Built for researchers
            </span>
            <h2 className="text-3xl font-extrabold text-[#1C1C1A] mt-4 mb-6 leading-tight">
              Everything you need to synthesize research faster
            </h2>
            <div className="space-y-4">
              {[
                'Cross-lingual search across 10+ languages',
                'Contradiction detection between studies',
                'Confidence scoring per finding',
                'Full cost and token tracking',
                'Research history and saved reports',
                'Admin dashboard for team management',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-[#22C55E] shrink-0" />
                  <span className="text-[#6B6B67] text-sm">{feature}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/signup')}
              className="mt-8 flex items-center gap-2 bg-[#1C1C1A] hover:bg-[#22C55E] text-white font-semibold px-6 py-3 rounded-full transition-all"
            >
              Get started free
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Stats side */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '10+', label: 'Languages supported' },
              { value: '<60s', label: 'Average synthesis time' },
              { value: '$0.08', label: 'Avg cost per report' },
              { value: '99%', label: 'Uptime guarantee' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-[#E8E6DE] p-6 text-center hover:shadow-md transition-all">
                <p className="text-4xl font-black text-[#1C1C1A] mb-1">{stat.value}</p>
                <p className="text-xs text-[#6B6B67] font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E8E6DE] py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#22C55E] rounded-md flex items-center justify-center">
              <FlaskConical size={12} className="text-white" />
            </div>
            <span className="font-bold text-[#1C1C1A] text-sm">ResearchSynth</span>
          </div>
          <p className="text-xs text-[#B4B2A9]">
            Built with FastAPI, React, LangSmith, and Pinecone
          </p>
        </div>
      </footer>
    </div>
  )
}