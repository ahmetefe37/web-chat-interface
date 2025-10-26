// Image handling functions

// Current uploaded image
let currentImage = null;

// Upload image to server
export async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Upload error:', error);
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

// Set current image
export function setCurrentImage(imageData) {
    currentImage = imageData;
}

// Get current image
export function getCurrentImage() {
    return currentImage;
}

// Clear current image
export function clearCurrentImage() {
    currentImage = null;
}

// Check if image is attached
export function hasImage() {
    return currentImage !== null;
}

