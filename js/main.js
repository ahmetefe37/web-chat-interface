// Main Application - Entry Point
import { loadSettings, saveSettings, getSettings, updateSetting, getCustomModels, addCustomModel, removeCustomModel, saveCustomModels } from './config.js';
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
  syncChatsWithServer,
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
  addCodeHeader,
  addHTMLPreviewButtonsToElement,
} from './ui.js';
import {
  initializeMarked,
  initHTMLPreview,
  showHTMLPreview,
  refreshHTMLPreview,
  closeHTMLPreview,
} from './markdown.js';
import {
  uploadImage,
  uploadDocument,
  parseDocument,
  imageUrlToBase64,
  getFileType,
  getFileIcon,
  formatFileSize,
  setCurrentFile,
  getCurrentFile,
  clearCurrentFile,
  hasFile,
} from './file.js';

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
  openrouterModelSelect: document.getElementById("openrouterModelSelect"),
  addCustomModelBtn: document.getElementById("addCustomModelBtn"),
  openrouterCustomModelName: document.getElementById("openrouterCustomModelName"),
  openrouterCustomModelValue: document.getElementById("openrouterCustomModelValue"),
  customModelsList: document.getElementById("customModelsList"),
  refreshModelsBtn: document.getElementById("refreshModels"),
  modelInfo: document.getElementById("modelInfo"),
  
  // History modal
  historyBtn: document.getElementById("historyBtn"),
  historyModal: document.getElementById("historyModal"),
  closeHistoryModalBtn: document.getElementById("closeHistoryModal"),
  savedChatsContainer: document.getElementById("savedChatsContainer"),
  clearAllChatsBtn: document.getElementById("clearAllChatsBtn"),
  
  // Preview modal
  previewModal: document.getElementById("previewModal"),
  closePreviewModalBtn: document.getElementById("closePreviewModal"),
  previewFrame: document.getElementById("previewFrame"),
  refreshPreviewBtn: document.getElementById("refreshPreview"),
  
  // File preview modal
  filePreviewModal: document.getElementById("filePreviewModal"),
  closeFilePreviewModalBtn: document.getElementById("closeFilePreviewModal"),
  filePreviewContent: document.getElementById("filePreviewContent"),
  filePreviewTitle: document.getElementById("filePreviewTitle"),
  downloadFileBtn: document.getElementById("downloadFileBtn"),
  
  // Sidebar elements
  sidebar: document.getElementById("sidebar"),
  toggleSidebarBtn: document.getElementById("toggleSidebar"),
  
  // Mobile header elements
  mobileNewChatBtn: document.getElementById("mobileNewChatBtn"),
  mobileHistoryBtn: document.getElementById("mobileHistoryBtn"),
  mobileSettingsBtn: document.getElementById("mobileSettingsBtn"),
  
  // Input actions
  attachImageBtn: document.getElementById("attachImageBtn"),
  attachDocumentBtn: document.getElementById("attachDocumentBtn"),
  webSearchBtn: document.getElementById("webSearchBtn"),
  imageInput: document.getElementById("imageInput"),
  documentInput: document.getElementById("documentInput"),
  
  // File preview
  filePreviewContainer: document.getElementById("filePreviewContainer"),
  imagePreviewWrapper: document.getElementById("imagePreviewWrapper"),
  documentPreviewWrapper: document.getElementById("documentPreviewWrapper"),
  imagePreview: document.getElementById("imagePreview"),
  documentIcon: document.getElementById("documentIcon"),
  documentName: document.getElementById("documentName"),
  documentMeta: document.getElementById("documentMeta"),
  documentPreviewContent: document.getElementById("documentPreviewContent"),
  removeFileBtn: document.getElementById("removeFileBtn"),
  removeDocumentBtn: document.getElementById("removeDocumentBtn"),
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
  console.log('🚀 Initializing Web Chat Interface...');
  
  // Load settings (async now - loads from .env)
  await loadSettings();
  
  // 🔄 SYNC: Load all chats from cache folder (Single Source of Truth)
  console.log('📂 Synchronizing chats from cache folder...');
  const syncSuccess = await syncChatsWithServer();
  
  if (!syncSuccess) {
    console.warn('⚠️ Cache sync failed, falling back to localStorage');
  loadChatsFromLocalStorage();
  }
  
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
    console.log('📝 No active chat, starting new chat...');
    startNewChat();
    // Don't save empty chat - will save after first message
    updateChatHistoryUI();
  } else {
    // Restore current chat messages
    const currentChat = getAllChats()[chatId];
    if (currentChat && currentChat.messages) {
      console.log(`📖 Restoring chat: ${currentChat.title} (${currentChat.messages.length} messages)`);
      currentChat.messages.forEach(msg => {
        addMessage(msg.role, msg.content, msg.fileData);
      });
    }
  }
  
  // Restore sidebar state
  const sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
  if (sidebarCollapsed) {
    elements.sidebar.classList.add("collapsed");
  }
  
  console.log('✅ Initialization complete!');
}

