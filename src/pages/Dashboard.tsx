import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { CalendarDays, Calendar, FileText, GraduationCap, Bell, Clock, LayoutDashboard, AlertCircle, BookOpen, Plus, X, Trash2, ClipboardList } from 'lucide-react'
import { auth } from '../firebase'
import { getDefaultClasses, subscribeToCalendarEvents, subscribeToClasses, type StoredCalendarEvent, type StoredClassInfo } from '../storage'
import './Dashboard.css'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type DeadlineType = 'Assignment' | 'Quiz' | 'Test' | 'Exam' | 'Presentation' | 'Project' | 'Lab Report' | 'Other'

interface LocalDeadline {
  id: string
  course: string
  name: string
  type: DeadlineType
  dueDate: string
  createdAt: number
}

const STORAGE_KEY = 'cuhub_local_deadlines'

function loadDeadlines(): LocalDeadline[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function saveDeadlines(deadlines: LocalDeadline[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deadlines))
}

function getDaysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(`${dateStr}T00:00:00`)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function formatCountdown(dateStr: string): string {
  const days = getDaysUntil(dateStr)
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Today!'
  if (days === 1) return '1 day'
  return `${days} days`
}

function getUrgencyClass(dateStr: string): string {
  const days = getDaysUntil(dateStr)
  if (days <= 2) return 'urgent'
  if (days <= 7) return 'warning'
  return 'calm'
}

const TYPE_COLORS: Record<DeadlineType, string> = {
  Assignment: '#3B82F6', Quiz: '#8B5CF6', Test: '#F59E0B', Exam: '#E31C3D',
  Presentation: '#10B981', Project: '#06B6D4', 'Lab Report': '#F97316', Other: '#6B7280',
}

