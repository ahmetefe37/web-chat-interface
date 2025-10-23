// Main Application - Entry Point
import { loadSettings, saveSettings, getSettings, updateSetting } from './config.js';
import { callAI, fetchOllamaModels } from './api.js';
import {
  getChatHistory,
  getCurrentChatId,
  startNewChat,
  addMessageToChat,
  loadChat,
  deleteChat,
  getAllChats,
  setAllChats,
  setCurrentChatId,
  cleanupEmptyChats,
} from './chat.js';
import {
  saveChatToLocalStorage,
  loadChatsFromLocalStorage,
  saveChatToServer,
  loadSavedChatsFromServer,
  loadChatFromServer,
  deleteChatFromServer,
} from './storage.js';
import {
  initUIElements,
  updateProviderUI,
  updateModelInfo,
  addMessage,
  addTypingIndicator,
  removeTypingIndicator,
  clearMessagesUI,
  updateChatHistoryUI,
  displaySavedChats,
} from './ui.js';
import {
  initializeMarked,
  initHTMLPreview,
  showHTMLPreview,
  refreshHTMLPreview,
  closeHTMLPreview,
} from './markdown.js';

// DOM Elements
const elements = {
  // Chat elements
  chatContainer: document.getElementById("chatContainer"),
  messagesContainer: document.getElementById("messagesContainer"),
  welcomeScreen: document.getElementById("welcomeScreen"),
  messageInput: document.getElementById("messageInput"),
  sendBtn: document.getElementById("sendBtn"),
  newChatBtn: document.getElementById("newChatBtn"),
  chatHistoryContainer: document.getElementById("chatHistory"),
  
  // Settings elements
  settingsBtn: document.getElementById("settingsBtn"),
  settingsModal: document.getElementById("settingsModal"),
  closeModalBtn: document.getElementById("closeModal"),
  saveSettingsBtn: document.getElementById("saveSettings"),
  providerSelect: document.getElementById("providerSelect"),
  geminiApiKeyInput: document.getElementById("geminiApiKey"),
  geminiModelSelect: document.getElementById("geminiModel"),
  openrouterApiKeyInput: document.getElementById("openrouterApiKey"),
  openrouterModelInput: document.getElementById("openrouterModel"),
  refreshModelsBtn: document.getElementById("refreshModels"),
  modelInfo: document.getElementById("modelInfo"),
  
  // History modal
  historyBtn: document.getElementById("historyBtn"),
  historyModal: document.getElementById("historyModal"),
  closeHistoryModalBtn: document.getElementById("closeHistoryModal"),
  savedChatsContainer: document.getElementById("savedChatsContainer"),
  
  // Preview modal
  previewModal: document.getElementById("previewModal"),
  closePreviewModalBtn: document.getElementById("closePreviewModal"),
  previewFrame: document.getElementById("previewFrame"),
  refreshPreviewBtn: document.getElementById("refreshPreview"),
  
  // Sidebar elements
  sidebar: document.getElementById("sidebar"),
  toggleSidebarBtn: document.getElementById("toggleSidebar"),
  
  // Mobile header elements
  mobileNewChatBtn: document.getElementById("mobileNewChatBtn"),
  mobileHistoryBtn: document.getElementById("mobileHistoryBtn"),
  mobileSettingsBtn: document.getElementById("mobileSettingsBtn"),
  
  // Input actions
  attachFileBtn: document.getElementById("attachFileBtn"),
  webSearchBtn: document.getElementById("webSearchBtn"),
  fileInput: document.getElementById("fileInput"),
};

// Initialize UI elements in modules
initUIElements(elements);
initHTMLPreview(elements.previewModal, elements.previewFrame);

// Initialize markdown
initializeMarked();

// State
let webSearchEnabled = false;
let attachedFiles = [];

// Expose currentChatId to window for storage module
Object.defineProperty(window, '__currentChatId', {
  get() { return getCurrentChatId(); },
  set(val) { /* Read-only */ }
});

// Initialize Application
async function init() {
  // Load settings and chats
  loadSettings();
  loadChatsFromLocalStorage();
  
  // Update UI
  updateSettingsUI();
  updateProviderUI();
  updateModelInfo();
  updateChatHistoryUI();
  
  // Load Ollama models automatically on startup
  const settings = getSettings();
  if (settings.provider === "ollama") {
    await loadOllamaModels();
  }
  
  // Start new chat if none exists
  const chatId = getCurrentChatId();
  if (!chatId) {
    startNewChat();
  } else {
    // Restore current chat messages
    const currentChat = getAllChats()[chatId];
    if (currentChat && currentChat.messages) {
      currentChat.messages.forEach(msg => {
        addMessage(msg.role, msg.content);
      });
    }
  }
  
  // Restore sidebar state
  const sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
  if (sidebarCollapsed) {
    elements.sidebar.classList.add("collapsed");
  }
}

