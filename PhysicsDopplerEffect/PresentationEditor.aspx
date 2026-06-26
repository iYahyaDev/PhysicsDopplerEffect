<%@ Page Title="Presentation Editor" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="PresentationEditor.aspx.cs" Inherits="DopplerLab.PresentationEditor" %>
<asp:Content ID="EditorHead" ContentPlaceHolderID="HeadContent" runat="server">
    <link rel="stylesheet" href="Content/presentation-runtime.css" />
    <link rel="stylesheet" href="Content/presentation-editor.css" />
</asp:Content>
<asp:Content ID="EditorContent" ContentPlaceHolderID="MainContent" runat="server">
    <section class="presentation-editor" data-page="editor">
        <div class="editor-toolbar">
            <a class="ghost-button" href="Presentations.aspx" data-text-ar="رجوع" data-text-en="Back">رجوع</a>
            <button type="button" id="saveDraftBtn" class="primary-button" data-text-ar="حفظ المسودة" data-text-en="Save draft">حفظ المسودة</button>
            <button type="button" id="publishBtn" class="secondary-button" data-text-ar="نشر" data-text-en="Publish">نشر</button>
            <button type="button" id="previewSlideBtn" class="secondary-button" data-text-ar="معاينة الشريحة" data-text-en="Preview slide">معاينة الشريحة</button>
            <button type="button" id="previewDeckBtn" class="secondary-button" data-text-ar="معاينة العرض" data-text-en="Preview deck">معاينة العرض</button>
            <button type="button" id="undoBtn" class="ghost-button" data-text-ar="تراجع" data-text-en="Undo">تراجع</button>
            <button type="button" id="redoBtn" class="ghost-button" data-text-ar="إعادة" data-text-en="Redo">إعادة</button>
            <a id="exportDeckBtn" class="ghost-button" href="#" data-text-ar="تصدير" data-text-en="Export">تصدير</a>
            <label class="ghost-button import-button">
                <span data-text-ar="استيراد" data-text-en="Import">استيراد</span>
                <input type="file" id="editorImportInput" accept=".zip" />
            </label>
            <span id="editorSaveState" class="save-state"></span>
        </div>

        <div class="editor-workspace">
            <aside class="slide-sidebar">
                <div class="panel-title-row">
                    <h2 data-text-ar="الشرائح" data-text-en="Slides">الشرائح</h2>
                    <button type="button" id="addSlideBtn" class="icon-button" aria-label="Add slide">+</button>
                </div>
                <select id="slideTemplateSelect" class="template-select" aria-label="Slide template"></select>
                <div id="slideList" class="slide-list" aria-label="Slides"></div>
            </aside>

            <main class="editor-stage-panel">
                <div class="language-tabs" role="tablist">
                    <button type="button" class="active" id="editArabicBtn" data-lang="ar">العربية</button>
                    <button type="button" id="editEnglishBtn" data-lang="en">English</button>
                    <span id="translationWarning" class="translation-warning"></span>
                </div>
                <div class="editor-preview-frame">
                    <div id="slidePreview" class="presentation-stage editor-preview"></div>
                </div>
                <div class="block-toolbar">
                    <span data-text-ar="إضافة كتلة:" data-text-en="Add block:">إضافة كتلة:</span>
                    <button type="button" data-add-block="heading">Heading</button>
                    <button type="button" data-add-block="text">Text</button>
                    <button type="button" data-add-block="bullet-list">Bullets</button>
                    <button type="button" data-add-block="image">Image</button>
                    <button type="button" data-add-block="question">Question</button>
                    <button type="button" data-add-block="interactive">Simulation</button>
                    <button type="button" data-add-block="comparison">Comparison</button>
                    <button type="button" data-add-block="reference-list">References</button>
                </div>
            </main>

            <aside class="properties-panel">
                <div class="panel-title-row">
                    <h2 data-text-ar="الخصائص" data-text-en="Properties">الخصائص</h2>
                    <button type="button" id="startFromSlideBtn" class="secondary-button" data-text-ar="ابدأ من هنا" data-text-en="Start here">ابدأ من هنا</button>
                </div>
                <div id="propertiesForm" class="properties-form"></div>
                <div class="media-library">
                    <div class="panel-title-row">
                        <h3 data-text-ar="الوسائط" data-text-en="Media">الوسائط</h3>
                        <label class="secondary-button import-button">
                            <span data-text-ar="رفع" data-text-en="Upload">رفع</span>
                            <input type="file" id="mediaUploadInput" accept=".png,.jpg,.jpeg,.webp,.svg,.mp3,.wav,.mp4" />
                        </label>
                        <button type="button" id="cleanupMediaBtn" class="ghost-button" data-text-ar="تنظيف" data-text-en="Clean">تنظيف</button>
                    </div>
                    <div id="mediaLibrary" class="media-grid"></div>
                </div>
                <div class="backup-panel">
                    <div class="panel-title-row">
                        <h3 data-text-ar="النسخ الاحتياطية" data-text-en="Backups">النسخ الاحتياطية</h3>
                        <button type="button" id="refreshBackupsBtn" class="ghost-button" data-text-ar="تحديث" data-text-en="Refresh">تحديث</button>
                    </div>
                    <div id="backupList" class="backup-list"></div>
                </div>
            </aside>
        </div>
    </section>
</asp:Content>
<asp:Content ID="EditorScripts" ContentPlaceHolderID="ScriptContent" runat="server">
    <script>window.DopplerBoot = <%= BootJson %>;</script>
    <script src="Scripts/presentation-storage.js"></script>
    <script src="Scripts/doppler-engine.js"></script>
    <script src="Scripts/doppler-audio.js"></script>
    <script src="Scripts/presentation-components.js"></script>
    <script src="Scripts/presentation-simulations.js"></script>
    <script src="Scripts/presentation-editor.js"></script>
</asp:Content>
