import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { onAuthStateChanged, type User } from 'firebase/auth'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import SyllabusPage from './pages/SyllabusPage'
import Calendar from './pages/Calendar'
import CourseInfo from './pages/CourseInfo'
import Login from './pages/Login'
import { auth } from './firebase'
import './App.css'

const basename = import.meta.env.PROD ? '/group-projects-backdoor-corp' : ''

function App() {
  const [user, setUser] = useState<User | null>(auth.currentUser)
  const [isAuthReady, setIsAuthReady] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsAuthReady(true)
    })

    return unsubscribe
  }, [])

  if (!isAuthReady) {
    return null
  }

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/syllabus" element={user ? <SyllabusPage /> : <Navigate to="/login" replace />} />
        <Route path="/calendar" element={user ? <Calendar /> : <Navigate to="/login" replace />} />
        <Route path="/course-info" element={user ? <CourseInfo /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
