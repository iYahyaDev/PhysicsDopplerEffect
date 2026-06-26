using System;
using System.Collections;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web;
using System.Web.Script.Serialization;
using DopplerLab.Models;

namespace DopplerLab.Services
{
    public class PresentationRepository
    {
        private const int MaxBackups = 20;
        private static readonly Encoding JsonEncoding = new UTF8Encoding(false);
        private static readonly ConcurrentDictionary<string, object> PresentationLocks = new ConcurrentDictionary<string, object>(StringComparer.OrdinalIgnoreCase);
        private readonly JavaScriptSerializer serializer;
        private readonly string rootPath;

        public PresentationRepository()
        {
            serializer = CreateSerializer();
            rootPath = HttpContext.Current.Server.MapPath("~/App_Data/Presentations");
            EnsureStore();
        }

        public static JavaScriptSerializer CreateSerializer()
        {
            return new JavaScriptSerializer
            {
                MaxJsonLength = int.MaxValue,
                RecursionLimit = 256
            };
        }

        public IList<PresentationIndexItem> List()
        {
            List<PresentationIndexItem> index = ReadIndex();
            if (index.Count == 0)
            {
                TryRebuildIndex();
                index = ReadIndex();
            }

            return index.OrderByDescending(item => item.PublishedUtc ?? item.UpdatedUtc).ToList();
        }

        public PresentationDefinition Get(string id, string version)
        {
            string presentationId = NormalizeId(id);
            string requestedVersion = string.Equals(version, "draft", StringComparison.OrdinalIgnoreCase) ? "draft" : "published";
            string path = GetVersionPath(presentationId, requestedVersion);

            if (!File.Exists(path) && requestedVersion == "draft")
            {
                string published = GetVersionPath(presentationId, "published");
                if (File.Exists(published))
                {
                    return ReadPresentation(published);
                }
            }

            if (!File.Exists(path))
            {
                throw new FileNotFoundException("Presentation not found.");
            }

            return ReadPresentation(path);
        }

        public PresentationDefinition Create(string requestedId, LocalizedText title)
        {
            string id = NormalizeId(string.IsNullOrWhiteSpace(requestedId) ? Slug(PresentationValidator.Fallback(title)) : requestedId);
            if (Directory.Exists(GetPresentationPath(id)))
            {
                throw new InvalidOperationException("A presentation with this id already exists.");
            }

            PresentationDefinition presentation = new PresentationDefinition
            {
                SchemaVersion = 1,
                Id = id,
                Title = title ?? new LocalizedText { Ar = "عرض جديد", En = "New presentation" },
                Theme = DefaultTheme(),
                Sections = new List<PresentationSection>(),
                Slides = new List<SlideDefinition>
                {
                    new SlideDefinition
                    {
                        Id = "slide-1",
                        Order = 1,
                        SectionId = string.Empty,
                        InternalTitle = "Title",
                        Template = "title",
                        Hidden = false,
                        Transition = "fade",
                        Blocks = new List<SlideBlockDefinition>
                        {
                            new SlideBlockDefinition
                            {
                                Id = "heading-1",
                                Type = "heading",
                                Width = "full",
                                Align = "center",
                                Data = new Dictionary<string, object>
                                {
                                    { "text", new Dictionary<string, object> { { "ar", title != null ? title.Ar : "عرض جديد" }, { "en", title != null ? title.En : "New presentation" } } }
                                }
                            }
                        },
                        Notes = new LocalizedText(),
                        Background = new Dictionary<string, object>(),
                        EditorMetadata = new Dictionary<string, object>()
                    }
                },
                Media = new List<PresentationMedia>(),
                UpdatedUtc = DateTime.UtcNow
            };

            SaveDraft(presentation);
            UpdateIndex(presentation, null);
            return presentation;
        }

        public PresentationDefinition SaveDraft(PresentationDefinition presentation)
        {
            NormalizePresentation(presentation);
            lock (GetPresentationLock(presentation.Id))
            {
                List<string> errors = PresentationValidator.Validate(presentation);
                if (errors.Count > 0)
                {
                    throw new PresentationValidationException(errors);
                }

                presentation.UpdatedUtc = DateTime.UtcNow;
                string path = GetVersionPath(presentation.Id, "draft");
                AtomicWrite(path, Serialize(presentation), ValidateJsonPresentation);
                UpdateIndex(presentation, null);
                return presentation;
            }
        }

