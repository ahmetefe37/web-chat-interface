// API Calls for different providers
import { getSettings } from './config.js';

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

// Call Ollama API
export async function callOllamaAPI(chatHistory) {
  const settings = getSettings();
  
  const response = await fetch(`${settings.ollamaUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: settings.modelName,
      prompt: buildPrompt(chatHistory),
      stream: false,
      options: {
        temperature: settings.temperature,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.response || "No response";
}

// Call Google Gemini API
export async function callGeminiAPI(chatHistory) {
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

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
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

// Call OpenRouter API
export async function callOpenRouterAPI(chatHistory) {
  const settings = getSettings();
  
  if (!settings.openrouterApiKey) {
    throw new Error("OpenRouter API key not configured");
  }

  const model = settings.openrouterModel || "anthropic/claude-3-opus";
  const apiUrl = "https://openrouter.ai/api/v1/chat/completions";

  // Convert chat history to OpenAI format
  const messages = chatHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.openrouterApiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "Llama Chat Interface",
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

// Main API caller - routes to correct provider
export async function callAI(chatHistory) {
  const settings = getSettings();
  
  switch (settings.provider) {
    case "ollama":
      return await callOllamaAPI(chatHistory);
    case "gemini":
      return await callGeminiAPI(chatHistory);
    case "openrouter":
      return await callOpenRouterAPI(chatHistory);
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

