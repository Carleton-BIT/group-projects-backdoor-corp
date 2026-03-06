import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import SyllabusPage from './pages/SyllabusPage'
import Calendar from './pages/Calendar' // 1. Added your import
import './App.css'

const basename = import.meta.env.PROD ? '/group-projects-backdoor-corp' : ''

function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/syllabus" element={<SyllabusPage />} />
        <Route path="/calendar" element={<Calendar />} /> {/* 2. Added your route */}
      </Routes>
    </BrowserRouter>
  )
}

export default App