// Update settings UI from current settings
function updateSettingsUI() {
  const settings = getSettings();
  elements.providerSelect.value = settings.provider || "ollama";
  document.getElementById("ollamaUrl").value = settings.ollamaUrl;
  document.getElementById("modelName").value = settings.modelName;
  elements.geminiApiKeyInput.value = settings.geminiApiKey || "";
  elements.geminiModelSelect.value = settings.geminiModel || "gemini-2.5-pro";
  elements.openrouterApiKeyInput.value = settings.openrouterApiKey || "";
  elements.openrouterModelInput.value = settings.openrouterModel || "anthropic/claude-3-opus";
  document.getElementById("temperature").value = settings.temperature;
  document.getElementById("tempValue").textContent = settings.temperature;
}

// Send message
async function sendMessage() {
  const message = elements.messageInput.value.trim();
  if (!message) return;

  // Add user message
  addMessage("user", message);
  addMessageToChat("user", message);

  // Clear input
  elements.messageInput.value = "";
  elements.messageInput.style.height = "auto";

  // Save to storage
  saveChatToLocalStorage();
  updateChatHistoryUI();

  // Add typing indicator
  const typingId = addTypingIndicator();

  // Disable send button
  elements.sendBtn.disabled = true;

  try {
    // Call AI based on provider
    const chatHist = getChatHistory();
    const response = await callAI(chatHist);

    // Remove typing indicator
    removeTypingIndicator(typingId);

    // Add AI response
    addMessage("assistant", response);
    addMessageToChat("assistant", response);

    // Save to storage
    saveChatToLocalStorage();
    updateChatHistoryUI();
    
    // Save to server only if chat has meaningful content
    const updatedChatHist = getChatHistory();
    const chatId = getCurrentChatId();
    if (updatedChatHist.length >= 2) {
      saveChatToServer(chatId);
    }
  } catch (error) {
    console.error("Error:", error);
    removeTypingIndicator(typingId);
    
    // Build provider-specific error message
    const settings = getSettings();
    let errorMessage = `Error: ${error.message}\n\n`;
    
    if (settings.provider === "ollama") {
      errorMessage += `Make sure:\n1. Ollama is running (ollama serve)\n2. URL is correct: ${settings.ollamaUrl}\n3. Model is installed: ollama pull ${settings.modelName}`;
    } else if (settings.provider === "gemini") {
      errorMessage += `Make sure:\n1. Gemini API key is valid\n2. You haven't exceeded your quota\n3. Model is available: ${settings.geminiModel}\n4. Try again in a few moments if the model is overloaded`;
    } else if (settings.provider === "openrouter") {
      errorMessage += `Make sure:\n1. OpenRouter API key is valid\n2. You have credits available\n3. Model is available: ${settings.openrouterModel}`;
    }
    
    addMessage("assistant", errorMessage);
  }

  // Enable send button
  elements.sendBtn.disabled = false;
  elements.messageInput.focus();
}

// Event Listeners

// Send message
elements.sendBtn.addEventListener("click", sendMessage);
elements.messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
elements.messageInput.addEventListener("input", () => {
  elements.messageInput.style.height = "auto";
  elements.messageInput.style.height = elements.messageInput.scrollHeight + "px";
});

// New chat
elements.newChatBtn.addEventListener("click", () => {
  startNewChat();
  clearMessagesUI();
  saveChatToLocalStorage();
  updateChatHistoryUI();
});

// Chat history item click
window.onChatHistoryItemClick = (chatId) => {
  loadChat(chatId);
  clearMessagesUI();
  
  const currentChat = getAllChats()[chatId];
  if (currentChat && currentChat.messages) {
    currentChat.messages.forEach(msg => {
      addMessage(msg.role, msg.content);
    });
  }
  
  setCurrentChatId(chatId);
  updateChatHistoryUI();
};

// Settings modal
elements.settingsBtn.addEventListener("click", () => {
  elements.settingsModal.classList.add("active");
});

elements.closeModalBtn.addEventListener("click", () => {
  elements.settingsModal.classList.remove("active");
});

elements.settingsModal.addEventListener("click", (e) => {
  if (e.target === elements.settingsModal) {
    elements.settingsModal.classList.remove("active");
  }
});

// Save settings
elements.saveSettingsBtn.addEventListener("click", () => {
  const newSettings = {
    provider: elements.providerSelect.value,
    ollamaUrl: document.getElementById("ollamaUrl").value,
    modelName: document.getElementById("modelName").value,
    geminiApiKey: elements.geminiApiKeyInput.value,
    geminiModel: elements.geminiModelSelect.value,
    openrouterApiKey: elements.openrouterApiKeyInput.value,
    openrouterModel: elements.openrouterModelInput.value,
    temperature: parseFloat(document.getElementById("temperature").value),
  };
  
  saveSettings(newSettings);
  updateProviderUI();
  updateModelInfo();
  
  elements.settingsModal.classList.remove("active");
});

// Provider select change
elements.providerSelect.addEventListener("change", async () => {
  const provider = elements.providerSelect.value;
  updateSetting("provider", provider);
  updateProviderUI();
  updateModelInfo();
  
  // Auto-load Ollama models when switching to Ollama
  if (provider === "ollama") {
    await loadOllamaModels();
  }
});

