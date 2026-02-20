import { useNavigate } from 'react-router-dom'
import { CalendarDays, Calendar, FileText, GraduationCap } from 'lucide-react'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()

  const features = [
    { icon: CalendarDays, title: 'Course Schedule', desc: 'View and manage your courses' },
    { icon: Calendar, title: 'Calendar', desc: 'Personalized schedule' },
    { icon: FileText, title: 'Assignments', desc: 'Track deadlines' },
    { icon: GraduationCap, title: 'Exams', desc: 'Exam schedules' },
  ]

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left" onClick={() => navigate('/')}>
          <div className="logo"><span>CU</span></div>
          <span className="brand">StudentHub</span>
        </div>
        <button className="btn-back" onClick={() => navigate('/')}>
          ← Home
        </button>
      </header>

      <main className="dashboard-main">
        <h2>Welcome to Your Dashboard</h2>
        <p className="subtitle">More features coming soon...</p>

        <div className="feature-grid">
          {features.map((f, i) => {
            const IconComponent = f.icon
            return (
              <div key={i} className="feature-card">
                <div className="feature-icon">
                  <IconComponent size={28} strokeWidth={1.5} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default Dashboard