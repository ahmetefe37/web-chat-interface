// Configuration and Settings Management

// Get server URL
function getServerUrl() {
  return `${window.location.protocol}//${window.location.host}`;
}

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
export let customOpenRouterModels = [];

// Load settings from localStorage and .env file
export async function loadSettings() {
  // First load from localStorage
  const saved = localStorage.getItem("llamaSettings");
  if (saved) {
    settings = { ...defaultSettings, ...JSON.parse(saved) };
  }
  
  // Then load API keys from server (.env file)
  try {
    console.log('🔑 Loading API keys from .env file...');
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/api/config/load-keys`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.keys) {
        // Update settings with API keys from .env
        if (data.keys.geminiApiKey) {
          settings.geminiApiKey = data.keys.geminiApiKey;
          console.log('✅ Gemini API key loaded from .env');
        }
        if (data.keys.openrouterApiKey) {
          settings.openrouterApiKey = data.keys.openrouterApiKey;
          console.log('✅ OpenRouter API key loaded from .env');
        }
        
        // Load custom models
        if (data.customModels && Array.isArray(data.customModels)) {
          customOpenRouterModels = data.customModels;
          console.log(`✅ Loaded ${customOpenRouterModels.length} custom OpenRouter models from .env`);
        }
        
        // Save merged settings back to localStorage
        localStorage.setItem("llamaSettings", JSON.stringify(settings));
        localStorage.setItem("customOpenRouterModels", JSON.stringify(customOpenRouterModels));
      }
    }
  } catch (error) {
    console.error('⚠️ Could not load API keys from .env:', error);
  }
  
  // Load custom models from localStorage if not loaded from server
  if (customOpenRouterModels.length === 0) {
    const savedCustomModels = localStorage.getItem("customOpenRouterModels");
    if (savedCustomModels) {
      customOpenRouterModels = JSON.parse(savedCustomModels);
    }
  }
  
  return settings;
}

// Save custom OpenRouter models
export async function saveCustomModels(newModels) {
  customOpenRouterModels = newModels;
  localStorage.setItem("customOpenRouterModels", JSON.stringify(customOpenRouterModels));
  
  try {
    console.log('💾 Saving custom models to .env file...');
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/api/config/save-custom-models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ models: newModels }),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log('✅ Custom models saved to .env file!');
      }
    } else {
      console.error('⚠️ Failed to save custom models to .env');
    }
  } catch (error) {
    console.error('⚠️ Error saving custom models to .env:', error);
  }
  
  return customOpenRouterModels;
}

// Get custom models
export function getCustomModels() {
  return [...customOpenRouterModels];
}

// Add custom model
export function addCustomModel(name, value) {
  customOpenRouterModels.push({ name, value });
  saveCustomModels(customOpenRouterModels);
}

// Remove custom model
export function removeCustomModel(index) {
  customOpenRouterModels.splice(index, 1);
  saveCustomModels(customOpenRouterModels);
}

// Save settings to localStorage and API keys to .env file
export async function saveSettings(newSettings) {
  settings = { ...settings, ...newSettings };
  localStorage.setItem("llamaSettings", JSON.stringify(settings));
  
  // Save API keys to server (.env file)
  const hasApiKeys = newSettings.geminiApiKey !== undefined || newSettings.openrouterApiKey !== undefined;
  
  if (hasApiKeys) {
    try {
      console.log('🔐 Saving API keys to .env file...');
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/config/save-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          geminiApiKey: settings.geminiApiKey,
          openrouterApiKey: settings.openrouterApiKey,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ API keys saved to .env file!');
        }
      } else {
        console.error('⚠️ Failed to save API keys to .env');
      }
    } catch (error) {
      console.error('⚠️ Error saving API keys to .env:', error);
    }
  }
  
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

