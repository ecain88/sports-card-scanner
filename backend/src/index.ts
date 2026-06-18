import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cardRoutes from './routes/cards';
import ebayRoutes from './routes/ebay';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/cards', cardRoutes);
app.use('/api/ebay', ebayRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
