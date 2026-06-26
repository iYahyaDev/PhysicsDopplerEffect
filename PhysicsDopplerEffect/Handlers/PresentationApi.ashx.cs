using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Script.Serialization;
using DopplerLab.Models;
using DopplerLab.Services;

namespace DopplerLab.Handlers
{
    public class PresentationApi : IHttpHandler
    {
        private readonly JavaScriptSerializer serializer = PresentationRepository.CreateSerializer();

        public bool IsReusable
        {
            get { return false; }
        }

        public void ProcessRequest(HttpContext context)
        {
            string correlationId = Guid.NewGuid().ToString("N");
            string action = string.Empty;
            string presentationId = string.Empty;

            try
            {
                PresentationRepository repository = new PresentationRepository();
                action = (context.Request["action"] ?? string.Empty).Trim();
                presentationId = context.Request["id"] ?? string.Empty;

                if (string.Equals(action, "export", StringComparison.OrdinalIgnoreCase))
                {
                    RequireMethod(context, "GET");
                    byte[] zip = PresentationExportService.Export(repository, context.Request["id"]);
                    context.Response.ContentType = "application/zip";
                    context.Response.AddHeader("Content-Disposition", "attachment; filename=\"" + repository.NormalizeId(context.Request["id"]) + ".zip\"");
                    context.Response.BinaryWrite(zip);
                    return;
                }

                if (string.Equals(action, "media", StringComparison.OrdinalIgnoreCase))
                {
                    RequireMethod(context, "GET");
                    ServeMedia(context, repository);
                    return;
                }

                object data = HandleJsonAction(context, repository, action);
                WriteJson(context, 200, new PresentationApiResponse { Ok = true, Data = data });
            }
            catch (PresentationValidationException ex)
            {
                WriteJson(context, 400, new PresentationApiResponse
                {
                    Ok = false,
                    Error = "The presentation contains invalid data.",
                    Code = "PRESENTATION_VALIDATION_FAILED",
                    Data = new { Errors = ex.Errors }
                });
            }
            catch (FileNotFoundException ex)
            {
                LogException(context, correlationId, action, presentationId, ex);
                WriteJson(context, 404, new PresentationApiResponse
                {
                    Ok = false,
                    Error = "Not found.",
                    Code = "PRESENTATION_NOT_FOUND",
                    CorrelationId = correlationId
                });
            }
            catch (ArgumentException ex)
            {
                LogException(context, correlationId, action, presentationId, ex);
                WriteJson(context, 400, new PresentationApiResponse
                {
                    Ok = false,
                    Error = "The request JSON could not be read.",
                    Code = "PRESENTATION_INVALID_JSON",
                    CorrelationId = correlationId,
                    Data = DebugDiagnostic(context, ex)
                });
            }
            catch (InvalidOperationException ex)
            {
                LogException(context, correlationId, action, presentationId, ex);
                WriteJson(context, 400, new PresentationApiResponse
                {
                    Ok = false,
                    Error = ex.Message,
                    Code = "PRESENTATION_BAD_REQUEST",
                    CorrelationId = correlationId,
                    Data = DebugDiagnostic(context, ex)
                });
            }
            catch (HttpException ex)
            {
                LogException(context, correlationId, action, presentationId, ex);
                WriteJson(context, ex.GetHttpCode(), new PresentationApiResponse
                {
                    Ok = false,
                    Error = ex.Message,
                    Code = "PRESENTATION_HTTP_ERROR",
                    CorrelationId = correlationId,
                    Data = DebugDiagnostic(context, ex)
                });
            }
            catch (Exception ex)
            {
                LogException(context, correlationId, action, presentationId, ex);
                WriteJson(context, 500, new PresentationApiResponse
                {
                    Ok = false,
                    Error = string.Equals(action, "saveDraft", StringComparison.OrdinalIgnoreCase)
                        ? "Failed to save the presentation draft."
                        : "A server error occurred.",
                    Code = string.Equals(action, "saveDraft", StringComparison.OrdinalIgnoreCase)
                        ? "PRESENTATION_SAVE_FAILED"
                        : "PRESENTATION_SERVER_ERROR",
                    CorrelationId = correlationId,
                    Data = DebugDiagnostic(context, ex)
                });
            }
        }

