using System;
using System.Web;

namespace DopplerLab
{
    public class Global : HttpApplication
    {
        protected void Application_Start(object sender, EventArgs e)
        {
            Application["StartedAtUtc"] = DateTime.UtcNow;
        }
    }
}