// Update settings UI from current settings
// Predefined OpenRouter models
const predefinedOpenRouterModels = [
  { name: 'OpenAI GPT-4o', value: 'openai/gpt-4o' },
  { name: 'Anthropic Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
  { name: 'Google Gemini 2.5 Pro', value: 'google/gemini-2.5-pro' },
  { name: 'Meta Llama 4 Maverick (Free)', value: 'meta-llama/llama-4-maverick:free' },
  { name: 'X.AI Grok 4 Fast', value: 'x-ai/grok-4-fast' },
  { name: 'Anthropic Claude Sonnet 4.5', value: 'anthropic/claude-sonnet-4.5' },
  { name: 'Google Gemini 2.5 Flash', value: 'google/gemini-2.5-flash' },
  { name: 'DeepSeek V3', value: 'deepseek/deepseek-chat' },
  { name: 'OpenAI GPT-5 Pro', value: 'openai/gpt-5-pro' },
  { name: 'Z.AI GLM 4.6', value: 'z-ai/glm-4.6' },
  { name: 'Anthropic Claude Haiku 4.5', value: 'anthropic/claude-haiku-4.5' },
  { name: 'Google Gemini 2.0 Flash', value: 'google/gemini-2.0-flash-001' },
  { name: 'X.AI Grok Code Fast', value: 'x-ai/grok-code-fast-1' },
  { name: 'Google Gemini 2.5 Flash Lite', value: 'google/gemini-2.5-flash-lite' },
  { name: 'Anthropic Claude Sonnet 4', value: 'anthropic/claude-sonnet-4' },
  { name: 'Mistral Small 3.1 (Free)', value: 'mistralai/mistral-small-3.1-24b-instruct:free' },
  { name: 'Qwen3 VL 32B', value: 'qwen/qwen3-vl-32b-instruct' },
  { name: 'Meta Llama 3.3 Nemotron Super 49B', value: 'nvidia/llama-3.3-nemotron-super-49b-v1.5' },
  { name: 'OpenAI GPT-4o Mini', value: 'openai/gpt-4o-mini' },
  { name: 'Dolphin (Free)', value: 'cognitivecomputations/dolphin3.0-mistral-24b:free' },
  { name: 'DeepSeek R1 0528 (Free)', value: 'deepseek/deepseek-r1-0528:free' },
  { name: 'DeepSeek R1T2 Chimera (Free)', value: 'tngtech/deepseek-r1t2-chimera:free' },
  { name: 'Z.AI GLM 4.5 Air (Free)', value: 'z-ai/glm-4.5-air:free' },
  { name: 'Meituan LongCat Flash Chat (Free)', value: 'meituan/longcat-flash-chat:free' },
  { name: 'Microsoft Mai DS R1 (Free)', value: 'microsoft/mai-ds-r1:free' },
  { name: 'OpenAI GPT-OSS 20B (Free)', value: 'openai/gpt-oss-20b:free' },
  { name: 'Qwen3 235B (Free)', value: 'qwen/qwen3-235b-a22b:free' },
  { name: 'InclusionAI Ring 1T', value: 'inclusionai/ring-1t' },
  { name: 'OpenAI O3 Deep Research', value: 'openai/o3-deep-research' },
  { name: 'IBM Granite 4.0 Micro', value: 'ibm-granite/granite-4.0-h-micro' },
  { name: 'Qwen3 VL 8B Thinking', value: 'qwen/qwen3-vl-8b-thinking' },
  { name: 'DeepSeek Chat V3 (Free)', value: 'deepseek/deepseek-chat-v3-0324:free' },
  { name: 'Google Gemini 2.5 Pro Experimental (Free)', value: 'google/gemini-2.5-pro' },
  { name: 'OpenRouter Sonoma Dusk Alpha', value: 'openrouter/andromeda-alpha' },
  { name: 'Switchpoint Kimi K2 (Free)', value: 'moonshotai/kimi-k2:free' },
  { name: 'Switchpoint Kimi K2', value: 'moonshotai/kimi-k2-0905' },
  { name: 'Meta Llama 4 Scout', value: 'meta-llama/llama-4-scout' },
  { name: 'Meta Llama 4 Scout (Free)', value: 'meta-llama/llama-4-scout:free' },
  { name: 'Baidu Ernie 4.5 21B', value: 'baidu/ernie-4.5-21b-a3b' },
  { name: 'OpenAI GPT-5 Image', value: 'openai/gpt-5-image' },
  { name: 'LiquidAI LFM2 8B', value: 'liquid/lfm2-8b-a1b' },
  { name: 'Deep Cogito V2 Preview Llama 405B', value: 'deepcogito/cogito-v2-preview-llama-405b' },
  { name: 'OpenAI GPT-5 Image Mini', value: 'openai/gpt-5-image-mini' },
  { name: 'Qwen3 Coder Plus', value: 'qwen/qwen3-coder-plus' },
  { name: 'OpenAI GPT-5 Codex', value: 'openai/gpt-5-codex' },
  { name: 'OpenRouter Andromeda Alpha', value: 'openrouter/andromeda-alpha' },
  { name: 'Google Gemini 2.5 Flash Image Preview', value: 'google/gemini-2.5-flash-image-preview' },
  { name: 'Anthropic Claude 3.5 Haiku', value: 'anthropic/claude-3.5-haiku' },
  { name: 'Qwen3 Coder 480B', value: 'qwen/qwen3-coder' },
  { name: 'Qwen3 Coder 480B (Free)', value: 'qwen/qwen3-coder:free' },
  { name: 'DeepSeek R1T Chimera (Free)', value: 'tngtech/deepseek-r1t-chimera:free' },
  { name: 'DeepSeek R1 (Free)', value: 'deepseek/deepseek-r1:free' },
  { name: 'OpenAI GPT-4o (2024-11-20)', value: 'openai/gpt-4o-2024-11-20' },
];

function updateSettingsUI() {
  const settings = getSettings();
  elements.providerSelect.value = settings.provider || "ollama";
  document.getElementById("ollamaUrl").value = settings.ollamaUrl;
  document.getElementById("modelName").value = settings.modelName;
  elements.geminiApiKeyInput.value = settings.geminiApiKey || "";
  elements.geminiModelSelect.value = settings.geminiModel || "gemini-2.5-pro";
  elements.openrouterApiKeyInput.value = settings.openrouterApiKey || "";
  
  // Populate OpenRouter model select
  populateOpenRouterModels();
  
  // Set current model
  if (elements.openrouterModelSelect) {
    elements.openrouterModelSelect.value = settings.openrouterModel || "anthropic/claude-3-opus";
  }
  
  document.getElementById("temperature").value = settings.temperature;
  document.getElementById("tempValue").textContent = settings.temperature;
  
  // Update custom models list
  updateCustomModelsList();
}

function populateOpenRouterModels() {
  if (!elements.openrouterModelSelect) return;
  
  // Clear existing options
  elements.openrouterModelSelect.innerHTML = '';
  
  // Add predefined models
  predefinedOpenRouterModels.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.name;
    elements.openrouterModelSelect.appendChild(option);
  });
  
  // Add custom models
  const customModels = getCustomModels();
  if (customModels.length > 0) {
    const separator = document.createElement('option');
    separator.disabled = true;
    separator.textContent = '--- Custom Models ---';
    elements.openrouterModelSelect.appendChild(separator);
    
    customModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model.value;
      option.textContent = model.name;
      elements.openrouterModelSelect.appendChild(option);
    });
  }
}

