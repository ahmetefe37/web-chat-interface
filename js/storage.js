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
    // Don't save empty or too short chats
    if (!chat.messages || chat.messages.length < 2) {
      console.log('saveChatToServer: Chat too short, not saving:', chat.messages?.length);
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
      console.log(`saveChatToServer: Success! ${result.updated ? 'Updated' : 'Created'} ${result.filename}`);
    } else {
      console.error(`saveChatToServer: Failed with status ${response.status}`);
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

