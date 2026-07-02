import fs from "fs";

export const addRouter= async(req, res) =>{
    
    const dataToSave = {
    ...req.body,
    addedBy:req.routerCreds.username,
    branchId: Number(req.body.branchId)
    };
    try {
      const routers = JSON.parse(fs.readFileSync('routers.json', "utf8")).routers;
      const exists = routers.some(r => r.branchId === dataToSave.branchId);
      if (exists) {
        return res.send({ success: false, message: "Branch is already there" });
      }
      routers.push(dataToSave)
      fs.writeFileSync(`routers.json`, JSON.stringify({ routers: routers }, null, 1));
      res.status(200).send({success:true, message: "Branch Added"})      
    } catch (error) {
      res.status(200).send({success:true, message: error})      
    }

}