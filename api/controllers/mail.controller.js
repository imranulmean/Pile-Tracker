import nodemailer from 'nodemailer';
import MailLog from '../models/mailSent.model.js';
import dotenv from 'dotenv';
import moment from 'moment';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',  
  port: 465,
  secure: true,
  auth: {
    user: process.env.AIBL_EMAIL,
    pass: process.env.AIBL_PASS
  }
})


try{
  await transporter.verify();
  console.log('SMTP server ready')   
}
catch(err){
  console.log(err)
}



const christmasTemplate = (branchName, lastDownTime, contactPerson) => 
`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,sans-serif;">
 
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
    <tr>
      <td>
 
        <!-- Main Content -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;padding:40px 30px">
          <tr>
            <td style="font-size:14px;line-height:1.8;color:#333333;text-align:left;">
 
              <p style="margin:0 0 16px;">Dear Concern,</p>
 
              <p style="margin:0 0 16px;">
                This is to inform you that <strong style="color:#0d2b50;">${branchName}</strong> link down on <strong>${lastDownTime}</strong>.
              </p>
              <p style="margin:0 0 16px; color:#0d2b50;"><b>Branch Concern: ${contactPerson}.</b></p>
              <p style="margin:0 0 16px;">Please take necessary action as soon as possible.</p>
              <p style="margin:0 0 16px; color:#0d2b50;"><b>For any further information, please call at 09611456760.</b></p>
  
              <!-- Signature with Logo -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
                <tr>
                  <td style="vertical-align:middle;padding-right:16px;">
                    <img src="https://www.aibl.com.bd/wp-content/themes/aiblTheme/images/aibplc-logo2.png"
                          alt="AIBL Logo" style="width:120px;height:auto;display:block;" />
                  </td>
                  <td style="vertical-align:middle;border-left:3px solid #0d2b50;padding-left:16px;">
                    <p style="margin:0;font-size:14px;">Best Regards,</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:bold;color:#0d2b50;">AIBL Network Team</p>
                    <p style="margin:2px 0 0;font-size:13px;color:#555;">ICTD</p>
                    <p style="margin:2px 0 0;font-size:13px;color:#555;">Hotline: 09611456760</p>
                  </td>
                </tr>
              </table>
 
            </td>
          </tr>
        </table>
 
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#116835">
          <tr>
            <td align="center" style="padding:24px 30px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:rgba(255,255,255,0.75);">
                &copy; AIBPLC ICT Division. All rights reserved.<br>
                This email was sent from the AIBPLC Intelligent Network Monitoring Service.
              </p>
            </td>
          </tr>
        </table>
 
      </td>
    </tr>
  </table>
 
</body>
</html>
`

const sendEmails = async (users, req) => {
   
    for (const user of users) {
      // if (!user['Email']) continue 
      const lastDownTimeModified = moment().format("MMMM Do YYYY, h:mm a");
      try {
       const messageId= await transporter.sendMail({
          from: `AIBPLC Network Moitoring System<${process.env.AIBL_EMAIL}>`,
          // to: `imranul4574@aibl.com.bd`,
          to: `${user.email}`,
          cc: 'network@aibl.com.bd',
          subject: `AIBPLC ${user.router} link is down.`,
          html: christmasTemplate(user.router, lastDownTimeModified, user.contactPerson),
        })
        user['sentBy']=req.routerCreds?.username || "";
        const doc= new MailLog(user);        
        const res1=await doc.save();
        await new Promise(r =>{
            setTimeout(r, 1000);
        })        
      } catch (err) {
        console.error(`Failed: `, err.message)
      }
    }
  }

export const sendMail = async(req, res) =>{
  try{
    await sendEmails(req.body, req);
    res.json({success: true, message:"Mail Send Success"});
  }
  catch(err){
    res.json({success: false, message:"Mail Send Failed"});
  }

} 

export const getSentMails= async(req, res) =>{
  const today = new Date();
  const from= new Date(today);
  from.setHours(0, 0, 0, 0);
  const to= new Date(today);
  to.setHours(23, 59, 59, 999)

  const docs= await MailLog.find({createdAt: { $gte: from, $lte: to }});
  res.json({data:docs});
}

export const deleteSentMail = async (req, res) => {
  try {
      const { branchId } = req.params; //  extract branchId from URL      
      await MailLog.deleteMany({ branchId: branchId }); //  actually delete      
      res.json({ message: "Deleted successfully", branchId });
  } catch (error) {
      res.status(500).json({ message: "Delete failed", error });
  }
};


export const deleteAllMail = async()=>{
  try {
    const deleted = await MailLog.deleteMany({});
    return deleted;    
  } catch (error) {
    console.log(error);
  }

}