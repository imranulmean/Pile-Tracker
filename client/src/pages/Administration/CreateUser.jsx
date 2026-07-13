import { Button, Checkbox, Label, TextInput } from "flowbite-react";
import { useEffect, useState } from "react";

export default function CreateUser(){

    const [username, setUsername]=useState('');
    const [password, setPassword]=useState('');
    const [loading, setLoading]= useState(false);
    const [roles, setRoles]=useState([]);
    const accessToken= localStorage.getItem('accessToken')
    const [role, setRole]= useState('admin');
    const BASE_API=import.meta.env.VITE_API_BASE_URL;

    useEffect(()=>{
        getRoles();
    },[])

    const getRoles= async()=>{
        try {
            const res= await fetch(`${BASE_API}/administration/getRoles`,{
                method:"GET",
                headers:{
                    'content-type':"application/json",
                    'authorization' : accessToken
                }                 
            });
            const data = await res.json();
            if(!data.success){
                alert(data.message)
                return;
            }            
            setRoles(data.ROLES);
        } catch (error) {
            alert(error)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();        
        if(!username || !password){
            alert("Fields cannot be null")
            return;
        }
        const obj={username, password, role};
        setLoading(true);
        try {
            const res= await fetch(`${BASE_API}/administration/createUser`,{
                method:"POST",
                headers: { 
                    "Content-Type": "application/json",
                    'authorization' : accessToken
                 },
                body: JSON.stringify(obj)
            })
            const data= await res.json();
            if(!data.success){
                alert(data.message)
                return;
            }
        } catch (error) {
            alert(error)
        }
        finally{
            setLoading(false);
        }
      };    

    return(
        <>
            <div className="flex flex-col w-full h-[100vh]" 
                style={{'justify-content': 'center', 'align-items': 'center', 'background':'url(/login-bg-new.jpg)', 'background-repeat': 'no-repeat', 'background-position': 'center', 'background-size': 'cover' }}>
                <div className="w-full max-w-md bg-white p-10 rounded-lg ">
                    <div className="flex justify-center">
                        {/* <img  src="/watchdog.png" alt="Your Company" class="h-[10rem] w-auto" /> */}
                        <span class="text-cyan-900 self-center text-3xl text-heading font-semibold whitespace-nowrap">Pile Tracker Create User</span>
                    </div>
                    <form className="flex max-w-md flex-col gap-4 mt-4" onSubmit={handleSubmit}>
                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="email1">Username: </Label>
                            </div>
                            <TextInput onChange={(e)=>setUsername(e.target.value)} id="email1" type="text" placeholder="User ID" required 
                            style={{'border':'none', 'border-radius':'0px', 'border-bottom':'1px solid #E5E7EB', 'background':'white', 'box-shadow':'none'}} 
                            />
                        </div>
                        <div>
                            <div className="mb-2 block">
                            <Label htmlFor="password1">Password</Label>
                            </div>
                            <TextInput onChange={(e)=>setPassword(e.target.value)} id="password1" type="password" placeholder="Password" required 
                            style={{'border':'none', 'border-radius':'0px', 'border-bottom':'1px solid #E5E7EB', 'background':'white', 'box-shadow':'none'}} 
                            />
                        </div>
                        <select onChange={(e)=>{ setRole(e.target.value)}}
                                class="block w-full px-3 py-2.5 bg-white-200 border border-gray-200 rounded-lg text-sm focus:ring-green-500 focus:border-green-500 outline:none"> 
                            {
                                roles.map((item)=>{
                                    return(
                                        <>
                                            <option value={item}>{item}</option>
                                        </>
                                    )
                                })
                            }

                        </select>                    
                        {
                            loading && <h1>Processing ...</h1>
                        }
                        {
                            !loading &&
                            <button disabled={loading} type="submit" className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-gray-900 px-4 py-2 text-center text-sm font-medium text-gray-100 hover:bg-cyan-900">Submit</button>
                        }
                    </form>
                </div>
            </div>        
        </>


    )
}