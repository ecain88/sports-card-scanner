import { Router, Request, Response } from 'express';
import { fetchCompletedSales } from '../services/ebay';

const router = Router();

// GET /api/ebay/search?q=...
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = req.query['q'] as string | undefined;
    if (!q) {
      res.status(400).json({ error: 'Missing query parameter: q' });
      return;
    }
    const salesData = await fetchCompletedSales(q);
    res.json(salesData);
  } catch (err) {
    console.error('eBay search error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Search failed' });
  }
});

export default router;