        public PresentationDefinition Publish(string id)
        {
            string presentationId = NormalizeId(id);
            lock (GetPresentationLock(presentationId))
            {
                PresentationDefinition draft = Get(presentationId, "draft");
                NormalizePresentation(draft);
                List<string> errors = PresentationValidator.Validate(draft);
                if (errors.Count > 0)
                {
                    throw new PresentationValidationException(errors);
                }

                string destination = GetVersionPath(draft.Id, "published");
                if (File.Exists(destination))
                {
                    CreateBackup(draft.Id, destination);
                }

                draft.PublishedUtc = DateTime.UtcNow;
                draft.UpdatedUtc = DateTime.UtcNow;
                AtomicWrite(destination, Serialize(draft), ValidateJsonPresentation);
                AtomicWrite(GetVersionPath(draft.Id, "draft"), Serialize(draft), ValidateJsonPresentation);
                TrimBackups(draft.Id);
                UpdateIndex(draft, draft.PublishedUtc);
                return draft;
            }
        }

        public PresentationDefinition Duplicate(string id)
        {
            PresentationDefinition source = Get(id, "draft");
            string newId = UniqueId(source.Id + "-copy");
            source.Id = newId;
            source.Title = new LocalizedText
            {
                Ar = AppendCopy(source.Title != null ? source.Title.Ar : "نسخة"),
                En = AppendCopy(source.Title != null ? source.Title.En : "Copy")
            };
            source.PublishedUtc = null;
            source.UpdatedUtc = DateTime.UtcNow;
            SaveDraft(source);
            return source;
        }

        public void Delete(string id)
        {
            string presentationId = NormalizeId(id);
            string path = GetPresentationPath(presentationId);
            if (Directory.Exists(path))
            {
                Directory.Delete(path, true);
            }

            List<PresentationIndexItem> index = ReadIndex();
            index.RemoveAll(item => string.Equals(item.Id, presentationId, StringComparison.OrdinalIgnoreCase));
            WriteIndex(index);
        }

        public IList<PresentationBackup> ListBackups(string id)
        {
            string backupPath = GetBackupPath(NormalizeId(id));
            if (!Directory.Exists(backupPath))
            {
                return new List<PresentationBackup>();
            }

            return Directory.GetFiles(backupPath, "*.json")
                .Select(file => new PresentationBackup
                {
                    Id = Path.GetFileNameWithoutExtension(file),
                    FileName = Path.GetFileName(file),
                    CreatedUtc = File.GetCreationTimeUtc(file)
                })
                .OrderByDescending(backup => backup.CreatedUtc)
                .ToList();
        }

        public PresentationDefinition RestoreBackup(string id, string backupId)
        {
            string presentationId = NormalizeId(id);
            string safeBackup = SafeFileName(backupId) + ".json";
            string source = Path.Combine(GetBackupPath(presentationId), safeBackup);
            if (!File.Exists(source))
            {
                throw new FileNotFoundException("Backup not found.");
            }

            PresentationDefinition restored = ReadPresentation(source);
            restored.Id = presentationId;
            restored.UpdatedUtc = DateTime.UtcNow;
            SaveDraft(restored);
            return restored;
        }

        public PresentationMedia SaveMedia(string id, HttpPostedFile file)
        {
            string presentationId = NormalizeId(id);
            if (file == null || file.ContentLength <= 0)
            {
                throw new InvalidOperationException("No file was uploaded.");
            }

            if (file.ContentLength > 50 * 1024 * 1024)
            {
                throw new InvalidOperationException("File is too large.");
            }

            string extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            string contentType = DetectAndValidate(file.InputStream, extension);
            string safeName = DateTime.UtcNow.ToString("yyyyMMddHHmmssfff") + "-" + SafeFileName(Path.GetFileNameWithoutExtension(file.FileName)) + extension;
            string mediaPath = GetMediaPath(presentationId);
            Directory.CreateDirectory(mediaPath);
            string destination = Path.Combine(mediaPath, safeName);
            file.InputStream.Position = 0;
            using (FileStream output = File.Create(destination))
            {
                file.InputStream.CopyTo(output);
            }

            PresentationMedia media = new PresentationMedia
            {
                Id = Path.GetFileNameWithoutExtension(safeName),
                FileName = safeName,
                OriginalName = Path.GetFileName(file.FileName),
                ContentType = contentType,
                Size = file.ContentLength,
                CreatedUtc = DateTime.UtcNow,
                Url = "PresentationApi.ashx?action=media&id=" + presentationId + "&file=" + HttpUtility.UrlEncode(safeName)
            };

            PresentationDefinition draft = Get(presentationId, "draft");
            if (draft.Media == null)
            {
                draft.Media = new List<PresentationMedia>();
            }

            draft.Media.Add(media);
            SaveDraft(draft);
            return media;
        }