// Temperature slider
document.getElementById("temperature").addEventListener("input", (e) => {
  document.getElementById("tempValue").textContent = e.target.value;
});

// Load Ollama models
async function loadOllamaModels() {
  const modelSelect = document.getElementById("modelName");
  
  try {
    // Show loading state
    modelSelect.innerHTML = '<option value="">Loading models...</option>';
    
    const models = await fetchOllamaModels();
    modelSelect.innerHTML = "";
    
    if (models.length === 0) {
      modelSelect.innerHTML = '<option value="">No models found</option>';
    } else {
      models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.name;
        option.textContent = model.name;
        modelSelect.appendChild(option);
      });
      
      // Select current model if it exists
      const settings = getSettings();
      if (settings.modelName) {
        modelSelect.value = settings.modelName;
      }
      
      console.log(`✓ Loaded ${models.length} Ollama model(s)`);
    }
    return true;
  } catch (error) {
    console.error("Error fetching models:", error);
    modelSelect.innerHTML = '<option value="">Error loading models</option>';
    return false;
  }
}

// Refresh models button
elements.refreshModelsBtn.addEventListener("click", async () => {
  elements.refreshModelsBtn.disabled = true;
  await loadOllamaModels();
  elements.refreshModelsBtn.disabled = false;
});

// History modal
elements.historyBtn.addEventListener("click", () => {
  elements.historyModal.classList.add("active");
  displaySavedChats();
});

elements.closeHistoryModalBtn.addEventListener("click", () => {
  elements.historyModal.classList.remove("active");
});

elements.historyModal.addEventListener("click", (e) => {
  if (e.target === elements.historyModal) {
    elements.historyModal.classList.remove("active");
  }
});

// Load saved chat callback
window.onLoadSavedChat = async (chatId) => {
  const chatData = await loadChatFromServer(chatId);
  if (chatData) {
    // Add to allChats
    const chats = getAllChats();
    chats[chatData.id] = chatData;
    setAllChats(chats);
    
    // Load the chat
    loadChat(chatData.id);
    clearMessagesUI();
    
    chatData.messages.forEach(msg => {
      addMessage(msg.role, msg.content);
    });
    
    setCurrentChatId(chatData.id);
    updateChatHistoryUI();
  }
  
  elements.historyModal.classList.remove("active");
};

// Delete saved chat callback
window.onDeleteSavedChat = async (chatId) => {
  const success = await deleteChatFromServer(chatId);
  if (success) {
    // Remove from allChats
    const chats = getAllChats();
    delete chats[chatId];
    setAllChats(chats);
    
    // Update UI
    updateChatHistoryUI();
    saveChatToLocalStorage();
    
    // Refresh saved chats list
    await displaySavedChats();
  }
};

// Preview modal
elements.closePreviewModalBtn.addEventListener("click", closeHTMLPreview);
elements.previewModal.addEventListener("click", (e) => {
  if (e.target === elements.previewModal) {
    closeHTMLPreview();
  }
});
elements.refreshPreviewBtn.addEventListener("click", refreshHTMLPreview);

// Expose showHTMLPreview to window for ui.js
window.showHTMLPreview = showHTMLPreview;

// Sidebar toggle
elements.toggleSidebarBtn.addEventListener("click", () => {
  elements.sidebar.classList.toggle("collapsed");
  const isCollapsed = elements.sidebar.classList.contains("collapsed");
  localStorage.setItem("sidebarCollapsed", isCollapsed.toString());
});

// Mobile header buttons
if (elements.mobileNewChatBtn) {
  elements.mobileNewChatBtn.addEventListener("click", () => {
    startNewChat();
    clearMessagesUI();
    saveChatToLocalStorage();
    updateChatHistoryUI();
  });
}

if (elements.mobileHistoryBtn) {
  elements.mobileHistoryBtn.addEventListener("click", () => {
    elements.historyModal.classList.add("active");
    displaySavedChats();
  });
}

if (elements.mobileSettingsBtn) {
  elements.mobileSettingsBtn.addEventListener("click", () => {
    elements.settingsModal.classList.add("active");
  });
}

// File attachment
elements.attachFileBtn.addEventListener("click", () => {
  elements.fileInput.click();
});

elements.fileInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  attachedFiles = files;
  
  if (files.length > 0) {
    elements.messageInput.placeholder = `${files.length} file(s) attached. Type your message...`;
  } else {
    elements.messageInput.placeholder = "Type your message...";
  }
});

// Web search toggle
elements.webSearchBtn.addEventListener("click", () => {
  webSearchEnabled = !webSearchEnabled;
  elements.webSearchBtn.classList.toggle("active", webSearchEnabled);
  
  if (webSearchEnabled) {
    elements.messageInput.placeholder = "Web search enabled. Type your message...";
  } else {
    elements.messageInput.placeholder = "Type your message...";
  }
});

// Initialize app on DOM ready
init();

