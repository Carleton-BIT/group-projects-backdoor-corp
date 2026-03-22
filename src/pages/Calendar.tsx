import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { saveCalendarEvents, subscribeToCalendarEvents, type StoredCalendarEvent } from '../storage';
import './Calendar.css';

const Calendar: React.FC = () => {
    const navigate = useNavigate();
    const [date, setDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');
    const [events, setEvents] = useState<StoredCalendarEvent[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form States
    const [formTitle, setFormTitle] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formTime, setFormTime] = useState('');
    const [formPriority, setFormPriority] = useState<'high' | 'medium' | 'low'>('high');
    const [formType, setFormType] = useState<'assignment' | 'exam'>('assignment');

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        return subscribeToCalendarEvents(uid, setEvents);
    }, []);

    const openModalForDate = (selectedDate?: string) => {
        setFormDate(selectedDate ?? '');
        setIsModalOpen(true);
    };

    const handleSaveEvent = async () => {
        const uid = auth.currentUser?.uid;
        if (formTitle && formDate && uid) {
            const nextEvents = [...events, { title: formTitle, date: formDate, time: formTime, priority: formPriority, type: formType }];
            setEvents(nextEvents);
            await saveCalendarEvents(uid, nextEvents);
            setIsModalOpen(false);
            setFormTitle(''); setFormDate(''); setFormTime(''); setFormType('assignment');
        }
    };

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
                    <div key={index} className={`event-item priority-${e.priority}`}>{e.title}</div>
                ))}
            </div>
        );
    };

    return (
        <div id="ismail-calendar-page">
            <div className="calendar-top-nav">
                <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
            </div>

            <div className="calendar-main-container">
                {}
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

                {}
                <aside className="task-sidebar">
                    <h3>Upcoming Tasks</h3>
                    <div className="task-list-container">
                        {events.length === 0 ? (
                            <p className="empty-msg">No tasks added yet.</p>
                        ) : (
                            events.map((e, i) => (
                                <div key={i} className={`task-card p-${e.priority}`}>
                                    <strong>{e.title}</strong>
                                    <span>{e.type === 'exam' ? 'Exam' : 'Assignment'}</span>
                                    <span>{e.date} | {e.time}</span>
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            </div>

            <button className="floating-add" onClick={() => openModalForDate()}>+</button>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>Add Task</h3>
                        <input type="text" placeholder="Title" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
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
                            <button className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="save-btn" onClick={handleSaveEvent}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