        private object HandleJsonAction(HttpContext context, PresentationRepository repository, string action)
        {
            if (string.Equals(action, "list", StringComparison.OrdinalIgnoreCase))
            {
                RequireMethod(context, "GET");
                return repository.List();
            }

            if (string.Equals(action, "get", StringComparison.OrdinalIgnoreCase))
            {
                RequireMethod(context, "GET");
                return repository.Get(context.Request["id"], context.Request["version"]);
            }

            if (string.Equals(action, "backups", StringComparison.OrdinalIgnoreCase))
            {
                RequireMethod(context, "GET");
                return repository.ListBackups(context.Request["id"]);
            }

            if (string.Equals(action, "create", StringComparison.OrdinalIgnoreCase))
            {
                RequirePost(context, 1024 * 1024);
                IDictionary<string, object> payload = ReadBody(context);
                return repository.Create(Get(payload, "id"), new LocalizedText { Ar = Get(payload, "titleAr"), En = Get(payload, "titleEn") });
            }

            if (string.Equals(action, "saveDraft", StringComparison.OrdinalIgnoreCase))
            {
                RequirePost(context, int.MaxValue);
                string body = NormalizeIncomingJsonDates(ReadRawBody(context));
                PresentationDefinition presentation = serializer.Deserialize<PresentationDefinition>(body);
                PresentationDefinition saved = repository.SaveDraft(presentation);
                return new PresentationSaveResult
                {
                    PresentationId = saved.Id,
                    SavedAtUtc = saved.UpdatedUtc,
                    Version = Environment.TickCount & int.MaxValue,
                    Presentation = saved
                };
            }

            if (string.Equals(action, "publish", StringComparison.OrdinalIgnoreCase))
            {
                RequirePost(context, 1024 * 1024);
                return repository.Publish(context.Request["id"]);
            }

            if (string.Equals(action, "duplicate", StringComparison.OrdinalIgnoreCase))
            {
                RequirePost(context, 1024 * 1024);
                return repository.Duplicate(context.Request["id"]);
            }

            if (string.Equals(action, "delete", StringComparison.OrdinalIgnoreCase))
            {
                RequirePost(context, 1024 * 1024);
                repository.Delete(context.Request["id"]);
                return new { Deleted = true };
            }

            if (string.Equals(action, "cleanupMedia", StringComparison.OrdinalIgnoreCase))
            {
                RequirePost(context, 1024 * 1024);
                return repository.CleanupUnusedMedia(context.Request["id"]);
            }

            if (string.Equals(action, "restoreBackup", StringComparison.OrdinalIgnoreCase))
            {
                RequirePost(context, 1024 * 1024);
                return repository.RestoreBackup(context.Request["id"], context.Request["backupId"]);
            }

            if (string.Equals(action, "import", StringComparison.OrdinalIgnoreCase))
            {
                RequirePost(context, 60 * 1024 * 1024);
                if (context.Request.Files.Count == 0)
                {
                    throw new InvalidOperationException("Import file is required.");
                }

                return repository.Import(context.Request["id"], context.Request.Files[0].InputStream);
            }

            throw new InvalidOperationException("Unsupported action.");
        }

        private void ServeMedia(HttpContext context, PresentationRepository repository)
        {
            string path = repository.GetMediaFilePath(context.Request["id"], context.Request["file"]);
            string extension = Path.GetExtension(path).ToLowerInvariant();
            string contentType = "application/octet-stream";
            if (extension == ".png") contentType = "image/png";
            if (extension == ".jpg" || extension == ".jpeg") contentType = "image/jpeg";
            if (extension == ".webp") contentType = "image/webp";
            if (extension == ".svg") contentType = "image/svg+xml";
            if (extension == ".mp3") contentType = "audio/mpeg";
            if (extension == ".wav") contentType = "audio/wav";
            if (extension == ".mp4") contentType = "video/mp4";
            context.Response.ContentType = contentType;
            context.Response.TransmitFile(path);
        }

