import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import {
  getDefaultClasses,
  saveCalendarEvents,
  saveClasses,
  saveSyllabusUploads,
  subscribeToCalendarEvents,
  subscribeToClasses,
  subscribeToSyllabusUploads,
  type StoredCalendarEvent,
  type StoredClassInfo,
  type StoredSyllabusUpload,
} from '../storage'
import { parseSyllabusPdf, type ParsedSyllabusData } from '../syllabusParser'
import {
  DEADLINE_TYPE_COLORS,
  deadlineTypeToEventType,
  formatDeadlineType,
  getStoredEventDeadlineType,
  normalizeDeadlineType,
  isSameCalendarEvent,
  type DeadlineType,
} from '../deadlines'
import './Dashboard.css'

type ReviewCourse = NonNullable<StoredSyllabusUpload['parsedCourse']>
type ReviewEvent = NonNullable<StoredSyllabusUpload['parsedEvents']>[number]
type ParseReviewState = {
  uploadId: string
  fileName: string
  course: ReviewCourse
  events: ReviewEvent[]
  missing: string[]
  source: ParsedSyllabusData['source']
}

const ASSIGNMENT_REVIEW_TYPES: DeadlineType[] = ['assignment', 'presentation', 'project', 'lab-report', 'other']
const EXAM_REVIEW_TYPES: DeadlineType[] = ['quiz', 'test', 'exam']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function SyllabusPage() {
  const navigate = useNavigate()
  const [uploads, setUploads] = useState<StoredSyllabusUpload[]>([])
  const [uploadsReady, setUploadsReady] = useState(false)
  const [classes, setClasses] = useState<StoredClassInfo[]>(() => getDefaultClasses())
  const [events, setEvents] = useState<StoredCalendarEvent[]>([])
  const [parseReview, setParseReview] = useState<ParseReviewState | null>(null)
  const [activeImport, setActiveImport] = useState<{ fileName: string; message: string; tone: 'info' | 'error' } | null>(null)
  const uploadsRef = useRef<StoredSyllabusUpload[]>([])
  const reviewResolverRef = useRef<((value: ParseReviewState | null) => void) | null>(null)

  useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return

    const unsubscribeClasses = subscribeToClasses(uid, setClasses)
    const unsubscribeEvents = subscribeToCalendarEvents(uid, setEvents)
    const unsubscribeUploads = subscribeToSyllabusUploads(uid, (nextUploads) => {
      setUploads(nextUploads)
      setUploadsReady(true)
    })

    return () => {
      unsubscribeClasses()
      unsubscribeEvents()
      unsubscribeUploads()
    }
  }, [])

  const normalizeToSixClasses = (items: StoredClassInfo[]) => {
    const normalized = items.slice(0, 6).map((item, index) => ({
      ...item,
      id: index,
    }))

    while (normalized.length < 6) {
      normalized.push(getDefaultClasses()[normalized.length])
    }

    return normalized
  }

  const mergeClass = (current: StoredClassInfo[], incoming: Partial<StoredClassInfo>, sourceUploadId: string) => {
    const matchIndex = current.findIndex((item) => {
      if (item.sourceUploadId && item.sourceUploadId === sourceUploadId) return true
      if (incoming.code && item.code && item.code.toLowerCase() === incoming.code.toLowerCase()) return true
      if (incoming.title && item.title && item.title.toLowerCase() === incoming.title.toLowerCase()) return true
      return false
    })

    const next = [...current]
    const targetIndex = matchIndex >= 0 ? matchIndex : next.findIndex((item) => {
      return !item.code.trim() && !item.title.trim() && !item.day.trim() && !item.startTime.trim() && !item.location.trim()
    })
    const index = targetIndex >= 0 ? targetIndex : 0
    const base = next[index] ?? getDefaultClasses()[0]

    next[index] = {
      ...base,
      ...incoming,
      id: base.id ?? index,
      title: incoming.title || incoming.code || base.title,
      time: [incoming.startTime ?? base.startTime, incoming.endTime ?? base.endTime].filter(Boolean).join(' - '),
      sourceUploadId,
    }

    return normalizeToSixClasses(next)
  }

  const mergeEvents = (current: StoredCalendarEvent[], incoming: StoredCalendarEvent[], sourceUploadId: string) => {
    const next = [...current]
    for (const event of incoming) {
      const normalizedEvent = { ...event, sourceUploadId }
      const exists = next.some((item) => isSameCalendarEvent(item, normalizedEvent) && item.sourceUploadId === sourceUploadId)
      if (!exists) next.push(normalizedEvent)
    }
    return next
  }

  const saveUploadsList = async (uid: string, items: StoredSyllabusUpload[]) => {
    setUploads(items)
    uploadsRef.current = items
    await saveSyllabusUploads(uid, items)
  }

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid || uploads.length === 0) return

    const stuckUploads = uploads.filter(
      upload => upload.status === 'processing' || upload.status === 'review',
    )
    if (stuckUploads.length === 0) return

    const recoveredUploads = uploads.map((upload) =>
      upload.status === 'processing' || upload.status === 'review'
        ? {
            ...upload,
            status: 'error' as const,
            message: 'This upload did not finish saving. Remove it and upload again.',
          }
        : upload,
    )

    queueMicrotask(() => {
      void saveUploadsList(uid, recoveredUploads)
    })
  }, [uploads])

  const summarizeCourse = (course?: StoredSyllabusUpload['parsedCourse']) => {
    if (!course) return []

    return [
      course.code || course.title ? `${course.code ? `${course.code} - ` : ''}${course.title}`.trim() : '',
      course.day || course.startTime || course.endTime
        ? [course.day, [course.startTime, course.endTime].filter(Boolean).join(' - ')].filter(Boolean).join(' ')
        : '',
      course.location || '',
      course.profName || course.profEmail ? `Prof: ${[course.profName, course.profEmail].filter(Boolean).join(' | ')}` : '',
      course.taName || course.taEmail ? `TA: ${[course.taName, course.taEmail].filter(Boolean).join(' | ')}` : '',
    ].filter(Boolean)
  }

  const getMissingFields = (parsed: ParsedSyllabusData) => {
    const missing: string[] = []

    if (!parsed.course.title && !parsed.course.code) missing.push('course name/code')
    if (!parsed.course.day && !parsed.course.startTime && !parsed.course.endTime) missing.push('class day/time')
    if (!parsed.course.profName) missing.push('professor name')
    if (!parsed.course.profEmail) missing.push('professor email')
    if (!parsed.course.taName) missing.push('TA name')
    if (!parsed.course.taEmail) missing.push('TA email')
    if (!parsed.events.some((event) => event.type === 'assignment')) missing.push('assignment dates')
    if (!parsed.events.some((event) => event.type === 'exam')) missing.push('exam dates')

    return missing
  }

  const getReviewMissingFields = (review: Pick<ParseReviewState, 'course' | 'events'>) => {
    const missing: string[] = []

    if (!review.course.title && !review.course.code) missing.push('course name/code')
    if (!review.course.day && !review.course.startTime && !review.course.endTime) missing.push('class day/time')
    if (!review.course.profName) missing.push('professor name')
    if (!review.course.profEmail) missing.push('professor email')
    if (!review.course.taName) missing.push('TA name')
    if (!review.course.taEmail) missing.push('TA email')
    if (!review.events.some((event) => event.type === 'assignment')) missing.push('assignment dates')
    if (!review.events.some((event) => event.type === 'exam')) missing.push('exam dates')

    return missing
  }

  const toReviewCourse = (course: ParsedSyllabusData['course']): ReviewCourse => ({
    title: course.title ?? '',
    code: course.code ?? '',
    day: course.day ?? '',
    startTime: course.startTime ?? '',
    endTime: course.endTime ?? '',
    location: course.location ?? '',
    profName: course.profName ?? '',
    profEmail: course.profEmail ?? '',
    taName: course.taName ?? '',
    taEmail: course.taEmail ?? '',
  })

  const toReviewEvents = (parsedEvents: ParsedSyllabusData['events']): ReviewEvent[] =>
    parsedEvents.map((event) => ({
      title: event.title,
      courseCode: event.courseCode ?? '',
      date: event.date,
      time: event.time,
      type: deadlineTypeToEventType(normalizeDeadlineType(event.deadlineType, event.type)),
      deadlineType: normalizeDeadlineType(event.deadlineType, event.type),
      priority: event.priority,
    }))

  const confirmParsedImport = (review: ParseReviewState) => {
    return new Promise<ParseReviewState | null>((resolve) => {
      reviewResolverRef.current = resolve
      setParseReview(review)
    })
  }

  const closeReview = (result: ParseReviewState | null) => {
    setParseReview(null)
    reviewResolverRef.current?.(result)
    reviewResolverRef.current = null
  }

  const updateReviewCourse = (field: keyof ReviewCourse, value: string) => {
    setParseReview((current) => current ? { ...current, course: { ...current.course, [field]: value } } : current)
  }

  const updateReviewEvent = (index: number, field: keyof ReviewEvent, value: string) => {
    setParseReview((current) => {
      if (!current) return current
      const nextEvents = current.events.map((event, eventIndex) =>
        eventIndex === index ? { ...event, [field]: value } : event,
      )
      return { ...current, events: nextEvents }
    })
  }

  const removeReviewEvent = (index: number) => {
    setParseReview((current) => current ? { ...current, events: current.events.filter((_, eventIndex) => eventIndex !== index) } : current)
  }

  const removeAllReviewEventsOfType = (type: 'assignment' | 'exam') => {
    setParseReview((current) => current ? {
      ...current,
      events: current.events.filter((event) => event.type !== type),
    } : current)
  }

  const addReviewEventOfType = (type: 'assignment' | 'exam') => {
    setParseReview((current) => current ? {
      ...current,
      events: [
        ...current.events,
        {
          title: '',
          courseCode: current.course.code,
          date: '',
          time: '',
          type,
          deadlineType: type === 'exam' ? 'exam' : 'assignment',
          priority: type === 'exam' ? 'high' : 'low',
        },
      ],
    } : current)
  }

  const applyCourseCodeToAllEvents = () => {
    setParseReview((current) => current ? {
      ...current,
      events: current.events.map((event) => ({
        ...event,
        courseCode: current.course.code,
      })),
    } : current)
  }

  const getReviewDeadlineTypeOptions = (type: 'assignment' | 'exam') => {
    return type === 'exam' ? EXAM_REVIEW_TYPES : ASSIGNMENT_REVIEW_TYPES
  }

  const assignmentEvents = parseReview?.events.filter((event) => event.type === 'assignment') ?? []
  const examEvents = parseReview?.events.filter((event) => event.type === 'exam') ?? []

  const renderReviewEventRows = (filteredEvents: ReviewEvent[]) => {
    if (!parseReview || filteredEvents.length === 0) {
      return <div className="syllabus-warning-item">No items in this section yet.</div>
    }

    return filteredEvents.map((event) => {
      const index = parseReview.events.indexOf(event)
      return (
        <div key={`review-event-${index}`} className="syllabus-review-event-row">
          <input value={event.title} onChange={(e) => updateReviewEvent(index, 'title', e.target.value)} placeholder="Event title" />
          <input value={event.courseCode ?? ''} onChange={(e) => updateReviewEvent(index, 'courseCode', e.target.value)} placeholder="Course code" />
          <input type="date" value={event.date} onChange={(e) => updateReviewEvent(index, 'date', e.target.value)} />
          <input type="time" value={event.time} onChange={(e) => updateReviewEvent(index, 'time', e.target.value)} />
          <select value={event.deadlineType ?? (event.type === 'exam' ? 'exam' : 'assignment')} onChange={(e) => updateReviewEvent(index, 'deadlineType', e.target.value)}>
            {getReviewDeadlineTypeOptions(event.type).map((deadlineType) => (
              <option key={deadlineType} value={deadlineType}>{formatDeadlineType(deadlineType)}</option>
            ))}
          </select>
          <select value={event.priority} onChange={(e) => updateReviewEvent(index, 'priority', e.target.value)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button type="button" className="syllabus-remove syllabus-review-remove" onClick={() => removeReviewEvent(index)}>Remove</button>
        </div>
      )
    })
  }

  const handleFiles = async (filesList: FileList | null) => {
    const uid = auth.currentUser?.uid
    if (!filesList || filesList.length === 0 || !uid || !uploadsReady) return

    const files = Array.from(filesList)
    let nextClasses = classes
    let nextEvents = events

    for (const file of files) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setActiveImport({ fileName: file.name, message: 'Only PDF files are accepted.', tone: 'error' })
        continue
      }

      try {
        setActiveImport({ fileName: file.name, message: 'Reading PDF...', tone: 'info' })
        const uploadId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
        const parsed = await parseSyllabusPdf(file)
        const reviewDraft: ParseReviewState = {
          uploadId,
          fileName: file.name,
          course: toReviewCourse(parsed.course),
          events: toReviewEvents(parsed.events),
          missing: getMissingFields(parsed),
          source: parsed.source,
        }

        setActiveImport({
          fileName: file.name,
          message: parsed.source === 'remote-ai'
            ? 'AI parsed this PDF. Review the extracted info before import.'
            : 'Using local fallback parsing. Review the extracted info before import.',
          tone: 'info',
        })
        const reviewed = await confirmParsedImport(reviewDraft)
        if (!reviewed) {
          setActiveImport({ fileName: file.name, message: 'Import cancelled before confirmation.', tone: 'error' })
          continue
        }

        nextClasses = mergeClass(nextClasses, {
          ...reviewed.course,
          time: [reviewed.course.startTime, reviewed.course.endTime].filter(Boolean).join(' - '),
        }, uploadId)
        nextEvents = mergeEvents(nextEvents, reviewed.events, uploadId)
        await saveClasses(uid, nextClasses)
        await saveCalendarEvents(uid, nextEvents)

        const summary = [
          reviewed.course.code || reviewed.course.title ? 'course info' : '',
          reviewed.events.length ? `${reviewed.events.length} dates` : '',
        ].filter(Boolean).join(', ')

        const nextUpload: StoredSyllabusUpload = {
          id: uploadId,
          name: file.name,
          url: '',
          storagePath: '',
          status: 'done',
          message: summary ? `Imported ${summary}.` : 'Parsed PDF, but found limited structured data.',
          parsedCourse: reviewed.course,
          parsedEvents: reviewed.events.map((event) => ({
            title: event.title,
            courseCode: event.courseCode ?? '',
            date: event.date,
            time: event.time,
            type: event.type,
            deadlineType: event.deadlineType,
            priority: event.priority,
          })),
        }

        await saveUploadsList(uid, [nextUpload, ...uploadsRef.current])
        setActiveImport(null)
      } catch {
        setActiveImport({ fileName: file.name, message: 'Could not parse or save this PDF syllabus.', tone: 'error' })
      }
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    if (e.target) e.target.value = ''
  }

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const removeUpload = async (id: string) => {
    const uid = auth.currentUser?.uid
    if (!uid) return

    const nextUploads = uploadsRef.current.filter((upload) => upload.id !== id)
    const nextClasses = normalizeToSixClasses(classes.filter((course) => course.sourceUploadId !== id))
    const nextEvents = events.filter((event) => event.sourceUploadId !== id)

    await saveClasses(uid, nextClasses)
    await saveCalendarEvents(uid, nextEvents)
    await saveSyllabusUploads(uid, nextUploads)
  }

  const removeUploadEventRow = async (uploadId: string, rowIndex: number) => {
    const uid = auth.currentUser?.uid
    const targetUpload = uploadsRef.current.find((upload) => upload.id === uploadId)
    const targetRow = targetUpload?.parsedEvents?.[rowIndex]
    if (!uid || !targetUpload || !targetRow) return

    const nextUpload = {
      ...targetUpload,
      parsedEvents: (targetUpload.parsedEvents ?? []).filter((_, index) => index !== rowIndex),
    }

    const nextUploads = uploadsRef.current.map((upload) => upload.id === uploadId ? nextUpload : upload)
    const nextEvents = events.filter((event) => {
      if (event.sourceUploadId !== uploadId) return true
      return !(
        event.title === targetRow.title &&
        (event.courseCode ?? '') === (targetRow.courseCode ?? '') &&
        event.date === targetRow.date &&
        event.time === targetRow.time &&
        event.type === targetRow.type &&
        getStoredEventDeadlineType(event) === (targetRow.deadlineType ?? (targetRow.type === 'exam' ? 'exam' : 'assignment'))
      )
    })

    await saveCalendarEvents(uid, nextEvents)
    await saveSyllabusUploads(uid, nextUploads)
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
          <p className="muted">PDF only. We will extract course name, schedule, professor, TA, emails, assignments, and exams.</p>
          <label className="btn-upload" style={{ marginTop: 12 }}>
            Choose files
            <input type="file" accept=".pdf,application/pdf" multiple onChange={onInputChange} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {activeImport ? (
        <div className={`syllabus-active-import syllabus-active-import-${activeImport.tone}`}>
          <strong>{activeImport.fileName}</strong>
          <span>{activeImport.message}</span>
        </div>
      ) : null}

      <div className="syllabus-list-container">
        {!uploadsReady ? (
          <p className="muted">Loading uploaded syllabi...</p>
        ) : null}
        {uploadsReady && uploads.length === 0 ? (
          <p className="muted">No files uploaded yet.</p>
        ) : (
          <>
            <div className="syllabus-list-header">
              <h3>Uploaded Syllabi</h3>
            </div>
            <div className="syllabus-list">
              {uploads.map((u) => (
                <div className="syllabus-item" key={u.id}>
                  <div className="syllabus-item-body">
                    <div className="syllabus-item-info">
                      <span className="syllabus-name">{u.name}</span>
                      <span className={`syllabus-status syllabus-status-${u.status}`}>{u.message}</span>
                      <button type="button" className="syllabus-remove syllabus-item-delete" onClick={() => removeUpload(u.id)}>Delete Upload</button>
                    </div>
                    {u.parsedCourse || (u.parsedEvents && u.parsedEvents.length > 0) ? (
                      <div className="syllabus-preview">
                        {summarizeCourse(u.parsedCourse).map((line) => (
                          <div key={line} className="syllabus-preview-line">{line}</div>
                        ))}
                        {u.parsedEvents && u.parsedEvents.length > 0 ? (
                          <div className="syllabus-preview-events">
                            {u.parsedEvents.map((event, index) => (
                              <div key={`${event.type}-${event.courseCode ?? ''}-${event.title}-${event.date}-${event.time}-${index}`} className={`syllabus-preview-event ${event.priority}`}>
                                <span
                                  className="syllabus-preview-type"
                                  style={{
                                    color: DEADLINE_TYPE_COLORS[event.deadlineType ?? (event.type === 'exam' ? 'exam' : 'assignment')],
                                    background: `${DEADLINE_TYPE_COLORS[event.deadlineType ?? (event.type === 'exam' ? 'exam' : 'assignment')]}22`,
                                    borderColor: `${DEADLINE_TYPE_COLORS[event.deadlineType ?? (event.type === 'exam' ? 'exam' : 'assignment')]}66`,
                                  }}
                                >
                                  {formatDeadlineType(event.deadlineType ?? (event.type === 'exam' ? 'exam' : 'assignment'))}
                                </span>
                                <span>{event.courseCode ? `${event.courseCode} - ${event.title}` : event.title}</span>
                                <span>{event.date}{event.time ? ` ${event.time}` : ''}</span>
                                <button type="button" className="syllabus-remove syllabus-preview-remove" onClick={() => removeUploadEventRow(u.id, index)}>Delete</button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {parseReview ? (
        <div className="syllabus-warning-overlay" onClick={() => closeReview(null)}>
          <div className="syllabus-warning-modal syllabus-review-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Review Parsed Import</h3>
            <p>
              Check what we found in <strong>{parseReview.fileName}</strong> before importing it into your classes and calendar.
            </p>
            <p>
              {parseReview.source === 'remote-ai'
                ? 'Parsing source: AI proxy'
                : 'Parsing source: local fallback'}
            </p>
            {getReviewMissingFields(parseReview).length > 0 ? (
              <>
                <p>Still missing or unclear:</p>
                <div className="syllabus-warning-list">
                  {getReviewMissingFields(parseReview).map((item) => (
                    <div key={item} className="syllabus-warning-item">{item}</div>
                  ))}
                </div>
              </>
            ) : null}

            <div className="syllabus-review-section">
              <h4>Course Info</h4>
              <div className="syllabus-review-grid">
                <input value={parseReview.course.code} onChange={(e) => updateReviewCourse('code', e.target.value)} placeholder="Course code" />
                <input value={parseReview.course.title} onChange={(e) => updateReviewCourse('title', e.target.value)} placeholder="Course title" />
                <select value={parseReview.course.day} onChange={(e) => updateReviewCourse('day', e.target.value)}>
                  <option value="">Select day</option>
                  {WEEKDAYS.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <input type="time" value={parseReview.course.startTime} onChange={(e) => updateReviewCourse('startTime', e.target.value)} />
                <input type="time" value={parseReview.course.endTime} onChange={(e) => updateReviewCourse('endTime', e.target.value)} />
                <input value={parseReview.course.location} onChange={(e) => updateReviewCourse('location', e.target.value)} placeholder="Room / location" />
                <input value={parseReview.course.profName} onChange={(e) => updateReviewCourse('profName', e.target.value)} placeholder="Professor name" />
                <input value={parseReview.course.profEmail} onChange={(e) => updateReviewCourse('profEmail', e.target.value)} placeholder="Professor email" />
                <input value={parseReview.course.taName} onChange={(e) => updateReviewCourse('taName', e.target.value)} placeholder="TA name" />
                <input value={parseReview.course.taEmail} onChange={(e) => updateReviewCourse('taEmail', e.target.value)} placeholder="TA email" />
              </div>
            </div>

            <div className="syllabus-review-section">
              <div className="syllabus-review-events-header">
                <h4>Events To Import</h4>
                <div className="syllabus-review-toolbar">
                  <button type="button" className="cancel-btn syllabus-review-add" onClick={applyCourseCodeToAllEvents}>Apply Course Code To All</button>
                  <button type="button" className="save-btn syllabus-review-add" onClick={() => addReviewEventOfType('assignment')}>Add Assignment</button>
                  <button type="button" className="save-btn syllabus-review-add" onClick={() => addReviewEventOfType('exam')}>Add Exam</button>
                </div>
              </div>
              <div className="syllabus-review-groups">
                <div className="syllabus-review-group">
                  <div className="syllabus-review-group-header">
                    <div className="syllabus-review-group-title">
                      <h5>Assignments</h5>
                      <span>{assignmentEvents.length}</span>
                    </div>
                    <button type="button" className="syllabus-remove syllabus-review-clear" onClick={() => removeAllReviewEventsOfType('assignment')}>Delete All</button>
                  </div>
                  <div className="syllabus-review-events">
                    {renderReviewEventRows(assignmentEvents)}
                  </div>
                </div>
                <div className="syllabus-review-group">
                  <div className="syllabus-review-group-header">
                    <div className="syllabus-review-group-title">
                      <h5>Exams</h5>
                      <span>{examEvents.length}</span>
                    </div>
                    <button type="button" className="syllabus-remove syllabus-review-clear" onClick={() => removeAllReviewEventsOfType('exam')}>Delete All</button>
                  </div>
                  <div className="syllabus-review-events">
                    {renderReviewEventRows(examEvents)}
                  </div>
                </div>
              </div>
            </div>

            <div className="syllabus-warning-actions">
              <button className="cancel-btn" onClick={() => closeReview(null)}>Cancel Import</button>
              <button className="save-btn" onClick={() => closeReview(parseReview)}>Confirm Import</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
