import RouterLog from '../models/routerLog.model.js';
import SessionLog from '../models/sessionLog.model.js';
import DownTimeLog from '../models/downtime.model.js';
import fs from "fs";
import XLSX from 'xlsx'
import moment from 'moment';

function buildDocs(routers, cycleEndDate) {

  const lastUpTime = moment(cycleEndDate, "DD-MM-YYYY").hour(23).minute(59).second(0);
  let downTimeLogDate;
  const docs = [];

  routers.forEach(item => {
      const result = item.result;
      if(result.branchType !=='branch' && result.branchType !=='sub') return;
      downTimeLogDate = result.logDate;
      const base = {
          logDate:    new Date(result.logDate),
          id:   result.branchId,
          branchName:     result.router,
          branchType: result.branchType,
          host:       result.host,
      };

      ['isp1', 'isp2'].forEach(ispKey => {
          const isp = result.results[ispKey];
          const downTimes = isp.downTimes;
          const upTimes = [...isp.upTimes]; // copy to avoid mutation

          if (downTimes.length === 0) return; // no outages, skip

          // pad missing uptimes with last day 11:59pm
          while (upTimes.length < downTimes.length) {
              upTimes.push(lastUpTime.format("MMMM Do YYYY, h:mm:ss a"));
          }

          for (let i = 0; i < downTimes.length; i++) {

            const down = moment(downTimes[i], "MMMM Do YYYY, h:mm:ss a");
            const up   = moment(upTimes[i],   "MMMM Do YYYY, h:mm:ss a");
            // const thresoldTime= moment(cycleEndDate, "DD-MM-YYYY").hour(16).minute(30).second(0)
            const thresoldTime= down.clone().hour(16).minute(30).second(0)
            if (!down.isValid() || !up.isValid()) continue;
            if(down.isAfter(thresoldTime)) continue;
            const durationMins = up.diff(down, 'minutes');
            if (!down.isValid() || !up.isValid()) continue;
            if (durationMins <= 30) continue;       
            docs.push({
                ...base,
                ispName: isp.name,
                downAt: down.toDate(),
                upAt:   up.toDate(),
                totalDownTime:durationMins
            });
          }
      });
  });

  return {docs, downTimeLogDate};
}

export const saveToDb = async (req, res) => {
  const { fileName } = req.body; // "17-05-2026"
  const filePath = `downtime_folder/${fileName}.json`;

  if (!fs.existsSync(filePath)) {
      return res.send({ success: false, message: "No file found" });
  }

  try {
      const { routers } = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const dateFromFile= fileName.replace('.json', '');
      const cycleEnd = moment(dateFromFile, "DD-MM-YYYY").add(2, 'days').format("DD-MM-YYYY");
      const {docs, downTimeLogDate} = buildDocs(routers, cycleEnd);

      const startLogdate = moment(downTimeLogDate).startOf('day').toDate();
      const endLogdate = moment(downTimeLogDate).endOf('day').toDate();
      
      await RouterLog.deleteMany({
          logDate: { $gte: startLogdate, $lte: endLogdate }
      }); 
      await RouterLog.insertMany(docs);
      res.send({ success: true, message: `Saved ${docs.length} rows successfully`});

  } catch (err) {
      console.error(err);
      res.status(500).send({ success: false, message: err.message });
  }
};
// {
//   "logDate": {
//     "$gte": ISODate("2026-02-04T00:00:00.000Z"),
//     "$lt": ISODate("2026-02-05T00:00:00.000Z")
//   }
// }

export const saveSession = async(sessionUsername, sessionRouter, sessionCommands, sessionStartTime) =>{
      if (sessionCommands.length > 0) {
        await SessionLog.create({
          branchId: sessionRouter.branchId,  
          branch: sessionRouter.router || sessionRouter.name,
          host:sessionRouter.host,
          user: sessionUsername,
          commands: sessionCommands,
          startTime: sessionStartTime,
          endTime: new Date()
        });
      }  
}

export const getRouterSessions = async(req, res) =>{
  try {
    const sessions = await SessionLog
      .find()
      .sort({startTime:-1})
      .limit(100);

    res.json({ success: true, message: sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }  
}

// "08-05-2026" + "11:35 am" → Date object
function parseDateTime(dateString, timeString){
  const [day, month, year] = dateString.split("-");
  return new Date(`${year}-${month}-${day} ${timeString}`);
}

function calcDownTime(downAt, upAt) {
  if (!downAt || !upAt) return null;
  return Math.round((upAt - downAt) / 60000); // minutes
}

export const addDownTime = async (fileUrl, sessionData)=>{
  try {
    if(!sessionData){
      fs.unlinkSync(fileUrl);
      return({ success: true, message: "No Server Session Found", docs:[] });
    }    
    const workbook = XLSX.readFile(fileUrl);
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const docs = XLSX.utils.sheet_to_json(sheet, { raw: false });
    const parsedDocs = docs.map((row) => {
      const downAt = parseDateTime(row.downDate, row.down);
      const upAt = parseDateTime(row.upDate, row.up);
      return {
        ...row,
        downAt,
        upAt,
        totalDownTime: calcDownTime(downAt, upAt),
        addedBy: sessionData.username
      };
    });
    const savedData=await DownTimeLog.insertMany(parsedDocs);
    fs.unlinkSync(fileUrl);
    return({ success: true, message: "Data write success", docs:savedData });
  } catch (err) {
      console.error(err);
      fs.unlinkSync(fileUrl);
      return({ success: false, message: "Error saving data" });
  }  

}

// {
//   "logDate": {
//     "$gte": ISODate("2026-02-04T00:00:00.000Z"),
//     "$lt": ISODate("2026-02-05T00:00:00.000Z")
//   }
// }
export const generateReport2 =  async(req, res)=>{
  try {

    const { fromDate, toDate, ispName, branchId, fromUrl } = req.query;
    const parsedBranchId= Number(branchId);
    const from = new Date(fromDate);
    const to = new Date(toDate);    
    to.setHours(23, 59, 59, 999);        
    let data;
    let queryFilter = {
      downAt: { $gte: from,  $lte: to},
      // upAt:{ $lte: to},
      ispName:ispName,
    };
    //  only add router filter if branchName exists
    if (parsedBranchId && parsedBranchId !== 0) {
      queryFilter['id']= parsedBranchId;
    }
    if(fromUrl === "automaticReport"){
       data= await RouterLog.find(queryFilter).sort({id:1});
    }    
    else if(fromUrl === "manualReport"){
    data= await DownTimeLog.find(queryFilter).sort({id:1});
    } 
    res.json({ success: true, data });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }    
}