function updateCustomModelsList() {
  if (!elements.customModelsList) return;
  
  elements.customModelsList.innerHTML = '';
  
  const customModels = getCustomModels();
  customModels.forEach((model, index) => {
    const item = document.createElement('div');
    item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 4px; gap: 8px;';
    
    const info = document.createElement('div');
    info.style.cssText = 'flex: 1; min-width: 0;';
    
    const name = document.createElement('div');
    name.textContent = model.name;
    name.style.cssText = 'font-weight: 600; color: var(--text-primary);';
    
    const value = document.createElement('div');
    value.textContent = model.value;
    value.style.cssText = 'font-size: 12px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    
    info.appendChild(name);
    info.appendChild(value);
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.style.cssText = 'padding: 4px 12px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); cursor: pointer; font-size: 12px; flex-shrink: 0;';
    removeBtn.onclick = async () => {
      await removeCustomModel(index);
      updateCustomModelsList();
      populateOpenRouterModels();
      const settings = getSettings();
      if (settings.provider === 'openrouter') {
        elements.openrouterModelSelect.value = settings.openrouterModel;
      }
    };
    
    item.appendChild(info);
    item.appendChild(removeBtn);
    elements.customModelsList.appendChild(item);
  });
}

// Add custom model button
elements.addCustomModelBtn?.addEventListener("click", async () => {
  const name = elements.openrouterCustomModelName?.value?.trim();
  const value = elements.openrouterCustomModelValue?.value?.trim();
  
  if (!name || !value) {
    alert('Please enter both model name and model ID');
    return;
  }
  
  console.log('➕ Adding custom model:', name);
  await addCustomModel(name, value);
  
  // Clear inputs
  elements.openrouterCustomModelName.value = '';
  elements.openrouterCustomModelValue.value = '';
  
  // Update UI
  updateCustomModelsList();
  populateOpenRouterModels();
  
  console.log('✅ Custom model added!');
});

