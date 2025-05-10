 
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import taskRoutes from './routes/taskRoutes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/tasks', taskRoutes);

app.get('/', (_req, res) => {
  res.send('EquiTaskly Api is running 🚀');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
