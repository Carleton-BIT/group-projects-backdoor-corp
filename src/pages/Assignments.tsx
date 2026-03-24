import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { saveCalendarEvents, subscribeToCalendarEvents, type StoredCalendarEvent } from '../storage'
import { DEADLINE_TYPE_COLORS, formatCountdown, formatDeadlineType, getDaysUntil, getStoredEventDeadlineType, isExamLikeDeadlineType, isSameCalendarEvent } from '../deadlines'
import './ItemsPage.css'

function Assignments() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<StoredCalendarEvent[]>([])

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    return subscribeToCalendarEvents(uid, setEvents)
  }, [])

  const assignments = useMemo(() => {
    return events
      .filter((event) => !isExamLikeDeadlineType(getStoredEventDeadlineType(event)))
      .sort((a, b) => new Date(`${a.date}T${a.time || '23:59'}`).getTime() - new Date(`${b.date}T${b.time || '23:59'}`).getTime())
  }, [events])

  const upcomingAssignments = useMemo(() => assignments.filter((event) => getDaysUntil(event.date) >= 0), [assignments])
  const overdueAssignments = useMemo(() => assignments.filter((event) => getDaysUntil(event.date) < 0), [assignments])

  const handleEdit = (targetEvent: StoredCalendarEvent) => {
    navigate('/calendar', { state: { editEvent: targetEvent } })
  }

  const handleRemove = async (targetEvent: StoredCalendarEvent) => {
    const uid = auth.currentUser?.uid
    if (!uid) return

    const nextEvents = events.filter((event) => !isSameCalendarEvent(event, targetEvent))
    setEvents(nextEvents)
    await saveCalendarEvents(uid, nextEvents)
  }

  return (
    <div className="items-page">
      <header className="items-header">
        <button className="items-back" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
        <div>
          <h1>Assignments</h1>
          <p>Assignments, projects, presentations, and other non-exam deadlines synced from your calendar.</p>
        </div>
      </header>

      <div className="items-list">
        {assignments.length === 0 ? (
          <p className="items-empty">No assignment-style deadlines yet. Add one from Calendar or Upcoming Deadlines.</p>
        ) : (
          <>
            {upcomingAssignments.length > 0 ? (
              <section className="items-group">
                <div className="items-group-label">Upcoming</div>
                {upcomingAssignments.map((event) => {
                  const deadlineType = getStoredEventDeadlineType(event)
                  return (
                    <article key={`${event.date}-${event.time}-${event.title}-${deadlineType}`} className={`items-card ${event.priority}`}>
                      <div>
                        <h2>{event.courseCode ? `${event.courseCode} - ${event.title}` : event.title}</h2>
                        <p>{event.date}{event.time ? ` at ${event.time}` : ''} · {formatCountdown(event.date)}</p>
                      </div>
                      <div className="items-actions">
                        <span
                          className="items-type"
                          style={{
                            color: DEADLINE_TYPE_COLORS[deadlineType],
                            background: `${DEADLINE_TYPE_COLORS[deadlineType]}22`,
                            borderColor: `${DEADLINE_TYPE_COLORS[deadlineType]}66`,
                          }}
                        >
                          {formatDeadlineType(deadlineType)}
                        </span>
                        <button className="items-edit" onClick={() => handleEdit(event)}>Edit</button>
                        <button className="items-remove" onClick={() => void handleRemove(event)}>Remove</button>
                      </div>
                    </article>
                  )
                })}
              </section>
            ) : null}

            {overdueAssignments.length > 0 ? (
              <section className="items-group">
                <div className="items-group-label overdue">Overdue</div>
                {overdueAssignments.map((event) => {
                  const deadlineType = getStoredEventDeadlineType(event)
                  return (
                    <article key={`${event.date}-${event.time}-${event.title}-${deadlineType}-overdue`} className={`items-card overdue ${event.priority}`}>
                      <div>
                        <h2>{event.courseCode ? `${event.courseCode} - ${event.title}` : event.title}</h2>
                        <p>{event.date}{event.time ? ` at ${event.time}` : ''} · {formatCountdown(event.date)}</p>
                      </div>
                      <div className="items-actions">
                        <span
                          className="items-type"
                          style={{
                            color: DEADLINE_TYPE_COLORS[deadlineType],
                            background: `${DEADLINE_TYPE_COLORS[deadlineType]}22`,
                            borderColor: `${DEADLINE_TYPE_COLORS[deadlineType]}66`,
                          }}
                        >
                          {formatDeadlineType(deadlineType)}
                        </span>
                        <button className="items-edit" onClick={() => handleEdit(event)}>Edit</button>
                        <button className="items-remove" onClick={() => void handleRemove(event)}>Remove</button>
                      </div>
                    </article>
                  )
                })}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export default Assignments
