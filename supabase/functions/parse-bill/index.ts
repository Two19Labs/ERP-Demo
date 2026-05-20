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
    
    // Create Supabase client using the client's auth header
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Retrieve input values from request body
    const { text, vendors, stockItems, customApiKey } = await req.json();

    let apiKey = customApiKey ? customApiKey.trim() : null;

    if (!apiKey) {
      // Retrieve Hugging Face API key securely from public.system_config table
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

    const systemPrompt = `You are a structured invoice data extractor. Convert the raw invoice/bill text into a JSON object matching this schema exactly:
{
  "vendorId": "string (matching vendor ID from the list, or empty string)",
  "billNumber": "string (invoice/bill number, or empty)",
  "billDate": "string (YYYY-MM-DD format, defaults to today's date)",
  "parsedTotal": "number or null",
  "items": [
    {
      "rawName": "string (raw product name)",
      "quantity": "number (default 1)",
      "unit": "string (standardized 'kg', 'litre', or 'pieces')",
      "unitPrice": "number (unit rate)",
      "lineTotal": "number (line total)"
    }
  ]
}

Available Vendors:
${vendorsList}

Available Stock Items:
${stockItemsList}

Rules:
1. Output ONLY the JSON block. Do not include markdown code block syntax (like \`\`\`json) or any explanations.
2. Select the vendor ID by mapping the mention in the text to the nearest available vendor.
3. Keep units standardized ('kg', 'litre', or 'pieces').`;

    // Fetch from Hugging Face with Retry mechanism
    const response = await fetchWithRetry("https://api-inference.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-7B-Instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract details from:\n${text}` }
        ],
        max_tokens: 1024,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HF API Error: ${response.status} - ${errText}`);
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
