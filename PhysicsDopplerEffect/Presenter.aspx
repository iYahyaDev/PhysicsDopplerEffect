<%@ Page Title="Presenter" Language="C#" AutoEventWireup="true" CodeBehind="Presenter.aspx.cs" Inherits="DopplerLab.Presenter" %>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head runat="server">
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#071521" />
    <link rel="icon" href="data:," />
    <title>Doppler Presentation</title>
    <link rel="stylesheet" href="Content/presentation-runtime.css" />
</head>
<body class="presentation-player-page">
    <form id="form1" runat="server">
        <div id="presentationApp" class="presentation-app" aria-live="polite">
            <div id="presentationStage" class="presentation-stage" tabindex="-1"></div>
            <div id="presentationOverview" class="presentation-overview" hidden></div>
            <div id="runtimeStepDots" class="presentation-step-dots" aria-hidden="true"></div>
            <div class="presentation-controls" id="presentationControls">
                <button type="button" id="runtimePrev" class="presentation-icon" aria-label="Previous slide">‹</button>
                <button type="button" id="runtimeNext" class="presentation-control" data-label-ar="الخطوة التالية" data-label-en="Next step">الخطوة التالية</button>
                <button type="button" id="runtimeOverview" class="presentation-control" data-label-ar="نظرة عامة" data-label-en="Overview">نظرة عامة</button>
                <button type="button" id="runtimeReset" class="presentation-control" data-label-ar="إعادة" data-label-en="Reset">إعادة</button>
                <button type="button" id="runtimeFullscreen" class="presentation-control" data-label-ar="ملء الشاشة" data-label-en="Fullscreen">ملء الشاشة</button>
                <button type="button" id="runtimeLanguage" class="presentation-control">English</button>
                <button type="button" id="runtimeHideControls" class="presentation-control" data-label-ar="إخفاء" data-label-en="Hide">إخفاء</button>
                <div class="presentation-counter"><span id="runtimeSlideNumber">1</span> / <span id="runtimeSlideTotal">1</span></div>
            </div>
            <button type="button" id="runtimeShowControls" class="presentation-show-controls" hidden data-label-ar="إظهار التحكم" data-label-en="Show controls">إظهار التحكم</button>
            <div class="presentation-progress" aria-hidden="true"><span id="runtimeProgress"></span></div>
            <div id="runtimeStatus" class="presentation-status" role="status"></div>
        </div>
    </form>
    <script>window.DopplerBoot = <%= BootJson %>;</script>
    <script src="Scripts/doppler-engine.js"></script>
    <script src="Scripts/doppler-audio.js"></script>
    <script src="Scripts/presentation-storage.js"></script>
    <script src="Scripts/presentation-components.js"></script>
    <script src="Scripts/presentation-simulations.js"></script>
    <script src="Scripts/presentation-runtime.js"></script>
</body>
</html>
