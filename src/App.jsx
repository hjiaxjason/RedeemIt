import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import CardDetail from './pages/CardDetail'
import AddCard from './pages/AddCard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/card/:id" element={<CardDetail />} />
        <Route path="/add" element={<AddCard />} />
      </Routes>
    </BrowserRouter>
  )
}