        public string GetMediaFilePath(string id, string fileName)
        {
            string presentationId = NormalizeId(id);
            string safeFile = SafeFileNameWithExtension(fileName);
            string path = Path.Combine(GetMediaPath(presentationId), safeFile);
            if (!File.Exists(path))
            {
                throw new FileNotFoundException("Media file not found.");
            }

            return path;
        }

        public object CleanupUnusedMedia(string id)
        {
            string presentationId = NormalizeId(id);
            PresentationDefinition draft = Get(presentationId, "draft");
            HashSet<string> references = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (SlideDefinition slide in draft.Slides ?? new List<SlideDefinition>())
            {
                CollectMediaReferences(slide.Background, references);
                foreach (SlideBlockDefinition block in slide.Blocks ?? new List<SlideBlockDefinition>())
                {
                    CollectMediaReferences(block.Data, references);
                }
            }

            List<PresentationMedia> media = draft.Media ?? new List<PresentationMedia>();
            List<PresentationMedia> removed = new List<PresentationMedia>();
            foreach (PresentationMedia item in media.ToList())
            {
                if (IsMediaReferenced(item, references))
                {
                    continue;
                }

                removed.Add(item);
                media.Remove(item);
                if (!string.IsNullOrWhiteSpace(item.FileName))
                {
                    string path = Path.Combine(GetMediaPath(presentationId), SafeFileNameWithExtension(item.FileName));
                    if (File.Exists(path))
                    {
                        File.Delete(path);
                    }
                }
            }

            draft.Media = media;
            SaveDraft(draft);
            return new { Media = media, Removed = removed };
        }

        public PresentationDefinition Import(string requestedId, Stream zipStream)
        {
            return PresentationExportService.Import(this, requestedId, zipStream);
        }

        public void SaveImported(PresentationDefinition presentation, IDictionary<string, byte[]> mediaFiles)
        {
            NormalizePresentation(presentation);
            if (Directory.Exists(GetPresentationPath(presentation.Id)))
            {
                presentation.Id = UniqueId(presentation.Id);
            }

            SaveDraft(presentation);
            Publish(presentation.Id);

            if (mediaFiles != null && mediaFiles.Count > 0)
            {
                string mediaPath = GetMediaPath(presentation.Id);
                Directory.CreateDirectory(mediaPath);
                foreach (KeyValuePair<string, byte[]> media in mediaFiles)
                {
                    string safeName = SafeFileNameWithExtension(media.Key);
                    File.WriteAllBytes(Path.Combine(mediaPath, safeName), media.Value);
                }
            }
        }

        public string Serialize(object value)
        {
            return serializer.Serialize(value).Replace("</", "<\\/");
        }

        public PresentationDefinition DeserializePresentation(string json)
        {
            return serializer.Deserialize<PresentationDefinition>(NormalizeJsonDates(json));
        }

        public string NormalizeId(string id)
        {
            string normalized = (id ?? string.Empty).Trim().ToLowerInvariant();
            if (!PresentationValidator.IsSafeId(normalized))
            {
                throw new InvalidOperationException("Invalid presentation id.");
            }

            return normalized;
        }

