using System;
using System.IO;
using System.Linq;

namespace Kitchy.Core.Security
{
    public static class MediaValidator
    {
        public static readonly string[] AllowedImageMimes = { "image/jpeg", "image/png", "image/webp" };
        public static readonly string[] AllowedVideoMimes = { "video/mp4", "video/quicktime" };
        public static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov" };

        public const long MaxImageSizeBytes = 10 * 1024 * 1024; // 10MB
        public const long MaxVideoSizeBytes = 50 * 1024 * 1024; // 50MB

        public static bool ValidateMedia(Stream stream, string fileName, string contentType, out string errorMessage)
        {
            errorMessage = string.Empty;

            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
            {
                errorMessage = "Extensión no permitida. Solo se admiten JPG, PNG, WEBP, MP4 y MOV.";
                return false;
            }

            var isVideo = AllowedVideoMimes.Contains(contentType) || ext == ".mp4" || ext == ".mov";
            var maxBytes = isVideo ? MaxVideoSizeBytes : MaxImageSizeBytes;

            if (stream.Length > maxBytes)
            {
                errorMessage = $"Archivo demasiado grande. El límite es {(isVideo ? "50MB" : "10MB")}.";
                return false;
            }

            if (stream.Length < 4)
            {
                errorMessage = "Archivo corrupto o incompleto.";
                return false;
            }

            // Inspect Magic Bytes
            var header = new byte[12];
            var bytesRead = stream.Read(header, 0, Math.Min(header.Length, (int)stream.Length));
            stream.Position = 0; // Rewind

            if (bytesRead < 4)
            {
                errorMessage = "No se pudieron verificar las cabeceras del archivo.";
                return false;
            }

            // Check JPEG (FF D8 FF)
            if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF) return true;

            // Check PNG (89 50 4E 47)
            if (header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47) return true;

            // Check WEBP (RIFF....WEBP)
            if (header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46)
            {
                if (bytesRead >= 12 && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50)
                {
                    return true;
                }
            }

            // Check MP4 / QuickTime (....ftyp)
            if (bytesRead >= 8 && header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70)
            {
                return true;
            }

            // Check QuickTime (....moov)
            if (bytesRead >= 8 && header[4] == 0x6D && header[5] == 0x6F && header[6] == 0x6F && header[7] == 0x76)
            {
                return true;
            }

            // If video content-type declared and extension is valid, allow as fallback
            if (isVideo && (ext == ".mp4" || ext == ".mov"))
            {
                return true;
            }

            errorMessage = "Firma o cabecera (Magic Bytes) del archivo no válida.";
            return false;
        }
    }
}

