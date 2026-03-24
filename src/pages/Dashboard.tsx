import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
// react hooks not needed in this file
import { CalendarDays, Calendar, FileText, GraduationCap, Bell, Clock, LayoutDashboard, AlertCircle, BookOpen } from 'lucide-react'
import { auth } from '../firebase'
import { getDefaultClasses, subscribeToCalendarEvents, subscribeToClasses, type StoredCalendarEvent, type StoredClassInfo } from '../storage'
import './Dashboard.css'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface AppNotification {
  id: string
  type: 'assignment' | 'exam'
  title: string
  courseCode?: string
  date: string
  message: string
}

function buildNotifications(events: StoredCalendarEvent[]): AppNotification[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const notifications: AppNotification[] = []

  for (const event of events) {
    const eventDate = new Date(`${event.date}T00:00:00`)
    if (Number.isNaN(eventDate.getTime())) continue
    const diffDays = Math.round((eventDate.getTime() - today.getTime()) / 86400000)

    if (event.type === 'assignment' && diffDays === 2) {
      notifications.push({
        id: `assignment-${event.date}-${event.title}`,
        type: 'assignment',
        title: event.title,
        courseCode: event.courseCode,
        date: event.date,
        message: `${event.courseCode ? event.courseCode + ' — ' : ''}${event.title} is due in 2 days.`,
      })
    }

    if (event.type === 'exam' && diffDays === 7) {
      notifications.push({
        id: `exam-${event.date}-${event.title}`,
        type: 'exam',
        title: event.title,
        courseCode: event.courseCode,
        date: event.date,
        message: `${event.courseCode ? event.courseCode + ' — ' : ''}${event.title} exam is in 1 week.`,
      })
    }
  }

  notifications.sort((a, b) => b.date.localeCompare(a.date))
  return notifications
}