        private void RequirePost(HttpContext context, int maxBytes)
        {
            RequireMethod(context, "POST");
            if (context.Request.TotalBytes > maxBytes)
            {
                throw new InvalidOperationException("Request is too large.");
            }
        }

        private void RequireMethod(HttpContext context, string method)
        {
            if (!string.Equals(context.Request.HttpMethod, method, StringComparison.OrdinalIgnoreCase))
            {
                throw new HttpException(405, "Unsupported HTTP method.");
            }
        }

        private IDictionary<string, object> ReadBody(HttpContext context)
        {
            return serializer.DeserializeObject(ReadRawBody(context)) as IDictionary<string, object>;
        }

        private string ReadRawBody(HttpContext context)
        {
            context.Request.InputStream.Position = 0;
            using (StreamReader reader = new StreamReader(context.Request.InputStream, Encoding.UTF8, true))
            {
                return reader.ReadToEnd();
            }
        }

        private string NormalizeIncomingJsonDates(string json)
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

        private string Get(IDictionary<string, object> payload, string key)
        {
            if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
            {
                return string.Empty;
            }

            return Convert.ToString(payload[key]);
        }

        private void WriteJson(HttpContext context, int statusCode, PresentationApiResponse response)
        {
            context.Response.TrySkipIisCustomErrors = true;
            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/json; charset=utf-8";
            context.Response.ContentEncoding = Encoding.UTF8;
            context.Response.Write(serializer.Serialize(response).Replace("</", "<\\/"));
        }

        private object DebugDiagnostic(HttpContext context, Exception ex)
        {
            if (context == null || !context.IsDebuggingEnabled || ex == null)
            {
                return null;
            }

            return new
            {
                ExceptionType = ex.GetType().FullName,
                Message = ScrubDiagnostic(ex.Message)
            };
        }

        private string ScrubDiagnostic(string message)
        {
            if (string.IsNullOrEmpty(message))
            {
                return string.Empty;
            }

            return Regex.Replace(message, "[A-Za-z]:\\\\[^\\r\\n\\\"]+", "[path]");
        }

        private void LogException(HttpContext context, string correlationId, string action, string presentationId, Exception ex)
        {
            try
            {
                string root = context.Server.MapPath("~/App_Data/Logs");
                Directory.CreateDirectory(root);
                string path = Path.Combine(root, "presentation-api.log");
                StringBuilder builder = new StringBuilder();
                builder.AppendLine("UTC: " + DateTime.UtcNow.ToString("o"));
                builder.AppendLine("CorrelationId: " + correlationId);
                builder.AppendLine("Action: " + (action ?? string.Empty));
                builder.AppendLine("PresentationId: " + (presentationId ?? string.Empty));
                builder.AppendLine("ContentType: " + (context.Request.ContentType ?? string.Empty));
                builder.AppendLine("ContentLength: " + context.Request.TotalBytes);
                builder.AppendLine("ExceptionType: " + ex.GetType().FullName);
                builder.AppendLine("Message: " + ex.Message);
                if (ex.InnerException != null)
                {
                    builder.AppendLine("InnerExceptionType: " + ex.InnerException.GetType().FullName);
                    builder.AppendLine("InnerExceptionMessage: " + ex.InnerException.Message);
                }
                builder.AppendLine("StackTrace:");
                builder.AppendLine(ex.StackTrace ?? string.Empty);
                builder.AppendLine(new string('-', 72));
                File.AppendAllText(path, builder.ToString(), new UTF8Encoding(false));
            }
            catch
            {
            }
        }
    }
}
