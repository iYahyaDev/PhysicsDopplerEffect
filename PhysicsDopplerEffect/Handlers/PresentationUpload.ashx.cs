using System;
using System.Web;
using System.Web.Script.Serialization;
using DopplerLab.Models;
using DopplerLab.Services;

namespace DopplerLab.Handlers
{
    public class PresentationUpload : IHttpHandler
    {
        private readonly JavaScriptSerializer serializer = PresentationRepository.CreateSerializer();

        public bool IsReusable
        {
            get { return false; }
        }

        public void ProcessRequest(HttpContext context)
        {
            try
            {
                if (!string.Equals(context.Request.HttpMethod, "POST", StringComparison.OrdinalIgnoreCase))
                {
                    throw new HttpException(405, "Unsupported HTTP method.");
                }

                if (context.Request.TotalBytes > 60 * 1024 * 1024)
                {
                    throw new InvalidOperationException("Request is too large.");
                }

                if (context.Request.Files.Count == 0)
                {
                    throw new InvalidOperationException("No file was uploaded.");
                }

                PresentationRepository repository = new PresentationRepository();
                PresentationMedia media = repository.SaveMedia(context.Request["id"], context.Request.Files[0]);
                WriteJson(context, 200, new PresentationApiResponse { Ok = true, Data = media });
            }
            catch (InvalidOperationException ex)
            {
                WriteJson(context, 400, new PresentationApiResponse { Ok = false, Error = ex.Message, Code = "PRESENTATION_BAD_REQUEST" });
            }
            catch (HttpException ex)
            {
                WriteJson(context, ex.GetHttpCode(), new PresentationApiResponse { Ok = false, Error = ex.Message, Code = "PRESENTATION_HTTP_ERROR" });
            }
            catch
            {
                WriteJson(context, 500, new PresentationApiResponse { Ok = false, Error = "A server error occurred.", Code = "PRESENTATION_SERVER_ERROR", CorrelationId = Guid.NewGuid().ToString("N") });
            }
        }

        private void WriteJson(HttpContext context, int statusCode, PresentationApiResponse response)
        {
            context.Response.TrySkipIisCustomErrors = true;
            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/json; charset=utf-8";
            context.Response.ContentEncoding = System.Text.Encoding.UTF8;
            context.Response.Write(serializer.Serialize(response).Replace("</", "<\\/"));
        }
    }
}
