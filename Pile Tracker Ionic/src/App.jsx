import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/Pile-Tracker/PrivateRoute';
import Login from './pages/Login';
import PileTracker from './pages/pile-tracker';
export default function App(){

  return(
    <BrowserRouter>
      <Routes>
        <Route path='/login' element={<Login/>} />
        <Route element={<PrivateRoute/>}>
          <Route path='/' element={<PileTracker />} />
          <Route path='/pile-tracker' element={<PileTracker />} />
        </Route>
      </Routes>        
    </BrowserRouter>    
  )
}