function Dashboard() {
  const navigate = useNavigate()
  const [calendarEvents, setCalendarEvents] = useState<StoredCalendarEvent[]>([])
  const [classes, setClasses] = useState<StoredClassInfo[]>(() => getDefaultClasses())
  const [localDeadlines, setLocalDeadlines] = useState<LocalDeadline[]>(loadDeadlines)
  const [showModal, setShowModal] = useState(false)
  const [showDeadlinePanel, setShowDeadlinePanel] = useState(false)
  const [form, setForm] = useState({ course: '', name: '', type: 'Assignment' as DeadlineType, dueDate: '' })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const unsubscribeCalendar = subscribeToCalendarEvents(uid, setCalendarEvents)
    const unsubscribeClasses = subscribeToClasses(uid, setClasses)
    return () => { unsubscribeCalendar(); unsubscribeClasses() }
  }, [])

  const handleLogout = async () => { await signOut(auth); navigate('/', { replace: true }) }

  const addDeadline = () => {
    if (!form.course.trim()) { setFormError('Please enter a course name.'); return }
    if (!form.name.trim())   { setFormError('Please enter a deadline name.'); return }
    if (!form.dueDate)       { setFormError('Please pick a due date.'); return }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (new Date(`${form.dueDate}T00:00:00`) < today) { setFormError('Due date cannot be in the past.'); return }
    const newDeadline: LocalDeadline = {
      id: `dl_${Date.now()}`, course: form.course.trim(), name: form.name.trim(),
      type: form.type, dueDate: form.dueDate, createdAt: Date.now(),
    }
    const updated = [...localDeadlines, newDeadline].sort(
      (a, b) => new Date(`${a.dueDate}T00:00:00`).getTime() - new Date(`${b.dueDate}T00:00:00`).getTime()
    )
    setLocalDeadlines(updated); saveDeadlines(updated)
    setForm({ course: '', name: '', type: 'Assignment', dueDate: '' }); setFormError(''); setShowModal(false)
  }

  const deleteDeadline = (id: string) => {
    const updated = localDeadlines.filter(d => d.id !== id)
    setLocalDeadlines(updated); saveDeadlines(updated)
  }

  const upcomingDeadlines = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return calendarEvents
      .filter(e => e.type === 'assignment')
      .filter(e => { const d = new Date(`${e.date}T00:00:00`); return !isNaN(d.getTime()) && d >= today })
      .sort((a, b) => new Date(`${a.date}T${a.time||'23:59'}`).getTime() - new Date(`${b.date}T${b.time||'23:59'}`).getTime())
      .slice(0, 3)
  }, [calendarEvents])

  const upcomingExams = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return calendarEvents
      .filter(e => e.type === 'exam')
      .filter(e => { const d = new Date(`${e.date}T00:00:00`); return !isNaN(d.getTime()) && d >= today })
      .sort((a, b) => new Date(`${a.date}T${a.time||'23:59'}`).getTime() - new Date(`${b.date}T${b.time||'23:59'}`).getTime())
      .slice(0, 2)
  }, [calendarEvents])

  const scheduledClasses = useMemo(() => {
    const todayName = weekdays[new Date().getDay()]
    return classes
      .filter(c => c.day === todayName && (c.code.trim() || c.title.trim() || c.startTime.trim() || c.location.trim()))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 4)
  }, [classes])

  const formatDaysUntil = (date: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const diff = Math.round((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86400000)
    if (diff <= 0) return 'Today'; if (diff === 1) return '1 day'; return `${diff} days`
  }

  const features = [
    { icon: CalendarDays,  title: 'Class Information', desc: 'View and manage your course info', path: '/course-info' },
    { icon: Calendar,      title: 'Calendar',           desc: 'Personalized schedule',           path: '/calendar'    },
    { icon: FileText,      title: 'Assignments',        desc: 'Track deadlines',                 path: '/assignments' },
    { icon: GraduationCap, title: 'Exams',              desc: 'Exam schedules',                  path: '/exams'       },
  ]

  const todayStr = new Date().toISOString().split('T')[0]
  const soonLocalDeadlines = localDeadlines.filter(d => getDaysUntil(d.dueDate) >= 0).slice(0, 3)
  const activeDeadlineCount = localDeadlines.filter(d => getDaysUntil(d.dueDate) >= 0).length

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left" onClick={() => navigate('/')}>
          <div className="logo"><span>CU</span></div>
          <span className="brand">StudentHub</span>
        </div>
        <div className="header-actions">
          <button className="btn-back" onClick={() => navigate('/')}>← Home</button>
          <button className="btn-logout" onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-title-row">
          <h2>Welcome to Your Dashboard</h2>
          <div className="title-actions">
            <button className="btn-syllabus-top" onClick={() => navigate('/syllabus')}>Add Syllabus</button>
            <button className="btn-notify"><Bell size={26} strokeWidth={1.5} /></button>
          </div>
        </div>
        <p className="subtitle">Your home for all things student life!</p>

        <div className="dashboard-body">
          {/* Left: Feature Grid */}
          <div className="dashboard-feature-grid">
            {/* Cards 1–4 */}
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="dashboard-feature-card"
                  onClick={() => f.path && navigate(f.path)}
                  style={{ cursor: f.path ? 'pointer' : 'default' }}>
                  <div className="dashboard-feature-icon"><Icon size={36} strokeWidth={1.5} /></div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              )
            })}

            {/* Card 5 — Upcoming Deadlines, same layout as cards 1–4 */}
            <div
              className="dashboard-feature-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowModal(true)}
            >
              <div className="dashboard-feature-icon">
                <ClipboardList size={36} strokeWidth={1.5} />
              </div>
              <h3>Upcoming Deadlines</h3>
              <p>
                {activeDeadlineCount === 0
                  ? 'No deadlines yet'
                  : `${activeDeadlineCount} deadline${activeDeadlineCount !== 1 ? 's' : ''} coming up`}
              </p>
              {/* Small badge showing count if any exist */}
              {activeDeadlineCount > 0 && (
                <span className="deadline-card-badge">{activeDeadlineCount}</span>
              )}
            </div>
          </div>

          {/* Right: Schedule Panel */}
          <div className="dashboard-demo-card">
            <div className="dashboard-demo-header">
              <div className="dashboard-demo-title">
                <LayoutDashboard size={18} /><span>Schedule</span>
              </div>
              <span className="dashboard-demo-date">Today</span>
            </div>

            <div className="dashboard-demo-section">
              <div className="dashboard-demo-section-title">
                <AlertCircle size={14} /><span>Upcoming Deadlines</span>
              </div>
              <div className="dashboard-demo-deadlines">
                {soonLocalDeadlines.length === 0 && upcomingDeadlines.length === 0 ? (
                  <p className="dashboard-empty-state">No upcoming deadlines. Click the card on the left to add one!</p>
                ) : (
                  <>
                    {soonLocalDeadlines.map(d => (
                      <div key={d.id} className={`dashboard-deadline-item ${getUrgencyClass(d.dueDate)}`}>
                        <div className="dashboard-deadline-info">
                          <span className="dashboard-deadline-course" style={{ color: TYPE_COLORS[d.type] }}>{d.course}</span>
                          <span className="dashboard-deadline-task">{d.name}</span>
                          <span className="deadline-type-chip" style={{ background: `${TYPE_COLORS[d.type]}22`, color: TYPE_COLORS[d.type] }}>{d.type}</span>
                        </div>
                        <div className="dashboard-deadline-meta">
                          <Clock size={12} /><span>{formatCountdown(d.dueDate)}</span>
                        </div>
                      </div>
                    ))}
                    {upcomingDeadlines.map(event => (
                      <div key={`${event.date}-${event.title}`} className={`dashboard-deadline-item ${event.priority === 'high' ? 'urgent' : event.priority === 'medium' ? 'warning' : 'calm'}`}>
                        <div className="dashboard-deadline-info">
                          <span className="dashboard-deadline-course">{event.courseCode || event.date}</span>
                          <span className="dashboard-deadline-task">{event.title}</span>
                        </div>
                        <div className="dashboard-deadline-meta">
                          <Clock size={12} /><span>{formatDaysUntil(event.date)}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="dashboard-demo-section">
              <div className="dashboard-demo-section-title">
                <BookOpen size={14} /><span>Today's Classes</span>
              </div>
              <div className="dashboard-demo-classes">
                {scheduledClasses.length === 0
                  ? <p className="dashboard-empty-state">Add classes for today in Class Information.</p>
                  : scheduledClasses.map(c => (
                    <div key={c.id} className="dashboard-class-item">
                      <span className="dashboard-class-time">{c.startTime || 'TBA'}</span>
                      <span className="dashboard-class-name">{c.code || c.title}{c.location ? ` - ${c.location}` : ''}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="dashboard-demo-section">
              <div className="dashboard-demo-section-title">
                <GraduationCap size={14} /><span>Upcoming Exams</span>
              </div>
              <div className="dashboard-demo-deadlines">
                {upcomingExams.length === 0
                  ? <p className="dashboard-empty-state">No upcoming exams yet. Add one in Calendar.</p>
                  : upcomingExams.map(event => (
                    <div key={`${event.date}-${event.title}`} className={`dashboard-deadline-item ${event.priority === 'high' ? 'urgent' : event.priority === 'medium' ? 'warning' : 'calm'}`}>
                      <div className="dashboard-deadline-info">
                        <span className="dashboard-deadline-course">{event.courseCode || event.date}</span>
                        <span className="dashboard-deadline-task">{event.title}</span>
                      </div>
                      <div className="dashboard-deadline-meta">
                        <Clock size={12} /><span>{formatDaysUntil(event.date)}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="dashboard-demo-footer">
              <div className="dashboard-demo-stat">
                <span className="dashboard-stat-value">{activeDeadlineCount + upcomingDeadlines.length}</span>
                <span className="dashboard-stat-label">Tasks</span>
              </div>
              <div className="dashboard-demo-stat">
                <span className="dashboard-stat-value">{scheduledClasses.length}</span>
                <span className="dashboard-stat-label">Classes</span>
              </div>
              <div className="dashboard-demo-stat">
                <span className="dashboard-stat-value">{upcomingExams.length}</span>
                <span className="dashboard-stat-label">Exams</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ADD DEADLINE MODAL — opens when card 5 is clicked */}
      {showModal && (
        <div className="dl-overlay" onClick={() => { setShowModal(false); setFormError('') }}>
          <div className="dl-modal" onClick={e => e.stopPropagation()}>
            <div className="dl-modal-header">
              <h3>Add Upcoming Deadline</h3>
              <button className="dl-close" onClick={() => { setShowModal(false); setFormError('') }}><X size={18} /></button>
            </div>
            <div className="dl-form">
              <div className="dl-field">
                <label>Course Name</label>
                <input type="text" placeholder="e.g. COMP 1406" value={form.course}
                  onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addDeadline()} />
              </div>
              <div className="dl-field">
                <label>Deadline Name</label>
                <input type="text" placeholder="e.g. Midterm Review Assignment" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addDeadline()} />
              </div>
              <div className="dl-field">
                <label>Type</label>
                <div className="dl-type-grid">
                  {(Object.keys(TYPE_COLORS) as DeadlineType[]).map(t => (
                    <button key={t} className={`dl-type-btn ${form.type === t ? 'active' : ''}`}
                      style={form.type === t ? { background: `${TYPE_COLORS[t]}22`, borderColor: TYPE_COLORS[t], color: TYPE_COLORS[t] } : {}}
                      onClick={() => setForm(f => ({ ...f, type: t }))}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="dl-field">
                <label>Due Date</label>
                <input type="date" min={todayStr} value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              {formError && <p className="dl-error">{formError}</p>}
              {form.course && form.dueDate && (
                <div className={`dl-preview ${getUrgencyClass(form.dueDate)}`}>
                  <span className="dl-preview-badge" style={{ background: TYPE_COLORS[form.type] }}>{form.type}</span>
                  <div className="dl-preview-text">
                    <span className="dl-preview-course">{form.course}</span>
                    <span className="dl-preview-name">{form.name || '—'}</span>
                  </div>
                  <span className="dl-preview-days">{form.dueDate ? formatCountdown(form.dueDate) : ''}</span>
                </div>
              )}
              <div className="dl-modal-footer-row">
                <button className="dl-submit" onClick={addDeadline}>
                  <Plus size={16} /> Add Deadline
                </button>
                {localDeadlines.length > 0 && (
                  <button className="dl-view-all-btn" onClick={() => { setShowModal(false); setShowDeadlinePanel(true) }}>
                    View All ({localDeadlines.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ALL DEADLINES PANEL */}
      {showDeadlinePanel && (
        <div className="dl-overlay" onClick={() => setShowDeadlinePanel(false)}>
          <div className="dl-panel" onClick={e => e.stopPropagation()}>
            <div className="dl-modal-header">
              <h3>All Deadlines <span className="dl-count">{localDeadlines.length}</span></h3>
              <button className="dl-close" onClick={() => setShowDeadlinePanel(false)}><X size={18} /></button>
            </div>
            <div className="dl-panel-body">
              {localDeadlines.length === 0 ? (
                <p className="dl-empty">No deadlines added yet.</p>
              ) : (
                localDeadlines.map(d => {
                  const days = getDaysUntil(d.dueDate)
                  const urgency = getUrgencyClass(d.dueDate)
                  return (
                    <div key={d.id} className={`dl-panel-item ${urgency}`}>
                      <div className="dl-panel-left">
                        <span className="dl-panel-badge" style={{ background: TYPE_COLORS[d.type] }}>{d.type}</span>
                        <div className="dl-panel-info">
                          <span className="dl-panel-course">{d.course}</span>
                          <span className="dl-panel-name">{d.name}</span>
                          <span className="dl-panel-date">
                            Due: {new Date(`${d.dueDate}T00:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="dl-panel-right">
                        <span className={`dl-panel-countdown ${urgency}`}>
                          {days < 0 ? 'Overdue' : days === 0 ? 'Today!' : `${days}d`}
                        </span>
                        <button className="dl-delete" onClick={() => deleteDeadline(d.id)} title="Delete deadline">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="dl-panel-footer">
              <button className="btn-add-deadline" onClick={() => { setShowDeadlinePanel(false); setShowModal(true) }}>
                <Plus size={16} /> Add Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard