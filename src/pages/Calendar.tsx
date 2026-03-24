import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getDefaultClasses, saveCalendarEvents, subscribeToCalendarEvents, subscribeToClasses, type StoredCalendarEvent, type StoredClassInfo } from '../storage';
import './Calendar.css';

// ── Deadline types (same as Dashboard / Home) ──────────────────────────────
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

function loadLocalDeadlines(): LocalDeadline[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
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
  Assignment:   '#3B82F6',
  Quiz:         '#8B5CF6',
  Test:         '#F59E0B',
  Exam:         '#E31C3D',
  Presentation: '#10B981',
  Project:      '#06B6D4',
  'Lab Report': '#F97316',
  Other:        '#6B7280',
}

// ── Main Component ─────────────────────────────────────────────────────────
const Calendar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [date, setDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');
    const [events, setEvents] = useState<StoredCalendarEvent[]>([]);
    const [classes, setClasses] = useState<StoredClassInfo[]>(() => getDefaultClasses());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<StoredCalendarEvent | null>(null);

    // Deadline panel state
    const [showDeadlinePanel, setShowDeadlinePanel] = useState(false);
    const [localDeadlines, setLocalDeadlines] = useState<LocalDeadline[]>([]);

    // Form States
    const [formTitle, setFormTitle] = useState('');
    const [formCourseCode, setFormCourseCode] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formTime, setFormTime] = useState('');
    const [formPriority, setFormPriority] = useState<'high' | 'medium' | 'low'>('high');
    const [formType, setFormType] = useState<'assignment' | 'exam'>('assignment');

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Load local deadlines
    useEffect(() => {
        const load = () => {
            const all = loadLocalDeadlines()
            setLocalDeadlines(all.sort(
                (a, b) => new Date(`${a.dueDate}T00:00:00`).getTime() - new Date(`${b.dueDate}T00:00:00`).getTime()
            ))
        }
        load()
        window.addEventListener('storage', load)
        return () => window.removeEventListener('storage', load)
    }, [])

    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        return subscribeToCalendarEvents(uid, setEvents);
    }, []);

    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        return subscribeToClasses(uid, setClasses);
    }, []);

    useEffect(() => {
        const pendingEvent = (location.state as { editEvent?: StoredCalendarEvent } | null)?.editEvent;
        if (!pendingEvent) return;
        openModalForEdit(pendingEvent);
        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, location.state, navigate]);

    const isSameEvent = (left: StoredCalendarEvent, right: StoredCalendarEvent) => {
        return (
            left.title === right.title &&
            (left.courseCode ?? '') === (right.courseCode ?? '') &&
            left.date === right.date &&
            left.time === right.time &&
            left.priority === right.priority &&
            left.type === right.type &&
            (left.sourceUploadId ?? '') === (right.sourceUploadId ?? '')
        );
    };

    const openModalForDate = (selectedDate?: string) => {
        setEditingEvent(null);
        setFormTitle('');
        setFormCourseCode('');
        setFormDate(selectedDate ?? '');
        setFormTime('');
        setFormPriority('high');
        setFormType('assignment');
        setIsModalOpen(true);
    };

    const openModalForEdit = (event: StoredCalendarEvent) => {
        setEditingEvent(event);
        setFormTitle(event.title);
        setFormCourseCode(event.courseCode ?? '');
        setFormDate(event.date);
        setFormTime(event.time);
        setFormPriority(event.priority);
        setFormType(event.type);
        setIsModalOpen(true);
    };

    const handleSaveEvent = async () => {
        const uid = auth.currentUser?.uid;
        if (formTitle && formDate && uid) {
            const nextEvent = {
                title: formTitle,
                courseCode: formCourseCode.trim(),
                date: formDate,
                time: formTime,
                priority: formPriority,
                type: formType,
                sourceUploadId: editingEvent?.sourceUploadId ?? '',
            };
            const nextEvents = editingEvent
                ? events.map((event) => isSameEvent(event, editingEvent) ? nextEvent : event)
                : [...events, nextEvent];
            setEvents(nextEvents);
            await saveCalendarEvents(uid, nextEvents);
            setIsModalOpen(false);
            setEditingEvent(null);
            setFormTitle(''); setFormCourseCode(''); setFormDate(''); setFormTime(''); setFormType('assignment');
        }
    };

    const formatEventLabel = (event: StoredCalendarEvent) => {
        const baseTitle = event.type === 'exam' ? `Exam: ${event.title}` : event.title;
        return event.courseCode ? `${event.courseCode} - ${baseTitle}` : baseTitle;
    };

    const handleRemoveEvent = async (targetEvent: StoredCalendarEvent) => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const nextEvents = events.filter((event) => !isSameEvent(event, targetEvent));
        setEvents(nextEvents);
        await saveCalendarEvents(uid, nextEvents);
        if (editingEvent && isSameEvent(editingEvent, targetEvent)) {
            setIsModalOpen(false);
            setEditingEvent(null);
        }
    };

    const deleteLocalDeadline = (id: string) => {
        const updated = localDeadlines.filter(d => d.id !== id)
        setLocalDeadlines(updated)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }

    const changeDate = (direction: number) => {
        const newDate = new Date(date);
        if (currentView === 'month') newDate.setMonth(date.getMonth() + direction);
        else {
            const offset = currentView === 'week' ? 7 : currentView === '3day' ? 3 : 1;
            newDate.setDate(date.getDate() + (direction * offset));
        }
        setDate(newDate);
    };

    const renderDays = () => {
        const days = [];
        const m = date.getMonth();
        const y = date.getFullYear();

        if (currentView === 'month') {
            const firstDay = new Date(y, m, 1).getDay();
            const lastDay = new Date(y, m + 1, 0).getDate();
            for (let x = 0; x < firstDay; x++) days.push(<div key={`empty-${x}`} className="empty-day"></div>);
            for (let i = 1; i <= lastDay; i++) days.push(createDayElement(i, m, y));
        } else {
            const span = currentView === 'day' ? 1 : currentView === '3day' ? 3 : 7;
            for (let i = 0; i < span; i++) {
                let d = new Date(date);
                d.setDate(date.getDate() + i);
                days.push(createDayElement(d.getDate(), d.getMonth(), d.getFullYear()));
            }
        }
        return days;
    };

    const createDayElement = (num: number, m: number, y: number) => {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(num).padStart(2, '0')}`;
        const isToday = num === new Date().getDate() && m === new Date().getMonth() && y === new Date().getFullYear();

        return (
            <div key={dateStr} className={`calendar-day ${isToday ? 'today' : ''}`} onClick={() => openModalForDate(dateStr)}>
                <span className="day-num">{num}</span>
                {events.filter(e => e.date === dateStr).map((e, index) => (
                    <div
                        key={index}
                        className={`event-item priority-${e.priority}`}
                        onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            openModalForEdit(e);
                        }}
                    >
                        {formatEventLabel(e)}
                    </div>
                ))}
            </div>
        );
    };

    // Upcoming deadlines split: overdue vs future
    const upcomingDeadlines = localDeadlines.filter(d => getDaysUntil(d.dueDate) >= 0)
    const overdueDeadlines  = localDeadlines.filter(d => getDaysUntil(d.dueDate) < 0)

    return (
        <div id="ismail-calendar-page">
            {/* ── Top Nav ── */}
            <div className="calendar-top-nav">
                <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>

                {/* Deadlines button */}
                <button
                    className="btn-deadlines-toggle"
                    onClick={() => setShowDeadlinePanel(true)}
                >
                    📋 Upcoming Deadlines
                    {upcomingDeadlines.length > 0 && (
                        <span className="deadlines-badge">{upcomingDeadlines.length}</span>
                    )}
                </button>
            </div>

            <div className="calendar-main-container">
                {/* ── Calendar Left ── */}
                <section className="calendar-section">
                    <header className="calendar-header">
                        <div className="month-nav">
                            <button className="nav-arrow" onClick={() => changeDate(-1)}>&larr;</button>
                            <h2>{monthNames[date.getMonth()]} {date.getFullYear()}</h2>
                            <button className="nav-arrow" onClick={() => changeDate(1)}>&rarr;</button>
                        </div>
                        <div className="view-options">
                            {['day', '3day', 'week', 'month'].map(v => (
                                <button key={v} className={`view-btn ${currentView === v ? 'active' : ''}`} onClick={() => setCurrentView(v)}>
                                    {v.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </header>

                    <div className="calendar-grid-wrapper">
                        {currentView === 'month' && (
                            <div className="weekdays-row">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                            </div>
                        )}
                        <div className={`days-grid view-${currentView}`}>{renderDays()}</div>
                    </div>
                </section>

                {/* ── Task Sidebar ── */}
                <aside className="task-sidebar">
                    <h3>Upcoming Tasks</h3>
                    <div className="task-list-container">
                        {events.length === 0 ? (
                            <p className="empty-msg">No tasks added yet.</p>
                        ) : (
                            events.map((e, i) => (
                                <div key={i} className={`task-card p-${e.priority}`}>
                                    <div className="task-card-top">
                                        <strong>{formatEventLabel(e)}</strong>
                                        <div className="task-card-actions">
                                            <button className="task-edit" onClick={() => openModalForEdit(e)}>Edit</button>
                                            <button className="task-remove" onClick={() => handleRemoveEvent(e)}>Remove</button>
                                        </div>
                                    </div>
                                    <span>{e.type === 'exam' ? 'Exam' : 'Assignment'}</span>
                                    <span>{e.date} | {e.time}</span>
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            </div>

            {/* ── Floating Add Button ── */}
            <button className="floating-add" onClick={() => openModalForDate()}>+</button>

            {/* ══════════════════════════════════════════
                UPCOMING DEADLINES POPUP PANEL
            ══════════════════════════════════════════ */}
            {showDeadlinePanel && (
                <div className="cal-dl-overlay" onClick={() => setShowDeadlinePanel(false)}>
                    <div className="cal-dl-panel" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="cal-dl-header">
                            <div className="cal-dl-header-left">
                                <span className="cal-dl-icon">📋</span>
                                <h3>Upcoming Deadlines</h3>
                                {upcomingDeadlines.length > 0 && (
                                    <span className="cal-dl-count">{upcomingDeadlines.length}</span>
                                )}
                            </div>
                            <button className="cal-dl-close" onClick={() => setShowDeadlinePanel(false)}>✕</button>
                        </div>

                        {/* Body */}
                        <div className="cal-dl-body">
                            {localDeadlines.length === 0 ? (
                                <div className="cal-dl-empty">
                                    <p>No deadlines added yet.</p>
                                    <p style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
                                        Go to the Dashboard to add your upcoming deadlines.
                                    </p>
                                    <button
                                        className="cal-dl-go-dashboard"
                                        onClick={() => navigate('/dashboard')}
                                    >
                                        Go to Dashboard →
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Upcoming */}
                                    {upcomingDeadlines.length > 0 && (
                                        <div className="cal-dl-group">
                                            <div className="cal-dl-group-label">Upcoming</div>
                                            {upcomingDeadlines.map(d => {
                                                const urgency = getUrgencyClass(d.dueDate)
                                                const days = getDaysUntil(d.dueDate)
                                                return (
                                                    <div key={d.id} className={`cal-dl-item ${urgency}`}>
                                                        <div className="cal-dl-item-left">
                                                            <span
                                                                className="cal-dl-badge"
                                                                style={{ background: TYPE_COLORS[d.type] }}
                                                            >
                                                                {d.type}
                                                            </span>
                                                            <div className="cal-dl-info">
                                                                <span className="cal-dl-course" style={{ color: TYPE_COLORS[d.type] }}>{d.course}</span>
                                                                <span className="cal-dl-name">{d.name}</span>
                                                                <span className="cal-dl-date">
                                                                    Due: {new Date(`${d.dueDate}T00:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="cal-dl-item-right">
                                                            <span className={`cal-dl-countdown ${urgency}`}>
                                                                {days === 0 ? 'Today!' : `${days}d`}
                                                            </span>
                                                            <button
                                                                className="cal-dl-delete"
                                                                onClick={() => deleteLocalDeadline(d.id)}
                                                                title="Remove deadline"
                                                            >
                                                                🗑
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Overdue */}
                                    {overdueDeadlines.length > 0 && (
                                        <div className="cal-dl-group">
                                            <div className="cal-dl-group-label overdue-label">Overdue</div>
                                            {overdueDeadlines.map(d => (
                                                <div key={d.id} className="cal-dl-item overdue">
                                                    <div className="cal-dl-item-left">
                                                        <span
                                                            className="cal-dl-badge"
                                                            style={{ background: TYPE_COLORS[d.type] }}
                                                        >
                                                            {d.type}
                                                        </span>
                                                        <div className="cal-dl-info">
                                                            <span className="cal-dl-course">{d.course}</span>
                                                            <span className="cal-dl-name">{d.name}</span>
                                                            <span className="cal-dl-date">
                                                                Was due: {new Date(`${d.dueDate}T00:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="cal-dl-item-right">
                                                        <span className="cal-dl-countdown overdue">Overdue</span>
                                                        <button
                                                            className="cal-dl-delete"
                                                            onClick={() => deleteLocalDeadline(d.id)}
                                                            title="Remove deadline"
                                                        >
                                                            🗑
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="cal-dl-footer">
                            <button className="cal-dl-go-dashboard" onClick={() => navigate('/dashboard')}>
                                ＋ Add / Edit Deadlines on Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add/Edit Event Modal ── */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>{editingEvent ? 'Edit Task' : 'Add Task'}</h3>
                        <input type="text" placeholder="Title" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
                        <input
                            type="text"
                            list="calendar-course-codes"
                            placeholder="Course code (e.g. IRM3001)"
                            value={formCourseCode}
                            onChange={e => setFormCourseCode(e.target.value)}
                        />
                        <datalist id="calendar-course-codes">
                            {classes
                                .map((course) => course.code.trim())
                                .filter((code, index, allCodes) => code && allCodes.indexOf(code) === index)
                                .map((code) => <option key={code} value={code} />)}
                        </datalist>
                        <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
                        <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} />
                        <select value={formType} onChange={e => setFormType(e.target.value as 'assignment' | 'exam')}>
                            <option value="assignment">Assignment</option>
                            <option value="exam">Exam</option>
                        </select>
                        <select value={formPriority} onChange={e => setFormPriority(e.target.value as any)}>
                            <option value="high">High (Red)</option>
                            <option value="medium">Medium (Yellow)</option>
                            <option value="low">Low (Green)</option>
                        </select>
                        <div className="modal-btns">
                            {editingEvent ? <button className="delete-btn" onClick={() => handleRemoveEvent(editingEvent)}>Delete</button> : null}
                            <button className="cancel-btn" onClick={() => { setIsModalOpen(false); setEditingEvent(null); }}>Cancel</button>
                            <button className="save-btn" onClick={handleSaveEvent}>{editingEvent ? 'Update' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;