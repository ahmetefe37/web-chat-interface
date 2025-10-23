// UI Management and Updates
import { getSettings } from './config.js';
import { getAllChats, getCurrentChat } from './chat.js';
import { loadSavedChatsFromServer, deleteChatFromServer, loadChatFromServer } from './storage.js';

// UI Elements (will be initialized in main.js)
export let elements = {};

export function initUIElements(domElements) {
  elements = domElements;
}

// Update provider-specific UI
export function updateProviderUI() {
  const settings = getSettings();
  const provider = settings.provider;
  
  // Hide all provider settings
  document.getElementById("ollamaSettings").style.display = "none";
  document.getElementById("geminiSettings").style.display = "none";
  document.getElementById("openrouterSettings").style.display = "none";
  
  // Show selected provider settings
  if (provider === "ollama") {
    document.getElementById("ollamaSettings").style.display = "block";
  } else if (provider === "gemini") {
    document.getElementById("geminiSettings").style.display = "block";
  } else if (provider === "openrouter") {
    document.getElementById("openrouterSettings").style.display = "block";
  }
}

// Update model info display
export function updateModelInfo() {
  const settings = getSettings();
  const provider = settings.provider;
  let modelInfo = "";
  
  if (provider === "ollama") {
    modelInfo = `${settings.modelName} via Ollama`;
  } else if (provider === "gemini") {
    modelInfo = `${settings.geminiModel || "Gemini 2.5 Pro"} via Google Gemini`;
  } else if (provider === "openrouter") {
    const modelName = settings.openrouterModel || "Claude 3";
    modelInfo = `${modelName} via OpenRouter`;
  }
  
  if (elements.modelInfo) {
    elements.modelInfo.textContent = modelInfo;
  }
}

// Add message to UI
export function addMessage(role, content) {
  if (!elements.messagesContainer) return;
  
  // Hide welcome screen
  if (elements.welcomeScreen) {
    elements.welcomeScreen.style.display = "none";
  }

  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";

  if (role === "assistant") {
    // Render markdown for assistant messages
    contentDiv.innerHTML = marked.parse(content);
    
    // Add syntax highlighting
    contentDiv.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
      addCopyButton(block);
    });
    
    // Add HTML preview buttons for code blocks
    addHTMLPreviewButtons(contentDiv);
  } else {
    contentDiv.textContent = content;
  }

  messageDiv.appendChild(contentDiv);
  elements.messagesContainer.appendChild(messageDiv);

  // Scroll to bottom
  elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

// Add copy button to code blocks
function addCopyButton(codeBlock) {
  const pre = codeBlock.parentElement;
  
  // Check if header already exists
  if (pre.querySelector('.code-header')) return;
  
  // Create code header
  const codeHeader = document.createElement("div");
  codeHeader.className = "code-header";
  
  // Get language from class
  const language = codeBlock.className.match(/language-(\w+)/)?.[1] || 'code';
  const langLabel = document.createElement("span");
  langLabel.className = "code-language";
  langLabel.textContent = language;
  
  // Create button container
  const btnContainer = document.createElement("div");
  btnContainer.className = "code-actions";
  
  // Create copy button
  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
    <span class="btn-text">Copy</span>
  `;
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(codeBlock.textContent);
    copyBtn.querySelector('.btn-text').textContent = "Copied!";
    setTimeout(() => {
      copyBtn.querySelector('.btn-text').textContent = "Copy";
    }, 2000);
  };
  
  btnContainer.appendChild(copyBtn);
  codeHeader.appendChild(langLabel);
  codeHeader.appendChild(btnContainer);
  
  // Insert header before code block
  pre.insertBefore(codeHeader, pre.firstChild);
}

// Add HTML preview buttons
function addHTMLPreviewButtons(contentDiv) {
  const codeBlocks = contentDiv.querySelectorAll("pre code");
  codeBlocks.forEach((block) => {
    const language = block.className.match(/language-(\w+)/)?.[1];
    if (language === "html" || language === "xml") {
      const pre = block.parentElement;
      const codeHeader = pre.querySelector('.code-header');
      if (!codeHeader) return;
      
      const btnContainer = codeHeader.querySelector('.code-actions');
      
      const previewBtn = document.createElement("button");
      previewBtn.className = "preview-btn";
      previewBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <span class="btn-text">Preview</span>
      `;
      previewBtn.onclick = () => {
        if (window.showHTMLPreview) {
          window.showHTMLPreview(block.textContent);
        }
      };
      
      // Insert preview button before copy button
      btnContainer.insertBefore(previewBtn, btnContainer.firstChild);
    }
  });
}

