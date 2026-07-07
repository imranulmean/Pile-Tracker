export const verifyToken = async(req, res, next) => {
    const token = req.headers.authorization;
    if(!token) return res.status(401).json({ success:false, message: "No token" });
    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) {
            return res.status(401).json({ success:false, message: "Unauthorized" });  
        }
        const validUser= await User.findById({_id:user.id});
        if(!validUser){
            return res.status(401).json({ success:false, message: "Unauthorized" });  
        }
        req.user = user;
        next();
    });
  };