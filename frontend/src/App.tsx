import { useRef, useState } from 'react'
import './App.css'

interface CinResult {
  nom: string | null
  prenom: string | null
  date_naissance: string | null
  numero_cin: string | null
  date_fin_validite: string | null
  warnings?: { field: string; message: string }[]
}

interface HistoryEntry {
  id: string
  fileName: string
  time: string
  result: CinResult
  isRejected: boolean
}

const FIELD_LABELS: { key: keyof Omit<CinResult, 'warnings'>; label: string }[] = [
  { key: 'nom', label: 'Nom' },
  { key: 'prenom', label: 'Prénom' },
  { key: 'date_naissance', label: 'Date de naissance' },
  { key: 'numero_cin', label: 'Numéro de CIN' },
  { key: 'date_fin_validite', label: 'Date d\'expiration' },
]

function formatFileMeta(file: File): string {
  const sizeKb = file.size / 1024
  const sizeLabel = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} Mo` : `${sizeKb.toFixed(0)} Ko`
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${file.name}  •  ${sizeLabel}  •  déposé à ${time}`
}

function renderHighlightedJson(jsonString: string) {
  const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = tokenRegex.exec(jsonString)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span className="json-punct" key={key++}>
          {jsonString.slice(lastIndex, match.index)}
        </span>
      )
    }

    const token = match[0]
    let className = 'json-number'
    if (/^"/.test(token)) {
      className = /:\s*$/.test(token) ? 'json-key' : 'json-string'
    } else if (/true|false/.test(token)) {
      className = 'json-bool'
    } else if (/null/.test(token)) {
      className = 'json-null'
    }

    nodes.push(
      <span className={className} key={key++}>
        {token}
      </span>
    )
    lastIndex = tokenRegex.lastIndex
  }

  if (lastIndex < jsonString.length) {
    nodes.push(
      <span className="json-punct" key={key++}>
        {jsonString.slice(lastIndex)}
      </span>
    )
  }

  return nodes
}

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [view, setView] = useState<'analyze' | 'history'>('analyze')

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CinResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [analyzedCount, setAnalyzedCount] = useState(0)
  const [rejectedCount, setRejectedCount] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)

  const loadFile = (file: File) => {
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setResult(null)
    setErrorMessage(null)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) loadFile(file)
  }

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) loadFile(file)
  }

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return

    setIsLoading(true)
    setResult(null)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedFile)

      const response = await fetch('http://localhost:3001/analyze', {
        method: 'POST',
        body: formData,
      })

      const data: CinResult = await response.json()

      if (!response.ok) {
        setErrorMessage((data as unknown as { error?: string }).error ?? 'Une erreur est survenue.')
      } else {
        setResult(data)

        const isRejected = FIELD_LABELS.every((f) => data[f.key] === null)

        setAnalyzedCount((n) => n + 1)
        if (isRejected) setRejectedCount((n) => n + 1)

        setHistory((h) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            fileName: selectedFile.name,
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            result: data,
            isRejected,
          },
          ...h,
        ])
      }
    } catch {
      setErrorMessage('Impossible de contacter le serveur.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadJson = (data: CinResult | null, filenameHint?: string) => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filenameHint ? `resultat-${filenameHint}.json` : 'resultat-cin.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyJson = async () => {
    if (!result) return
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setResult(null)
    setErrorMessage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleNewDocument = () => {
    handleReset()
    fileInputRef.current?.click()
  }

  const isDone = Boolean(result) || Boolean(errorMessage)

    return (
    <div className="app-root">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="topbar-mark">◈</span>
          <div>
            <div className="topbar-name">LECTEUR CIN</div>
            <div className="topbar-subtitle">Poste de vérification documentaire</div>
          </div>
        </div>
      </header>

      <div className="shell">
        <aside className="sidebar">
                <nav className="sidebar-nav">
          <button
            type="button"
            className={view === 'analyze' ? 'sidebar-link sidebar-link-active' : 'sidebar-link'}
            onClick={() => setView('analyze')}
          >
            Accueil
          </button>
          <button
            type="button"
            className={view === 'history' ? 'sidebar-link sidebar-link-active' : 'sidebar-link'}
            onClick={() => setView('history')}
          >
            Historique ({history.length})
          </button>
        </nav>

               </aside>

        <div className="main-area">
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-card-label">Analysées</span>
            <span className="stat-card-value">{analyzedCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Rejetées</span>
            <span className="stat-card-value">{rejectedCount}</span>
          </div>
        </div>

        {view === 'analyze' ? (
          <main className="console">
            <section className="panel capture-panel">
              <div className="panel-header-row">
                <span className="panel-label">Document déposé</span>
              </div>

              <label
                className="viewfinder"
                data-has-image={Boolean(previewUrl)}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <span className="corner corner-tl" />
                <span className="corner corner-tr" />
                <span className="corner corner-bl" />
                <span className="corner corner-br" />

                {previewUrl ? (
                  <img src={previewUrl} alt="Aperçu du document déposé" />
                ) : (
                  <span className="viewfinder-placeholder">
                    Glisser-déposer une image, ou cliquer pour choisir un fichier
                  </span>
                )}

                {isLoading && <span className="scan-line" />}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="visually-hidden-input"
                />
              </label>

              {selectedFile && (
                <p className="file-meta">{formatFileMeta(selectedFile)}</p>
              )}

              {selectedFile && !isDone && (
                <button
                  type="button"
                  className="analyze-btn"
                  onClick={handleAnalyze}
                  disabled={isLoading}
                >
                  {isLoading ? 'Lecture en cours…' : 'Analyser le document'}
                </button>
              )}

              {isDone && (
                <div className="post-analysis-actions">
                  <button type="button" className="secondary-btn" onClick={handleReset}>
                    Effacer
                  </button>
                  <button type="button" className="analyze-btn" onClick={handleNewDocument}>
                    Analyser un nouveau document
                  </button>
                </div>
              )}
            </section>

            <section className="panel result-panel">
              <div className="panel-header-row">
                <span className="panel-label">Champs extraits</span>
              </div>

              {!result && !errorMessage && !isLoading && (
                <p className="empty-state">
                  Les champs lus apparaîtront ici une fois l'analyse lancée.
                </p>
              )}

              {isLoading && (
                <div className="skeleton-list">
                  {FIELD_LABELS.map(({ key }) => (
                    <div className="field-card skeleton-card" key={key} />
                  ))}
                </div>
              )}

              {errorMessage && (
                <div className="alert-box">
                  <span className="alert-label">Échec de la lecture</span>
                  <p>{errorMessage}</p>
                </div>
              )}

              {result && (
                <div className="field-card-list">
                  {FIELD_LABELS.map(({ key, label }) => {
                    const value = result[key]
                    const isRead = value !== null
                    const warning = result.warnings?.find((w) => w.field === key)
                    return (
                      <div className="field-card" key={key} data-read={isRead}>
                        <div className="field-card-top">
                          <span className="field-card-label">{label}</span>
                          <span className={isRead ? 'read-badge read-ok' : 'read-badge read-no'}>
                            {isRead ? 'Vérifié' : 'Non lisible'}
                          </span>
                        </div>
                        <div className="field-card-value-box" data-empty={!isRead}>
                          <span className="field-card-icon">{isRead ? '✓' : '✕'}</span>
                          <span>{isRead ? value : 'Non lisible'}</span>
                        </div>
                        {warning && <div className="field-warning">{warning.message}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {result && (
              <section className="panel json-panel">
                <div className="panel-header-row">
                  <span className="panel-label">Sortie JSON</span>
                  <div className="json-actions">
                    <button type="button" className="download-btn" onClick={handleCopyJson}>
                      {copied ? 'Copié' : 'Copier'}
                    </button>
                    <button type="button" className="download-btn" onClick={() => handleDownloadJson(result)}>
                      Télécharger
                    </button>
                  </div>
                </div>
                <pre className="json-block">{renderHighlightedJson(JSON.stringify(result, null, 2))}</pre>
              </section>
            )}
          </main>
        ) : (
          <main className="history-view">
            <div className="panel-header-row">
              <span className="panel-label">Historique de session</span>
              <span className="history-hint">Effacé au rechargement de la page</span>
            </div>

            {history.length === 0 ? (
              <p className="empty-state">Aucune analyse effectuée pour l'instant dans cette session.</p>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Fichier</th>
                    <th>Statut</th>
                    <th>Heure</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <>
                      <tr key={entry.id}>
                        <td>{entry.fileName}</td>
                        <td>
                          <span className={entry.isRejected ? 'read-badge read-no' : 'read-badge read-ok'}>
                            {entry.isRejected ? 'Rejetée' : 'Analysée'}
                          </span>
                        </td>
                        <td>{entry.time}</td>
                        <td className="history-table-actions">
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => setExpandedEntryId((id) => (id === entry.id ? null : entry.id))}
                          >
                            {expandedEntryId === entry.id ? 'Masquer' : 'Voir'}
                          </button>
                          <button
                            type="button"
                            className="table-action-btn table-action-btn-primary"
                            onClick={() => handleDownloadJson(entry.result, entry.fileName)}
                          >
                            Exporter
                          </button>
                        </td>
                      </tr>
                      {expandedEntryId === entry.id && (
                        <tr key={`${entry.id}-detail`}>
                          <td colSpan={4}>
                            <pre className="json-block json-block-compact">
                              {renderHighlightedJson(JSON.stringify(entry.result, null, 2))}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </main>
             )}
        </div>
      </div>
    </div>
  )
}

export default App