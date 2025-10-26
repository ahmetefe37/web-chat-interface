// API Calls for different providers
import { getSettings } from './config.js';
import { imageUrlToBase64 } from './image.js';

// Build prompt from chat history
export function buildPrompt(chatHistory) {
  let prompt = "";
  for (const msg of chatHistory) {
    if (msg.role === "user") {
      prompt += `User: ${msg.content}\n\n`;
    } else {
      prompt += `Assistant: ${msg.content}\n\n`;
    }
  }
  return prompt;
}

// Call Ollama API with streaming support and optional image
export async function callOllamaAPI(chatHistory, imageUrl = null, onChunk = null) {
  const settings = getSettings();
  
  // Prepare request body
  const requestBody = {
    model: settings.modelName,
    prompt: buildPrompt(chatHistory),
    stream: !!onChunk,
    options: {
      temperature: settings.temperature,
    },
  };

  // Add image if provided
  if (imageUrl) {
    try {
      const base64Image = await imageUrlToBase64(imageUrl);
      requestBody.images = [base64Image];
    } catch (error) {
      console.error('Failed to convert image to base64:', error);
      throw new Error('Failed to process image');
    }
  }

  const response = await fetch(`${settings.ollamaUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama Error ${response.status}: ${errorText}`);
  }

  // Handle streaming response
  if (onChunk) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) {
            fullResponse += json.response;
            onChunk(json.response);
          }
        } catch (e) {
          // JSON parse error, skip line
        }
      }
    }

    return fullResponse;
  }

  // Non-streaming response
  const data = await response.json();
  return data.response || "No response";
}

// Call Google Gemini API with optional image support
export async function callGeminiAPI(chatHistory, imageUrl = null, onChunk = null) {
  const settings = getSettings();
  
  if (!settings.geminiApiKey) {
    throw new Error("Gemini API key not configured");
  }

  const model = settings.geminiModel || "gemini-flash-latest";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.geminiApiKey}`;

  // Build a single prompt from chat history for generateContent
  let prompt = "";
  for (const msg of chatHistory) {
    if (msg.role === "user") {
      prompt += `User: ${msg.content}\n\n`;
    } else {
      prompt += `Assistant: ${msg.content}\n\n`;
    }
  }

  // Build parts array
  const parts = [{ text: prompt }];

  // Add image if provided
  if (imageUrl) {
    try {
      const base64Image = await imageUrlToBase64(imageUrl);
      parts.unshift({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Image
        }
      });
    } catch (error) {
      console.error('Failed to convert image to base64:', error);
      throw new Error('Failed to process image');
    }
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: settings.temperature,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  
  // Handle potential safety blocks
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);
  }
  
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

// Call OpenRouter API with optional image support
export async function callOpenRouterAPI(chatHistory, imageUrl = null, onChunk = null) {
  const settings = getSettings();
  
  if (!settings.openrouterApiKey) {
    throw new Error("OpenRouter API key not configured");
  }

  const model = settings.openrouterModel || "anthropic/claude-3-opus";
  const apiUrl = "https://openrouter.ai/api/v1/chat/completions";

  // Convert chat history to OpenAI format
  const messages = [];
  
  for (const msg of chatHistory) {
    if (msg.role === "user" && imageUrl && chatHistory[chatHistory.length - 1] === msg) {
      // Add image to the last user message
      try {
        const base64Image = await imageUrlToBase64(imageUrl);
        messages.push({
          role: msg.role,
          content: [
            {
              type: "text",
              text: msg.content
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        });
      } catch (error) {
        console.error('Failed to convert image to base64:', error);
        throw new Error('Failed to process image');
      }
    } else {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.openrouterApiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "Web Chat Interface",
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: settings.temperature,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response";
}

// Main API caller - routes to correct provider with optional image and streaming
export async function callAI(chatHistory, imageUrl = null, onChunk = null) {
  const settings = getSettings();
  
  switch (settings.provider) {
    case "ollama":
      return await callOllamaAPI(chatHistory, imageUrl, onChunk);
    case "gemini":
      return await callGeminiAPI(chatHistory, imageUrl, onChunk);
    case "openrouter":
      return await callOpenRouterAPI(chatHistory, imageUrl, onChunk);
    default:
      throw new Error(`Unknown provider: ${settings.provider}`);
  }
}

// Fetch Ollama models
export async function fetchOllamaModels() {
  const settings = getSettings();
  const response = await fetch(`${settings.ollamaUrl}/api/tags`);
  
  if (!response.ok) {
    throw new Error("Failed to fetch models");
  }
  
  const data = await response.json();
  return data.models || [];
}

