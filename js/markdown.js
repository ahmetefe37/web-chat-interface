// Markdown and HTML Preview Management

// Configure marked.js
export function initializeMarked() {
  if (typeof marked !== "undefined") {
    marked.setOptions({
      highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.error("Highlight error:", err);
          }
        }
        return hljs.highlightAuto(code).value;
      },
      breaks: true,
      gfm: true,
    });
  }
}

// HTML Preview Modal Elements
let previewModal = null;
let previewFrame = null;

export function initHTMLPreview(modal, iframe) {
  previewModal = modal;
  previewFrame = iframe;
}

// Show HTML Preview
export function showHTMLPreview(htmlCode) {
  loadHTMLPreview(htmlCode);
  if (previewModal) {
    previewModal.classList.add("active");
  }
}

// Load HTML into preview iframe
function loadHTMLPreview(htmlCode) {
  if (!previewFrame) {
    console.error('Preview frame not found!');
    return;
  }
  
  console.log('Loading HTML preview:', htmlCode.substring(0, 100) + '...');
  
  // Store the HTML for refresh functionality
  previewFrame.setAttribute("data-html", htmlCode);

  // Create a complete HTML document if not already one
  let fullHTML = htmlCode.trim();
  if (!fullHTML.toLowerCase().includes("<!doctype") && !fullHTML.toLowerCase().includes("<html")) {
    fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    body { margin: 0; padding: 20px; font-family: sans-serif; }
  </style>
</head>
<body>
${fullHTML}
</body>
</html>`;
  }

  console.log('Full HTML:', fullHTML.substring(0, 200) + '...');

  // Use srcdoc to load HTML safely
  previewFrame.srcdoc = fullHTML;
}

// Refresh HTML preview
export function refreshHTMLPreview() {
  if (!previewFrame) return;
  
  const htmlCode = previewFrame.getAttribute("data-html");
  if (htmlCode) {
    loadHTMLPreview(htmlCode);
  }
}

// Close HTML preview
export function closeHTMLPreview() {
  if (previewModal) {
    previewModal.classList.remove("active");
  }
}

