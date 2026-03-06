import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Calendar.css';

// TypeScript Interface for Type Safety
interface CalendarEvent {
    title: string;
    date: string;
    time: string;
    priority: 'high' | 'medium' | 'low';
}

const Calendar: React.FC = () => {
    const navigate = useNavigate();
    const [date, setDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form States for adding new assignments
    const [formTitle, setFormTitle] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formTime, setFormTime] = useState('');
    const [formPriority, setFormPriority] = useState<'high' | 'medium' | 'low'>('high');

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const handleSaveEvent = () => {
        if (formTitle && formDate) {
            setEvents([...events, { title: formTitle, date: formDate, time: formTime, priority: formPriority }]);
            setIsModalOpen(false);
            setFormTitle('');
            setFormDate('');
            setFormTime('');
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
        } else if (currentView === 'day') {
            days.push(createDayElement(date.getDate(), m, y));
        } else {
            const span = currentView === '3day' ? 3 : 7;
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
            <div key={dateStr} className={`calendar-day ${isToday ? 'today' : ''}`}>
                <span className="day-num">{num}</span>
                {events.filter(e => e.date === dateStr).map((e, index) => (
                    <div key={index} className={`event-item priority-${e.priority}`}>
                        {e.time && <span className="event-time">{e.time}</span>} {e.title}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="calendar-page-wrapper">
            {/* Top Navigation Bar */}
            <div className="calendar-top-nav">
                <button className="btn-back" onClick={() => navigate('/dashboard')}>
                    ← Back to Dashboard
                </button>
            </div>

            <div className="calendar-container">
                <div className="calendar-header">
                    <div className="header-left"></div>
                    <div className="month-nav">
                        <button className="nav-arrow" onClick={() => changeDate(-1)}>&larr;</button>
                        <div className="month-text-container">
                            <h2>{monthNames[date.getMonth()]} {date.getFullYear()}</h2>
                        </div>
                        <button className="nav-arrow" onClick={() => changeDate(1)}>&rarr;</button>
                    </div>
                    <div className="view-options">
                        {['day', '3day', 'week', 'month'].map(v => (
                            <button key={v} className={`view-btn ${currentView === v ? 'active' : ''}`} onClick={() => setCurrentView(v)}>
                                {v === '3day' ? '3 Day' : v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {(currentView === 'month' || currentView === 'week') && (
                    <div className="calendar-weekdays">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                    </div>
                )}

                <div className={`calendar-days view-${currentView}`}>
                    {renderDays()}
                </div>
            </div>

            {/* Floating Action Button */}
            <button className="floating-add" onClick={() => setIsModalOpen(true)}>+</button>

            {/* Event Modal */}
            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Add Assignment</h3>
                        <input type="text" placeholder="Assignment Name" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
                        <div className="form-row">
                            <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
                            <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} />
                        </div>
                        <select value={formPriority} onChange={e => setFormPriority(e.target.value as any)}>
                            <option value="high">High Priority (Red)</option>
                            <option value="medium">Medium Priority (Yellow)</option>
                            <option value="low">Low Priority (Green)</option>
                        </select>
                        <div className="modal-buttons">
                            <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="btn-save" onClick={handleSaveEvent}>Add to Calendar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;