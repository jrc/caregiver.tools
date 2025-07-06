// Cloudflare Worker for Dementia Day Clock API

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://caregiver-tools.pages.dev",
  "http://localhost:8000" // i.e. `python3 -m http.server`
];

// Name of the KV Namespace binding
// This must match the binding you set up in the Worker's settings.
const KV_NAMESPACE = DAYCLOCK_KV;

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const origin = request.headers.get("Origin");

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
      headers: corsHeaders(origin)
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
      headers: corsHeaders(request.headers.get("Origin"))
    });
  }

  const data = await KV_NAMESPACE.get(clockId, { type: "json" });

  if (data === null) {
    return new Response("Message not found for this clock_id", {
      status: 404,
      headers: corsHeaders(request.headers.get("Origin"))
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders(request.headers.get("Origin")),
      "Content-Type": "application/json"
    }
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
          headers: corsHeaders(request.headers.get("Origin"))
        }
      );
    }

    // The data to store in KV
    const dataToStore = {
      message: message,
      imageUrl: imageUrl || null, // Allow for future use
      lastUpdated: new Date().toISOString()
    };

    // The clock_id is the key in the KV store
    await KV_NAMESPACE.put(clock_id, JSON.stringify(dataToStore));

    // Respond with success
    const responsePayload = {
      status: "success",
      clock_id: clock_id,
      message: dataToStore.message,
      imageUrl: dataToStore.imageUrl
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: {
        ...corsHeaders(request.headers.get("Origin")),
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    return new Response("Invalid JSON in request body", {
      status: 400,
      headers: corsHeaders(request.headers.get("Origin"))
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
      headers: corsHeaders(headers.get("Origin"))
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: "GET, POST, OPTIONS"
      }
    });
  }
}

/**
 * Returns a base set of CORS headers.
 */
function corsHeaders(origin = null) {
  // Check if the origin is in our allowed list
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
