<%@ Page Title="Home" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="Default.aspx.cs" Inherits="DopplerLab.Default" %>
<asp:Content ID="HomeHead" ContentPlaceHolderID="HeadContent" runat="server">
    <meta name="description" content="Interactive Doppler effect lab for classroom and Zoom presentation." />
</asp:Content>
<asp:Content ID="HomeContent" ContentPlaceHolderID="MainContent" runat="server">
    <section class="home-grid">
        <div class="home-intro">
            <p class="eyebrow" data-text-ar="تعلم تفاعلي في الفيزياء" data-text-en="Interactive physics learning">تعلم تفاعلي في الفيزياء</p>
            <h1 data-text-ar="مختبر دوبلر" data-text-en="Doppler Lab">مختبر دوبلر</h1>
            <p data-text-ar="اسحب الدراجة النارية، ضع المستمعين، شغل صوت المحرك، وشاهد كيف تغير المركبة الشعاعية التردد بينما تغير المسافة العلو فقط." data-text-en="Drag the motorcycle, place listeners, start the engine sound, and see how radial velocity changes pitch while distance changes loudness.">
                اسحب الدراجة النارية، ضع المستمعين، شغل صوت المحرك، وشاهد كيف تغير المركبة الشعاعية التردد بينما تغير المسافة العلو فقط.
            </p>
            <div class="action-row">
                <a class="primary-link" href="Lab.aspx" data-text-ar="افتح المختبر" data-text-en="Open Lab">افتح المختبر</a>
                <a class="secondary-link" href="Presenter.aspx" data-text-ar="وضع العرض" data-text-en="Presenter Mode">وضع العرض</a>
            </div>
        </div>
        <div class="formula-panel" aria-label="Doppler formula">
            <div class="formula-title" data-text-ar="المعادلة المستخدمة للصوت" data-text-en="Sound equation used">المعادلة المستخدمة للصوت</div>
            <div class="physics-equation equation ltr-math" dir="ltr">f′ = f · (c − v<sub>o</sub> · n&#770;) / (c − v<sub>s</sub> · n&#770;)</div>
            <p data-text-ar="الاتجاه n من المصدر إلى المستمع. السرعات الكلية لا تكفي؛ المركبة على هذا الاتجاه هي المهمة." data-text-en="n points from source to observer. Total speed is not enough; the component along this direction is what matters.">
                الاتجاه n من المصدر إلى المستمع. السرعات الكلية لا تكفي؛ المركبة على هذا الاتجاه هي المهمة.
            </p>
        </div>
    </section>

    <section class="module-grid compact-modules" aria-label="Main site areas">
        <article class="module-card">
            <img src="Assets/motorcycle-rider.png" alt="" aria-hidden="true" />
            <h2 data-text-ar="المحاكاة الرئيسية" data-text-en="Main Simulation">المحاكاة الرئيسية</h2>
            <p data-text-ar="حركة يدوية، مرور تلقائي، موجات تمثيلية، صوت حقيقي، ومستمعان مستقلان." data-text-en="Manual motion, automatic pass-by, representative waves, real audio, and two independent listeners.">حركة يدوية، مرور تلقائي، موجات تمثيلية، صوت حقيقي، ومستمعان مستقلان.</p>
            <a href="Lab.aspx" data-text-ar="ابدأ" data-text-en="Start">ابدأ</a>
        </article>
        <article class="module-card">
            <img src="Assets/radar.svg" alt="" aria-hidden="true" />
            <h2 data-text-ar="تطبيقات دوبلر" data-text-en="Doppler Applications">تطبيقات دوبلر</h2>
            <p data-text-ar="رادار الشرطة، دوبلر الطبي، والانزياح الأحمر في الفلك بمعادلاتها الصحيحة." data-text-en="Police radar, medical Doppler, and astronomical redshift with their correct equations.">رادار الشرطة، دوبلر الطبي، والانزياح الأحمر في الفلك بمعادلاتها الصحيحة.</p>
            <a href="Applications.aspx" data-text-ar="استكشف" data-text-en="Explore">استكشف</a>
        </article>
        <article class="module-card">
            <img src="Assets/star.svg" alt="" aria-hidden="true" />
            <h2 data-text-ar="الصوت مقابل الضوء" data-text-en="Sound versus Light">الصوت مقابل الضوء</h2>
            <p data-text-ar="قارن بين موجات تحتاج وسطا وموجات كهرومغناطيسية نسبية." data-text-en="Compare waves that need a medium with relativistic electromagnetic waves.">قارن بين موجات تحتاج وسطا وموجات كهرومغناطيسية نسبية.</p>
            <a href="Compare.aspx" data-text-ar="قارن" data-text-en="Compare">قارن</a>
        </article>
        <article class="module-card">
            <img src="Assets/listener-person.png" alt="" aria-hidden="true" />
            <h2 data-text-ar="اختبار الجمهور" data-text-en="Audience Quiz">اختبار الجمهور</h2>
            <p data-text-ar="أسئلة مفاهيمية وعددية مع تفسير عربي وإنجليزي ووضع مقدم." data-text-en="Conceptual and numerical questions with Arabic and English explanations and presenter mode.">أسئلة مفاهيمية وعددية مع تفسير عربي وإنجليزي ووضع مقدم.</p>
            <a href="Quiz.aspx" data-text-ar="افتح الاختبار" data-text-en="Open Quiz">افتح الاختبار</a>
        </article>
    </section>
</asp:Content>
<asp:Content ID="HomeScripts" ContentPlaceHolderID="ScriptContent" runat="server">
    <script>window.DopplerBoot = <%= BootJson %>;</script>
</asp:Content>
