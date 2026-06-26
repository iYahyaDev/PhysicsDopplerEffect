using System;
using System.Text;
using System.Web.UI;

namespace DopplerLab
{
    public partial class SiteMaster : MasterPage
    {
        protected override void OnInit(EventArgs e)
        {
            base.OnInit(e);
            Response.ContentEncoding = Encoding.UTF8;
            Response.Charset = "utf-8";
            Response.ContentType = "text/html";
        }

        protected void Page_Load(object sender, EventArgs e)
        {
            Page.Title = string.IsNullOrWhiteSpace(Page.Title) ? "Doppler Lab" : Page.Title + " - Doppler Lab";
        }
    }
}