        private void CollectMediaReferences(object value, HashSet<string> references)
        {
            if (value == null)
            {
                return;
            }

            string text = value as string;
            if (text != null)
            {
                if (!string.IsNullOrWhiteSpace(text))
                {
                    references.Add(text);
                }
                return;
            }

            IDictionary<string, object> genericDictionary = value as IDictionary<string, object>;
            if (genericDictionary != null)
            {
                foreach (object item in genericDictionary.Values)
                {
                    CollectMediaReferences(item, references);
                }
                return;
            }

            IDictionary dictionary = value as IDictionary;
            if (dictionary != null)
            {
                foreach (object item in dictionary.Values)
                {
                    CollectMediaReferences(item, references);
                }
                return;
            }

            IEnumerable enumerable = value as IEnumerable;
            if (enumerable != null)
            {
                foreach (object item in enumerable)
                {
                    CollectMediaReferences(item, references);
                }
            }
        }

        private bool IsMediaReferenced(PresentationMedia media, HashSet<string> references)
        {
            if (media == null || string.IsNullOrWhiteSpace(media.FileName))
            {
                return false;
            }

            foreach (string reference in references)
            {
                if (reference.IndexOf(media.FileName, StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return true;
                }

                if (!string.IsNullOrWhiteSpace(media.Url) && reference.IndexOf(media.Url, StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return true;
                }
            }

            return false;
        }

        private void EnsureStore()
        {
            Directory.CreateDirectory(rootPath);
            if (!File.Exists(GetIndexPath()))
            {
                WriteIndex(new List<PresentationIndexItem>());
            }
        }

        private void NormalizePresentation(PresentationDefinition presentation)
        {
            if (presentation == null)
            {
                throw new InvalidOperationException("Presentation payload is empty.");
            }

            presentation.Id = NormalizeId(presentation.Id);
            presentation.SchemaVersion = presentation.SchemaVersion == 0 ? 1 : presentation.SchemaVersion;
            presentation.Title = presentation.Title ?? new LocalizedText();
            presentation.Theme = presentation.Theme ?? DefaultTheme();
            presentation.Sections = presentation.Sections ?? new List<PresentationSection>();
            presentation.Slides = presentation.Slides ?? new List<SlideDefinition>();
            presentation.Media = presentation.Media ?? new List<PresentationMedia>();

            int order = 1;
            foreach (SlideDefinition slide in presentation.Slides.OrderBy(slide => slide.Order))
            {
                slide.Order = order++;
                slide.Template = string.IsNullOrEmpty(slide.Template) ? "title-with-text" : slide.Template;
                slide.Transition = string.IsNullOrEmpty(slide.Transition) ? "fade" : slide.Transition;
                slide.Blocks = slide.Blocks ?? new List<SlideBlockDefinition>();
                slide.Notes = slide.Notes ?? new LocalizedText();
                slide.Background = slide.Background ?? new Dictionary<string, object>();
                slide.EditorMetadata = slide.EditorMetadata ?? new Dictionary<string, object>();
            }
        }

        private PresentationTheme DefaultTheme()
        {
            return new PresentationTheme
            {
                Id = "doppler-dark",
                Background = "#071521",
                Surface = "#102535",
                Accent = "#27b3ff",
                Accent2 = "#ffb45c",
                Text = "#f5fbff"
            };
        }

        private void UpdateIndex(PresentationDefinition presentation, DateTime? publishedUtc)
        {
            List<PresentationIndexItem> index = ReadIndex();
            PresentationIndexItem item = index.FirstOrDefault(x => string.Equals(x.Id, presentation.Id, StringComparison.OrdinalIgnoreCase));
            if (item == null)
            {
                item = new PresentationIndexItem { Id = presentation.Id };
                index.Add(item);
            }

            item.Title = presentation.Title;
            item.UpdatedUtc = presentation.UpdatedUtc;
            item.PublishedUtc = publishedUtc ?? presentation.PublishedUtc ?? item.PublishedUtc;
            item.SlideCount = presentation.Slides != null ? presentation.Slides.Count : 0;
            WriteIndex(index);
        }

        private void TryRebuildIndex()
        {
            List<PresentationIndexItem> rebuilt = new List<PresentationIndexItem>();
            foreach (string directory in Directory.GetDirectories(rootPath))
            {
                string published = Path.Combine(directory, "published.json");
                string draft = Path.Combine(directory, "draft.json");
                string source = File.Exists(published) ? published : draft;
                if (!File.Exists(source))
                {
                    continue;
                }

                PresentationDefinition presentation = ReadPresentation(source);
                rebuilt.Add(new PresentationIndexItem
                {
                    Id = presentation.Id,
                    Title = presentation.Title,
                    UpdatedUtc = presentation.UpdatedUtc,
                    PublishedUtc = presentation.PublishedUtc,
                    SlideCount = presentation.Slides != null ? presentation.Slides.Count : 0
                });
            }

            WriteIndex(rebuilt);
        }

        private PresentationDefinition ReadPresentation(string path)
        {
            string json = File.ReadAllText(path, JsonEncoding);
            PresentationDefinition presentation = DeserializePresentation(json);
            NormalizePresentation(presentation);
            return presentation;
        }

        private List<PresentationIndexItem> ReadIndex()
        {
            string path = GetIndexPath();
            if (!File.Exists(path))
            {
                return new List<PresentationIndexItem>();
            }

            return serializer.Deserialize<List<PresentationIndexItem>>(File.ReadAllText(path, JsonEncoding)) ?? new List<PresentationIndexItem>();
        }

        private void WriteIndex(List<PresentationIndexItem> index)
        {
            AtomicWrite(GetIndexPath(), Serialize(index), delegate(string json) { serializer.Deserialize<List<PresentationIndexItem>>(json); });
        }

        private void AtomicWrite(string destination, string content, Action<string> validate)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(destination));
            string temp = destination + "." + Guid.NewGuid().ToString("N") + ".tmp";
            try
            {
                RunFileOperationWithRetry(delegate
                {
                    File.WriteAllText(temp, content, JsonEncoding);
                });
                validate(File.ReadAllText(temp, JsonEncoding));

                RunFileOperationWithRetry(delegate
                {
                    if (File.Exists(destination))
                    {
                        string backup = destination + "." + Guid.NewGuid().ToString("N") + ".bak";
                        File.Replace(temp, destination, backup, true);
                        if (File.Exists(backup))
                        {
                            File.Delete(backup);
                        }
                    }
                    else
                    {
                        File.Move(temp, destination);
                    }
                });
            }
            finally
            {
                if (File.Exists(temp))
                {
                    TryDelete(temp);
                }
            }
        }

