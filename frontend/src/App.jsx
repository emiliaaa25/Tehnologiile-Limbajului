import React, { useState, useEffect } from 'react'

const API_URL = 'http://localhost:8000'

// ── Mapări sentiment → clase CSS existente în styles.css ────────────────────────
const sentimentMeta = {
  Positive: { label: 'Pozitiv', className: 'is-positive', ro: 'pozitiv' },
  Negative: { label: 'Negativ', className: 'is-negative', ro: 'negativ' },
  Neutral:  { label: 'Neutru',  className: 'is-neutral',  ro: 'neutru'  },
  Mixed:    { label: 'Mixt',    className: 'is-neutral',  ro: 'neutru'  },
}

const sampleReviews = [
  'Antrenorii sunt foarte implicați, echipamentele sunt noi, iar atmosfera este caldă și motivantă.',
  'Sala este curată, dar este extrem de aglomerată seara și nu găsești niciun aparat liber.',
  'Prețul abonamentului e OK, programul e flexibil, dar vestiarele lasă de dorit.',
]

export default function App() {
  const [text, setText] = useState(sampleReviews[0])
  const [result, setResult] = useState(null)
  const [aspectsStats, setAspectsStats] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusMsg, setStatusMsg] = useState('Introdu o recenzie și apasă Analizează.')

  // Încarcă statisticile reale din corpus la pornire
  useEffect(() => {
    fetch(`${API_URL}/aspects`)
      .then(r => r.json())
      .then(data => setAspectsStats(data.aspects || []))
      .catch(() => {
        // serverul nu e pornit încă — nu crapa, statisticile rămân goale
      })
  }, [])

  async function analyze() {
    if (loading || !text.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setStatusMsg('Se analizează...')

    try {
      const resp = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.detail || 'Eroare server')
      }
      const data = await resp.json()
      setResult(data)
      setStatusMsg(`Analiză finalizată — ${data.aspects_found} aspect${data.aspects_found !== 1 ? 'e' : ''} detectat${data.aspects_found !== 1 ? 'e' : ''}.`)
    } catch (e) {
      const msg = e.message || 'Nu s-a putut conecta la API. Asigură-te că serverul rulează pe portul 8000.'
      setError(msg)
      setStatusMsg('Analiza nu a reușit.')
    } finally {
      setLoading(false)
    }
  }

  // ── Date derivate ────────────────────────────────────────────────────────────
  const overallMeta = result
    ? (sentimentMeta[result.overall_sentiment] || sentimentMeta.Neutral)
    : null

  const sentimentCounts = result
    ? {
        Positive: result.aspects.filter(a => a.sentiment === 'Positive').length,
        Negative: result.aspects.filter(a => a.sentiment === 'Negative').length,
        Neutral:  result.aspects.filter(a => a.sentiment === 'Neutral').length,
      }
    : { Positive: 0, Negative: 0, Neutral: 0 }

  const maxTotal = aspectsStats.length
    ? Math.max(...aspectsStats.map(a => a.stats.total))
    : 1

  const statusTone = loading ? 'loading' : error ? 'error' : result ? 'success' : 'idle'

  return (
    <div className="page-shell">
      <div className="bg-orb bg-orb-one" aria-hidden="true" />
      <div className="bg-orb bg-orb-two" aria-hidden="true" />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="hero card">
        <div className="hero-copy">
          <p className="eyebrow">Recenzie Radar</p>
          <h1>Analizează recenzii pentru sălile de fitness</h1>
          <p className="subtitle">
            Introdu o recenzie și obții instant aspectele detectate cu sentimentul fiecăruia —
            antrenori, echipamente, atmosferă și altele. Powered by LLaMA 3.3 70B via Groq.
          </p>
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
            <p className={`hero-status${statusTone === 'error' ? ' is-error' : statusTone === 'success' ? ' is-success' : statusTone === 'loading' ? ' is-loading' : ''}`}>
              {statusMsg}
            </p>
          </div>
        </div>
      </header>

      {/* ── DASHBOARD ──────────────────────────────────────────────────────── */}
      <section className="dashboard-grid">

        {/* INPUT */}
        <article className="card panel input-panel">
          <div className="section-head">
            <div>
              <p className="section-label">Intrare</p>
              <h2>Scrie o recenzie</h2>
            </div>
            <span className="hint">{text.length} / 2000 caractere</span>
          </div>

          <label className="sr-only" htmlFor="reviewInput">Scrie o recenzie pentru sală</label>
          <textarea
            id="reviewInput"
            rows={8}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Ex.: Antrenorul este implicat, echipamentele sunt moderne, atmosfera e motivantă."
            maxLength={2000}
          />

          <div className="sample-row" aria-label="Exemple rapide">
            {sampleReviews.map((sample, i) => (
              <button key={i} type="button" className="sample-pill" onClick={() => setText(sample)}>
                Exemplu {i + 1}
              </button>
            ))}
          </div>

          <div className="actions">
            <button onClick={analyze} disabled={loading || !text.trim()} aria-busy={loading}>
              {loading ? 'Se analizează...' : 'Analizează'}
            </button>
            {loading && <p className="analysis-note">Modelul procesează recenzia...</p>}
          </div>
        </article>

        {/* REZULTAT */}
        <article
          className={`card panel result-panel is-${overallMeta ? overallMeta.ro : 'neutru'}`}
          aria-live="polite"
          aria-busy={loading}
        >
          <div className="section-head">
            <div>
              <p className="section-label">Rezultat</p>
              <h2>Sentiment general</h2>
            </div>
            {overallMeta && (
              <span className={`tone-chip ${overallMeta.className}`}>{overallMeta.label}</span>
            )}
          </div>

          {/* Cerc cu numărul de aspecte găsite */}
          <div className={`score-ring is-${overallMeta ? overallMeta.ro : 'neutru'}`} aria-label="Aspecte găsite">
            <div>
              <span id="scoreValue">{result ? result.aspects_found : '--'}</span>
              <small>{result ? 'aspecte' : 'scor'}</small>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="status-message is-loading">
              <span className="loading-spinner" aria-hidden="true" />
              <span>Se analizează...</span>
            </div>
          )}

          {/* Eroare */}
          {error && !loading && (
            <div className="status-message is-error">
              <span>⚠ {error}</span>
            </div>
          )}

          {/* Rezultate reale */}
          {result && !loading && (
            <>
              <div className="result-copy">
                <p className="result-title">
                  {result.dominant_aspect
                    ? `Aspect dominant: ${result.dominant_aspect}`
                    : 'Analiză completă'}
                </p>
                <p className="result-description">
                  {result.aspects_found} aspect{result.aspects_found !== 1 ? 'e' : ''} detectat{result.aspects_found !== 1 ? 'e' : ''} în recenzie.
                </p>
              </div>

              <div className="summary-grid">
                {[
                  ['Positive', 'Pozitiv'],
                  ['Negative', 'Negativ'],
                  ['Neutral',  'Neutru'],
                ].map(([key, label]) => (
                  <div key={key} className={`summary-card ${sentimentMeta[key].className}`}>
                    <strong>{sentimentCounts[key]}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <div>
                <p className="mini-label">Sentiment pe aspecte</p>
                <div className="aspect-list">
                  {result.aspects.length ? result.aspects.map(a => {
                    const m = sentimentMeta[a.sentiment] || sentimentMeta.Neutral
                    return (
                      <article key={a.aspect} className="aspect-card">
                        <div className="aspect-card-head">
                          <strong>{a.label}</strong>
                          <span className={`tone-chip ${m.className}`}>{m.label}</span>
                        </div>
                        {a.evidence && (
                          <p>"{a.evidence}"</p>
                        )}
                      </article>
                    )
                  }) : (
                    <article className="aspect-card aspect-empty">
                      <strong>Niciun aspect detectat</strong>
                      <p>Recenzia nu conține aspecte clare din cele 7 categorii.</p>
                    </article>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Stare inițială */}
          {!result && !loading && !error && (
            <div className="result-copy">
              <p className="result-title">Așteptând analiza</p>
              <p className="result-description">
                Introdu o recenzie și apasă Analizează pentru a vedea aspectele detectate și sentimentul lor.
              </p>
            </div>
          )}
        </article>
      </section>

      {/* ── STATISTICI CORPUS REAL ──────────────────────────────────────────── */}
      <section className="card panel stats-panel">
        <div className="section-head">
          <div>
            <p className="section-label">Corpus — 1000 recenzii Iași</p>
            <h2>Statistici din dataset</h2>
          </div>
          <span className="hint">Date reale</span>
        </div>

        {aspectsStats.length > 0 ? (
          <div className="stats-layout">
            <div>
              <p className="stats-copy">
                Distribuția mențiunilor per aspect din cele 1000 de recenzii procesate.
                Înălțimea barei reprezintă numărul total de mențiuni, culoarea arată procentul pozitiv.
              </p>
              <div className="stats-meta">
                {aspectsStats.map(a => (
                  <div key={a.id} className="meta-row">
                    <strong>{a.label}</strong>
                    <span style={{ color: a.stats.pos_pct >= 70 ? 'var(--positive-text)' : a.stats.neg_pct >= 30 ? 'var(--negative-text)' : 'var(--muted)' }}>
                      {a.stats.pos_pct}% pozitiv · {a.stats.total} mențiuni
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart" aria-label="Grafic statistici corpus">
              {aspectsStats.map(a => {
                const barValue = Math.round((a.stats.total / maxTotal) * 100)
                return (
                  <div className="bar-card" key={a.id}>
                    <div
                      className="bar-track"
                      style={{ '--value': barValue }}
                      data-value={a.stats.total}
                    />
                    <div className="bar-label">
                      <strong>{a.label}</strong>
                      <span>{a.stats.pos_pct}% poz.</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.7 }}>
            Pornește serverul backend (<code>python -m uvicorn main:app --reload</code> din folderul <code>backend/</code>)
            pentru a vedea statisticile reale din corpus.
          </p>
        )}
      </section>
    </div>
  )
}