import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 5000;
const OLLAMA_URL = 'http://127.0.0.1:11434';
const CACHE_DIR = join(__dirname, 'cache');
const UPLOADS_DIR = join(__dirname, 'cache', 'library', 'uploads');

// Ensure upload directory exists
async function ensureUploadDir() {
    if (!existsSync(UPLOADS_DIR)) {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
        console.log(`Created uploads directory: ${UPLOADS_DIR}`);
    }
}
ensureUploadDir();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        await ensureUploadDir();
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop();
        cb(null, `image-${uniqueSuffix}.${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Serve static files
app.get('/:path', (req, res) => {
    res.sendFile(join(__dirname, req.params.path));
});

// Ollama API - Generate
app.post('/api/generate', async (req, res) => {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Generate error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Ollama API - Chat
app.post('/api/chat', async (req, res) => {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Ollama API - Tags (List Models)
app.get('/api/tags', async (req, res) => {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`);

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Tags error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload image endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        const filePath = req.file.path;

        res.json({
            success: true,
            filename: req.file.filename,
            url: fileUrl,
            path: filePath,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Convert image to base64
app.post('/api/image-to-base64', async (req, res) => {
    try {
        const { imageUrl } = req.body;
        
        if (!imageUrl) {
            return res.status(400).json({ error: 'Image URL is required' });
        }

        let imagePath;
        
        // Check if it's a local file path
        if (imageUrl.startsWith('/uploads/')) {
            const filename = imageUrl.replace('/uploads/', '');
            imagePath = join(UPLOADS_DIR, filename);
        } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            // Download from URL
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch image from URL');
            }
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            return res.json({ success: true, base64: base64 });
        } else {
            return res.status(400).json({ error: 'Invalid image URL' });
        }

        // Read local file and convert to base64
        const imageBuffer = await fs.readFile(imagePath);
        const base64 = imageBuffer.toString('base64');

        res.json({
            success: true,
            base64: base64
        });
    } catch (error) {
        console.error('Base64 conversion error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save chat to cache directory (Update or Create)
app.post('/api/chats/save', async (req, res) => {
    try {
        const data = req.body;
        const chatId = data.id;

        if (!chatId) {
            return res.status(400).json({ error: 'Chat ID is required' });
        }

        // Ensure cache directory exists
        if (!existsSync(CACHE_DIR)) {
            await fs.mkdir(CACHE_DIR, { recursive: true });
        }

        // Check if chat already exists
        let existingFile = null;
        const files = await fs.readdir(CACHE_DIR);
        for (const file of files) {
            if (file.endsWith(`_${chatId}.json`)) {
                existingFile = file;
                break;
            }
        }

        let filename;
        if (existingFile) {
            // Update existing chat
            filename = existingFile;
        } else {
            // Create new chat with timestamp
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
            filename = `chat_${timestamp}_${chatId}.json`;
        }

        const filepath = join(CACHE_DIR, filename);

        // Add server-side metadata
        const chatData = {
            id: chatId,
            title: data.title || 'Untitled Chat',
            messages: data.messages || [],
            model: data.model || 'unknown',
            created_at: data.created_at,
            updated_at: new Date().toISOString(),
            saved_at: new Date().toISOString(),
            message_count: (data.messages || []).length,
        };

        // Save to file (overwrite if exists)
        await fs.writeFile(filepath, JSON.stringify(chatData, null, 2), 'utf-8');

        res.json({
            success: true,
            filename: filename,
            filepath: filepath,
            chat_id: chatId,
            updated: !!existingFile,
        });
    } catch (error) {
        console.error('Save chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// List all saved chats
app.get('/api/chats/list', async (req, res) => {
    try {
        // Ensure cache directory exists
        if (!existsSync(CACHE_DIR)) {
            await fs.mkdir(CACHE_DIR, { recursive: true });
        }

        const files = await fs.readdir(CACHE_DIR);
        const chatMap = new Map(); // Use Map to store unique chats by ID

        for (const filename of files) {
            if (filename.endsWith('.json') && filename.startsWith('chat_')) {
                const filepath = join(CACHE_DIR, filename);
                try {
                    const fileContent = await fs.readFile(filepath, 'utf-8');
                    const chatData = JSON.parse(fileContent);
                    
                    const chatInfo = {
                        id: chatData.id,
                        title: chatData.title,
                        model: chatData.model,
                        created_at: chatData.created_at,
                        updated_at: chatData.updated_at,
                        saved_at: chatData.saved_at,
                        message_count: chatData.message_count || 0,
                        filename: filename,
                    };
                    
                    // If this chat ID already exists, keep only the newest one
                    const existingChat = chatMap.get(chatData.id);
                    if (!existingChat || new Date(chatInfo.saved_at) > new Date(existingChat.saved_at)) {
                        chatMap.set(chatData.id, chatInfo);
                    }
                } catch (error) {
                    console.error(`Error reading ${filename}:`, error);
                    continue;
                }
            }
        }

        // Convert Map to array
        const chats = Array.from(chatMap.values());

        // Sort by saved_at (newest first)
        chats.sort((a, b) => {
            const dateA = new Date(a.saved_at || 0);
            const dateB = new Date(b.saved_at || 0);
            return dateB - dateA;
        });

        res.json({ chats: chats, count: chats.length });
    } catch (error) {
        console.error('List chats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Load a specific chat by ID
app.get('/api/chats/load/:chat_id', async (req, res) => {
    try {
        const chatId = req.params.chat_id;
        const files = await fs.readdir(CACHE_DIR);

        // Find the chat file
        for (const filename of files) {
            if (filename.endsWith(`_${chatId}.json`)) {
                const filepath = join(CACHE_DIR, filename);
                const fileContent = await fs.readFile(filepath, 'utf-8');
                const chatData = JSON.parse(fileContent);
                return res.json(chatData);
            }
        }

        res.status(404).json({ error: 'Chat not found' });
    } catch (error) {
        console.error('Load chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a specific chat by ID (deletes ALL files with this chat ID)
app.delete('/api/chats/delete/:chat_id', async (req, res) => {
    try {
        const chatId = req.params.chat_id;
        const files = await fs.readdir(CACHE_DIR);
        let deletedCount = 0;

        // Find and delete ALL files with this chat ID (handles duplicates)
        for (const filename of files) {
            if (filename.endsWith(`_${chatId}.json`)) {
                const filepath = join(CACHE_DIR, filename);
                await fs.unlink(filepath);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            return res.json({
                success: true,
                message: `Chat deleted successfully (${deletedCount} file(s) removed)`,
                chat_id: chatId,
                deleted_count: deletedCount,
            });
        }

        res.status(404).json({ error: 'Chat not found' });
    } catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Clean up duplicate chat files (keep only the newest for each chat ID)
app.post('/api/chats/cleanup', async (req, res) => {
    try {
        if (!existsSync(CACHE_DIR)) {
            return res.json({ message: 'Cache directory does not exist', cleaned: 0 });
        }

        const files = await fs.readdir(CACHE_DIR);
        const chatGroups = new Map(); // Group files by chat ID

        // Group all files by chat ID
        for (const filename of files) {
            if (filename.endsWith('.json') && filename.startsWith('chat_')) {
                const filepath = join(CACHE_DIR, filename);
                try {
                    const fileContent = await fs.readFile(filepath, 'utf-8');
                    const chatData = JSON.parse(fileContent);
                    const chatId = chatData.id;

                    if (!chatGroups.has(chatId)) {
                        chatGroups.set(chatId, []);
                    }

                    chatGroups.get(chatId).push({
                        filename: filename,
                        filepath: filepath,
                        saved_at: new Date(chatData.saved_at || 0),
                    });
                } catch (error) {
                    console.error(`Error reading ${filename}:`, error);
                }
            }
        }

        let cleanedCount = 0;

        // For each chat ID, delete all except the newest
        for (const [chatId, fileList] of chatGroups.entries()) {
            if (fileList.length > 1) {
                // Sort by saved_at (newest first)
                fileList.sort((a, b) => b.saved_at - a.saved_at);

                // Delete all except the first (newest)
                for (let i = 1; i < fileList.length; i++) {
                    await fs.unlink(fileList[i].filepath);
                    console.log(`Deleted duplicate: ${fileList[i].filename}`);
                    cleanedCount++;
                }
            }
        }

        res.json({
            success: true,
            message: `Cleaned up ${cleanedCount} duplicate chat file(s)`,
            cleaned: cleanedCount,
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('Initializing Web Chat Interface Server');
    console.log('='.repeat(50));
    console.log(`Server URL: http://localhost:${PORT}`);
    console.log(`Ollama URL: ${OLLAMA_URL}`);
    console.log(`Cache Directory: ${CACHE_DIR}`);
    console.log('='.repeat(50));
});

