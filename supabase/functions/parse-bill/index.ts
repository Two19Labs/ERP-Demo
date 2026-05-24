import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

// Comma-separated allow-list, e.g. "https://app.example.com,https://staging.example.com".
// Falls back to "*" for local dev when the env var is unset.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',').map(s => s.trim()).filter(Boolean);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.length === 0
    ? '*'
    : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

async function fetchWithRetry(url: string, options: any, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status !== 503) {
        return response;
      }
      console.warn(`HF API returned status ${response.status}. Retrying in ${delay}ms...`);
    } catch (err: any) {
      if (i === retries - 1) throw err;
      console.warn(`Fetch failed with error: ${err.message || err}. Retrying in ${delay}ms...`);
    }
    await new Promise(res => setTimeout(res, delay));
  }
  throw new Error("Request failed after maximum retries");
}

serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Require a valid Supabase session. Without this anyone with the public
    // CORS surface could spend our HF quota.
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { text, imageBase64, mimeType, vendors, stockItems } = await req.json();

    const isImage = !!imageBase64;
    if (!isImage && !(text || "").trim()) {
      throw new Error("No input provided. Send invoice text or an image.");
    }

    // HF key now lives in the edge function env only. Never accept it from the client.
    const apiKey = (Deno.env.get('HF_API_KEY') || '').trim();
    if (!apiKey) {
      throw new Error("HF_API_KEY is not configured for this function.");
    }

    const vendorsList = vendors.map((v: any) => `ID: "${v.id}", Name: "${v.name}"`).join("\n");
    const stockItemsList = stockItems.map((si: any) => `ID: "${si.id}", Name: "${si.name}"`).join("\n");

    const systemPrompt = `You are a structured invoice data extractor. Convert the invoice/bill into a JSON object matching this schema exactly:
{
  "vendorId": "string (matching vendor ID from the list, or empty string)",
  "billNumber": "string (invoice/bill number, or empty)",
  "billDate": "string (YYYY-MM-DD format, defaults to today's date)",
  "parsedTotal": "number or null",
  "items": [
    {
      "rawName": "string (raw product name)",
      "quantity": "number (the QTY value, default 1)",
      "unit": "string (standardized 'kg', 'litre', or 'pieces')",
      "unitPrice": "number (the per-unit RATE, e.g. 30 from '₹30/kg' — NOT the line amount)",
      "lineTotal": "number (the AMOUNT for the row = quantity × unitPrice)"
    }
  ]
}

Available Vendors:
${vendorsList}

Available Stock Items:
${stockItemsList}

Rules:
1. Output ONLY the JSON block. Do not include markdown code block syntax (like \`\`\`json) or any explanations.
2. Select the vendor ID by mapping the mention to the nearest available vendor.
3. Keep units standardized ('kg', 'litre', or 'pieces').
4. When BOTH a per-unit rate AND a line amount are printed, COPY them directly — do not recalculate.
5. "unitPrice" = the RATE = price for ONE single unit. A value written as "₹30/kg" or "30/kg" or "₹25/pkt" means unitPrice is the number BEFORE the slash. The "/kg" suffix means it is already per-unit — do NOT multiply by quantity.
6. "lineTotal" = the AMOUNT = total for that row.
7. Strip currency symbols and unit suffixes from numbers (e.g. "₹30/kg" -> 30, "₹60.00" -> 60).
8. IF ONLY ONE NUMBER appears alongside an item+quantity (no explicit per-unit rate), treat it as the LINE TOTAL. Set lineTotal to that number and compute unitPrice = lineTotal / quantity. Example: "100 rs tomato 10 kg" → {quantity: 10, unitPrice: 10, lineTotal: 100}. Example: "30 rs onion 2 kg" → {quantity: 2, unitPrice: 15, lineTotal: 30}.
9. If only a per-unit rate is given with no total, compute lineTotal = unitPrice × quantity.

WORKED EXAMPLE — input row:
  Potato        2 kg      ₹30/kg     ₹60.00
Correct item: {"rawName":"Potato","quantity":2,"unit":"kg","unitPrice":30,"lineTotal":60}
WRONG (do not do this): unitPrice 60 — that is 30×2, a calculation. unitPrice must stay 30, the per-kg rate.

Another row:
  Sugar Packets 3 pkt     ₹25/pkt    ₹75.00
Correct item: {"rawName":"Sugar Packets","quantity":3,"unit":"pieces","unitPrice":25,"lineTotal":75}`;

    let userContent: any;
    if (isImage) {
      const dataUri = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;
      userContent = [
        { type: "text", text: "Extract the structured invoice details from this image." },
        { type: "image_url", image_url: { url: dataUri } }
      ];
    } else {
      userContent = `Extract details from:\n${text}`;
    }

    const candidateModels = isImage
      ? [
          "Qwen/Qwen2.5-VL-72B-Instruct",
          "Qwen/Qwen2.5-VL-7B-Instruct",
          "meta-llama/Llama-3.2-11B-Vision-Instruct",
          "google/gemma-3-27b-it",
        ]
      : ["Qwen/Qwen2.5-7B-Instruct"];

    let response: Response | null = null;
    let lastErr = "";
    for (const model of candidateModels) {
      const resp = await fetchWithRetry("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
          ],
          max_tokens: 1024,
          temperature: 0.1
        })
      });

      if (resp.ok) {
        console.log(`Using model: ${model}`);
        response = resp;
        break;
      }

      lastErr = await resp.text();
      if (resp.status === 400 && /not supported by any provider/i.test(lastErr)) {
        console.warn(`Model ${model} unsupported, trying next...`);
        continue;
      }
      throw new Error(`HF API Error: ${resp.status} - ${lastErr}`);
    }

    if (!response) {
      throw new Error(`No supported vision model found. Last error: ${lastErr}`);
    }

    const resData = await response.json();
    const generatedText = resData.choices[0].message.content.trim();
    console.log("LLM raw output:", generatedText);

    let cleanedJson = generatedText;
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.substring(7);
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.substring(3);
    }
    if (cleanedJson.endsWith("```")) {
      cleanedJson = cleanedJson.substring(0, cleanedJson.length - 3);
    }
    cleanedJson = cleanedJson.trim();

    let parsedResult = JSON.parse(cleanedJson);

    // Normalize: the model sometimes drops the wrapper and returns a single item
    // object or a bare array of items. Coerce all shapes into the schema wrapper.
    const looksLikeItem = (o: any) =>
      o && typeof o === 'object' && ('rawName' in o || 'unitPrice' in o || 'lineTotal' in o);
    if (Array.isArray(parsedResult)) {
      parsedResult = { items: parsedResult };
    } else if (looksLikeItem(parsedResult) && !Array.isArray(parsedResult.items)) {
      parsedResult = { items: [parsedResult] };
    }
    if (!Array.isArray(parsedResult.items)) parsedResult.items = [];

    parsedResult.__debug_rawLLM = generatedText;

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
