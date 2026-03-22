import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getDefaultClasses, saveClasses, subscribeToClasses, type StoredClassInfo } from '../storage';
import './CourseInfo.css';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CourseInfo: React.FC = () => {
    const navigate = useNavigate();

    const [classes, setClasses] = useState<StoredClassInfo[]>(() => getDefaultClasses());

    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        return subscribeToClasses(uid, setClasses);
    }, []);

    const updateClass = async (id: number, field: keyof StoredClassInfo, value: string) => {
        const uid = auth.currentUser?.uid;
        const nextClasses = classes.map((c) => {
            if (c.id !== id) return c;

            const nextClass = { ...c, [field]: value };
            if (field === 'startTime' || field === 'endTime') {
                nextClass.time = [nextClass.startTime, nextClass.endTime].filter(Boolean).join(' - ');
            }

            return nextClass;
        });
        setClasses(nextClasses);
        if (uid) {
            await saveClasses(uid, nextClasses);
        }
    };

    return (
        <div id="ismail-course-info-page">
            <header className="info-header">
                <button className="back-btn-red" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
                <h1>Course Registry</h1>
                <div className="warning-banner">
                    Course details save automatically and appear on the dashboard schedule.
                </div>
            </header>

            <div className="info-grid">
                {classes.map((cls) => (
                    <div key={cls.id} className="info-card">
                        <input 
                            className="editable-title"
                            value={cls.title}
                            onChange={(e) => updateClass(cls.id, 'title', e.target.value)}
                        />
                        <div className="card-fields">
                            <div className="field-row">
                                <label>Course Code</label>
                                <input type="text" placeholder="e.g. BIT 2000" value={cls.code} onChange={e => updateClass(cls.id, 'code', e.target.value)} />
                            </div>
                            <div className="field-row">
                                <label>Class Schedule</label>
                                <div className="split-inputs">
                                    <select value={cls.day} onChange={e => updateClass(cls.id, 'day', e.target.value)}>
                                        <option value="">Select day</option>
                                        {weekdays.map((day) => (
                                            <option key={day} value={day}>{day}</option>
                                        ))}
                                    </select>
                                    <input type="time" value={cls.startTime} onChange={e => updateClass(cls.id, 'startTime', e.target.value)} />
                                    <input type="time" value={cls.endTime} onChange={e => updateClass(cls.id, 'endTime', e.target.value)} />
                                </div>
                                <input type="text" placeholder="Room/Lab" value={cls.location} onChange={e => updateClass(cls.id, 'location', e.target.value)} />
                            </div>
                            <div className="field-row">
                                <label>Professor Details</label>
                                <input type="text" placeholder="Name" value={cls.profName} onChange={e => updateClass(cls.id, 'profName', e.target.value)} />
                                <input type="email" placeholder="Email" value={cls.profEmail} onChange={e => updateClass(cls.id, 'profEmail', e.target.value)} />
                            </div>
                            <div className="field-row">
                                <label>TA Details</label>
                                <input type="text" placeholder="Name" value={cls.taName} onChange={e => updateClass(cls.id, 'taName', e.target.value)} />
                                <input type="email" placeholder="Email" value={cls.taEmail} onChange={e => updateClass(cls.id, 'taEmail', e.target.value)} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CourseInfo;
