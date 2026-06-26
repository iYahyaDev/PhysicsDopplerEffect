<%@ Page Title="Physics Validation" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="PhysicsValidation.aspx.cs" Inherits="DopplerLab.PhysicsValidation" %>
<asp:Content ID="ValidationContent" ContentPlaceHolderID="MainContent" runat="server">
    <section class="page-heading">
        <p class="eyebrow" data-text-ar="اختبارات مرجعية" data-text-en="Reference tests">اختبارات مرجعية</p>
        <h1 data-text-ar="تحقق فيزياء دوبلر" data-text-en="Doppler physics validation">تحقق فيزياء دوبلر</h1>
        <p data-text-ar="تشغل هذه الصفحة حالات مرجعية في C# وفي JavaScript للتأكد أن الحسابين متفقان ضمن سماحية صغيرة." data-text-en="This page runs reference cases in C# and JavaScript to verify that both calculations agree within a small tolerance.">
            تشغل هذه الصفحة حالات مرجعية في C# وفي JavaScript للتأكد أن الحسابين متفقان ضمن سماحية صغيرة.
        </p>
    </section>
    <section class="validation-summary">
        <div class="metric-card">
            <span data-text-ar="اختبارات الخادم" data-text-en="Server tests">اختبارات الخادم</span>
            <strong id="serverPassCount" class="metric-value">...</strong>
        </div>
        <div class="metric-card">
            <span data-text-ar="اختبارات المتصفح" data-text-en="Browser tests">اختبارات المتصفح</span>
            <strong id="clientPassCount" class="metric-value">...</strong>
        </div>
        <div class="metric-card">
            <span data-text-ar="أكبر خطأ" data-text-en="Max error">أكبر خطأ</span>
            <strong id="maxError" class="metric-value">...</strong>
        </div>
    </section>
    <section class="table-wrap">
        <table class="validation-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th data-text-ar="الحالة" data-text-en="Case">الحالة</th>
                    <th data-text-ar="المتوقع" data-text-en="Expected">المتوقع</th>
                    <th data-text-ar="C#" data-text-en="C#">C#</th>
                    <th data-text-ar="JavaScript" data-text-en="JavaScript">JavaScript</th>
                    <th data-text-ar="الخطأ" data-text-en="Error">الخطأ</th>
                    <th data-text-ar="النتيجة" data-text-en="Result">النتيجة</th>
                </tr>
            </thead>
            <tbody id="validationRows"></tbody>
        </table>
    </section>
</asp:Content>
<asp:Content ID="ValidationScripts" ContentPlaceHolderID="ScriptContent" runat="server">
    <script>window.DopplerBoot = <%= BootJson %>;</script>
    <script src="Scripts/doppler-engine.js"></script>
    <script src="Scripts/physics-validation.js"></script>
</asp:Content>
