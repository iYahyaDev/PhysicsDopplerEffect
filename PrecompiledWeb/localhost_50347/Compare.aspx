<%@ Page Title="Sound and Light" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="Compare.aspx.cs" Inherits="DopplerLab.Compare" %>
<asp:Content ID="CompareContent" ContentPlaceHolderID="MainContent" runat="server">
    <section class="page-heading">
        <p class="eyebrow" data-text-ar="مقارنة أساسية" data-text-en="Core comparison">مقارنة أساسية</p>
        <h1 data-text-ar="دوبلر للصوت ودوبلر للضوء ليسا المعادلة نفسها" data-text-en="Doppler for sound and light are not the same equation">دوبلر للصوت ودوبلر للضوء ليسا المعادلة نفسها</h1>
    </section>
    <section class="compare-grid">
        <article class="compare-panel sound-panel">
            <div class="module-heading">
                <img src="Assets/motorcycle-rider.png" alt="" aria-hidden="true" />
                <h2 data-text-ar="الصوت في الهواء" data-text-en="Sound in air">الصوت في الهواء</h2>
            </div>
            <canvas id="compareSoundCanvas" width="720" height="320"></canvas>
            <ul class="fact-list">
                <li data-text-ar="يحتاج إلى وسط مادي." data-text-en="Requires a material medium.">يحتاج إلى وسط مادي.</li>
                <li data-text-ar="السرعات تقاس بالنسبة للهواء." data-text-en="Velocities are measured relative to the air.">السرعات تقاس بالنسبة للهواء.</li>
                <li data-text-ar="حركة المصدر والمستمع ليست متناظرة تماما في المعادلة الكلاسيكية." data-text-en="Source and observer motion are not perfectly symmetric in the classical formula.">حركة المصدر والمستمع ليست متناظرة تماما في المعادلة الكلاسيكية.</li>
                <li class="ltr-math" dir="ltr">f′ = f(c − v<sub>o</sub> · n&#770;) / (c − v<sub>s</sub> · n&#770;), c ≈ 343 m/s</li>
            </ul>
            <div id="compareSoundResults" class="result-grid"></div>
        </article>
        <article class="compare-panel light-panel">
            <div class="module-heading">
                <img src="Assets/star.svg" alt="" aria-hidden="true" />
                <h2 data-text-ar="الضوء في الفضاء" data-text-en="Light in space">الضوء في الفضاء</h2>
            </div>
            <canvas id="compareLightCanvas" width="720" height="320"></canvas>
            <ul class="fact-list">
                <li data-text-ar="لا يحتاج إلى وسط." data-text-en="Requires no medium.">لا يحتاج إلى وسط.</li>
                <li data-text-ar="يعالج الحركة النسبية بتناظر من النسبية الخاصة." data-text-en="Treats relative motion symmetrically through special relativity.">يعالج الحركة النسبية بتناظر من النسبية الخاصة.</li>
                <li data-text-ar="ينتج انزياحا أحمر أو أزرق في الأطوال الموجية." data-text-en="Produces redshift or blueshift in wavelengths.">ينتج انزياحا أحمر أو أزرق في الأطوال الموجية.</li>
                <li class="ltr-math" dir="ltr">λ<sub>obs</sub>/λ<sub>emit</sub> = √((1 + β)/(1 − β)), c = 299792458 m/s</li>
            </ul>
            <div id="compareLightResults" class="result-grid"></div>
        </article>
    </section>
    <section class="shared-control-panel">
        <label class="slider-field">
            <span data-text-ar="سرعة شعاعية مشتركة" data-text-en="Shared radial velocity">سرعة شعاعية مشتركة</span>
            <input id="compareVelocity" type="range" min="-60" max="60" step="0.5" value="25" />
            <output id="compareVelocityOut" class="metric-value">25 m/s</output>
        </label>
        <p data-text-ar="القيمة نفسها تعطي أثرا كبيرا للصوت لأنها قريبة نسبيا من 343 m/s، لكنها تكاد لا تظهر للضوء لأنها ضئيلة مقارنة بسرعة الضوء." data-text-en="The same value has a large sound effect because it is sizable compared with 343 m/s, but it is almost invisible for light because it is tiny compared with light speed.">
            القيمة نفسها تعطي أثرا كبيرا للصوت لأنها قريبة نسبيا من 343 m/s، لكنها تكاد لا تظهر للضوء لأنها ضئيلة مقارنة بسرعة الضوء.
        </p>
    </section>
</asp:Content>
<asp:Content ID="CompareScripts" ContentPlaceHolderID="ScriptContent" runat="server">
    <script>window.DopplerBoot = <%= BootJson %>;</script>
    <script src="Scripts/applications.js"></script>
</asp:Content>
