// Storage Management (localStorage and Server Cache)
import { getAllChats, getChat, setAllChats, setCurrentChatId, getCurrentChatId } from './chat.js';

// Get server URL dynamically
function getServerUrl() {
  return `${window.location.protocol}//${window.location.host}`;
}

// Save chats to localStorage
export function saveChatToLocalStorage() {
  try {
    const validChats = getAllChats();
    localStorage.setItem("llamaChats", JSON.stringify(validChats));
    const chatId = getCurrentChatId();
    if (chatId) {
      localStorage.setItem("llamaCurrentChatId", chatId);
    }
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

// Load chats from localStorage
export function loadChatsFromLocalStorage() {
  try {
    const savedChats = localStorage.getItem("llamaChats");
    const savedChatId = localStorage.getItem("llamaCurrentChatId");
    
    if (savedChats) {
      setAllChats(JSON.parse(savedChats));
    }
    if (savedChatId) {
      setCurrentChatId(savedChatId);
    }
  } catch (error) {
    console.error("Error loading from localStorage:", error);
  }
}

// Save chat to server (cache directory)
export async function saveChatToServer(chatId) {
  const chat = getChat(chatId);
  if (!chat) {
    console.log('saveChatToServer: Chat not found for ID:', chatId);
    return;
  }
  
  try {
    // Only save when we have both user and assistant messages (interaction happened)
    if (!chat.messages || chat.messages.length === 0) {
      console.log('saveChatToServer: Chat has no messages, not saving');
      return;
    }
    
    // Check if we have both user and assistant messages
    const hasUser = chat.messages.some(msg => msg.role === 'user');
    const hasAssistant = chat.messages.some(msg => msg.role === 'assistant');
    
    if (!hasUser || !hasAssistant) {
      console.log('saveChatToServer: Chat incomplete - hasUser:', hasUser, 'hasAssistant:', hasAssistant);
      return;
    }
    
    // Check if already saved recently (prevent rapid successive saves)
    const lastSaved = chat.lastServerSave || 0;
    const now = Date.now();
    if (now - lastSaved < 3000) {
      console.log('saveChatToServer: Chat saved recently, skipping:', chatId);
      return;
    }
    
    const serverUrl = getServerUrl();
    console.log('saveChatToServer: Saving chat:', chatId, 'Messages:', chat.messages.length);
    
    const response = await fetch(`${serverUrl}/api/chats/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chat),
    });
    
    if (response.ok) {
      const result = await response.json();
      chat.lastServerSave = now;
      console.log(`✅ saveChatToServer: Success! ${result.updated ? 'Updated' : 'Created'} ${result.filename}`);
    } else {
      const errorText = await response.text();
      console.error(`❌ saveChatToServer: Failed with status ${response.status}:`, errorText);
    }
  } catch (error) {
    console.error("saveChatToServer: Error:", error);
  }
}

// Load saved chats from server
export async function loadSavedChatsFromServer() {
  try {
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/api/chats/list`);
    
    if (response.ok) {
      const data = await response.json();
      return data.chats || [];
    }
  } catch (error) {
    console.error("Error loading chats from server:", error);
  }
  return [];
}

// Synchronize all chats from server cache (Single Source of Truth)
export async function syncChatsWithServer() {
  console.log('🔄 Starting chat synchronization with server cache...');
  
  try {
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/api/chats/list`);
    
    if (!response.ok) {
      console.error('Failed to sync chats from server');
      return false;
    }
    
    const data = await response.json();
    const serverChats = data.chats || [];
    
    console.log(`📂 Found ${serverChats.length} chats in cache folder`);
    
    // Load full chat data for each chat
    const fullChats = {};
    let loadedCount = 0;
    
    for (const chatMeta of serverChats) {
      try {
        const chatData = await loadChatFromServer(chatMeta.id);
        if (chatData && chatData.messages) {
          fullChats[chatData.id] = chatData;
          loadedCount++;
        }
      } catch (error) {
        console.error(`Failed to load chat ${chatMeta.id}:`, error);
      }
    }
    
    console.log(`✅ Successfully loaded ${loadedCount} chats from cache`);
    
    // Get current chat ID BEFORE setting allChats
    const currentChatId = getCurrentChatId();
    const savedChatId = localStorage.getItem("llamaCurrentChatId");
    
    // Preserve current in-memory chat if it exists and is newer
    let currentInMemoryChat = null;
    if (currentChatId) {
      const allChats = getAllChats();
      if (allChats[currentChatId]) {
        currentInMemoryChat = allChats[currentChatId];
        console.log('💾 Preserving in-memory current chat:', currentChatId);
      }
    }
    
    // Update allChats with server data
    setAllChats(fullChats);
    
    // If we had an in-memory current chat that's newer, keep it
    if (currentInMemoryChat && (!fullChats[currentChatId] || 
        currentInMemoryChat.messages.length > (fullChats[currentChatId]?.messages.length || 0))) {
      const updatedChats = getAllChats();
      updatedChats[currentChatId] = currentInMemoryChat;
      setAllChats(updatedChats);
      console.log('✅ Kept current in-memory chat, it has more messages');
    }
    
    // Set current chat ID
    const chatIdToUse = currentChatId || savedChatId;
    if (chatIdToUse && fullChats[chatIdToUse]) {
      setCurrentChatId(chatIdToUse);
    } else if (chatIdToUse) {
      console.log('⚠️ Current chat ID not in server cache:', chatIdToUse);
      // Check if we have this chat in allChats (before syncing)
      if (currentChatId && currentInMemoryChat) {
        // Add it to fullChats so it doesn't get lost
        fullChats[currentChatId] = currentInMemoryChat;
        setAllChats(fullChats);
        setCurrentChatId(currentChatId);
        console.log('✅ Added current chat to synced chats:', currentChatId);
      } else {
        // Keep the ID anyway - it will be saved when it has messages
      }
    }
    
    // Save to localStorage as backup
    saveChatToLocalStorage();
    
    console.log('✅ Chat synchronization complete!');
    return true;
    
  } catch (error) {
    console.error('❌ Error synchronizing chats:', error);
    return false;
  }
}

// Load specific chat from server
export async function loadChatFromServer(chatId) {
  try {
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/api/chats/load/${chatId}`);
    
    if (response.ok) {
      const chatData = await response.json();
      return chatData;
    }
  } catch (error) {
    console.error("Error loading chat from server:", error);
  }
  return null;
}

// Delete chat from server
export async function deleteChatFromServer(chatId) {
  try {
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/api/chats/delete/${chatId}`, {
      method: "DELETE",
    });
    
    if (response.ok) {
      console.log("Chat deleted from server");
      return true;
    }
  } catch (error) {
    console.error("Error deleting chat from server:", error);
  }
  return false;
}

