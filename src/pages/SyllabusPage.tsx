import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

type Upload = { id: string; file: File; url: string }

export default function SyllabusPage() {
  const navigate = useNavigate()
  const [uploads, setUploads] = useState<Upload[]>([])
  const uploadsRef = useRef<Upload[]>([])

  useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])

  useEffect(() => {
    return () => uploadsRef.current.forEach((u) => URL.revokeObjectURL(u.url))
  }, [])

  const handleFiles = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return
    const files: Upload[] = Array.from(filesList).map((f) => ({ id: (crypto as any)?.randomUUID?.() ?? String(Date.now()) + Math.random(), file: f, url: URL.createObjectURL(f) }))
    setUploads((s) => [...s, ...files])
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    if (e.target) e.target.value = ''
  }

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const removeUpload = (id: string) => {
    setUploads((s) => {
      const found = s.find((u) => u.id === id)
      if (found) URL.revokeObjectURL(found.url)
      return s.filter((u) => u.id !== id)
    })
  }

  return (
    <div className="syllabus-fullpage">
      <header className="syllabus-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <h2>Upload Syllabus</h2>
      </header>

      <div className="syllabus-drop-area-large" onDrop={onDrop} onDragOver={(e) => e.preventDefault()} onClick={() => { /* click to focus */ }}>
        <div className="syllabus-drop-inner">
          <h3>Drag & drop syllabus files here</h3>
          <p className="muted">PDF or Word documents — multiple allowed</p>
          <label className="btn-upload" style={{ marginTop: 12 }}>
            Choose files
            <input type="file" accept=".pdf,.doc,.docx" multiple onChange={onInputChange} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div className="syllabus-list-container">
        {uploads.length === 0 ? (
          <p className="muted">No files uploaded yet.</p>
        ) : (
          <div className="syllabus-list">
            {uploads.map((u) => (
              <div className="syllabus-item" key={u.id}>
                <div className="syllabus-item-info">
                  <span className="syllabus-name">{u.file.name}</span>
                  <a className="syllabus-view" href={u.url} target="_blank" rel="noreferrer">View</a>
                </div>
                <button className="syllabus-remove" onClick={() => removeUpload(u.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
