/**
 * Google Vision OCR integration.
 * Calls Google Cloud Vision API to extract text from images.
 */

import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("ocr");

export async function performOcr(imageBase64: string): Promise<string> {
  const apiUrl = process.env.OCR_API_URL;
  const apiKey = process.env.OCR_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error("OCR_API_URL and OCR_API_KEY must be configured");
  }

  const requestBody = {
    requests: [
      {
        image: {
          content: imageBase64,
        },
        features: [
          {
            type: "TEXT_DETECTION",
            maxResults: 1,
          },
        ],
      },
    ],
  };

  log.debug({ base64Length: imageBase64.length }, "Calling Google Vision API");
  const response = await fetch(`${apiUrl}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    log.error({ status: response.status }, "Google Vision API error");
    throw new Error(`Google Vision API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  const annotation = data?.responses?.[0]?.fullTextAnnotation;
  const text = annotation?.text ?? "";
  log.info({ textLength: text.length }, "OCR text extracted");
  return text;
}
