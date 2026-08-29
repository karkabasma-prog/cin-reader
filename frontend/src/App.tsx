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

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CinResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error ?? 'Une erreur est survenue.')
      } else {
        setResult(data)
      }
    } catch {
      setErrorMessage('Impossible de contacter le serveur.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadJson = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'resultat-cin.json'
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
    <div className="page">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="topbar-mark">◈</span>
          <div>
            <div className="topbar-name">Lecture automatisée de CIN</div>
            <div className="topbar-subtitle">Poste de vérification documentaire</div>
          </div>
        </div>
        <span className="badge-specimen">Specimen fictif</span>
      </header>

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
                  {copied ? 'Copié' : 'Copier le JSON'}
                </button>
                <button type="button" className="download-btn" onClick={handleDownloadJson}>
                  Télécharger
                </button>
              </div>
            </div>
            <pre className="json-block">{JSON.stringify(result, null, 2)}</pre>
          </section>
        )}
      </main>
    </div>
  )
}

export default App