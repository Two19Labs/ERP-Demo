import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function testDns(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeout);
    return `SUCCESS (status: ${res.status})`;
  } catch (err: any) {
    return `FAILED (${err.message || err})`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const report = {
      "cloudflare.com": await testDns("https://cloudflare.com"),
      "github.com": await testDns("https://github.com"),
      "huggingface.co": await testDns("https://huggingface.co"),
      "api-inference.huggingface.co": await testDns("https://api-inference.huggingface.co")
    };

    throw new Error(`DNS Diagnostics: ${JSON.stringify(report)}`);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
