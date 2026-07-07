import { useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';



export default function PrivateRoute() {

    const sessionToken = localStorage.getItem('sessionToken')
    // return sessionToken ? <Outlet /> : <Navigate to='/login' />;
    return <Outlet /> ;
  }