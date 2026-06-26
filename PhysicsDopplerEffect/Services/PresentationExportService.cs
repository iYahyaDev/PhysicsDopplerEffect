using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text.RegularExpressions;
using DopplerLab.Models;

namespace DopplerLab.Services
{
    public static class PresentationExportService
    {
        public static byte[] Export(PresentationRepository repository, string id)
        {
            PresentationDefinition presentation = repository.Get(id, "draft");
            string json = repository.Serialize(presentation);

            using (MemoryStream output = new MemoryStream())
            {
                using (ZipArchive zip = new ZipArchive(output, ZipArchiveMode.Create, true))
                {
                    ZipArchiveEntry manifest = zip.CreateEntry("presentation.json", CompressionLevel.Optimal);
                    using (StreamWriter writer = new StreamWriter(manifest.Open()))
                    {
                        writer.Write(json);
                    }

                    if (presentation.Media != null)
                    {
                        foreach (PresentationMedia media in presentation.Media)
                        {
                            if (string.IsNullOrEmpty(media.FileName))
                            {
                                continue;
                            }

                            string mediaPath;
                            try
                            {
                                mediaPath = repository.GetMediaFilePath(presentation.Id, media.FileName);
                            }
                            catch
                            {
                                continue;
                            }

                            ZipArchiveEntry mediaEntry = zip.CreateEntry("media/" + Path.GetFileName(media.FileName), CompressionLevel.Optimal);
                            using (Stream entryStream = mediaEntry.Open())
                            using (FileStream input = File.OpenRead(mediaPath))
                            {
                                input.CopyTo(entryStream);
                            }
                        }
                    }
                }

                return output.ToArray();
            }
        }

        public static PresentationDefinition Import(PresentationRepository repository, string requestedId, Stream zipStream)
        {
            Dictionary<string, byte[]> media = new Dictionary<string, byte[]>(StringComparer.OrdinalIgnoreCase);
            PresentationDefinition presentation = null;

            using (ZipArchive zip = new ZipArchive(zipStream, ZipArchiveMode.Read, true))
            {
                foreach (ZipArchiveEntry entry in zip.Entries)
                {
                    string name = NormalizeEntryName(entry.FullName);
                    if (string.IsNullOrEmpty(name) || name.EndsWith("/", StringComparison.Ordinal))
                    {
                        continue;
                    }

                    if (name == "presentation.json")
                    {
                        using (StreamReader reader = new StreamReader(entry.Open()))
                        {
                            presentation = repository.DeserializePresentation(reader.ReadToEnd());
                        }
                    }
                    else if (name.StartsWith("media/", StringComparison.OrdinalIgnoreCase))
                    {
                        string fileName = Path.GetFileName(name);
                        ValidateMediaName(fileName);
                        if (entry.Length > 50 * 1024 * 1024)
                        {
                            throw new InvalidOperationException("Imported media file is too large.");
                        }

                        using (MemoryStream buffer = new MemoryStream())
                        using (Stream input = entry.Open())
                        {
                            input.CopyTo(buffer);
                            media[fileName] = buffer.ToArray();
                        }
                    }
                    else
                    {
                        throw new InvalidOperationException("Unsupported file inside import package.");
                    }
                }
            }

            if (presentation == null)
            {
                throw new InvalidOperationException("Import package is missing presentation.json.");
            }

            if (!string.IsNullOrWhiteSpace(requestedId))
            {
                presentation.Id = requestedId;
            }

            List<string> errors = PresentationValidator.Validate(presentation);
            if (errors.Count > 0)
            {
                throw new PresentationValidationException(errors);
            }

            repository.SaveImported(presentation, media);
            return presentation;
        }

        private static string NormalizeEntryName(string entryName)
        {
            string normalized = (entryName ?? string.Empty).Replace('\\', '/').Trim('/');
            if (normalized.Contains("../") || normalized.StartsWith("/", StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Unsafe path in import package.");
            }

            return normalized;
        }

        private static void ValidateMediaName(string fileName)
        {
            string extension = Path.GetExtension(fileName).ToLowerInvariant();
            if (!Regex.IsMatch(fileName, "^[a-z0-9][a-z0-9_.-]{1,120}$") ||
                !Regex.IsMatch(extension, "^\\.(png|jpg|jpeg|webp|svg|mp3|wav|mp4)$"))
            {
                throw new InvalidOperationException("Unsafe media name in import package.");
            }
        }
    }
}
