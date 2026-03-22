import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CourseInfo.css';

interface ClassData {
    id: number;
    title: string;
    code: string;
    time: string;
    location: string;
    profName: string;
    profEmail: string;
    taName: string;
    taEmail: string;
}

const CourseInfo: React.FC = () => {
    const navigate = useNavigate();

    // Start with 6 blank slots
    const [classes, setClasses] = useState<ClassData[]>(
        Array.from({ length: 6 }, (_, i) => ({
            id: i,
            title: `Class ${i + 1}`,
            code: '', time: '', location: '',
            profName: '', profEmail: '',
            taName: '', taEmail: ''
        }))
    );

    const updateClass = (id: number, field: keyof ClassData, value: string) => {
        setClasses(classes.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    // The logic to warn users before they lose their progress
    const handleBack = () => {
        const confirmLeave = window.confirm("⚠️ ATTENTION: Your progress will be lost! Data is not saved on this page. Do you still want to return to the Dashboard?");
        if (confirmLeave) {
            navigate('/dashboard');
        }
    };

    return (
        <div id="ismail-course-info-page">
            <header className="info-header">
                <button className="back-btn-red" onClick={handleBack}>← Back to Dashboard</button>
                <h1>Course Registry</h1>
                <div className="warning-banner">
                    Note: Information entered here is temporary for this session.
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
                                <label>Time & Location</label>
                                <input type="text" placeholder="Time" value={cls.time} onChange={e => updateClass(cls.id, 'time', e.target.value)} />
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