<%@ Page Title="Quiz" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="Quiz.aspx.cs" Inherits="DopplerLab.Quiz" %>
<asp:Content ID="QuizContent" ContentPlaceHolderID="MainContent" runat="server">
    <section class="quiz-shell">
        <div class="quiz-header">
            <div>
                <p class="eyebrow" data-text-ar="أسئلة الجمهور" data-text-en="Audience questions">أسئلة الجمهور</p>
                <h1 data-text-ar="اختبار دوبلر" data-text-en="Doppler Quiz">اختبار دوبلر</h1>
            </div>
            <div class="quiz-actions">
                <label class="toggle-label"><input type="checkbox" id="presenterQuizMode" /> <span data-text-ar="وضع مقدم بدون كشف تلقائي" data-text-en="Presenter mode without auto reveal">وضع مقدم بدون كشف تلقائي</span></label>
                <button type="button" id="shuffleQuizBtn" class="secondary-button" data-text-ar="ترتيب عشوائي" data-text-en="Shuffle">ترتيب عشوائي</button>
                <button type="button" id="restartQuizBtn" class="secondary-button" data-text-ar="إعادة الاختبار" data-text-en="Restart">إعادة الاختبار</button>
            </div>
        </div>
        <article class="quiz-card">
            <div class="quiz-meta">
                <span id="quizPosition" class="metric-value">1 / 12</span>
                <span id="quizTopic">Basics</span>
                <span id="quizDifficulty">Easy</span>
            </div>
            <h2 id="quizQuestion">...</h2>
            <div id="quizChoices" class="choice-list"></div>
            <p id="quizExplanation" class="explanation"></p>
            <div class="dialog-actions">
                <button type="button" id="previousQuestionBtn" class="secondary-button" data-text-ar="السابق" data-text-en="Previous">السابق</button>
                <button type="button" id="revealQuizBtn" class="primary-button" data-i18n="reveal">إظهار الإجابة</button>
                <button type="button" id="nextQuestionBtn" class="secondary-button" data-text-ar="التالي" data-text-en="Next">التالي</button>
            </div>
        </article>
        <aside class="score-card">
            <h2 data-text-ar="النتيجة المحلية" data-text-en="Local score">النتيجة المحلية</h2>
            <strong id="quizScore" class="score-number">0</strong>
            <p id="quizScoreDetail" data-text-ar="تخزن النتيجة في هذا المتصفح فقط." data-text-en="The score is stored only in this browser.">تخزن النتيجة في هذا المتصفح فقط.</p>
        </aside>
    </section>
</asp:Content>
<asp:Content ID="QuizScripts" ContentPlaceHolderID="ScriptContent" runat="server">
    <script>window.DopplerBoot = <%= BootJson %>;</script>
    <script src="Scripts/quiz.js"></script>
</asp:Content>
