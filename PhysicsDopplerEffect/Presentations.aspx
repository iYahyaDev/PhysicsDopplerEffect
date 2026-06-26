<%@ Page Title="Presentations" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="Presentations.aspx.cs" Inherits="DopplerLab.Presentations" %>
<asp:Content ID="PresentationsHead" ContentPlaceHolderID="HeadContent" runat="server">
    <link rel="stylesheet" href="Content/presentation-editor.css" />
</asp:Content>
<asp:Content ID="PresentationsContent" ContentPlaceHolderID="MainContent" runat="server">
    <section class="presentation-manager" data-page="presentations">
        <div class="manager-hero">
            <div>
                <p class="eyebrow" data-text-ar="منصة العروض التفاعلية" data-text-en="Interactive presentation platform">منصة العروض التفاعلية</p>
                <h1 data-text-ar="العروض" data-text-en="Presentations">العروض</h1>
                <p data-text-ar="أنشئ عرضا، حرره، انشر نسخة مستقرة، ثم اعرضه بملء الشاشة بدون مغادرة العرض." data-text-en="Create, edit, publish, and present full-screen Doppler presentations without leaving the player.">أنشئ عرضا، حرره، انشر نسخة مستقرة، ثم اعرضه بملء الشاشة بدون مغادرة العرض.</p>
            </div>
            <div class="manager-actions">
                <button type="button" class="primary-button" id="createPresentationBtn" data-text-ar="عرض جديد" data-text-en="New presentation">عرض جديد</button>
                <label class="secondary-button import-button">
                    <span data-text-ar="استيراد" data-text-en="Import">استيراد</span>
                    <input type="file" id="importPresentationInput" accept=".zip" />
                </label>
            </div>
        </div>
        <div id="presentationManagerStatus" class="editor-status" role="status"></div>
        <div id="presentationList" class="presentation-list"></div>
    </section>
</asp:Content>
<asp:Content ID="PresentationsScripts" ContentPlaceHolderID="ScriptContent" runat="server">
    <script>window.DopplerBoot = <%= BootJson %>;</script>
    <script src="Scripts/presentation-storage.js"></script>
    <script src="Scripts/presentation-manager.js"></script>
</asp:Content>
