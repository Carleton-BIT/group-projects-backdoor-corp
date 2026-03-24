import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { 
  LayoutDashboard, 
  Calendar, 
  FileText, 
  GraduationCap,
  Bell,
  Clock,
  BookOpen,
  AlertCircle,
  Upload,
  FolderKanban
} from 'lucide-react'
import { auth } from '../firebase'
import './Home.css'

function Home() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth.currentUser))

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user))
    })

    return unsubscribe
  }, [])

  // Handle click on nav links
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault()
    window.history.pushState(null, '', hash)
    scrollToSection(hash)
    setMenuOpen(false)
  }

  const handleLaunchApp = () => {
    navigate(isAuthenticated ? '/dashboard' : '/login')
  }

  const features = [
    {
      icon: LayoutDashboard,
      title: 'Dashboard',
      description: 'See your deadlines, class schedule, and exam snapshot in one place.'
    },
    {
      icon: Calendar,
      title: 'Calendar',
      description: 'Track upcoming and overdue items with editable deadline cards and rich types.'
    },
    {
      icon: FileText,
      title: 'Assignments',
      description: 'Keep papers, projects, labs, and presentations organized outside the exam list.'
    },
    {
      icon: GraduationCap,
      title: 'Exams',
      description: 'Separate quizzes, tests, and exams from other coursework so review is clearer.'
    },
    {
      icon: Upload,
      title: 'Syllabus Import',
      description: 'Upload a PDF syllabus, review what was parsed, and import it into your calendar.'
    },
    {
      icon: FolderKanban,
      title: 'Course Info',
      description: 'Store meeting times, locations, and instructor details for each class slot.'
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
            <button className="btn-primary" onClick={handleLaunchApp}>
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
          <button className="btn-primary" onClick={handleLaunchApp}>
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
              <button className="btn-primary large" onClick={handleLaunchApp}>
                {isAuthenticated ? 'Open Dashboard' : 'Get Started'}
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
                  <span>StudentHub</span>
                </div>
                <span className="demo-date">Today</span>
              </div>

              <div className="demo-summary">
                <div>
                  <strong>3 upcoming items.</strong>
                  <p>2 classes scheduled today and 1 exam this week.</p>
                </div>
                <div className="demo-summary-count">
                  <span>3</span>
                  <small>Open</small>
                </div>
              </div>

              <div className="demo-grid">
                <div className="demo-section">
                  <div className="demo-section-title deadlines">
                    <AlertCircle size={14} />
                    <span>Upcoming Deadlines</span>
                  </div>
                  <div className="demo-deadlines">
                    <div className="deadline-item urgent">
                      <div className="deadline-info">
                        <span className="deadline-course">COMP 3004</span>
                        <span className="deadline-task">Research Paper Draft</span>
                        <span className="deadline-chip assignment">Assignment</span>
                      </div>
                      <div className="deadline-meta">
                        <Clock size={12} />
                        <span>2 days</span>
                      </div>
                    </div>
                    <div className="deadline-item warning">
                      <div className="deadline-info">
                        <span className="deadline-course">PSYC 2002</span>
                        <span className="deadline-task">Pre-final Presentation</span>
                        <span className="deadline-chip presentation">Presentation</span>
                      </div>
                      <div className="deadline-meta">
                        <Clock size={12} />
                        <span>4 days</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="demo-section">
                  <div className="demo-section-title classes">
                    <BookOpen size={14} />
                    <span>Today's Classes</span>
                  </div>
                  <div className="demo-classes">
                    <div className="class-item">
                      <span className="class-time">10:00 AM</span>
                      <span className="class-name">COMP 3004 - Azrieli Theatre</span>
                    </div>
                    <div className="class-item">
                      <span className="class-time">2:00 PM</span>
                      <span className="class-name">PSYC 2002 - Loeb B146</span>
                    </div>
                  </div>
                </div>

                <div className="demo-section">
                  <div className="demo-section-title exams">
                    <Bell size={14} />
                    <span>Upcoming Exams</span>
                  </div>
                  <div className="demo-deadlines">
                    <div className="deadline-item warning">
                      <div className="deadline-info">
                        <span className="deadline-course">STAT 2507</span>
                        <span className="deadline-task">Quiz 4</span>
                        <span className="deadline-chip exam">Quiz</span>
                      </div>
                      <div className="deadline-meta">
                        <Clock size={12} />
                        <span>6 days</span>
                      </div>
                    </div>
                  </div>
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
          <button className="btn-primary large light" onClick={() => navigate('/login')}>
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
