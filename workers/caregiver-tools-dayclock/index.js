// Cloudflare Worker for Dementia Day Clock API

// Allowed origin for CORS
const ALLOWED_ORIGIN = "https://caregiver-tools-dayclock.pages.dev";

// Name of the KV Namespace binding
// This must match the binding you set up in the Worker's settings.
const KV_NAMESPACE = DAYCLOCK_KV;

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }

  // Handle GET and POST requests
  if (request.method === "GET") {
    return handleGet(request);
  } else if (request.method === "POST") {
    return handlePost(request);
  } else {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders(),
    });
  }
}

/**
 * Handles GET requests to retrieve a message.
 * URL format: /?clock_id=some-id
 */
async function handleGet(request) {
  const url = new URL(request.url);
  const clockId = url.searchParams.get("clock_id");

  if (!clockId) {
    return new Response("Missing clock_id query parameter", {
      status: 400,
      headers: corsHeaders(),
    });
  }

  const data = await KV_NAMESPACE.get(clockId, { type: "json" });

  if (data === null) {
    return new Response("Message not found for this clock_id", {
      status: 404,
      headers: corsHeaders(),
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
    },
  });
}

/**
 * Handles POST requests to create/update a message.
 * Body format: { "clock_id": "some-id", "message": "hello", "imageUrl": null }
 */
async function handlePost(request) {
  try {
    const body = await request.json();
    const { clock_id, message, imageUrl } = body;

    if (!clock_id || typeof message === "undefined") {
      return new Response(
        'Request body must include "clock_id" and "message"',
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    // The data to store in KV
    const dataToStore = {
      message: message,
      imageUrl: imageUrl || null, // Allow for future use
      lastUpdated: new Date().toISOString(),
    };

    // The clock_id is the key in the KV store
    await KV_NAMESPACE.put(clock_id, JSON.stringify(dataToStore));

    // Respond with success
    const responsePayload = {
      status: "success",
      clock_id: clock_id,
      message: dataToStore.message,
      imageUrl: dataToStore.imageUrl,
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response("Invalid JSON in request body", {
      status: 400,
      headers: corsHeaders(),
    });
  }
}

/**
 * Handles CORS preflight (OPTIONS) requests.
 */
function handleOptions(request) {
  const headers = request.headers;
  if (
    headers.get("Origin") !== null &&
    headers.get("Access-Control-Request-Method") !== null &&
    headers.get("Access-Control-Request-Headers") !== null
  ) {
    // Handle CORS preflight requests.
    return new Response(null, {
      headers: corsHeaders(),
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: "GET, POST, OPTIONS",
      },
    });
  }
}

/**
 * Returns a base set of CORS headers.
 */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
