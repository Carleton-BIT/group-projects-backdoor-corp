import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  FileText, 
  Bot, 
  Bell,
  Clock,
  BookOpen,
  AlertCircle
} from 'lucide-react'
import './Home.css'

function Home() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  // Smooth scroll to section with offset
  const scrollToSection = (hash: string) => {
    if (hash === '#hero' || hash === '#') {
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const element = document.querySelector(hash)
    if (element) {
      const navHeight = 64
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - navHeight
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  // Handle hash scroll offset on load
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      setTimeout(() => scrollToSection(hash), 100)
    }
  }, [])

  // Handle click on nav links
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault()
    window.history.pushState(null, '', hash)
    scrollToSection(hash)
    setMenuOpen(false)
  }

  const features = [
    {
      icon: LayoutDashboard,
      title: 'Dashboard',
      description: 'Centralized hub for all academic information from Brightspace and Carleton Central.'
    },
    {
      icon: Calendar,
      title: 'Calendar',
      description: 'Sync schedules, add assignments, exams, and important dates with smart reminders.'
    },
    {
      icon: CheckSquare,
      title: 'Tasks',
      description: 'Track assignments and projects with progress tracking and priority levels.'
    },
    {
      icon: FileText,
      title: 'Notes',
      description: 'Store lecture notes, create study guides, and share resources with classmates.'
    },
    {
      icon: Bot,
      title: 'AI Assistant',
      description: 'Get instant answers to academic questions with smart chatbot support.'
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Personalized alerts for deadlines, grade updates, and announcements.'
    }
  ]

  return (
    <div className="home">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-brand">
            <div className="logo">
              <span>CU</span>
            </div>
            <span className="brand-name">StudentHub</span>
          </div>

          <div className="nav-links-desktop">
            <a href="#hero" onClick={(e) => handleNavClick(e, '#hero')}>Home</a>
            <a href="#features" onClick={(e) => handleNavClick(e, '#features')}>Features</a>
            <a href="#about" onClick={(e) => handleNavClick(e, '#about')}>About</a>
            <a href="#contact" onClick={(e) => handleNavClick(e, '#contact')}>Contact</a>
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>
              Launch App
            </button>
          </div>

          <button 
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={menuOpen ? 'open' : ''}></span>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`nav-mobile ${menuOpen ? 'open' : ''}`}>
          <a href="#hero" onClick={(e) => handleNavClick(e, '#hero')}>Home</a>
          <a href="#features" onClick={(e) => handleNavClick(e, '#features')}>Features</a>
          <a href="#about" onClick={(e) => handleNavClick(e, '#about')}>About</a>
          <a href="#contact" onClick={(e) => handleNavClick(e, '#contact')}>Contact</a>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero" id="hero">
        <div className="hero-bg">
          <div className="gradient-orb"></div>
        </div>
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-tag">
              <span>Built for Carleton Students</span>
            </div>
            <h1>
              Your Academic Life
              <br />
              <span className="accent">Simplified</span>
            </h1>
            <p>
              The all-in-one platform integrating Brightspace, Carleton Central,
              and your academic tools. Manage courses, track deadlines, stay organized.
            </p>
            <div className="hero-actions">
              <button className="btn-primary large" onClick={() => navigate('/dashboard')}>
                Get Started
              </button>
              <button className="btn-secondary">
                Learn More
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="demo-card">
              <div className="demo-header">
                <div className="demo-title">
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </div>
                <span className="demo-date">Today</span>
              </div>

              <div className="demo-section">
                <div className="demo-section-title">
                  <AlertCircle size={14} />
                  <span>Upcoming Deadlines</span>
                </div>
                <div className="demo-deadlines">
                  <div className="deadline-item urgent">
                    <div className="deadline-info">
                      <span className="deadline-course">COMP 3004</span>
                      <span className="deadline-task">Assignment 3</span>
                    </div>
                    <div className="deadline-meta">
                      <Clock size={12} />
                      <span>2 days</span>
                    </div>
                  </div>
                  <div className="deadline-item warning">
                    <div className="deadline-info">
                      <span className="deadline-course">SYSC 4001</span>
                      <span className="deadline-task">Project Report</span>
                    </div>
                    <div className="deadline-meta">
                      <Clock size={12} />
                      <span>5 days</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="demo-section">
                <div className="demo-section-title">
                  <BookOpen size={14} />
                  <span>Today's Classes</span>
                </div>
                <div className="demo-classes">
                  <div className="class-item">
                    <span className="class-time">10:00 AM</span>
                    <span className="class-name">COMP 3004 - Lecture</span>
                  </div>
                  <div className="class-item">
                    <span className="class-time">2:00 PM</span>
                    <span className="class-name">SYSC 4001 - Tutorial</span>
                  </div>
                </div>
              </div>

              <div className="demo-footer">
                <div className="demo-stat">
                  <span className="stat-value">4</span>
                  <span className="stat-label">Tasks</span>
                </div>
                <div className="demo-stat">
                  <span className="stat-value">2</span>
                  <span className="stat-label">Classes</span>
                </div>
                <div className="demo-stat">
                  <span className="stat-value">1</span>
                  <span className="stat-label">Exam</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="section-inner">
          <div className="section-header">
            <span className="tag">Features</span>
            <h2>Everything You Need</h2>
            <p>Powerful tools designed for Carleton students</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => {
              const IconComponent = f.icon
              return (
                <div key={i} className="feature-card">
                  <div className="feature-icon">
                    <IconComponent size={20} strokeWidth={2} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="about" id="about">
        <div className="section-inner">
          <div className="about-content">
            <span className="tag">About</span>
            <h2>Built by Students, For Students</h2>
            <p>
              StudentHub was created to make academic life at Carleton University easier.
              A unified platform bringing everything together.
            </p>
            <ul className="about-list">
              <li><span className="check"></span>Seamless Brightspace & Carleton Central integration</li>
              <li><span className="check"></span>Real-time updates and notifications</li>
              <li><span className="check"></span>Secure and private—your data stays yours</li>
              <li><span className="check"></span>Mobile-friendly design</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta" id="contact">
        <div className="cta-inner">
          <h2>Ready to Get Started?</h2>
          <p>Join thousands of Carleton students using StudentHub</p>
          <button className="btn-primary large light" onClick={() => navigate('/dashboard')}>
            Launch Dashboard
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="logo small"><span>CU</span></div>
            <span>StudentHub</span>
          </div>
          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
            <a href="#">Support</a>
          </div>
          <p className="copyright">© 2026 StudentHub. Built for Carleton University Students.</p>
        </div>
      </footer>
    </div>
  )
}

export default Home