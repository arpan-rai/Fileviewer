# 📄 Gmail-Like Secure File Viewer

A **Gmail-style file viewer** built with **ASP.NET Core** that allows users to preview **PDFs and images directly in the browser** without downloading them.

This implementation uses **PDF.js (ES Modules)** for PDF rendering and **CSS transforms** for image zooming, closely matching Gmail’s attachment preview experience.

---

## ✨ Features

### 📑 PDF Viewer
- Gmail-style full-screen overlay (no iframe)
- PDF.js canvas rendering (`.mjs`)
- Page navigation (Previous / Next)
- Zoom In / Zoom Out
- Keyboard support
  - `← / →` – Page navigation
- Secure file streaming via controller

### 🖼 Image Viewer
- Full-screen overlay preview
- Zoom In / Zoom Out
- Mouse wheel zoom
- Drag-to-pan when zoomed
- Reset zoom on close

---

## 🏗 Tech Stack

- **ASP.NET Core (MVC / Razor)**
- **PDF.js (ES Module `.mjs`)**
- **HTML, CSS, JavaScript**
- No iframe usage
- Secure server-side file handling

---

## 🔐 Security

- Files are served via **authorized controller endpoints**
- No public/static access to files
- `Content-Disposition: inline` enforced
- Supports authentication and role-based authorization

---

## ⚙️ Required Configuration

### Enable `.mjs` Files in ASP.NET Core

```csharp
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = new FileExtensionContentTypeProvider
    {
        Mappings = { [".mjs"] = "application/javascript" }
    }
});
```
Without this, PDF.js modules will not load correctly.

---

## 📌 Sample Secure File Endpoint

### Home controller
```csharp
[Authorize]
public async Task<IActionResult> DownloadFile(string path, bool download = false)
{
    // Apply authorization login for file access for that user
    ////

    // Build physical path from secure uploads directory
    string uploadsRoot = Path.Combine(_hostingEnvironment.ContentRootPath,"wwwroot");
    string fullPath = Path.Combine(uploadsRoot, relativeFilePath);

    if (!System.IO.File.Exists(fullPath))
    {
        return NotFound("File does not exist.");
    }

    string extension = Path.GetExtension(fullPath).ToLowerInvariant();
    string contentType = GetContentType(extension);
    if (string.IsNullOrEmpty(contentType))
    {
        return BadRequest("Unsupported file format.");
    }

    string downloadFileName = "DownloadFileName"; // Filename setting

    if (download)
    {
        byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
        return File(fileBytes, contentType, downloadFileName);
    }

    // Stream file back to client
    var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read);
    Response.Headers.Add("Content-Disposition", $"inline; filename=\"{downloadFileName}\"");
    return File(stream, contentType);
}
```
---
## 🚀 Usage
```
<a href="/home/downloadfile?path=/Files/AMS.PNG" class="preview-file">View File</a>
```
