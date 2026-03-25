import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { CalendarDays, Calendar, FileText, GraduationCap, Bell, Clock, LayoutDashboard, AlertCircle, BookOpen } from 'lucide-react'
import { auth } from '../firebase'
import { subscribeToCalendarEvents, subscribeToClasses, type StoredCalendarEvent, type StoredClassInfo } from '../storage'
import {
  DEADLINE_TYPE_COLORS,
  formatCountdown,
  formatDeadlineType,
  getStoredEventDeadlineType,
  getUrgencyClass,
  isExamLikeDeadlineType,
} from '../deadlines'
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

  for (const ev of events) {
    const eventDate = new Date(`${ev.date}T00:00:00`)
    if (Number.isNaN(eventDate.getTime())) continue
    const diffDays = Math.round((eventDate.getTime() - today.getTime()) / 86400000)
    const deadlineType = getStoredEventDeadlineType(ev)
    const typeLabel = formatDeadlineType(deadlineType)
    const prefix = ev.courseCode ? `${ev.courseCode} — ` : ''

    if (!isExamLikeDeadlineType(deadlineType) && diffDays === 2) {
      notifications.push({
        id: `assignment-${ev.date}-${ev.title}`,
        type: 'assignment',
        title: ev.title,
        courseCode: ev.courseCode,
        date: ev.date,
        message: `${prefix}${typeLabel}: ${ev.title} is due in 2 days.`,
      })
    }

    if (isExamLikeDeadlineType(deadlineType) && diffDays === 7) {
      notifications.push({
        id: `exam-${ev.date}-${ev.title}`,
        type: 'exam',
        title: ev.title,
        courseCode: ev.courseCode,
        date: ev.date,
        message: `${prefix}${typeLabel}: ${ev.title} is in 1 week.`,
      })
    }
  }

  notifications.sort((a, b) => b.date.localeCompare(a.date))
  return notifications
}

