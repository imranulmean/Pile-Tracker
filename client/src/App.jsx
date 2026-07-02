import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PileTracker from './pages/pile-tracker';
export default function App(){

  return(
    <BrowserRouter>
      <Routes>        
        <Route path='/' element={<PileTracker />} />
        <Route path='/pile-tracker' element={<PileTracker />} />
      </Routes>        
    </BrowserRouter>    
  )
}