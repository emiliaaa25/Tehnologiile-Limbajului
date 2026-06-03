import React, { useState } from 'react'

const MOCK_LATENCY_MS = 850
const MOCK_TIMEOUT_MS = 2500

const mockStats = [
  { aspect: 'Trainer', value: 90, note: 'Calitatea îndrumării' },
  { aspect: 'Atmosferă', value: 83, note: 'Experiența din sală' },
  { aspect: 'Echipamente', value: 88, note: 'Aparate și dotări' },
  { aspect: 'Energie', value: 85, note: 'Nivel de energie' },
  { aspect: 'Ghidare', value: 79, note: 'Direcție și suport' },
  { aspect: 'Comunitate', value: 76, note: 'Atmosferă socială' },
]

const aspectDefinitions = [
  {
    key: 'trainer',
    label: 'Trainer',
    tokens: ['trainer', 'antrenor', 'coach', 'instruc'],
    positive: ['implicat', 'clar', 'răbdător', 'profesionist', 'ajută', 'motivant'],
    negative: ['absent', 'nepoliticos', 'dezinteresat', 'confuz', 'slab'],
  },
  {
    key: 'atmosphere',
    label: 'Atmosferă',
    tokens: ['atmosfer', 'ambient', 'vibe', 'ambiant'],
    positive: ['prietenoasă', 'caldă', 'plăcută', 'relaxată', 'motivantă'],
    negative: ['rece', 'tensionată', 'agitată', 'obosită', 'neplăcută'],
  },
  {
    key: 'equipment',
    label: 'Echipamente',
    tokens: ['echipament', 'aparat', 'ganter', 'halter', 'benzi'],
    positive: ['noi', 'curate', 'moderne', 'variate', 'complete'],
    negative: ['vechi', 'stricate', 'lipse', 'defecte', 'insuficiente'],
  },
  {
    key: 'energy',
    label: 'Energie',
    tokens: ['energie', 'energic', 'motivant', 'intens', 'vital'],
    positive: ['energică', 'dinamică', 'motivantă', 'activă', 'bună'],
    negative: ['lipsă', 'obosită', 'scăzută', 'anemică', 'leneșă'],
  },
  {
    key: 'guidance',
    label: 'Ghidare',
    tokens: ['ghidare', 'îndrumare', 'indrumare', 'suport'],
    positive: ['clară', 'utilă', 'structurată', 'sigură', 'bună'],
    negative: ['neclară', 'slabă', 'confuză', 'haotică', 'lipsește'],
  },
  {
    key: 'community',
    label: 'Comunitate',
    tokens: ['comunitate', 'colegi', 'grup', 'social', 'oameni'],
    positive: ['deschisă', 'prietenos', 'solidară', 'caldă', 'activă'],
    negative: ['rece', 'izolată', 'tensionată', 'distantă', 'închisă'],
  },
]

const sentimentMeta = {
  pozitiv: {
    label: 'Pozitiv',
    className: 'is-positive',
    summary: 'Textul transmite o experiență bună și un ton favorabil.',
  },
  negativ: {
    label: 'Negativ',
    className: 'is-negative',
    summary: 'Textul sugerează probleme, frustrare sau neclaritate.',
  },
  neutru: {
    label: 'Neutru',
    className: 'is-neutral',
    summary: 'Textul este echilibrat sau nu oferă destule indicii clare.',
  },
}

const sampleReviews = [
  'Antrenorii sunt foarte implicați, echipamentele sunt noi, iar atmosfera este caldă și motivantă.',
  'Sala este curată, dar uneori trainerii răspund greu și comunitatea pare mai degrabă rece.',
  'Este o sală decentă, fără probleme majore, cu o experiență echilibrată pentru majoritatea oamenilor.',
]

const genericPositive = ['rapid', 'excelent', 'util', 'clar', 'bun', 'super', 'ușor', 'prietenos', 'solid', 'plăcut']
const genericNegative = ['prost', 'lent', 'confuz', 'greu', 'slab', 'problemă', 'eroare', 'defect', 'neclar', 'rece']

