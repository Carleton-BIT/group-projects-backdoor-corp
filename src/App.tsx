import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import SyllabusPage from './pages/SyllabusPage'
import './App.css'

const basename = import.meta.env.PROD ? '/group-projects-backdoor-corp' : ''

function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/syllabus" element={<SyllabusPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App