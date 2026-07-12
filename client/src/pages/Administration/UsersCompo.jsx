import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function UsersCompo(){

    const BASE_API=import.meta.env.VITE_API_BASE_URL;
    const accessToken= localStorage.getItem('accessToken')
    const [roles, setRoles]=useState([]);
    const [users, setUsers]= useState([]);
    const [updatedPass, setUpdatedPass] = useState();
    const [updatedRole, setUpdatedRole] = useState();
    const [loading, setLoading] = useState(false);


    useEffect(async()=>{
        await getRoles();
        await getUsers();
    },[])

    const getRoles= async()=>{
        try {
            const res= await fetch(`${BASE_API}/administration/getRoles`);
            const data = await res.json();
            setRoles(data.ROLES);
            console.log(data);
        } catch (error) {
            alert(error)
        }
    } 
    
    const getUsers = async()=>{
        const res= await fetch(`${BASE_API}/administration/getUsers`,{
            method:"GET",
            headers:{
                'content-type':"application/json",
                'authorization' : accessToken
            }            
        })
        const data = await res.json();
        setUsers(data.message)
    }

    const handleSelect=(value,index)=>{
        setUpdatedRole(value)
        const updatedUser=users;
        updatedUser[index]={...updatedUser[index], role:value };
        setUsers(updatedUser);
    }
    const updateUser= async(userId)=>{
        if(!updatedPass && !updatedRole){
            alert("Empty Filed")
            return;
        }
        const obj={userId, updatedPass, updatedRole}
        setLoading(true);
        try {
            const res= await fetch(`${BASE_API}/administration/updateUser`,{
                method:"POST",
                headers: { 
                    "Content-Type": "application/json",
                    "authorization": accessToken
                 },
                body: JSON.stringify(obj)
            })
            const data= await res.json();
            alert(data.message);
        } catch (error) {
            alert(error)
        }
        finally{
            setLoading(false);
            await getUsers();
            setUpdatedPass('')
            setUpdatedRole('')
            document.getElementById(`${userId}-pass`).value="";
        }

    }    

    ///////////////////////
    const getInitials = (name) => name.slice(0, 2).toUpperCase();

    const avatarColors = [
        { bg: 'bg-blue-50',   text: 'text-blue-700' },
        { bg: 'bg-green-50',  text: 'text-green-700' },
        { bg: 'bg-yellow-50', text: 'text-yellow-700' },
        { bg: 'bg-purple-50', text: 'text-purple-700' },
    ];

    const roleBadge = (role) => {
        const map = {
            Admin:  'bg-red-50 text-red-700',
            Moderator:   'bg-green-50 text-green-700',
        };
        return map[role] || 'bg-gray-100 text-gray-600';
    };    
    ////////////////////////    
    
    return (
        <div className="h-[400px] overflow-auto flex flex-col gap-3">

            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="text-sm font-medium">user management</p>
                    <p className="text-xs text-gray-500">update passwords and roles</p>                    
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400">{users.length} users</span>
                    <Link to='/administration/createUser' className="text-xs text-blue-500">Create User</Link>
                </div>

            </div>
            <div className="h-[400px] overflow-auto ">
                {users.map((user, index) => {
                    const color = avatarColors[index % avatarColors.length];
                    return (
                        <div key={user._id}
                            className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-[auto_1fr_1fr_auto] items-center gap-4 hover:bg-gray-50 transition-colors">

                            {/* avatar */}
                            <div className={`w-9 h-9 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-xs font-medium shrink-0`}>
                                {getInitials(user.username)}
                            </div>

                            {/* name + role badge */}
                            <div>
                                <p className="text-sm font-medium">{user.username}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge(user.role)}`}>
                                    {user.role}
                                </span>
                            </div>

                            {/* inputs */}
                            <div className="flex flex-col gap-1.5">
                                <input type="password"  onChange={(e)=>setUpdatedPass(e.target.value)} id={`${user._id}-pass`} placeholder="new password"
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-green-500"
                                />
                                <select value={user.role} onChange={(e) => handleSelect(e.target.value, index)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-green-500"
                                >
                                    {roles.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>

                            {/* save button */}
                            {!loading
                                ? <button onClick={() => updateUser(user._id)}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-100">
                                    save
                                </button>
                                : <p className="text-xs text-gray-400">saving...</p>
                            }

                        </div>
                    );
                })}
            </div>
        </div>
    );
}