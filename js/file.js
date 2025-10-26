// File handling functions (images and documents)

// Current uploaded file
let currentFile = null;

// Upload image to server
export async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Image upload error:', error);
        throw error;
    }
}

// Upload document to server
export async function uploadDocument(file) {
    const formData = new FormData();
    formData.append('document', file);

    try {
        const response = await fetch('/api/upload/document', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Upload failed:', response.status, errorData);
            throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Document upload error:', error);
        throw error;
    }
}

// Parse document content
export async function parseDocument(fileUrl) {
    try {
        const response = await fetch('/api/document/parse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileUrl })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Parse failed:', response.status, errorData);
            throw new Error(errorData.error || 'Document parsing failed');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Document parse error:', error);
        throw error;
    }
}

// Convert image URL to base64
export async function imageUrlToBase64(imageUrl) {
    try {
        const response = await fetch('/api/image-to-base64', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageUrl })
        });

        if (!response.ok) {
            throw new Error('Base64 conversion failed');
        }

        const data = await response.json();
        return data.base64;
    } catch (error) {
        console.error('Base64 conversion error:', error);
        throw error;
    }
}

// Detect file type
export function getFileType(file) {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const documentExts = ['.txt', '.csv', '.md', '.json', '.pdf'];
    
    if (imageExts.includes(ext)) {
        return 'image';
    } else if (documentExts.includes(ext)) {
        return 'document';
    }
    return 'unknown';
}

// Get file icon based on extension
export function getFileIcon(filename) {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    
    const icons = {
        '.txt': '📄',
        '.csv': '📊',
        '.md': '📝',
        '.json': '📋',
        '.pdf': '📕'
    };
    
    return icons[ext] || '📎';
}

// Format file size
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Set current file
export function setCurrentFile(fileData) {
    currentFile = fileData;
}

// Get current file
export function getCurrentFile() {
    return currentFile;
}

// Clear current file
export function clearCurrentFile() {
    currentFile = null;
}

// Check if file is attached
export function hasFile() {
    return currentFile !== null;
}

