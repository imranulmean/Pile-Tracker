import { IonApp } from '@ionic/react';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/Pile-Tracker/PrivateRoute';
import AdminDashboard from './pages/Administration/AdminDashboard';
import CreateUser from './pages/Administration/CreateUser';
import Login from './pages/Login';
import PileTracker from './pages/pile-tracker';
export default function App(){

  return(
    <IonApp>
        <BrowserRouter>
          <Routes>
            <Route path='/login' element={<Login/>} />
            <Route path='/administration/createUser' element={<CreateUser/>} />
            <Route element={<PrivateRoute/>}>
              <Route path='/' element={<PileTracker />} />
              <Route path='/pile-tracker' element={<PileTracker />} />
              <Route path='/administration/dashboard' element={<AdminDashboard />} />
            </Route>
          </Routes>        
        </BrowserRouter> 
    </IonApp>  
   
  )
}