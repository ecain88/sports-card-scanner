const API_URL = 'https://grand-forgiveness-production-dd16.up.railway.app';

export interface CardDetails {
  playerName: string;
  year: string;
  brand: string;
  set: string;
  cardNumber: string;
  variation: string;
  sport: string;
  team: string;
  grade: string;
  searchQuery: string;
}

export interface SaleListing {
  title: string;
  salePrice: number;
  saleDate: string;
  listingUrl: string;
  imageUrl: string;
}

export interface EbaySalesResult {
  listings: SaleListing[];
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  totalSales: number;
  lastSalePrice: number;
  lastSaleDate: string;
}

export interface ScanResult {
  cardDetails: CardDetails;
  salesData: EbaySalesResult;
}

export async function scanCardImage(imageBase64: string, backBase64?: string): Promise<ScanResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${API_URL}/api/cards/scan-base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, ...(backBase64 ? { backBase64 } : {}) }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error ?? 'Scan failed');
    }

    return response.json() as Promise<ScanResult>;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new Error('Request timed out — please try again');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function refreshCardSales(searchQuery: string): Promise<EbaySalesResult> {
  const response = await fetch(`${API_URL}/api/cards/refresh-sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ searchQuery }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Refresh failed');
  }

  const data = await response.json() as { salesData: EbaySalesResult };
  return data.salesData;
}
