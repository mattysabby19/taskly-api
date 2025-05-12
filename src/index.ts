 
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import taskRoutes from './routes/taskRoutes';
import clientRoutes from './routes/clientRoutes';
import userRoutes from './routes/userRoutes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/clients', clientRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/', (_req, res) => {
  res.send('EquiTaskly Api is running 🚀');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