// Send message with optional file
async function sendMessage() {
  const message = elements.messageInput.value.trim();
  if (!message && !hasFile()) return;

  // Get current file if attached
  const currentFile = getCurrentFile();
  
  // Parse document if it's a document type
  let documentContent = null;
  if (currentFile && currentFile.type === 'document') {
    try {
      const parsed = await parseDocument(currentFile.url);
      documentContent = parsed.content;
      currentFile.fileType = parsed.fileType;
      currentFile.metadata = parsed.metadata;
      currentFile.icon = getFileIcon(currentFile.originalName);
    } catch (error) {
      console.error('Document parse error:', error);
      alert('Failed to parse document');
      return;
    }
  }

  // Add user message with file
  addMessage("user", message, currentFile);
  addMessageToChat("user", message, currentFile);

  // Clear input and file
  elements.messageInput.value = "";
  elements.messageInput.style.height = "auto";
  clearFilePreview();

  // Save to storage
  saveChatToLocalStorage();
  updateChatHistoryUI();

  // Add typing indicator
  const typingId = addTypingIndicator();

  // Disable send button
  elements.sendBtn.disabled = true;

  try {
    // Get chat history
    const chatHist = getChatHistory();
    
    // Prepare prompt with document content if available
    let enhancedChatHist = chatHist;
    if (documentContent) {
      // Create enhanced prompt with document content
      const lastMessage = chatHist[chatHist.length - 1];
      const enhancedPrompt = `[Document: ${currentFile.originalName}]\n\n${documentContent}\n\n---\n\nUser Question: ${lastMessage.content || "Please analyze this document."}`;
      
      enhancedChatHist = [...chatHist.slice(0, -1), {
        ...lastMessage,
        content: enhancedPrompt
      }];
    }
    
    // Call AI with streaming support
    const settings = getSettings();
    
    // Create a message element for streaming
    let streamingMessageDiv = null;
    let streamingContentDiv = null;
    let fullResponse = '';
    
    // Streaming callback
    const onChunk = (chunk) => {
      if (!streamingMessageDiv) {
        // Remove typing indicator and create message element
    removeTypingIndicator(typingId);

        streamingMessageDiv = document.createElement("div");
        streamingMessageDiv.className = "message assistant";
        
        streamingContentDiv = document.createElement("div");
        streamingContentDiv.className = "message-content";
        
        const textDiv = document.createElement("div");
        textDiv.className = "message-text";
        streamingContentDiv.appendChild(textDiv);
        
        streamingMessageDiv.appendChild(streamingContentDiv);
        elements.messagesContainer.appendChild(streamingMessageDiv);
      }
      
      fullResponse += chunk;
      const textDiv = streamingContentDiv.querySelector('.message-text');
      textDiv.innerHTML = marked.parse(fullResponse);
      
      // Apply syntax highlighting and add code headers
      textDiv.querySelectorAll("pre code").forEach((block) => {
        // Only highlight if not already highlighted
        if (!block.classList.contains('hljs')) {
          hljs.highlightElement(block);
        }
        
        // Add copy button and code header
        const pre = block.parentElement;
        if (!pre.querySelector('.code-header')) {
          addCodeHeader(block);
        }
      });
      
      // Add HTML preview buttons for HTML code blocks
      addHTMLPreviewButtonsToElement(textDiv);
      
      // Auto-scroll
      elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
    };
    
    // Call AI with image (only for image type) and streaming
    const imageUrl = (currentFile && currentFile.type === 'image') ? currentFile.url : null;
    const response = await callAI(enhancedChatHist, imageUrl, settings.provider === "ollama" ? onChunk : null);

    // If not streaming (Gemini/OpenRouter), show response normally
    if (!streamingMessageDiv) {
      removeTypingIndicator(typingId);
    addMessage("assistant", response);
    addMessageToChat("assistant", response);
    } else {
      // Add final response to chat history
      addMessageToChat("assistant", fullResponse);
    }

    // Save to storage
    saveChatToLocalStorage();
    
    // 🔄 SYNC: Save to server and sync after AI response
    const updatedChatHist = getChatHistory();
    const chatId = getCurrentChatId();
    
    // Only save if we have both user and assistant messages (complete interaction)
    const hasUser = updatedChatHist.some(msg => msg.role === 'user');
    const hasAssistant = updatedChatHist.some(msg => msg.role === 'assistant');
    
    if (hasUser && hasAssistant && updatedChatHist.length >= 2) {
      console.log('💾 Saving chat to cache after AI response...');
      await saveChatToServer(chatId);
      
      // Sync to refresh sidebar
      await syncChatsWithServer();
      updateChatHistoryUI();
      console.log('✅ Chat synchronization complete');
    } else {
      console.log('⏳ Waiting for assistant response before saving - hasUser:', hasUser, 'hasAssistant:', hasAssistant);
      updateChatHistoryUI();
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
  console.log('📝 Creating new chat...');
  startNewChat();
  clearMessagesUI();
  saveChatToLocalStorage();
  
  // Don't sync - chat will be saved after first AI response
  // Sync only happens when AI responds, not on new chat creation
  updateChatHistoryUI();
  
  console.log('✅ New chat created!');
});

// Chat history item click
window.onChatHistoryItemClick = async (chatId) => {
  console.log(`📖 Loading chat: ${chatId}`);
  
  // Check if chat exists in current chats
  let chat = getAllChats()[chatId];
  
  // If not found, try to sync from server
  if (!chat) {
    console.log('⚠️ Chat not found locally, syncing from cache...');
    await syncChatsWithServer();
    chat = getAllChats()[chatId];
  }
  
  if (chat) {
  loadChat(chatId);
  clearMessagesUI();
  
    if (chat.messages) {
      console.log(`✅ Loaded chat with ${chat.messages.length} messages`);
      chat.messages.forEach(msg => {
        addMessage(msg.role, msg.content, msg.fileData);
      });
    }
  } else {
    console.error('❌ Chat not found even after sync');
    alert('Chat not found. It may have been deleted.');
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
elements.saveSettingsBtn.addEventListener("click", async () => {
  const newSettings = {
    provider: elements.providerSelect.value,
    ollamaUrl: document.getElementById("ollamaUrl").value,
    modelName: document.getElementById("modelName").value,
    geminiApiKey: elements.geminiApiKeyInput.value,
    geminiModel: elements.geminiModelSelect.value,
    openrouterApiKey: elements.openrouterApiKeyInput.value,
    openrouterModel: elements.openrouterModelSelect?.value || elements.openrouterModelInput.value,
    temperature: parseFloat(document.getElementById("temperature").value),
  };
  
  console.log('💾 Saving settings...');
  await saveSettings(newSettings);
  updateProviderUI();
  updateModelInfo();
  
  console.log('✅ Settings saved!');
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

// Clear all chats
elements.clearAllChatsBtn.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to delete ALL saved chats? This action cannot be undone.")) {
    return;
  }
  
  try {
    // Get all saved chats from server
    const serverUrl = `${window.location.protocol}//${window.location.host}`;
    const response = await fetch(`${serverUrl}/api/chats/list`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }
    
    const data = await response.json();
    const chats = data.chats || [];
    
    // Delete each chat from server
    for (const chat of chats) {
      await fetch(`${serverUrl}/api/chats/delete/${chat.id}`, {
        method: 'DELETE'
      });
    }
    
    // Clear localStorage
    localStorage.removeItem("llamaChats");
    localStorage.removeItem("llamaCurrentChatId");
    
    // Reset app state
    setAllChats({});
    setCurrentChatId(null);
    startNewChat();
    clearMessagesUI();
    updateChatHistoryUI();
    
    // Refresh saved chats modal
    await displaySavedChats();
    
    alert("All chats have been deleted successfully!");
  } catch (error) {
    console.error("Error clearing chats:", error);
    alert("Failed to clear all chats. Please try again.");
  }
});

// Load saved chat callback
window.onLoadSavedChat = async (chatId) => {
  console.log(`📂 Loading saved chat from cache: ${chatId}`);
  
  // 🔄 SYNC: Sync before loading to ensure we have latest data
  await syncChatsWithServer();
  
  const chatData = getAllChats()[chatId];
  
  if (chatData) {
    // Load the chat
    loadChat(chatData.id);
    clearMessagesUI();
    
    console.log(`✅ Loaded chat: ${chatData.title} (${chatData.messages?.length || 0} messages)`);
    
    if (chatData.messages) {
    chatData.messages.forEach(msg => {
        addMessage(msg.role, msg.content, msg.fileData);
    });
    }
    
    setCurrentChatId(chatData.id);
    updateChatHistoryUI();
  } else {
    console.error('❌ Chat not found in cache');
    alert('Chat not found. It may have been deleted.');
  }
  
  elements.historyModal.classList.remove("active");
};

// Delete saved chat callback
window.onDeleteSavedChat = async (chatId) => {
  console.log(`🗑️ Deleting chat: ${chatId}`);
  const success = await deleteChatFromServer(chatId);
  
  if (success) {
    console.log('✅ Chat deleted from cache');
    
    // 🔄 SYNC: Resync from cache folder
    await syncChatsWithServer();
    
    // Update UI
    updateChatHistoryUI();
    
    // Refresh saved chats list
    await displaySavedChats();
    
    console.log('✅ Sidebar synchronized after deletion');
  } else {
    console.error('❌ Failed to delete chat');
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
    console.log('📝 Creating new chat...');
    startNewChat();
    clearMessagesUI();
    saveChatToLocalStorage();
    
    // Don't sync - chat will be saved after first AI response
    // Sync only happens when AI responds, not on new chat creation
    updateChatHistoryUI();
    
    console.log('✅ New chat created!');
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

// Clear file preview
function clearFilePreview() {
  elements.filePreviewContainer.style.display = "none";
  elements.imagePreviewWrapper.style.display = "none";
  elements.documentPreviewWrapper.style.display = "none";
  elements.imagePreview.src = "";
  clearCurrentFile();
  elements.imageInput.value = "";
  elements.documentInput.value = "";
}

// Show image preview
function showImagePreview(imageUrl) {
  elements.imagePreview.src = imageUrl;
  elements.imagePreviewWrapper.style.display = "block";
  elements.documentPreviewWrapper.style.display = "none";
  elements.filePreviewContainer.style.display = "block";
}

// Show document preview
function showDocumentPreview(fileData, parsedData) {
  elements.documentIcon.textContent = fileData.icon;
  elements.documentName.textContent = fileData.originalName;
  elements.documentMeta.textContent = `${parsedData.fileType.toUpperCase()} • ${formatFileSize(fileData.size)}`;
  
  // Preview content (first 500 characters)
  const preview = parsedData.content.substring(0, 500);
  elements.documentPreviewContent.textContent = preview + (parsedData.content.length > 500 ? '...' : '');
  
  elements.imagePreviewWrapper.style.display = "none";
  elements.documentPreviewWrapper.style.display = "block";
  elements.filePreviewContainer.style.display = "block";
}

// Image upload
elements.attachImageBtn.addEventListener("click", () => {
  elements.imageInput.click();
});

elements.imageInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  
  if (!file) {
    clearFilePreview();
    return;
  }
  
  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    alert(`File is too large. Maximum size is 50MB.\nYour file: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    e.target.value = ''; // Clear input
    return;
  }
  
  try {
    // Upload image to server
    const uploadResult = await uploadImage(file);
    uploadResult.icon = '🖼️';
    
    // Store file data
    setCurrentFile(uploadResult);
    
    // Show preview
    showImagePreview(uploadResult.url);
    
    // Focus on input
    elements.messageInput.focus();
  } catch (error) {
    console.error('Image upload error:', error);
    const errorMsg = error.message || 'Failed to upload image';
    alert(errorMsg + '\nPlease try again.');
    clearFilePreview();
    e.target.value = ''; // Clear input
  }
});

// Document upload
elements.attachDocumentBtn.addEventListener("click", () => {
  elements.documentInput.click();
});

elements.documentInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  
  if (!file) {
    clearFilePreview();
    return;
  }
  
  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    alert(`File is too large. Maximum size is 50MB.\nYour file: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    e.target.value = ''; // Clear input
    return;
  }
  
  try {
    // Upload document to server
    const uploadResult = await uploadDocument(file);
    uploadResult.icon = getFileIcon(file.name);
    
    // Store file data
    setCurrentFile(uploadResult);
    
    // Parse and preview
    const parsed = await parseDocument(uploadResult.url);
    showDocumentPreview(uploadResult, parsed);
    
    // Focus on input
    elements.messageInput.focus();
  } catch (error) {
    console.error('Document upload error:', error);
    const errorMsg = error.message || 'Failed to upload document';
    alert(errorMsg + '\nPlease try again.');
    clearFilePreview();
    e.target.value = ''; // Clear input
  }
});

// Remove file buttons
elements.removeFileBtn.addEventListener("click", () => {
  clearFilePreview();
});

elements.removeDocumentBtn.addEventListener("click", () => {
  clearFilePreview();
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

// File Preview Modal Functions
function openFilePreview(fileData, content = null) {
  const modal = elements.filePreviewModal;
  const contentDiv = elements.filePreviewContent;
  const title = elements.filePreviewTitle;
  const downloadBtn = elements.downloadFileBtn;
  
  // Set title
  title.textContent = fileData.originalName || 'File Preview';
  
  // Set download link
  downloadBtn.href = fileData.url;
  downloadBtn.download = fileData.originalName;
  
  // Clear previous content
  contentDiv.innerHTML = '';
  contentDiv.className = 'file-preview-content';
  
  // Render based on file type
  if (fileData.type === 'image') {
    contentDiv.classList.add('image-preview');
    const img = document.createElement('img');
    img.src = fileData.url;
    img.alt = fileData.originalName;
    contentDiv.appendChild(img);
  } else if (fileData.type === 'document') {
    const fileType = getFileType(fileData.originalName);
    
    if (fileType === 'pdf') {
      contentDiv.classList.add('pdf-preview');
      const iframe = document.createElement('iframe');
      iframe.src = fileData.url;
      contentDiv.appendChild(iframe);
    } else {
      // Text-based files
      contentDiv.classList.add('text-preview');
      if (content) {
        contentDiv.textContent = content;
      } else {
        contentDiv.textContent = 'Loading...';
        // Fetch content if not provided
        parseDocument(fileData.url).then(parsed => {
          contentDiv.textContent = parsed.content;
        }).catch(err => {
          contentDiv.textContent = 'Failed to load content: ' + err.message;
        });
      }
    }
  }
  
  // Show modal
  modal.style.display = 'flex';
}

function closeFilePreview() {
  elements.filePreviewModal.style.display = 'none';
}

// File preview modal events
elements.closeFilePreviewModalBtn.addEventListener('click', closeFilePreview);

elements.filePreviewModal.addEventListener('click', (e) => {
  if (e.target === elements.filePreviewModal) {
    closeFilePreview();
  }
});

// Make file attachments in messages clickable
window.addEventListener('click', (e) => {
  // Check if clicked on message image
  if (e.target.classList.contains('message-image')) {
    e.preventDefault();
    e.stopPropagation();
    const fileData = {
      type: 'image',
      url: e.target.src,
      originalName: e.target.alt || 'image.jpg'
    };
    openFilePreview(fileData);
  }
  
  // Check if clicked on message document
  if (e.target.closest('.message-document')) {
    e.preventDefault();
    e.stopPropagation();
    const docElement = e.target.closest('.message-document');
    const fileData = JSON.parse(docElement.dataset.fileData || '{}');
    if (fileData.url) {
      openFilePreview(fileData);
    }
  }
});

// Initialize app on DOM ready
init();