function Dashboard() {
  const navigate = useNavigate()
  const [calendarEvents, setCalendarEvents] = useState<StoredCalendarEvent[]>([])
  const [classes, setClasses] = useState<StoredClassInfo[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const unsubscribeCalendar = subscribeToCalendarEvents(uid, setCalendarEvents)
    const unsubscribeClasses = subscribeToClasses(uid, setClasses)
    return () => { unsubscribeCalendar(); unsubscribeClasses() }
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

  const allUpcomingEvents = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return calendarEvents
      .filter((event) => {
        const date = new Date(`${event.date}T00:00:00`)
        return !Number.isNaN(date.getTime()) && date >= today
      })
      .sort((a, b) => new Date(`${a.date}T${a.time || '23:59'}`).getTime() - new Date(`${b.date}T${b.time || '23:59'}`).getTime())
  }, [calendarEvents])

  const upcomingDeadlines = useMemo(() => {
    return allUpcomingEvents.filter((event) => !isExamLikeDeadlineType(getStoredEventDeadlineType(event))).slice(0, 3)
  }, [allUpcomingEvents])

  const upcomingExams = useMemo(() => {
    return allUpcomingEvents.filter((event) => isExamLikeDeadlineType(getStoredEventDeadlineType(event))).slice(0, 3)
  }, [allUpcomingEvents])

  const activeCourseCodes = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const windowStart = new Date(today)
    windowStart.setDate(windowStart.getDate() - 120)

    const windowEnd = new Date(today)
    windowEnd.setDate(windowEnd.getDate() + 180)

    return new Set(
      calendarEvents
        .filter((event) => {
          const eventDate = new Date(`${event.date}T00:00:00`)
          return !Number.isNaN(eventDate.getTime()) && eventDate >= windowStart && eventDate <= windowEnd
        })
        .map((event) => event.courseCode?.trim().toUpperCase() ?? '')
        .filter(Boolean),
    )
  }, [calendarEvents])

  const scheduledClasses = useMemo(() => {
    const todayName = weekdays[new Date().getDay()]
    const todaysClasses = classes
      .filter((course) => course.day === todayName && (course.code.trim() || course.title.trim() || course.startTime.trim() || course.location.trim()))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    const matchingCurrentTermClasses = todaysClasses.filter((course) => {
      const normalizedCode = course.code.trim().toUpperCase()
      return normalizedCode && activeCourseCodes.has(normalizedCode)
    })

    return (matchingCurrentTermClasses.length > 0 ? matchingCurrentTermClasses : todaysClasses).slice(0, 4)
  }, [activeCourseCodes, classes])

  const notifications = useMemo(() => buildNotifications(calendarEvents), [calendarEvents])

  const hasUnread = useMemo(
    () => notifications.some((n) => !seenIds.has(n.id)),
    [notifications, seenIds]
  )

  const features = [
    { icon: CalendarDays, title: 'Class Information', desc: 'View and manage your course info', path: '/course-info' },
    { icon: Calendar, title: 'Calendar', desc: 'Personalized schedule', path: '/calendar' },
    { icon: FileText, title: 'Assignments', desc: 'Track deadlines', path: '/assignments' },
    { icon: GraduationCap, title: 'Exams', desc: 'Exam schedules', path: '/exams' },
  ]

  const trackedDeadlineCount = allUpcomingEvents.length

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
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="dashboard-feature-card"
                  onClick={() => feature.path && navigate(feature.path)}
                  style={{ cursor: feature.path ? 'pointer' : 'default' }}
                >
                  <div className="dashboard-feature-card-top">
                    <div className="dashboard-feature-icon"><Icon size={32} strokeWidth={1.7} /></div>
                    <span className="dashboard-feature-kicker">Open</span>
                  </div>
                  <div className="dashboard-feature-copy">
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                  </div>
                  <div className="dashboard-feature-card-bottom">
                    <span className="dashboard-feature-link">Go to page</span>
                  </div>
                </div>
              )
            })}

          </div>

          <div className="dashboard-demo-card">
            <div className="dashboard-demo-header">
              <div className="dashboard-demo-title">
                <LayoutDashboard size={18} /><span>Schedule</span>
              </div>
              <span className="dashboard-demo-date">Today</span>
            </div>

            <div className="dashboard-demo-summary">
              <div>
                <strong>{trackedDeadlineCount === 0 ? 'A clear day ahead.' : `${trackedDeadlineCount} upcoming item${trackedDeadlineCount !== 1 ? 's' : ''}.`}</strong>
                <p>
                  {scheduledClasses.length === 0
                    ? 'No classes scheduled for today.'
                    : `${scheduledClasses.length} class${scheduledClasses.length !== 1 ? 'es' : ''} scheduled today.`}
                </p>
              </div>
              <div className="dashboard-summary-count">
                <span>{trackedDeadlineCount}</span>
                <small>Open</small>
              </div>
            </div>

            <div className="dashboard-demo-grid">
              <div className="dashboard-demo-section">
                <div className="dashboard-demo-section-title deadlines">
                  <AlertCircle size={14} /><span>Upcoming Deadlines</span>
                </div>
                <div className="dashboard-demo-deadlines">
                  {upcomingDeadlines.length === 0 ? (
                    <p className="dashboard-empty-state">No upcoming deadlines. Add one from the Calendar page.</p>
                  ) : (
                    upcomingDeadlines.map((event) => {
                      const deadlineType = getStoredEventDeadlineType(event)
                      return (
                        <div key={`${event.date}-${event.time}-${event.title}-${deadlineType}`} className={`dashboard-deadline-item ${getUrgencyClass(event.date)}`}>
                          <div className="dashboard-deadline-info">
                            <span className="dashboard-deadline-course" style={{ color: DEADLINE_TYPE_COLORS[deadlineType] }}>{event.courseCode || 'General'}</span>
                            <span className="dashboard-deadline-task">{event.title}</span>
                            <span
                              className="deadline-type-chip"
                              style={{ background: `${DEADLINE_TYPE_COLORS[deadlineType]}22`, color: DEADLINE_TYPE_COLORS[deadlineType] }}
                            >
                              {formatDeadlineType(deadlineType)}
                            </span>
                          </div>
                          <div className="dashboard-deadline-meta">
                            <Clock size={12} /><span>{formatCountdown(event.date)}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="dashboard-demo-section">
                <div className="dashboard-demo-section-title classes">
                  <BookOpen size={14} /><span>Today's Classes</span>
                </div>
                <div className="dashboard-demo-classes">
                  {scheduledClasses.length === 0
                    ? <p className="dashboard-empty-state">Add classes for today in Class Information.</p>
                    : scheduledClasses.map((course) => (
                      <div key={course.id} className="dashboard-class-item">
                        <span className="dashboard-class-time">{course.startTime || 'TBA'}</span>
                        <span className="dashboard-class-name">{course.code || course.title}{course.location ? ` - ${course.location}` : ''}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="dashboard-demo-section">
                <div className="dashboard-demo-section-title exams">
                  <GraduationCap size={14} /><span>Upcoming Exams</span>
                </div>
                <div className="dashboard-demo-deadlines">
                  {upcomingExams.length === 0 ? (
                    <p className="dashboard-empty-state">No upcoming exams yet. Add one from the Calendar page.</p>
                  ) : (
                    upcomingExams.map((event) => {
                      const deadlineType = getStoredEventDeadlineType(event)
                      return (
                        <div key={`${event.date}-${event.time}-${event.title}-${deadlineType}`} className={`dashboard-deadline-item ${getUrgencyClass(event.date)}`}>
                          <div className="dashboard-deadline-info">
                            <span className="dashboard-deadline-course" style={{ color: DEADLINE_TYPE_COLORS[deadlineType] }}>{event.courseCode || 'General'}</span>
                            <span className="dashboard-deadline-task">{event.title}</span>
                            <span
                              className="deadline-type-chip"
                              style={{ background: `${DEADLINE_TYPE_COLORS[deadlineType]}22`, color: DEADLINE_TYPE_COLORS[deadlineType] }}
                            >
                              {formatDeadlineType(deadlineType)}
                            </span>
                          </div>
                          <div className="dashboard-deadline-meta">
                            <Clock size={12} /><span>{formatCountdown(event.date)}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
