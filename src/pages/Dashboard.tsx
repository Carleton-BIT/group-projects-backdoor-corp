import { useNavigate } from 'react-router-dom'
import { CalendarDays, Calendar, FileText, GraduationCap } from 'lucide-react'
import './Dashboard.css'

// For scrum 12 I will add my functions
type Deadline = {
  id: number
  title: string
  course: string
  dueDate: string
}
// end of edit 

function Dashboard() {
  const navigate = useNavigate()

// For scrum 12 upcoming deadlines add:
  // EXAMPLE DEADLINES can edit later
  const deadlines: Deadline[] = [
  {
    id: 1,
    title: "Assignment 2",
    course: "SYSC 2006",
    dueDate: "2026-02-24"
  },
  {
    id: 2,
    title: "Midterm Exam",
    course: "COMP 2402",
    dueDate: "2026-02-28"
  },
  {
    id: 3,
    title: "Project Milestone",
    course: "BIT 3000",
    dueDate: "2026-03-05"
  }
]

// This will sort deadlines from closer deadlines to later deadlines
  // Also sorts by days left
  const sortedDeadlines = deadlines.sort(
  (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
)

const getDaysRemaining = (date: string) => {
  const today = new Date()
  const due = new Date(date)
  const diff = due.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
  // End
  
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


{/* scrum12 Upcoming Deadlines */}
        <section className="upcoming-deadlines">
  <h3>Upcoming Deadlines</h3>

  {sortedDeadlines.map((deadline) => (
    <div key={deadline.id} className="deadline-card">
      <div>
        <strong>{deadline.course}</strong> — {deadline.title}
      </div>
      <div>
        {getDaysRemaining(deadline.dueDate)} days left
      </div>
    </div>
  ))}
</section>
  // End
        
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
