import { useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';



export default function PrivateRoute() {

    const accessToken = localStorage.getItem('accessToken')
    return accessToken ? <Outlet /> : <Navigate to='/login' />;
    return <Outlet /> ;
  }