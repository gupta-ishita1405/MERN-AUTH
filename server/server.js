import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import { connect } from 'mongoose';
import connectDB from './config/mongodb.js';
import authRouter from './routes/authRoutes.js';




const app = express();
const PORT = process.env.PORT || 5000
connectDB();





app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: 'http://localhost:5000', credentials: true }));
app.use(cookieParser());


//API endpoints
app.get('/', (req, res) => {
    res.send('Hello World! This is the backend server.');
});
app.use('/api/auth', authRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});