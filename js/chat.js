// Chat Management
import { getSettings } from './config.js';

// Chat state - Internal
let chatHistory = [];
let currentChatId = null;
let allChats = {};

// Getters for chat state
export function getChatHistory() {
  return chatHistory;
}

export function getCurrentChatId() {
  return currentChatId;
}

export function getAllChatsInternal() {
  return allChats;
}

// Generate unique chat ID
export function generateChatId() {
  return Date.now().toString();
}

// Start new chat
export function startNewChat() {
  // Don't create new chat if current one is empty
  if (currentChatId && allChats[currentChatId]?.messages.length === 0) {
    return currentChatId;
  }
  
  currentChatId = generateChatId();
  chatHistory = [];
  
  allChats[currentChatId] = {
    id: currentChatId,
    title: "New Chat",
    messages: [],
    created_at: new Date().toISOString(),
    model: getSettings().modelName,
  };
  
  return currentChatId;
}

// Add message to chat with optional image
export function addMessageToChat(role, content, imageUrl = null) {
  const message = {
    role: role,
    content: content,
    timestamp: new Date().toISOString(),
  };
  
  // Add image URL if provided
  if (imageUrl) {
    message.imageUrl = imageUrl;
  }
  
  chatHistory.push(message);
  
  if (currentChatId && allChats[currentChatId]) {
    allChats[currentChatId].messages.push(message);
    
    // Update title from first user message
    if (role === "user" && allChats[currentChatId].messages.length === 1) {
      allChats[currentChatId].title = content.substring(0, 50) + (content.length > 50 ? "..." : "");
    }
  }
  
  return message;
}

// Load a specific chat
export function loadChat(chatId) {
  if (!allChats[chatId]) {
    console.error(`Chat ${chatId} not found`);
    return false;
  }
  
  currentChatId = chatId;
  chatHistory = [...allChats[chatId].messages];
  
  return true;
}

// Delete a chat
export function deleteChat(chatId) {
  if (allChats[chatId]) {
    delete allChats[chatId];
    
    // If deleted chat was current, start new chat
    if (chatId === currentChatId) {
      startNewChat();
    }
    
    return true;
  }
  return false;
}

// Get chat by ID
export function getChat(chatId) {
  return allChats[chatId] || null;
}

// Get current chat
export function getCurrentChat() {
  return currentChatId ? allChats[currentChatId] : null;
}

// Get all chats (filtered for non-empty)
export function getAllChats() {
  const validChats = {};
  Object.keys(allChats).forEach(id => {
    if (allChats[id].messages && allChats[id].messages.length > 0) {
      validChats[id] = allChats[id];
    }
  });
  return validChats;
}

// Set all chats (used when loading from storage)
export function setAllChats(chats) {
  allChats = chats || {};
}

// Set current chat ID
export function setCurrentChatId(id) {
  currentChatId = id;
}

// Clean up empty chats
export function cleanupEmptyChats() {
  const chatIds = Object.keys(allChats);
  chatIds.forEach(id => {
    if (!allChats[id].messages || allChats[id].messages.length === 0) {
      delete allChats[id];
    }
  });
}

