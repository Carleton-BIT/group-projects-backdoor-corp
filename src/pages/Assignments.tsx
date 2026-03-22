import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { subscribeToCalendarEvents, type StoredCalendarEvent } from '../storage'
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
      .filter((event) => event.type === 'assignment')
      .sort((a, b) => {
        const left = new Date(`${a.date}T${a.time || '23:59'}`).getTime()
        const right = new Date(`${b.date}T${b.time || '23:59'}`).getTime()
        return left - right
      })
  }, [events])

  return (
    <div className="items-page">
      <header className="items-header">
        <button className="items-back" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
        <div>
          <h1>Assignments</h1>
          <p>Assignment deadlines synced from your calendar.</p>
        </div>
      </header>

      <div className="items-list">
        {assignments.length === 0 ? (
          <p className="items-empty">No assignments yet. Add one from Calendar.</p>
        ) : (
          assignments.map((event) => (
            <article key={`${event.date}-${event.time}-${event.title}`} className={`items-card ${event.priority}`}>
              <div>
                <h2>{event.title}</h2>
                <p>{event.date}{event.time ? ` at ${event.time}` : ''}</p>
              </div>
              <span className="items-type">Assignment</span>
            </article>
          ))
        )}
      </div>
    </div>
  )
}

export default Assignments