        private void RunFileOperationWithRetry(Action operation)
        {
            const int maxAttempts = 4;
            for (int attempt = 1; ; attempt++)
            {
                try
                {
                    operation();
                    return;
                }
                catch (IOException ex)
                {
                    if (attempt >= maxAttempts || !IsTransientIo(ex))
                    {
                        throw;
                    }

                    Thread.Sleep(60 * attempt);
                }
            }
        }

        private bool IsTransientIo(IOException ex)
        {
            int code = Marshal.GetHRForException(ex) & 0xFFFF;
            return code == 32 || code == 33;
        }

        private void TryDelete(string path)
        {
            try
            {
                File.Delete(path);
            }
            catch
            {
            }
        }

        private void ValidateJsonPresentation(string json)
        {
            PresentationDefinition presentation = DeserializePresentation(json);
            List<string> errors = PresentationValidator.Validate(presentation);
            if (errors.Count > 0)
            {
                throw new PresentationValidationException(errors);
            }
        }

        private static string NormalizeJsonDates(string json)
        {
            if (string.IsNullOrEmpty(json))
            {
                return json;
            }

            return Regex.Replace(json, "\"/Date\\((-?\\d+)([+-]\\d{4})?\\)/\"", delegate(Match match)
            {
                long milliseconds;
                if (!long.TryParse(match.Groups[1].Value, out milliseconds))
                {
                    return match.Value;
                }

                DateTime utc = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddMilliseconds(milliseconds);
                return "\"" + utc.ToString("o") + "\"";
            });
        }

        private void CreateBackup(string id, string publishedPath)
        {
            string backupPath = GetBackupPath(id);
            Directory.CreateDirectory(backupPath);
            string file = DateTime.UtcNow.ToString("yyyyMMddTHHmmssfffZ") + ".json";
            string destination = Path.Combine(backupPath, file);
            RunFileOperationWithRetry(delegate
            {
                File.Copy(publishedPath, destination, true);
            });
        }