function Dashboard() {
  const navigate = useNavigate()
  const [calendarEvents, setCalendarEvents] = useState<StoredCalendarEvent[]>([])
  const [classes, setClasses] = useState<StoredClassInfo[]>(() => getDefaultClasses())
  const [notifOpen, setNotifOpen] = useState(false)
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return

    const unsubscribeCalendar = subscribeToCalendarEvents(uid, setCalendarEvents)
    const unsubscribeClasses = subscribeToClasses(uid, setClasses)

    return () => {
      unsubscribeCalendar()
      unsubscribeClasses()
    }
  }, [])

  useEffect(() => {
    if (!notifOpen) return
      const handler = (e: MouseEvent) => {
        if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
          setNotifOpen(false)
        }
      }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  useEffect(() => {
    const saved = localStorage.getItem('seen_notifications')
    if (saved) {
      setSeenIds(new Set(JSON.parse(saved)))
    }
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/', { replace: true })
  }

  const handleBellClick = () => {
    if (!notifOpen) {
      // Create a copy of existing seen IDs + all current notification IDs
      const currentIds = notifications.map((n) => n.id)
      const newSeen = new Set([...Array.from(seenIds), ...currentIds])
      
      setSeenIds(newSeen)
      localStorage.setItem('seen_notifications', JSON.stringify(Array.from(newSeen)))
    }
    setNotifOpen((prev) => !prev)
  }

  const features = [
    // UPDATED: Added path for Class Information
    { 
      icon: CalendarDays, 
      title: 'Class Information', 
      desc: 'View and manage your course info', 
      path: '/course-info' 
    },
    { 
      icon: Calendar, 
      title: 'Calendar', 
      desc: 'Personalized schedule', 
      path: '/calendar' 
    },
    { icon: FileText, title: 'Assignments', desc: 'Track deadlines', path: '/assignments' },
    { icon: GraduationCap, title: 'Exams', desc: 'Exam schedules', path: '/exams' },
  ]

  const upcomingDeadlines = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return calendarEvents
      .filter((event) => event.type === 'assignment')
      .filter((event) => {
        const eventDate = new Date(`${event.date}T00:00:00`)
        return !Number.isNaN(eventDate.getTime()) && eventDate >= today
      })
      .sort((a, b) => {
        const left = new Date(`${a.date}T${a.time || '23:59'}`).getTime()
        const right = new Date(`${b.date}T${b.time || '23:59'}`).getTime()
        return left - right
      })
      .slice(0, 3)
  }, [calendarEvents])

  const upcomingExams = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return calendarEvents
      .filter((event) => {
        if (event.type !== 'exam') return false
        const eventDate = new Date(`${event.date}T00:00:00`)
        return !Number.isNaN(eventDate.getTime()) && eventDate >= today
      })
      .sort((a, b) => {
        const left = new Date(`${a.date}T${a.time || '23:59'}`).getTime()
        const right = new Date(`${b.date}T${b.time || '23:59'}`).getTime()
        return left - right
      })
      .slice(0, 2)
  }, [calendarEvents])

  const scheduledClasses = useMemo(() => {
    const todayName = weekdays[new Date().getDay()]

    return classes
      .filter((course) => course.day === todayName && (course.code.trim() || course.title.trim() || course.startTime.trim() || course.location.trim()))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 4)
  }, [classes])

  const notifications = useMemo(() => buildNotifications(calendarEvents), [calendarEvents])

  const hasUnread = useMemo(
    () => notifications.some((n) => !seenIds.has(n.id)),
    [notifications, seenIds]
  )

  const formatDaysUntil = (date: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(`${date}T00:00:00`)
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)

    if (diffDays <= 0) return 'Today'
    if (diffDays === 1) return '1 day'
    return `${diffDays} days`
  }

  const formatEventLabel = (event: StoredCalendarEvent) => {
    return event.courseCode ? `${event.courseCode}` : event.date
  }

  const formatEventSubtitle = (event: StoredCalendarEvent) => {
    return event.title
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div className="logo"><span>CU</span></div>
          <span className="brand">StudentHub</span>
        </div>
        <div className="header-actions">
          <button className="btn-back" onClick={() => navigate('/')}>
            ← Home
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-title-row">
          <h2>Welcome to Your Dashboard</h2>
          <div className="title-actions">
            <button className="btn-syllabus-top" onClick={() => navigate('/syllabus')}>Add Syllabus</button>
            <div className="notif-wrapper" ref={notifRef}>
            <button
              className={`btn-notify${notifOpen ? ' btn-notify--open' : ''}`}
              onClick={handleBellClick}
              aria-label="Notifications"
            >
              <Bell size={26} strokeWidth={1.5} />
              {hasUnread && <span className="notif-badge" />}
            </button>

              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-panel-header">
                    <span className="notif-panel-title">Notifications</span>
                    <span className="notif-panel-count">{notifications.length}</span>
                  </div>
                  <div className="notif-panel-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">
                        <Bell size={28} strokeWidth={1.2} />
                        <p>No notifications right now.</p>
                        <p className="notif-empty-sub">We'll alert you when assignments or exams are coming up.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`notif-item notif-item--${n.type}`}>
                          <div className="notif-item-icon">
                            {n.type === 'assignment'
                              ? <FileText size={15} strokeWidth={1.8} />
                              : <GraduationCap size={15} strokeWidth={1.8} />}
                          </div>
                          <div className="notif-item-body">
                            <p className="notif-item-msg">{n.message}</p>
                            <span className="notif-item-sub">
                              {n.type === 'assignment' ? 'Due in 2 days' : 'Exam in 1 week'} · {n.date}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="subtitle">Your home for all things student life!</p>

        <div className="dashboard-body">
          <div className="dashboard-feature-grid">
            {features.map((f, i) => {
              const IconComponent = f.icon
              return (
                <div 
                  key={i} 
                  className="dashboard-feature-card"
                  onClick={() => {
                    if (f.path) navigate(f.path)
                  }}
                  style={{ cursor: f.path ? 'pointer' : 'default' }}
                >
                  <div className="dashboard-feature-icon">
                    <IconComponent size={36} strokeWidth={1.5} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              )
            })}
          </div>

          <div className="dashboard-demo-card">
            <div className="dashboard-demo-header">
              <div className="dashboard-demo-title">
                <LayoutDashboard size={18} />
                <span>Schedule</span>
              </div>
              <span className="dashboard-demo-date">Today</span>
            </div>

            <div className="dashboard-demo-section">
              <div className="dashboard-demo-section-title">
                <AlertCircle size={14} />
                <span>Upcoming Deadlines</span>
              </div>
              <div className="dashboard-demo-deadlines">
                {upcomingDeadlines.length === 0 ? (
                  <p className="dashboard-empty-state">No upcoming deadlines yet. Add some in Calendar.</p>
                ) : (
                  upcomingDeadlines.map((event) => (
                    <div key={`${event.date}-${event.time}-${event.title}`} className={`dashboard-deadline-item ${event.priority === 'high' ? 'urgent' : event.priority === 'medium' ? 'warning' : 'calm'}`}>
                      <div className="dashboard-deadline-info">
                        <span className="dashboard-deadline-course">{formatEventLabel(event)}</span>
                        <span className="dashboard-deadline-task">{formatEventSubtitle(event)}</span>
                      </div>
                      <div className="dashboard-deadline-meta">
                        <Clock size={12} />
                        <span>{formatDaysUntil(event.date)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="dashboard-demo-section">
              <div className="dashboard-demo-section-title">
                <BookOpen size={14} />
                <span>Today's Classes</span>
              </div>
              <div className="dashboard-demo-classes">
                {scheduledClasses.length === 0 ? (
                  <p className="dashboard-empty-state">Add classes for today in Class Information to see them here.</p>
                ) : (
                  scheduledClasses.map((course) => (
                    <div key={course.id} className="dashboard-class-item">
                      <span className="dashboard-class-time">{course.startTime || 'TBA'}</span>
                      <span className="dashboard-class-name">
                        {course.code || course.title}
                        {course.location ? ` - ${course.location}` : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="dashboard-demo-section">
              <div className="dashboard-demo-section-title">
                <GraduationCap size={14} />
                <span>Upcoming Exams</span>
              </div>
              <div className="dashboard-demo-deadlines">
                {upcomingExams.length === 0 ? (
                  <p className="dashboard-empty-state">No upcoming exams yet. Add one in Calendar.</p>
                ) : (
                  upcomingExams.map((event) => (
                    <div key={`${event.date}-${event.time}-${event.title}`} className={`dashboard-deadline-item ${event.priority === 'high' ? 'urgent' : event.priority === 'medium' ? 'warning' : 'calm'}`}>
                      <div className="dashboard-deadline-info">
                        <span className="dashboard-deadline-course">{formatEventLabel(event)}</span>
                        <span className="dashboard-deadline-task">{formatEventSubtitle(event)}</span>
                      </div>
                      <div className="dashboard-deadline-meta">
                        <Clock size={12} />
                        <span>{formatDaysUntil(event.date)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="dashboard-demo-footer">
              <div className="dashboard-demo-stat">
                <span className="dashboard-stat-value">{upcomingDeadlines.length}</span>
                <span className="dashboard-stat-label">Tasks</span>
              </div>
              <div className="dashboard-demo-stat">
                <span className="dashboard-stat-value">{scheduledClasses.length}</span>
                <span className="dashboard-stat-label">Classes</span>
              </div>
              <div className="dashboard-demo-stat">
                <span className="dashboard-stat-value">{upcomingExams.length}</span>
                <span className="dashboard-stat-label">Exam</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
