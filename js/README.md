# JavaScript Modular Architecture

Bu klasör, web chat interface uygulamasının modüler JavaScript yapısını içerir.

## 📁 Dosya Yapısı

### **config.js** (1.3 KB)
**Amaç**: Ayarlar ve konfigürasyon yönetimi

**Exports**:
- `defaultSettings` - Varsayılan ayarlar objesi
- `settings` - Mevcut ayarlar
- `loadSettings()` - localStorage'dan ayarları yükle
- `saveSettings()` - Ayarları kaydet
- `getSettings()` - Mevcut ayarları al
- `updateSetting()` - Tek bir ayarı güncelle
- `resetSettings()` - Ayarları sıfırla

**Kullanım**:
```javascript
import { getSettings, saveSettings } from './config.js';

const settings = getSettings();
saveSettings({ temperature: 0.8 });
```

---

### **api.js** (4.6 KB)
**Amaç**: AI API çağrıları (Ollama, Gemini, OpenRouter)

**Exports**:
- `callAI()` - Ana API çağrıcı (provider'a göre yönlendirir)
- `callOllamaAPI()` - Ollama API
- `callGeminiAPI()` - Google Gemini API
- `callOpenRouterAPI()` - OpenRouter API
- `fetchOllamaModels()` - Ollama modellerini listele
- `buildPrompt()` - Chat history'den prompt oluştur

**Kullanım**:
```javascript
import { callAI } from './api.js';

const response = await callAI(chatHistory);
```

---

### **chat.js** (2.9 KB)
**Amaç**: Chat yönetimi ve mesaj işlemleri

**Exports**:
- `chatHistory` - Mevcut chat mesajları
- `currentChatId` - Aktif chat ID'si
- `allChats` - Tüm chatler
- `startNewChat()` - Yeni chat başlat
- `addMessageToChat()` - Mesaj ekle
- `loadChat()` - Belirli bir chat'i yükle
- `deleteChat()` - Chat'i sil
- `getChat()` - Chat'i ID ile al
- `getCurrentChat()` - Aktif chat'i al
- `getAllChats()` - Tüm chatleri al (boş olmayanlar)
- `setAllChats()` - Chatleri set et
- `cleanupEmptyChats()` - Boş chatleri temizle

**Kullanım**:
```javascript
import { startNewChat, addMessageToChat } from './chat.js';

startNewChat();
addMessageToChat('user', 'Hello!');
```

---

### **storage.js** (3.6 KB)
**Amaç**: localStorage ve server cache işlemleri

**Exports**:
- `saveChatToLocalStorage()` - Chatleri localStorage'a kaydet
- `loadChatsFromLocalStorage()` - localStorage'dan yükle
- `saveChatToServer()` - Server'a kaydet (debounced)
- `loadSavedChatsFromServer()` - Server'dan chat listesi al
- `loadChatFromServer()` - Belirli chat'i server'dan yükle
- `deleteChatFromServer()` - Server'dan sil

**Kullanım**:
```javascript
import { saveChatToServer, loadChatFromServer } from './storage.js';

await saveChatToServer(chatId);
const chat = await loadChatFromServer(chatId);
```

---

### **ui.js** (10.6 KB)
**Amaç**: UI güncellemeleri ve modal yönetimi

**Exports**:
- `initUIElements()` - DOM elementlerini başlat
- `updateProviderUI()` - Provider UI'ını güncelle
- `updateModelInfo()` - Model bilgisini güncelle
- `addMessage()` - Mesaj ekle (markdown render ile)
- `addTypingIndicator()` - Typing göstergesi ekle
- `removeTypingIndicator()` - Typing göstergesini kaldır
- `clearMessagesUI()` - Mesajları temizle
- `updateChatHistoryUI()` - Sidebar chat listesini güncelle
- `displaySavedChats()` - Kayıtlı chatler modalını göster

**Kullanım**:
```javascript
import { addMessage, updateChatHistoryUI } from './ui.js';

addMessage('user', 'Hello!');
updateChatHistoryUI();
```

---

### **markdown.js** (2.0 KB)
**Amaç**: Markdown ve HTML preview yönetimi

**Exports**:
- `initializeMarked()` - Marked.js konfigürasyonu
- `initHTMLPreview()` - HTML preview modal'ı başlat
- `showHTMLPreview()` - HTML önizleme göster
- `refreshHTMLPreview()` - Önizlemeyi yenile
- `closeHTMLPreview()` - Önizlemeyi kapat

**Kullanım**:
```javascript
import { showHTMLPreview } from './markdown.js';

showHTMLPreview('<h1>Hello World</h1>');
```

---

### **main.js** (13.6 KB)
**Amaç**: Ana uygulama ve event listeners

**İçerik**:
- Tüm modülleri import eder
- DOM elementlerini initialize eder
- Event listener'ları tanımlar
- Uygulama başlatıcısı (`init()`)
- Mesaj gönderme mantığı
- Modal yönetimi
- Sidebar toggle
- File attachment ve web search

**Not**: Bu dosya direkt import edilmez, `index.html` tarafından yüklenir.

---

## 🔄 Modül Bağımlılıkları

```
main.js
  ├── config.js
  ├── api.js (→ config.js)
  ├── chat.js (→ config.js)
  ├── storage.js (→ chat.js)
  ├── ui.js (→ config.js, chat.js, storage.js)
  └── markdown.js
```

---

## 🚀 Yeni Özellik Ekleme

### Örnek: Yeni bir AI Provider ekleme

1. **api.js** - Yeni provider fonksiyonu ekle:
```javascript
export async function callMyProviderAPI(chatHistory) {
  // API çağrısı
}
```

2. **api.js** - `callAI()` fonksiyonuna ekle:
```javascript
case "myprovider":
  return await callMyProviderAPI(chatHistory);
```

3. **config.js** - Varsayılan ayarlara ekle:
```javascript
myProviderApiKey: "",
myProviderModel: "default-model",
```

4. **index.html** - UI elementlerini ekle
5. **main.js** - Event listener'ları ekle

---

## 📝 Notlar

- Tüm modüller **ES6 modules** kullanır (`import/export`)
- Circular dependency'den kaçınılmıştır
- Her modül tek bir sorumluluğa sahiptir (Single Responsibility)
- State yönetimi `chat.js` ve `config.js` üzerinden yapılır
- UI işlemleri `ui.js`'de izole edilmiştir

---

## 🔧 Geliştirme

Değişiklik yaptıktan sonra:
1. Browser console'da hata kontrolü yapın
2. `Ctrl+Shift+R` ile hard refresh yapın
3. Module import error'larını kontrol edin

---

## 📦 Eski Dosya

`app.js.backup` - Modülerleştirme öncesi tek dosya yapısı (yedek)

