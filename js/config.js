// Configuration and Settings Management
export const defaultSettings = {
  provider: "ollama", // ollama, gemini, openrouter
  ollamaUrl: "http://localhost:11434",
  geminiApiKey: "",
  geminiModel: "gemini-2.5-pro",
  openrouterApiKey: "",
  openrouterModel: "anthropic/claude-3-opus",
  modelName: "llama3.2:3b",
  temperature: 0.7,
};

export let settings = { ...defaultSettings };

// Load settings from localStorage
export function loadSettings() {
  const saved = localStorage.getItem("llamaSettings");
  if (saved) {
    settings = { ...defaultSettings, ...JSON.parse(saved) };
  }
  return settings;
}

// Save settings to localStorage
export function saveSettings(newSettings) {
  settings = { ...settings, ...newSettings };
  localStorage.setItem("llamaSettings", JSON.stringify(settings));
  return settings;
}

// Get current settings
export function getSettings() {
  return { ...settings };
}

// Update a specific setting
export function updateSetting(key, value) {
  settings[key] = value;
  localStorage.setItem("llamaSettings", JSON.stringify(settings));
  return settings;
}

// Reset settings to default
export function resetSettings() {
  settings = { ...defaultSettings };
  localStorage.setItem("llamaSettings", JSON.stringify(settings));
  return settings;
}

