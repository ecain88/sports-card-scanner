import { parseStringPromise } from 'xml2js';

// Sandbox App IDs contain "-SBX-"; production IDs contain "-PRD-" or neither
const isSandbox = (process.env.EBAY_APP_ID ?? '').includes('-SBX-');
const EBAY_FINDING_API = isSandbox
  ? 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1'
  : 'https://svcs.ebay.com/services/search/FindingService/v1';

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
}

export async function fetchCompletedSales(searchQuery: string, limit = 20): Promise<EbaySalesResult> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) throw new Error('EBAY_APP_ID not configured');

  const params = new URLSearchParams({
    'OPERATION-NAME': 'findCompletedItems',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': appId,
    'RESPONSE-DATA-FORMAT': 'XML',
    'REST-PAYLOAD': '',
    'keywords': searchQuery,
    'categoryId': '212',       // Sports Trading Cards category
    'itemFilter(0).name': 'SoldItemsOnly',
    'itemFilter(0).value': 'true',
    'itemFilter(1).name': 'ListingType',
    'itemFilter(1).value': 'AuctionWithBIN',
    'itemFilter(2).name': 'ListingType',
    'itemFilter(2).value(0)': 'Auction',
    'itemFilter(2).value(1)': 'FixedPrice',
    'sortOrder': 'EndTimeSoonest',
    'paginationInput.entriesPerPage': String(limit),
    'paginationInput.pageNumber': '1',
    'outputSelector': 'SellerInfo',
  });

  const url = `${EBAY_FINDING_API}?${params.toString()}`;
  const res = await fetch(url);
  const xml = await res.text();

  let parsed: Record<string, unknown>;
  try {
    parsed = await parseStringPromise(xml, { explicitArray: false });
  } catch {
    console.error('eBay XML parse error. Raw response:', xml.slice(0, 500));
    return { listings: [], averagePrice: 0, lowestPrice: 0, highestPrice: 0, totalSales: 0 };
  }

  const response = parsed['findCompletedItemsResponse'] as Record<string, unknown> | undefined;
  const ack = response?.ack;
  if (ack !== 'Success' && ack !== 'Warning') {
    console.error('eBay API ack error:', ack);
    return { listings: [], averagePrice: 0, lowestPrice: 0, highestPrice: 0, totalSales: 0 };
  }

  const items: unknown[] = (() => {
    const raw = (response?.searchResult as Record<string, unknown>)?.item;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  })();

  const listings: SaleListing[] = items
    .map((item: unknown) => {
      const i = item as Record<string, unknown>;
      const sellingStatus = i['sellingStatus'] as Record<string, unknown> | undefined;
      const convertedPrice = sellingStatus?.['convertedCurrentPrice'] as Record<string, unknown> | undefined;
      const price = parseFloat((convertedPrice?.['__text'] ?? convertedPrice ?? '0') as string);
      const listingInfo = i['listingInfo'] as Record<string, unknown> | undefined;
      const galleryURL = ((i['galleryURL'] as string) ?? '');
      return {
        title: (i['title'] as string) ?? '',
        salePrice: price,
        saleDate: (listingInfo?.['endTime'] as string) ?? '',
        listingUrl: (i['viewItemURL'] as string) ?? '',
        imageUrl: galleryURL,
      };
    })
    .filter((l) => l.salePrice > 0);

  if (listings.length === 0) {
    return { listings: [], averagePrice: 0, lowestPrice: 0, highestPrice: 0, totalSales: 0 };
  }

  const prices = listings.map((l) => l.salePrice);
  const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  return {
    listings,
    averagePrice: Math.round(averagePrice * 100) / 100,
    lowestPrice: Math.min(...prices),
    highestPrice: Math.max(...prices),
    totalSales: listings.length,
  };
}
