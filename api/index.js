import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import moment from 'moment';
import mongoose from 'mongoose';
import projectRoutes from './routes/project.route.js';
import registerRoutes from './routes/register.route.js';
import pileRoutes from './routes/pile.routes.js';


dotenv.config();
mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log('MongoDb is connected');
  })
  .catch((err) => {
    console.log(err.message);
  });

const app = express();
const server= http.createServer(app);

// Initialize Socket.io and attach it to the same server
app.use(cors({
  origin: '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const PORT= 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}!`);
});

app.get('/test', (req, res)=>{
  res.json({"success":true, message:"Server is UP"});
})

app.use('/project', projectRoutes);
app.use('/register', registerRoutes);
app.use('/pile', pileRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

