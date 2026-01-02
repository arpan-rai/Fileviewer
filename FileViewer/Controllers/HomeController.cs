using FileViewer.Models;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net;

namespace FileViewer.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly IWebHostEnvironment _hostingEnvironment;

        public HomeController(ILogger<HomeController> logger, IWebHostEnvironment hostingEnvironment)
        {
            _logger = logger;
            _hostingEnvironment = hostingEnvironment;   
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
        public async Task<IActionResult> DownloadFile(string path, bool download = false)
        {
            if (string.IsNullOrWhiteSpace(path))
            {
                return StatusCode(404, new { message = "Document file path not found." });
            }

            // Ensure file path is safe
            string relativeFilePath = path.Replace('\\', '/').TrimStart('/');
            if (relativeFilePath.Contains(".."))
            {
                return StatusCode(500, new { message = "Invalid file path." });
            }

            // Apply authorization login for file access for that user
            ////

            // Build physical path from secure uploads directory
            string uploadsRoot = Path.Combine(_hostingEnvironment.ContentRootPath,"wwwroot");
            string fullPath = Path.Combine(uploadsRoot, relativeFilePath);

            if (!System.IO.File.Exists(fullPath))
            {
                return StatusCode(404, new { message = "File does not exist." });
            }

            string extension = Path.GetExtension(fullPath).ToLowerInvariant();
            string contentType = GetContentType(extension);
            if (string.IsNullOrEmpty(contentType))
            {
                return StatusCode(500, new { message = "Unsupported file format." });
            }

            string downloadFileName = "DownloadFileName"; // Filename setting

            if (download)
            {
                byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
                return File(fileBytes, contentType, downloadFileName);
            }

            // Metadata
            Response.Headers.Add("X-File-Name", downloadFileName);
            Response.Headers.Add("X-File-Size", System.IO.File.ReadAllBytes(fullPath).Length.ToString());
            Response.Headers.Add("X-File-Type", contentType);

            // IMPORTANT for JS access
            Response.Headers.Add(
                "Access-Control-Expose-Headers",
                "X-File-Name, X-File-Size, X-File-Type, Content-Disposition"
            );

            // Stream file back to client
            var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read);

            Response.Headers.Add("Content-Disposition", $"inline; filename=\"{downloadFileName}\"");

            return File(stream, contentType);
        }
        // Helper function to map extension to content type
        private static string GetContentType(string extension)
        {
            return extension switch
            {
                ".pdf" => "application/pdf",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".xls" => "application/vnd.ms-excel",
                ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".txt" => "text/plain",
                _ => null
            };
        }
    }
}
