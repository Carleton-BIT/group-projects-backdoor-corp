import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getDefaultClasses, saveClasses, subscribeToClasses, type StoredClassInfo } from '../storage';
import './CourseInfo.css';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CourseInfo: React.FC = () => {
    const navigate = useNavigate();

    const [classes, setClasses] = useState<StoredClassInfo[]>(() => getDefaultClasses());
    const [expandedEmptyIds, setExpandedEmptyIds] = useState<number[]>([]);

    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        return subscribeToClasses(uid, setClasses);
    }, []);

    const saveNextClasses = async (nextClasses: StoredClassInfo[]) => {
        const uid = auth.currentUser?.uid;
        setClasses(nextClasses);
        if (uid) {
            await saveClasses(uid, nextClasses);
        }
    };

    const updateClass = async (id: number, field: keyof StoredClassInfo, value: string) => {
        const nextClasses = classes.map((c) => {
            if (c.id !== id) return c;

            const nextClass = { ...c, [field]: value };
            if (field === 'startTime' || field === 'endTime') {
                nextClass.time = [nextClass.startTime, nextClass.endTime].filter(Boolean).join(' - ');
            }

            return nextClass;
        });
        await saveNextClasses(nextClasses);
    };

    const deleteClass = async (id: number) => {
        const defaultClass = getDefaultClasses()[id] ?? getDefaultClasses()[0];
        const nextClasses = classes.map((c) =>
            c.id === id
                ? {
                    ...defaultClass,
                    id,
                  }
                : c
        );
        setExpandedEmptyIds((current) => current.filter((currentId) => currentId !== id));
        await saveNextClasses(nextClasses);
    };

    const hasClassContent = (cls: StoredClassInfo) => {
        return Boolean(
            cls.code.trim() ||
            cls.title.trim() ||
            cls.day.trim() ||
            cls.startTime.trim() ||
            cls.endTime.trim() ||
            cls.location.trim() ||
            cls.profName.trim() ||
            cls.profEmail.trim() ||
            cls.taName.trim() ||
            cls.taEmail.trim()
        );
    };

    const configuredClasses = classes.filter(hasClassContent);
    const nextHiddenEmptyClass = classes.find((cls) => !hasClassContent(cls) && !expandedEmptyIds.includes(cls.id));
    const visibleClasses = classes
        .filter((cls) => hasClassContent(cls) || expandedEmptyIds.includes(cls.id))
        .sort((a, b) => a.id - b.id);

    const addEmptyCourseCard = () => {
        if (!nextHiddenEmptyClass) return;
        setExpandedEmptyIds((current) => [...current, nextHiddenEmptyClass.id]);
    };

    return (
        <div id="ismail-course-info-page">
            <div className="info-shell">
                <header className="info-header">
                    <div className="info-header-top">
                        <button className="back-btn-red" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
                        <div className="info-header-badge">Auto-saving</div>
                    </div>
                    <div className="info-hero">
                        <div>
                            <p className="info-kicker">Course Registry</p>
                            <h1>Keep every class in one clean place</h1>
                            <p className="info-subtitle">
                                Update schedule, room, professor, and TA details here. Changes save automatically and feed the dashboard schedule.
                            </p>
                        </div>
                        <div className="info-summary-card">
                            <span className="info-summary-label">Configured Courses</span>
                            <span className="info-summary-value">{configuredClasses.length}</span>
                            <span className="info-summary-note">
                                {configuredClasses.length === 1 ? 'course saved' : 'courses saved'}
                            </span>
                            {nextHiddenEmptyClass ? (
                                <button className="add-course-btn" type="button" onClick={addEmptyCourseCard}>
                                    + Add Course
                                </button>
                            ) : null}
                        </div>
                    </div>
                </header>

                <div className="info-grid">
                    {visibleClasses.map((cls) => (
                        <section key={cls.id} className="info-card">
                            <div className="info-card-header">
                                <div className="info-card-titleblock">
                                    <span className="info-slot-tag">Slot {cls.id + 1}</span>
                                    <input
                                        className="editable-title"
                                        value={cls.title}
                                        placeholder="Course name"
                                        onChange={(e) => updateClass(cls.id, 'title', e.target.value)}
                                    />
                                </div>
                                <button className="delete-course-btn" type="button" onClick={() => deleteClass(cls.id)}>
                                    Clear
                                </button>
                            </div>

                            <div className="info-card-status">
                                {hasClassContent(cls) ? 'Configured' : 'Empty slot'}
                            </div>

                            <div className="card-fields">
                                <div className="field-row">
                                    <label>Course Identity</label>
                                    <div className="two-up">
                                        <input type="text" placeholder="Course code" value={cls.code} onChange={e => updateClass(cls.id, 'code', e.target.value)} />
                                        <input type="text" placeholder="Section or note" value={cls.location} onChange={e => updateClass(cls.id, 'location', e.target.value)} />
                                    </div>
                                </div>

                                <div className="field-row">
                                    <label>Meeting Time</label>
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
                                </div>

                                <div className="field-row">
                                    <label>Professor</label>
                                    <div className="two-up">
                                        <input type="text" placeholder="Professor name" value={cls.profName} onChange={e => updateClass(cls.id, 'profName', e.target.value)} />
                                        <input type="email" placeholder="Professor email" value={cls.profEmail} onChange={e => updateClass(cls.id, 'profEmail', e.target.value)} />
                                    </div>
                                </div>

                                <div className="field-row">
                                    <label>Teaching Assistant</label>
                                    <div className="two-up">
                                        <input type="text" placeholder="TA name" value={cls.taName} onChange={e => updateClass(cls.id, 'taName', e.target.value)} />
                                        <input type="email" placeholder="TA email" value={cls.taEmail} onChange={e => updateClass(cls.id, 'taEmail', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CourseInfo;
