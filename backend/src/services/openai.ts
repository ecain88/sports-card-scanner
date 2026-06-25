import OpenAI from 'openai';

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

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

export async function recognizeCard(frontBase64: string, backBase64?: string): Promise<CardDetails> {
  const msgContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    {
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${frontBase64}`, detail: 'high' },
    },
  ];

  if (backBase64) {
    msgContent.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${backBase64}`, detail: 'high' },
    });
  }

  const yearInstruction = backBase64
    ? `CRITICAL RULE FOR "year": You MUST use the copyright year from the back of the card. Look at the bottom-left and bottom-right corners of the BACK image (image 2) for the copyright notice — it looks like "© 2025 Topps" or "©2025 Panini". Extract ONLY the 4-digit year from that © symbol. This is the definitive card year. IGNORE any other numbers or years you see anywhere else on the card (stats, dates, etc.). If you cannot find a © year on the back, then use the large year printed on the card front.`
    : 'For "year": find the copyright symbol © and extract the 4-digit year immediately after it. If not visible, use the year prominently printed on the card front.';

  msgContent.push({
    type: 'text',
    text: `You are given ${backBase64 ? 'two images: image 1 is the FRONT and image 2 is the BACK of a sports card' : 'the front of a sports card'}. Extract all information and return ONLY a JSON object with these exact fields:
{
  "playerName": "full player name",
  "year": "card year (4 digits)",
  "brand": "card manufacturer (Topps, Panini, Upper Deck, etc.)",
  "set": "full set name",
  "cardNumber": "card number with # prefix if present",
  "variation": "any parallel, refractor, auto, rookie designation",
  "sport": "Baseball, Basketball, Football, Hockey, etc.",
  "team": "team name",
  "grade": "grading company and grade if slabbed, else Raw",
  "searchQuery": "optimized eBay search string like: 2020 Topps Chrome Mike Trout #1 Refractor"
}
${yearInstruction}
Return only valid JSON, no other text.`,
  });

  const response = await getClient().chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 500,
    messages: [{ role: 'user', content: msgContent }],
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  // Strip markdown code fences if present
  const content = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(content) as CardDetails;
  } catch {
    throw new Error(`Failed to parse card recognition response: ${content.slice(0, 200)}`);
  }
}
