using System;
using DopplerLab.Services;

namespace DopplerLab
{
    public partial class Lab : System.Web.UI.Page
    {
        protected string BootJson { get; private set; }

        protected void Page_Load(object sender, EventArgs e)
        {
            BootJson = PageBoot.ForPage("lab");
        }
    }
}
