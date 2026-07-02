import crypto from "crypto";
import { Client } from "ssh2";

export const sessions={};

function createSession(username, password){
    const token= crypto.randomUUID();
    sessions[token]= {username, password};
    return token;

}
export const getSession=(token)=>{
    return sessions[token];
}
function deleteSession(token){
    delete sessions[token];
}

export const socketSession = (token)=>{
    return sessions[token];
}

export const checkSession = async(req, res)=>{
    const session = getSession(req.params.token);
    if(!session) return res.status(404).send({success:false, error: "session not found"})
    res.status(200).send({success:true})    
}

function routerAuth(username, password) {
    return new Promise((resolve) => {
      const conn = new Client(); 
      conn.on("ready", () => {
        resolve(true);
        conn.end(); 
      }).on("error", err => {
        resolve(false)
      }).connect({
        host: '10.20.0.2',
        username: username,
        password: password,
        readyTimeout: 10000,
        algorithms: {
            kex: ["diffie-hellman-group14-sha1", "diffie-hellman-group1-sha1"],
            cipher: ["aes128-cbc", "aes256-cbc", "aes128-ctr", "aes256-ctr"],
            serverHostKey: ["ssh-rsa"]
        }
      });
    });
  }

export const authMiddleware= (req, res, next) =>{
    const token = req.headers.authorization;
    if(!token) return res.status(401).json({ tokenSuccess:false, message: "No token" });
    const session = getSession(token);
    if (!session) return res.status(401).json({ tokenSuccess:false, message: "Invalid token" });
    req.routerCreds = session;
    next();
}

export const loginController = async(req, res)=>{
    const {username, password} = req.body;    
    const ok= await routerAuth(username, password)
    if(!ok) return res.status(401).json({ success:false, error: "Invalid User" });
    const sessionToken=createSession(username, password);
    res.status(200).send({ success:true, sessionToken })
}

export const logout = async (req, res) =>{
  const token = req.headers.authorization;
  deleteSession(token)
  res.status(200).send({ success:true });
}