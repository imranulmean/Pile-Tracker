import { useEffect, useState } from "react";
import UsersCompo from "./UsersCompo";

export default function AdminDashboard(){
    let {role} = JSON.parse(localStorage.getItem('userInfo')) || {};
    return(        
        <>         
            <div className="p-4 flex gap-2">
                {
                    role=='admin' && <UsersCompo/>
                } 
            </div>            
        </>
    )
}