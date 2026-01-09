import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partita_iva } = await req.json();
    
    if (!partita_iva || partita_iva.length < 11) {
      return new Response(
        JSON.stringify({ error: 'Partita IVA non valida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const piva = partita_iva.replace(/\s/g, '').replace(/^IT/i, '');
    console.log(`Looking up P.IVA: ${piva}`);

    // Try multiple APIs for P.IVA lookup
    let companyData = null;

    // Try OpenAPI.it first
    try {
      const response = await fetch(`https://openapi.it/api/v1/partita-iva/${piva}`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          companyData = {
            nome: data.data.denominazione || data.data.nome,
            indirizzo: data.data.indirizzo,
            citta: data.data.comune,
            cap: data.data.cap,
            provincia: data.data.provincia,
          };
          console.log('Found via openapi.it:', companyData);
        }
      }
    } catch (e: unknown) {
      const error = e as Error;
      console.log('OpenAPI.it failed:', error.message);
    }

    // Try EU VIES service as fallback
    if (!companyData) {
      try {
        const viesResponse = await fetch('https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            countryCode: 'IT',
            vatNumber: piva
          })
        });
        
        if (viesResponse.ok) {
          const viesData = await viesResponse.json();
          if (viesData.valid && viesData.name) {
            // Parse address from VIES format
            const addressParts = viesData.address?.split('\n') || [];
            companyData = {
              nome: viesData.name,
              indirizzo: addressParts[0] || '',
              citta: addressParts[1]?.replace(/^\d{5}\s*/, '') || '',
              cap: addressParts[1]?.match(/^\d{5}/)?.[0] || '',
            };
            console.log('Found via VIES:', companyData);
          }
        }
      } catch (e: unknown) {
        const error = e as Error;
        console.log('VIES failed:', error.message);
      }
    }

    if (companyData) {
      return new Response(
        JSON.stringify({ success: true, data: companyData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Nessun dato trovato per questa P.IVA' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e: unknown) {
    const error = e as Error;
    console.error('Error in lookup-piva function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});