function countMatches(text, tokens) {
  return tokens.reduce((count, token) => count + (text.includes(token) ? 1 : 0), 0)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function toneFromScore(score) {
  if (score >= 72) return 'pozitiv'
  if (score <= 48) return 'negativ'
  return 'neutru'
}

function classifyAspect(normalized, aspect) {
  const mentionHits = countMatches(normalized, aspect.tokens)
  const positiveHits = countMatches(normalized, [...genericPositive, ...aspect.positive])
  const negativeHits = countMatches(normalized, [...genericNegative, ...aspect.negative])

  let sentiment = 'neutru'
  let summary = 'Nu apar suficiente indicii pentru o concluzie clară.'

  if (mentionHits > 0 && positiveHits > negativeHits) {
    sentiment = 'pozitiv'
    summary = `Aspectul ${aspect.label.toLowerCase()} este descris favorabil.`
  } else if (mentionHits > 0 && negativeHits > positiveHits) {
    sentiment = 'negativ'
    summary = `Aspectul ${aspect.label.toLowerCase()} este descris cu semne de risc.`
  } else if (mentionHits > 0) {
    summary = `Aspectul ${aspect.label.toLowerCase()} este menționat, dar tonul rămâne echilibrat.`
  }

  return {
    label: aspect.label,
    sentiment,
    summary,
  }
}

function buildScore(text) {
  const normalized = text.toLowerCase()
  const positiveHits = countMatches(normalized, genericPositive)
  const negativeHits = countMatches(normalized, genericNegative)
  const aspectDetails = aspectDefinitions.map((aspect) => classifyAspect(normalized, aspect))
  const positiveAspects = aspectDetails.filter((item) => item.sentiment === 'pozitiv').length
  const negativeAspects = aspectDetails.filter((item) => item.sentiment === 'negativ').length
  const neutralAspects = aspectDetails.length - positiveAspects - negativeAspects

  let score = 64 + positiveHits * 8 + positiveAspects * 6 + neutralAspects * 2 - negativeHits * 9 - negativeAspects * 7
  if (normalized.length > 220) score += 4
  if (/[!?]/.test(text)) score += 2
  score = clamp(Math.round(score), 0, 100)

  const overallTone = toneFromScore(score)
  const title = score >= 80 ? 'Recenzie foarte bună' : score >= 60 ? 'Recenzie echilibrată' : 'Recenzie de investigat'
  const description =
    score >= 80
      ? 'Textul transmite feedback pozitiv și are suficiente indicii de claritate și utilitate.'
      : score >= 60
      ? 'Textul este mixt sau neutru. Se văd câteva puncte bune, dar și zone de rafinat.'
      : 'Textul indică probleme sau ambiguități și merită o revizuire suplimentară.'

  return {
    score,
    overallTone,
    title,
    description,
    aspectDetails,
    sentimentSummary: {
      pozitiv: positiveAspects,
      negativ: negativeAspects,
      neutru: neutralAspects,
    },
  }
}

function createMockAnalysis(text) {
  const normalized = text.toLowerCase()
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (/eroare api|fail api|api error|crash/.test(normalized)) {
        reject(new Error('API-ul mock a returnat o eroare.'))
        return
      }
      resolve(buildScore(text))
    }, MOCK_LATENCY_MS)
  })
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error('API-ul nu a răspuns în timp util. Te rugăm să încerci din nou.')), timeoutMs)
    promise.then(
      (v) => {
        window.clearTimeout(id)
        resolve(v)
      },
      (err) => {
        window.clearTimeout(id)
        reject(err)
      },
    )
  })
}