        private void TrimBackups(string id)
        {
            string backupPath = GetBackupPath(id);
            if (!Directory.Exists(backupPath))
            {
                return;
            }

            List<FileInfo> files = new DirectoryInfo(backupPath).GetFiles("*.json").OrderByDescending(file => file.CreationTimeUtc).ToList();
            foreach (FileInfo file in files.Skip(MaxBackups))
            {
                file.Delete();
            }
        }

        private string DetectAndValidate(Stream stream, string extension)
        {
            byte[] header = new byte[Math.Min(512, (int)Math.Max(1, stream.Length))];
            stream.Read(header, 0, header.Length);
            stream.Position = 0;

            if (extension == ".png" && header.Length > 8 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47)
            {
                return "image/png";
            }

            if ((extension == ".jpg" || extension == ".jpeg") && header.Length > 3 && header[0] == 0xFF && header[1] == 0xD8)
            {
                return "image/jpeg";
            }

            if (extension == ".webp" && header.Length > 12 && Text(header, 0, 4) == "RIFF" && Text(header, 8, 4) == "WEBP")
            {
                return "image/webp";
            }

            if (extension == ".wav" && header.Length > 12 && Text(header, 0, 4) == "RIFF" && Text(header, 8, 4) == "WAVE")
            {
                return "audio/wav";
            }

            if (extension == ".mp3" && header.Length > 3 && (Text(header, 0, 3) == "ID3" || (header[0] == 0xFF && (header[1] & 0xE0) == 0xE0)))
            {
                return "audio/mpeg";
            }

            if (extension == ".mp4" && header.Length > 12 && Text(header, 4, 4) == "ftyp")
            {
                return "video/mp4";
            }

            if (extension == ".svg")
            {
                using (StreamReader reader = new StreamReader(stream, true))
                {
                    string svg = reader.ReadToEnd();
                    stream.Position = 0;
                    string lower = svg.ToLowerInvariant();
                    if (lower.Contains("<svg") && !lower.Contains("<script") && !lower.Contains("javascript:") && !Regex.IsMatch(lower, "\\son[a-z]+\\s*="))
                    {
                        return "image/svg+xml";
                    }
                }
            }

            throw new InvalidOperationException("Unsupported or unsafe media file.");
        }

        private string Text(byte[] buffer, int start, int count)
        {
            if (buffer.Length < start + count)
            {
                return string.Empty;
            }

            return System.Text.Encoding.ASCII.GetString(buffer, start, count);
        }

        private string UniqueId(string baseId)
        {
            string clean = Slug(baseId);
            string candidate = clean;
            int index = 2;
            while (Directory.Exists(GetPresentationPath(candidate)))
            {
                candidate = clean + "-" + index++;
            }

            return candidate;
        }

        private string Slug(string value)
        {
            string slug = Regex.Replace((value ?? "presentation").ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');
            if (slug.Length < 2)
            {
                slug = "presentation";
            }

            if (slug.Length > 50)
            {
                slug = slug.Substring(0, 50).Trim('-');
            }

            return slug;
        }

        private string SafeFileName(string value)
        {
            string name = Regex.Replace((value ?? "file").ToLowerInvariant(), "[^a-z0-9_-]+", "-").Trim('-');
            return string.IsNullOrEmpty(name) ? "file" : name;
        }

        private string SafeFileNameWithExtension(string value)
        {
            string extension = Path.GetExtension(value).ToLowerInvariant();
            string name = SafeFileName(Path.GetFileNameWithoutExtension(value));
            return name + extension;
        }

        private string AppendCopy(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? "Copy" : value + " Copy";
        }

        private string GetPresentationPath(string id)
        {
            return Path.Combine(rootPath, id);
        }

        private string GetVersionPath(string id, string version)
        {
            return Path.Combine(GetPresentationPath(id), version + ".json");
        }

        private string GetMediaPath(string id)
        {
            return Path.Combine(GetPresentationPath(id), "media");
        }

        private string GetBackupPath(string id)
        {
            return Path.Combine(GetPresentationPath(id), "backups");
        }

        private string GetIndexPath()
        {
            return Path.Combine(rootPath, "index.json");
        }

        private object GetPresentationLock(string id)
        {
            return PresentationLocks.GetOrAdd(id, delegate { return new object(); });
        }
    }
}
