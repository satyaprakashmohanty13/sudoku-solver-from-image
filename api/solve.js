// api/solve.js
// This serverless function acts as a proxy to forward image upload requests
// to the actual backend API, keeping the backend URL hidden from the client.

// IMPORTANT: Disable Vercel's default body parser for this route
// This allows us to access the raw request stream and forward it directly.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Ensure the request method is POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // Get the real backend URL from environment variables
  const backendUrl = process.env.BACKEND_URL;

  // Check if the backend URL is configured
  if (!backendUrl) {
    console.error('BACKEND_URL environment variable is not set.');
    return res.status(500).json({ message: 'Server configuration error: Backend URL is not defined.' });
  }

  try {
    // Read the entire incoming request body into a buffer
    // This is necessary because `fetch` expects a complete body (like a Buffer or Blob)
    // when not dealing with simple string/JSON bodies.
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    // Forward the request to the real backend
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      // Crucially, pass the original 'Content-Type' header from the client.
      // This header contains the 'boundary' information vital for multipart/form-data.
      headers: {
        'Content-Type': req.headers['content-type'],
        // Optionally, you might want to forward other relevant headers like 'Accept'
        // or 'User-Agent' if your backend relies on them.
        // For file uploads, Content-Length is often automatically handled when passing a Buffer.
      },
      body: rawBody, // Pass the raw buffer of the incoming request body
    });

    // Check if the request to the backend was successful
    if (!backendResponse.ok) {
      // If the backend returned an error, try to parse its message
      let errorData = {};
      try {
        errorData = await backendResponse.json();
      } catch (parseError) {
        // If parsing fails, just use the status text or a generic message
        errorData.message = backendResponse.statusText || 'Failed to parse backend error response.';
      }
      console.error(`Backend error: ${backendResponse.status} - ${errorData.message || 'Unknown error'}`);
      return res.status(backendResponse.status).json({
        message: errorData.message || `Backend responded with status: ${backendResponse.status}`,
        details: errorData // Include any details from the backend error for debugging
      });
    }

    // Parse the JSON response from the backend
    const data = await backendResponse.json();

    // Send the backend's response back to the client
    return res.status(200).json(data);

  } catch (error) {
    // Catch any network errors or unexpected issues during the proxying process
    console.error('Proxy error:', error);
    return res.status(500).json({ message: 'An error occurred while processing your request.', error: error.message });
  }
}
