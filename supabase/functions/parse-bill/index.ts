import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { text, imageBase64, mimeType, vendors, stockItems, customApiKey } = await req.json();

    const isImage = !!imageBase64;
    if (!isImage && !(text || "").trim()) {
      throw new Error("No input provided. Send invoice text or an image.");
    }

    let apiKey = customApiKey ? customApiKey.trim() : null;

    if (!apiKey) {
      const { data: configData, error: configError } = await supabaseClient
        .from("system_config")
        .select("value")
        .eq("key", "hf_api_key")
        .maybeSingle();

      if (configError || !configData) {
        throw new Error(`Failed to load HF API key: ${configError?.message || 'Not found'}`);
      }

      apiKey = configData.value.trim();
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
4. Each row has three numbers: QTY, RATE (per-unit price), and AMOUNT (line total). Map RATE to "unitPrice" and AMOUNT to "lineTotal" — never swap them.
5. "unitPrice" is the price for ONE unit. If a row shows "2 kg" at "₹30/kg" for "₹60.00", then quantity=2, unitPrice=30, lineTotal=60. It must always hold that unitPrice = lineTotal / quantity.
6. Strip currency symbols and unit suffixes from numbers (e.g. "₹30/kg" -> 30, "₹60.00" -> 60).`;

    // Build the user message: an image content block, or plain text.
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

    // Candidate models to try in order. For images we need a vision model;
    // HF providers vary per account, so we fall through until one is supported.
    const candidateModels = isImage
      ? [
          "Qwen/Qwen2.5-VL-72B-Instruct",
          "Qwen/Qwen2.5-VL-7B-Instruct",
          "meta-llama/Llama-3.2-11B-Vision-Instruct",
          "google/gemma-3-27b-it",
        ]
      : ["Qwen/Qwen2.5-7B-Instruct"];

    // Try each candidate model until one succeeds (skip past "unsupported model" errors).
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
      // If the model is simply unsupported on this account, try the next one.
      if (resp.status === 400 && /not supported by any provider/i.test(lastErr)) {
        console.warn(`Model ${model} unsupported, trying next...`);
        continue;
      }
      // Any other error (auth, rate limit, etc.) is not fixed by switching models.
      throw new Error(`HF API Error: ${resp.status} - ${lastErr}`);
    }

    if (!response) {
      throw new Error(`No supported vision model found. Last error: ${lastErr}`);
    }

    const resData = await response.json();
    const generatedText = resData.choices[0].message.content.trim();

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

    const parsedResult = JSON.parse(cleanedJson);

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