// Add typing indicator
export function addTypingIndicator() {
  if (!elements.messagesContainer) return "typing-indicator";
  
  if (elements.welcomeScreen) {
    elements.welcomeScreen.style.display = "none";
  }

  const messageDiv = document.createElement("div");
  messageDiv.className = "message assistant";
  messageDiv.id = "typing-indicator";

  const typingDiv = document.createElement("div");
  typingDiv.className = "typing-indicator";
  typingDiv.innerHTML = "<span></span><span></span><span></span>";

  messageDiv.appendChild(typingDiv);
  elements.messagesContainer.appendChild(messageDiv);

  elements.chatContainer.scrollIntoView({ behavior: "smooth", block: "end" });

  return "typing-indicator";
}

// Remove typing indicator
export function removeTypingIndicator(id) {
  const indicator = document.getElementById(id);
  if (indicator) {
    indicator.remove();
  }
}

// Clear messages UI
export function clearMessagesUI() {
  if (elements.messagesContainer) {
    elements.messagesContainer.innerHTML = "";
  }
  if (elements.welcomeScreen) {
    elements.welcomeScreen.style.display = "flex";
  }
}

// Update chat history UI (sidebar)
export function updateChatHistoryUI() {
  if (!elements.chatHistoryContainer) return;
  
  elements.chatHistoryContainer.innerHTML = "";

  const chats = getAllChats();
  const chatIds = Object.keys(chats).sort((a, b) => b - a);

  chatIds.forEach((id) => {
    const chat = chats[id];
    const item = document.createElement("div");
    item.className = "chat-history-item";
    if (getCurrentChat()?.id === id) {
      item.classList.add("active");
    }
    
    item.textContent = chat.title;
    item.addEventListener("click", () => {
      if (window.onChatHistoryItemClick) {
        window.onChatHistoryItemClick(id);
      }
    });
    
    elements.chatHistoryContainer.appendChild(item);
  });
}

// Display saved chats modal
export async function displaySavedChats() {
  if (!elements.savedChatsContainer) return;
  
  elements.savedChatsContainer.innerHTML = '<div class="loading-saved-chats">Loading saved chats...</div>';
  
  try {
    const chats = await loadSavedChatsFromServer();
    
    if (!chats || chats.length === 0) {
      elements.savedChatsContainer.innerHTML = '<div class="no-saved-chats">No saved chats found</div>';
      return;
    }
    
    elements.savedChatsContainer.innerHTML = '';
    
    chats.forEach((chat) => {
      const chatCard = document.createElement("div");
      chatCard.className = "saved-chat-card";
      
      const createdDate = chat.created_at ? new Date(chat.created_at).toLocaleString() : 'N/A';
      const savedDate = chat.saved_at ? new Date(chat.saved_at).toLocaleString() : 'N/A';
      
      chatCard.innerHTML = `
        <div class="saved-chat-header">
          <h3 class="saved-chat-title">${chat.title || 'Untitled Chat'}</h3>
          <button class="delete-saved-chat" data-chat-id="${chat.id}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
        <div class="saved-chat-meta">
          <div class="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
            <span style="font-family: monospace; font-size: 11px; opacity: 0.7;">ID: ${chat.id}</span>
          </div>
          <div class="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            ${createdDate}
          </div>
          <div class="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Model: ${chat.model || 'N/A'}
          </div>
          <div class="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            ${chat.message_count || 0} messages
          </div>
        </div>
        <div class="saved-chat-footer">
          <span class="saved-date">Saved: ${savedDate}</span>
        </div>
      `;
      
      // Make entire card clickable
      chatCard.style.cursor = 'pointer';
      chatCard.addEventListener('click', async (e) => {
        // Don't trigger if delete button was clicked
        if (e.target.closest('.delete-saved-chat')) return;
        
        if (window.onLoadSavedChat) {
          await window.onLoadSavedChat(chat.id);
        }
      });
      
      elements.savedChatsContainer.appendChild(chatCard);
    });
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-saved-chat').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const chatId = e.target.closest('.delete-saved-chat').getAttribute('data-chat-id');
        
        if (confirm('Are you sure you want to delete this chat?')) {
          if (window.onDeleteSavedChat) {
            await window.onDeleteSavedChat(chatId);
          }
        }
      });
    });
  } catch (error) {
    console.error('Error displaying saved chats:', error);
    elements.savedChatsContainer.innerHTML = '<div class="error-saved-chats">Error loading saved chats</div>';
  }
}

