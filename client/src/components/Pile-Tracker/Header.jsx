import { LOGO_URI_JS } from "../../seed";
import {
    LogOut,
    LayoutDashboardIcon
  } from "lucide-react";
  import {Link, useNavigate} from 'react-router-dom';

export default function Header(){

    const logout = ()=>{
        localStorage.removeItem('accessToken')
        localStorage.removeItem('userInfo');
        navigate('/login');
    }     

    return(
      <div className="pt-brandbar">
        <Link to='/'>
            <img src={LOGO_URI_JS} alt="NCF — Build with Confidence" />
        </Link>        
        <div className="w-full flex justify-end gap-2">
            <Link to='/administration/dashboard' className="pt-btn pt-btn-ghost">
              <LayoutDashboardIcon size={16} /> Dashboard
            </Link>            
            <button className="pt-btn pt-btn-primary" onClick={() => logout()}>
              <LogOut size={16} /> Log Out
            </button>           
        </div>
      </div>        
    )    
}