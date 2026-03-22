import { useNavigate } from 'react-router-dom'
// react hooks not needed in this file
import { CalendarDays, Calendar, FileText, GraduationCap, Bell, Clock, LayoutDashboard, AlertCircle, BookOpen } from 'lucide-react'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()

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
    { icon: FileText, title: 'Assignments', desc: 'Track deadlines' },
    { icon: GraduationCap, title: 'Exams', desc: 'Exam schedules' },
  ]

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div className="logo"><span>CU</span></div>
          <span className="brand">StudentHub</span>
        </div>
        <button className="btn-back" onClick={() => navigate('/')}>
          ← Home
        </button>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-title-row">
          <h2>Welcome to Your Dashboard</h2>
          <div className="title-actions">
            <button className="btn-syllabus-top" onClick={() => navigate('/syllabus')}>Add Syllabus</button>
            <button className="btn-notify">
              <Bell size={26} strokeWidth={1.5} />
            </button>
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
                <div className="dashboard-deadline-item urgent">
                  <div className="dashboard-deadline-info">
                    <span className="dashboard-deadline-course">COMP 3004</span>
                    <span className="dashboard-deadline-task">Assignment 3</span>
                  </div>
                  <div className="dashboard-deadline-meta">
                    <Clock size={12} />
                    <span>2 days</span>
                  </div>
                </div>
                <div className="dashboard-deadline-item warning">
                  <div className="dashboard-deadline-info">
                    <span className="dashboard-deadline-course">SYSC 4001</span>
                    <span className="dashboard-deadline-task">Project Report</span>
                  </div>
                  <div className="dashboard-deadline-meta">
                    <Clock size={12} />
                    <span>5 days</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-demo-section">
              <div className="dashboard-demo-section-title">
                <BookOpen size={14} />
                <span>Today's Classes</span>
              </div>
              <div className="dashboard-demo-classes">
                <div className="dashboard-class-item">
                  <span className="dashboard-class-time">10:00 AM</span>
                  <span className="dashboard-class-name">COMP 3004 - Lecture</span>
                </div>
                <div className="dashboard-class-item">
                  <span className="dashboard-class-time">2:00 PM</span>
                  <span className="dashboard-class-name">SYSC 4001 - Tutorial</span>
                </div>
              </div>
            </div>

            <div className="dashboard-demo-footer">
              <div className="dashboard-demo-stat">
                <span className="dashboard-stat-value">2</span>
                <span className="dashboard-stat-label">Tasks</span>
              </div>
              <div className="dashboard-demo-stat">
                <span className="dashboard-stat-value">2</span>
                <span className="dashboard-stat-label">Classes</span>
              </div>
              <div className="dashboard-demo-stat">
                <span className="dashboard-stat-value">0</span>
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