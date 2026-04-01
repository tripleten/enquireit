import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { prisma } from "../db.server";

// CORS headers for storefront requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json(
      { error: "shop parameter is required" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const settings = await prisma.settings.findUnique({
      where: { shop },
      select: {
        gtagCode: true,
      },
    });

    return json(
      {
        gtagCode: settings?.gtagCode || null,
      },
      {
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, max-age=300", // Cache for 5 minutes
        },
      }
    );
  } catch (error) {
    console.error("Error fetching public settings:", error);
    return json(
      { gtagCode: null },
      { headers: corsHeaders }
    );
  }
};
