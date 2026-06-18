import { Router, Request, Response } from 'express';
import multer from 'multer';
import { recognizeCard } from '../services/openai';
import { fetchCompletedSales } from '../services/ebay';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// POST /api/cards/scan  — upload image, get card details + eBay sales
router.post('/scan', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }

    const base64 = req.file.buffer.toString('base64');
    const cardDetails = await recognizeCard(base64);
    const salesData = await fetchCompletedSales(cardDetails.searchQuery);

    res.json({ cardDetails, salesData });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Scan failed' });
  }
});

// POST /api/cards/scan-base64  — accept base64 body (for mobile)
router.post('/scan-base64', async (req: Request, res: Response) => {
  try {
    const { imageBase64, backBase64 } = req.body as { imageBase64?: string; backBase64?: string };
    if (!imageBase64) {
      res.status(400).json({ error: 'No imageBase64 provided' });
      return;
    }

    const cardDetails = await recognizeCard(imageBase64, backBase64);
    const salesData = await fetchCompletedSales(cardDetails.searchQuery);

    res.json({ cardDetails, salesData });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Scan failed' });
  }
});

// POST /api/cards/refresh-sales  — re-fetch eBay data for an existing card
router.post('/refresh-sales', async (req: Request, res: Response) => {
  try {
    const { searchQuery } = req.body as { searchQuery?: string };
    if (!searchQuery) {
      res.status(400).json({ error: 'No searchQuery provided' });
      return;
    }

    const salesData = await fetchCompletedSales(searchQuery);
    res.json({ salesData });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Refresh failed' });
  }
});

export default router;
