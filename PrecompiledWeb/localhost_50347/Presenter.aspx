<%@ Page Title="Presenter" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="Presenter.aspx.cs" Inherits="DopplerLab.Presenter" %>
<asp:Content ID="PresenterHead" ContentPlaceHolderID="HeadContent" runat="server">
    <link rel="stylesheet" href="Content/presenter.css" />
</asp:Content>
<asp:Content ID="PresenterContent" ContentPlaceHolderID="MainContent" runat="server">
    <section class="presenter-shell" aria-label="Zoom presentation flow">
        <div class="presenter-topbar">
            <button type="button" id="presenterPrev" class="icon-button" aria-label="Previous slide">‹</button>
            <div class="section-indicator"><span id="presenterIndex">1</span> / <span id="presenterTotal">15</span></div>
            <button type="button" id="presenterNext" class="icon-button" aria-label="Next slide">›</button>
            <button type="button" id="presenterFullscreen" class="secondary-button" data-text-ar="ملء الشاشة" data-text-en="Fullscreen">ملء الشاشة</button>
            <button type="button" id="presenterHideControls" class="ghost-button" data-text-ar="إخفاء التحكم" data-text-en="Hide controls">إخفاء التحكم</button>
        </div>
        <div class="zoom-reminder" data-text-ar="تذكير Zoom: فعل Share Computer Sound عند تشغيل الصوت." data-text-en="Zoom reminder: enable Share Computer Sound when playing audio.">تذكير Zoom: فعل Share Computer Sound عند تشغيل الصوت.</div>
        <div class="slides">
            <article class="presenter-slide active" data-title-ar="قصة البداية" data-title-en="Story introduction">
                <h1 data-text-ar="دراجة نارية تمر بجانب شخص" data-text-en="A motorcycle passes a person">دراجة نارية تمر بجانب شخص</h1>
                <p data-text-ar="صوت المحرك المنبعث لا يتغير، لكن الشخص يسمع نغمة مختلفة قبل المرور وبعده. لماذا؟" data-text-en="The emitted engine sound does not change, yet the person hears a different pitch before and after the pass. Why?">صوت المحرك المنبعث لا يتغير، لكن الشخص يسمع نغمة مختلفة قبل المرور وبعده. لماذا؟</p>
                <img src="Assets/motorcycle-rider.png" alt="" aria-hidden="true" />
            </article>
            <article class="presenter-slide" data-title-ar="توقع الجمهور" data-title-en="Audience prediction"><h1 data-text-ar="توقعوا أولا" data-text-en="Predict first">توقعوا أولا</h1><p data-text-ar="هل ترتفع النغمة عند الاقتراب؟ ماذا يحدث عند أقرب نقطة؟ وهل المسافة وحدها تكفي؟" data-text-en="Does pitch rise while approaching? What happens at closest approach? Is distance alone enough?">هل ترتفع النغمة عند الاقتراب؟ ماذا يحدث عند أقرب نقطة؟ وهل المسافة وحدها تكفي؟</p></article>
            <article class="presenter-slide" data-title-ar="الموجة والتردد" data-title-en="Waves and frequency"><h1 data-text-ar="التردد هو عدد القمم في الثانية" data-text-en="Frequency is crests per second">التردد هو عدد القمم في الثانية</h1><p class="physics-equation equation ltr-math" dir="ltr">λ = c / f</p></article>
            <article class="presenter-slide" data-title-ar="تجربة يدوية" data-title-en="Manual demonstration"><h1 data-text-ar="اسحب المصدر أمام المستمع" data-text-en="Drag the source in front of the listener">اسحب المصدر أمام المستمع</h1><p data-text-ar="افتح صفحة المختبر أو شاركها بجانب العرض لتغيير الحركة مباشرة." data-text-en="Open the lab page beside the presentation to change motion live.">افتح صفحة المختبر أو شاركها بجانب العرض لتغيير الحركة مباشرة.</p><a class="primary-link" href="Lab.aspx" data-text-ar="افتح المختبر" data-text-en="Open Lab">افتح المختبر</a></article>
            <article class="presenter-slide" data-title-ar="الجبهات الموجية" data-title-en="Wavefronts"><h1 data-text-ar="كل جبهة تبقى في مكان انبعاثها" data-text-en="Each wavefront stays at its emission origin">كل جبهة تبقى في مكان انبعاثها</h1><p data-text-ar="الجبهات ليست مثبتة بالدراجة النارية بعد الانبعاث؛ هي تتمدد من مواضع تاريخية." data-text-en="Wavefronts are not attached to the motorcycle after emission; they expand from historical origins.">الجبهات ليست مثبتة بالدراجة النارية بعد الانبعاث؛ هي تتمدد من مواضع تاريخية.</p></article>
            <article class="presenter-slide" data-title-ar="مرور تلقائي" data-title-en="Automatic pass-by"><h1 data-text-ar="مرور جانبي مستمر" data-text-en="A continuous off-axis pass">مرور جانبي مستمر</h1><p data-text-ar="عند أقرب نقطة تقريبا تصبح السرعة الشعاعية صفرا رغم أن السرعة الكلية كبيرة." data-text-en="Near closest approach, radial velocity is about zero even though total speed is large.">عند أقرب نقطة تقريبا تصبح السرعة الشعاعية صفرا رغم أن السرعة الكلية كبيرة.</p></article>
            <article class="presenter-slide" data-title-ar="تجميد وتحليل" data-title-en="Freeze and analyze"><h1 data-text-ar="ضع الأرقام في المعادلة" data-text-en="Substitute the live numbers">ضع الأرقام في المعادلة</h1><p class="physics-equation equation ltr-math" dir="ltr">f′ = f(c − v<sub>o</sub> · n&#770;) / (c − v<sub>s</sub> · n&#770;)</p></article>
            <article class="presenter-slide" data-title-ar="مستمعان" data-title-en="Two listeners"><h1 data-text-ar="نفس المصدر، ترددان مختلفان" data-text-en="Same source, different frequencies">نفس المصدر، ترددان مختلفان</h1><p data-text-ar="كل مستمع له اتجاه شعاعي مختلف من المصدر." data-text-en="Each listener has a different radial direction from the source.">كل مستمع له اتجاه شعاعي مختلف من المصدر.</p></article>
            <article class="presenter-slide" data-title-ar="مستمع متحرك" data-title-en="Moving observer"><h1 data-text-ar="المستمع المتحرك يدخل في البسط" data-text-en="Moving observers enter the numerator">المستمع المتحرك يدخل في البسط</h1><p data-text-ar="استخدم التجارب الجاهزة في صفحة المختبر لمقارنة الحالات." data-text-en="Use the lab presets to compare cases.">استخدم التجارب الجاهزة في صفحة المختبر لمقارنة الحالات.</p></article>
            <article class="presenter-slide" data-title-ar="رادار الشرطة" data-title-en="Police radar"><h1 data-text-ar="رادار منعكس: عامل 2" data-text-en="Reflected radar: factor of 2">رادار منعكس: عامل 2</h1><p class="physics-equation equation ltr-math" dir="ltr">Δf ≈ 2 f<sub>t</sub> v / c</p></article>
            <article class="presenter-slide" data-title-ar="دوبلر طبي" data-title-en="Medical ultrasound"><h1 data-text-ar="الزاوية مهمة في الموجات فوق الصوتية" data-text-en="Angle matters in ultrasound">الزاوية مهمة في الموجات فوق الصوتية</h1><p class="physics-equation equation ltr-math" dir="ltr">Δf = 2 f<sub>0</sub> v cos(θ) / 1540</p></article>
            <article class="presenter-slide" data-title-ar="الفلك" data-title-en="Astronomy"><h1 data-text-ar="الضوء نسبي ولا يحتاج وسطا" data-text-en="Light is relativistic and needs no medium">الضوء نسبي ولا يحتاج وسطا</h1><p class="physics-equation equation ltr-math" dir="ltr">λ<sub>obs</sub>/λ<sub>emit</sub> = √((1 + β)/(1 − β))</p></article>
            <article class="presenter-slide" data-title-ar="الصوت والضوء" data-title-en="Sound versus light"><h1 data-text-ar="لا تخلط المعادلات" data-text-en="Do not mix the equations">لا تخلط المعادلات</h1><a class="primary-link" href="Compare.aspx" data-text-ar="افتح المقارنة" data-text-en="Open comparison">افتح المقارنة</a></article>
            <article class="presenter-slide" data-title-ar="تحد أخير" data-title-en="Final challenge"><h1 data-text-ar="اجعل مستمعين يختلفان" data-text-en="Make two listeners disagree">اجعل مستمعين يختلفان</h1><p data-text-ar="ضع المستمعين على جهتين مختلفتين من مصدر متحرك." data-text-en="Place listeners on opposite sides of a moving source.">ضع المستمعين على جهتين مختلفتين من مصدر متحرك.</p></article>
            <article class="presenter-slide" data-title-ar="اختبار وخاتمة" data-title-en="Quiz and conclusion"><h1 data-text-ar="ما الفكرة الواحدة التي لا نريد نسيانها؟" data-text-en="What is the one idea we should not forget?">ما الفكرة الواحدة التي لا نريد نسيانها؟</h1><p data-text-ar="المركبة الشعاعية تغير النغمة، والمسافة تغير العلو." data-text-en="Radial velocity changes pitch; distance changes loudness.">المركبة الشعاعية تغير النغمة، والمسافة تغير العلو.</p><a class="secondary-link" href="Quiz.aspx" data-text-ar="ابدأ الاختبار" data-text-en="Start quiz">ابدأ الاختبار</a></article>
        </div>
        <aside id="speakerNotes" class="speaker-notes">
            <h2 data-text-ar="ملاحظات المتحدث" data-text-en="Speaker notes">ملاحظات المتحدث</h2>
            <p id="speakerNoteText"></p>
            <p class="shortcut-line ltr-math">Space: play/pause · R: reset · F: freeze · A: linear pass · C: circular motion · W: waves · M: mute · 1/2: listener · ←/→: slides · Esc: exit fullscreen</p>
        </aside>
    </section>
</asp:Content>
<asp:Content ID="PresenterScripts" ContentPlaceHolderID="ScriptContent" runat="server">
    <script>window.DopplerBoot = <%= BootJson %>;</script>
    <script src="Scripts/presenter.js"></script>
</asp:Content>
