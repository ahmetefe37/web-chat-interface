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
        addMessage(msg.role, msg.content, msg.fileData);
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
      addMessage(msg.role, msg.content, msg.fileData);
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
      addMessage(msg.role, msg.content, msg.fileData);
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

// Initialize app on DOM ready
init();