export default function App() {
  const [text, setText] = useState(sampleReviews[0])
  const [score, setScore] = useState(null)
  const [overallTone, setOverallTone] = useState('neutru')
  const [title, setTitle] = useState('Așteptând analiza')
  const [description, setDescription] = useState('Rezultatul va afișa principalele aspecte detectate din recenzia sălii și o evaluare sintetică.')
  const [aspectDetails, setAspectDetails] = useState([])
  const [sentimentSummary, setSentimentSummary] = useState({ pozitiv: 0, negativ: 0, neutru: 0 })
  const [status, setStatus] = useState({ kind: 'idle', message: 'Introdu o recenzie și apasă Analizează.' })
  const [analysisNote, setAnalysisNote] = useState('Introduceți o recenzie de sală ca să obțineți scor și tag-uri.')
  const [loading, setLoading] = useState(false)

  async function analyze() {
    if (loading) return
    const t = text.trim()
    if (!t) {
      setScore(null)
      setOverallTone('neutru')
      setTitle('Așteptând analiza')
      setDescription('Introduceți o recenzie de sală ca să obțineți scor și aspecte analizate.')
      setAspectDetails([])
      setSentimentSummary({ pozitiv: 0, negativ: 0, neutru: 0 })
      setAnalysisNote('Scrieți o recenzie și apăsați Analizează.')
      setStatus({ kind: 'idle', message: 'Introdu o recenzie și apasă Analizează.' })
      return
    }

    setLoading(true)
    setStatus({ kind: 'loading', message: 'Se analizează...' })
    setAnalysisNote('Se analizează...')
    setTitle('Analiză în curs')
    setDescription('Mock API-ul procesează textul și pregătește rezultatul.')
    setOverallTone('neutru')
    setAspectDetails([])

    try {
      const outcome = await withTimeout(createMockAnalysis(t), MOCK_TIMEOUT_MS)
      setScore(outcome.score)
      setOverallTone(outcome.overallTone)
      setTitle(outcome.title)
      setDescription(outcome.description)
      setAspectDetails(outcome.aspectDetails)
      setSentimentSummary(outcome.sentimentSummary)
      setStatus({ kind: 'success', message: `Analiză finalizată pentru ${t.length} caractere.` })
      setAnalysisNote(`Analiză rulată pentru ${t.length} caractere.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Eroare la analiză.'
      setScore(null)
      setOverallTone('negativ')
      setTitle('Analiza nu a reușit')
      setDescription(msg)
      setAspectDetails([])
      setSentimentSummary({ pozitiv: 0, negativ: 0, neutru: 0 })
      setStatus({ kind: 'error', message: msg })
      setAnalysisNote('Reîncercați analiza după ce API-ul revine.')
    } finally {
      setLoading(false)
    }
  }

  const maxValue = Math.max(...mockStats.map((s) => s.value), 100)
  const statusTone = loading ? 'loading' : status.kind === 'error' ? 'error' : status.kind === 'success' ? 'success' : 'idle'

  return (
    <div className="page-shell">
      <div className="bg-orb bg-orb-one" aria-hidden="true" />
      <div className="bg-orb bg-orb-two" aria-hidden="true" />

      <header className="hero card">
        <div className="hero-copy">
          <p className="eyebrow">Recenzie Radar</p>
          <h1>Analizează recenzii pentru sălile de fitness</h1>
          <p className="subtitle">Interfață completă, bazată pe date mock: scor general, sentimente pe fiecare aspect și feedback vizual clar pentru pozitiv, negativ și neutru.</p>
        </div>

        <div className="hero-aside">
          <div className="legend-card card-soft">
            <span className="legend-title">Culori sentimente</span>
            <div className="legend-list">
              <span className="tone-chip is-positive">Pozitiv</span>
              <span className="tone-chip is-negative">Negativ</span>
              <span className="tone-chip is-neutral">Neutru</span>
            </div>
          </div>
          <div className="legend-card card-soft">
            <span className="legend-title">Stare curentă</span>
            <p className={`hero-status ${statusTone === 'error' ? 'is-error' : statusTone === 'success' ? 'is-success' : statusTone === 'loading' ? 'is-loading' : ''}`}>
              {loading ? 'Se analizează...' : status.message}
            </p>
          </div>
        </div>
      </header>

      <section className="dashboard-grid">
        <article className="card panel input-panel">
          <div className="section-head">
            <div>
              <p className="section-label">Intrare mock</p>
              <h2>Scrie o recenzie</h2>
            </div>
            <span className="hint">Mock async</span>
          </div>

          <label className="sr-only" htmlFor="reviewInput">Scrie o recenzie pentru sală</label>
          <textarea id="reviewInput" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: Antrenorul este implicat, echipamentele sunt moderne, atmosfera e motivantă." />

          <div className="sample-row" aria-label="Exemple rapide">
            {sampleReviews.map((sample, index) => (
              <button key={index} type="button" className="sample-pill" onClick={() => setText(sample)}>
                Exemplu {index + 1}
              </button>
            ))}
          </div>

          <div className="actions">
            <button onClick={analyze} disabled={loading} aria-busy={loading}>{loading ? 'Se analizează...' : 'Analizează'}</button>
            <p className="analysis-note">{analysisNote}</p>
          </div>
        </article>

        <article className={`card panel result-panel is-${overallTone}`} aria-live="polite" aria-busy={loading}>
          <div className="section-head">
            <div>
              <p className="section-label">Rezultat</p>
              <h2>Sentiment general</h2>
            </div>
            <span className={`tone-chip ${sentimentMeta[overallTone].className}`}>{sentimentMeta[overallTone].label}</span>
          </div>

          <div className={`score-ring is-${overallTone}`} aria-label="Scor general">
            <div>
              <span id="scoreValue">{score ?? '--'}</span>
              <small>Scor general</small>
            </div>
          </div>

          <div className={`status-message is-${statusTone}`}>
            {loading ? (
              <>
                <span className="loading-spinner" aria-hidden="true" />
                <span>Se analizează...</span>
              </>
            ) : (
              <span>{status.message}</span>
            )}
          </div>

          <div className="result-copy">
            <p className="result-title">{title}</p>
            <p className="result-description">{description}</p>
          </div>

          <div className="summary-grid">
            {Object.entries(sentimentSummary).map(([tone, count]) => (
              <div key={tone} className={`summary-card ${sentimentMeta[tone].className}`}>
                <strong>{count}</strong>
                <span>{sentimentMeta[tone].label}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="mini-label">Sentiment pe aspecte</p>
            <div className="aspect-list">
              {aspectDetails.length ? aspectDetails.map((item) => (
                <article key={item.label} className="aspect-card">
                  <div className="aspect-card-head">
                    <strong>{item.label}</strong>
                    <span className={`tone-chip ${sentimentMeta[item.sentiment].className}`}>{sentimentMeta[item.sentiment].label}</span>
                  </div>
                  <p>{item.summary}</p>
                </article>
              )) : (
                <article className="aspect-card aspect-empty">
                  <strong>Fără analiză încă</strong>
                  <p>{loading ? 'Așteaptă finalizarea analizei mock.' : 'Apasă Analizează pentru a vedea sentimentele pe fiecare aspect.'}</p>
                </article>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="card panel stats-panel">
        <div className="section-head">
          <div>
            <p className="section-label">Mock dataset</p>
            <h2>Statistici din dataset</h2>
          </div>
          <span className="hint">Bar chart</span>
        </div>

        <div className="stats-layout">
          <div>
            <p className="stats-copy">Bar chart simplu generat din date mock. Secțiunea arată distribuția aspectelor și completează analiza vizuală fără să depindă de un API real.</p>
            <div className="stats-meta">
              {mockStats.map((s, idx) => (
                <div key={idx} className="meta-row">
                  <strong>{s.aspect}</strong>
                  <span>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart" aria-label="Grafic cu statistici">
            {mockStats.map((item, idx) => (
              <div className="bar-card" key={idx}>
                <div className="bar-track" style={{ ['--value']: Math.round((item.value / maxValue) * 100) }} data-value={item.value}></div>
                <div className="bar-label"><strong>{item.aspect}</strong><span>{item.note}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
