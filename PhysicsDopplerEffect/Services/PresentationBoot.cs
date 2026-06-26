using System;
using System.Web.Script.Serialization;

namespace DopplerLab.Services
{
    public static class PresentationBoot
    {
        public static string ForPage(string page, string defaultPresentationId)
        {
            JavaScriptSerializer serializer = PresentationRepository.CreateSerializer();
            return serializer.Serialize(new
            {
                page = page,
                defaultPresentationId = defaultPresentationId,
                generatedUtc = DateTime.UtcNow.ToString("o"),
                settings = Models.SimulationSettings.CreateDefault(),
                localization = LocalizationData.GetAll()
            }).Replace("</", "<\\/");
        }
    }
}
