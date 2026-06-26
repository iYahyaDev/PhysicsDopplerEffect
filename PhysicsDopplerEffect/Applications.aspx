<%@ Page Title="Applications" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="Applications.aspx.cs" Inherits="DopplerLab.Applications" %>
<asp:Content ID="ApplicationsHead" ContentPlaceHolderID="HeadContent" runat="server">
    <meta name="description" content="Police radar, medical Doppler ultrasound, astronomy, and weather radar demonstrations." />
</asp:Content>
<asp:Content ID="ApplicationsContent" ContentPlaceHolderID="MainContent" runat="server">
    <section class="page-heading">
        <p class="eyebrow" data-text-ar="تطبيقات علمية" data-text-en="Scientific applications">تطبيقات علمية</p>
        <h1 data-text-ar="دوبلر خارج الدراجة النارية" data-text-en="Doppler beyond the motorcycle">دوبلر خارج الدراجة النارية</h1>
        <p data-text-ar="كل وحدة تستخدم المعادلة المناسبة لها: رادار كهرومغناطيسي منعكس، دوبلر طبي في الأنسجة، وضوء نسبي في الفلك." data-text-en="Each module uses its proper equation: reflected electromagnetic radar, medical Doppler in tissue, and relativistic light in astronomy.">
            كل وحدة تستخدم المعادلة المناسبة لها: رادار كهرومغناطيسي منعكس، دوبلر طبي في الأنسجة، وضوء نسبي في الفلك.
        </p>
    </section>

    <section class="application-grid">
        <article class="interactive-module" id="policeModule">
            <div class="module-heading">
                <img src="Assets/radar.svg" alt="" aria-hidden="true" />
                <div>
                    <h2 data-text-ar="رادار الشرطة" data-text-en="Police radar">رادار الشرطة</h2>
                    <p class="physics-equation equation ltr-math" dir="ltr">Δf ≈ 2 f<sub>t</sub> v<sub>radial</sub> / c<sub>light</sub></p>
                </div>
            </div>
            <p data-text-ar="عامل 2 يظهر لأن الموجة تتحول عند استقبال السيارة ثم مرة ثانية عند انعكاسها إلى الرادار." data-text-en="The factor of 2 appears because the wave shifts when the car receives it and shifts again when it reflects back to the radar.">
                عامل 2 يظهر لأن الموجة تتحول عند استقبال السيارة ثم مرة ثانية عند انعكاسها إلى الرادار.
            </p>
            <canvas id="radarCanvas" width="760" height="300"></canvas>
            <div class="module-controls">
                <label class="slider-field"><span data-text-ar="سرعة السيارة" data-text-en="Car speed">سرعة السيارة</span><input id="radarSpeed" type="range" min="-60" max="60" step="0.5" value="25" /><output id="radarSpeedOut" class="metric-value">25 m/s</output></label>
                <label class="slider-field"><span data-text-ar="تردد الرادار GHz" data-text-en="Radar frequency GHz">تردد الرادار GHz</span><input id="radarFrequency" type="range" min="10" max="35" step="0.125" value="24.125" /><output id="radarFrequencyOut" class="metric-value">24.125 GHz</output></label>
                <label class="slider-field"><span data-text-ar="حد السرعة" data-text-en="Speed limit">حد السرعة</span><input id="speedLimit" type="range" min="30" max="140" step="5" value="80" /><output id="speedLimitOut" class="metric-value">80 km/h</output></label>
            </div>
            <div id="radarResults" class="result-grid"></div>
        </article>

        <article class="interactive-module" id="ultrasoundModule">
            <div class="module-heading">
                <img src="Assets/ultrasound.svg" alt="" aria-hidden="true" />
                <div>
                    <h2 data-text-ar="دوبلر الموجات فوق الصوتية" data-text-en="Medical Doppler ultrasound">دوبلر الموجات فوق الصوتية</h2>
                    <p class="physics-equation equation ltr-math" dir="ltr">Δf = 2 f<sub>0</sub> v cos(θ) / c<sub>tissue</sub></p>
                </div>
            </div>
            <p data-text-ar="تستخدم الوحدة سرعة الصوت في الأنسجة 1540 m/s. قرب 90° يصبح cos(θ) صغيرا فتضعف الإزاحة." data-text-en="This module uses sound speed in tissue, 1540 m/s. Near 90 degrees, cos(theta) is small, so the shift becomes weak.">
                تستخدم الوحدة سرعة الصوت في الأنسجة 1540 m/s. قرب 90° يصبح cos(θ) صغيرا فتضعف الإزاحة.
            </p>
            <canvas id="ultrasoundCanvas" width="760" height="300"></canvas>
            <div class="module-controls">
                <label class="slider-field"><span data-text-ar="سرعة الدم" data-text-en="Blood speed">سرعة الدم</span><input id="bloodSpeed" type="range" min="-1.5" max="1.5" step="0.01" value="0.7" /><output id="bloodSpeedOut" class="metric-value">0.70 m/s</output></label>
                <label class="slider-field"><span data-text-ar="زاوية المسبار" data-text-en="Probe angle">زاوية المسبار</span><input id="probeAngle" type="range" min="0" max="90" step="1" value="45" /><output id="probeAngleOut" class="metric-value">45°</output></label>
                <label class="slider-field"><span data-text-ar="تردد المسبار" data-text-en="Probe frequency">تردد المسبار</span><input id="ultrasoundFrequency" type="range" min="2" max="12" step="0.1" value="5" /><output id="ultrasoundFrequencyOut" class="metric-value">5 MHz</output></label>
            </div>
            <div id="ultrasoundResults" class="result-grid"></div>
        </article>

        <article class="interactive-module" id="astronomyModule">
            <div class="module-heading">
                <img src="Assets/galaxy.svg" alt="" aria-hidden="true" />
                <div>
                    <h2 data-text-ar="الفلك: انزياح أحمر وأزرق" data-text-en="Astronomy: redshift and blueshift">الفلك: انزياح أحمر وأزرق</h2>
                    <p class="physics-equation equation ltr-math" dir="ltr">f<sub>obs</sub>/f<sub>emit</sub> = √((1 − β)/(1 + β))</p>
                </div>
            </div>
            <p data-text-ar="الضوء لا يحتاج إلى وسط. عند السرعات الفلكية نستخدم علاقة دوبلر النسبية لا معادلة الصوت." data-text-en="Light needs no medium. At astronomical speeds, use relativistic Doppler rather than the sound equation.">
                الضوء لا يحتاج إلى وسط. عند السرعات الفلكية نستخدم علاقة دوبلر النسبية لا معادلة الصوت.
            </p>
            <canvas id="astroCanvas" width="760" height="300"></canvas>
            <div class="module-controls">
                <label class="slider-field"><span data-text-ar="السرعة كجزء من c" data-text-en="Velocity fraction of c">السرعة كجزء من c</span><input id="astroBeta" type="range" min="-0.8" max="0.8" step="0.01" value="0.2" /><output id="astroBetaOut" class="metric-value">0.20 c</output></label>
                <label class="slider-field"><span data-text-ar="الطول الموجي المنبعث" data-text-en="Emitted wavelength">الطول الموجي المنبعث</span><input id="emitWavelength" type="range" min="400" max="700" step="1" value="520" /><output id="emitWavelengthOut" class="metric-value">520 nm</output></label>
            </div>
            <div id="astroResults" class="result-grid"></div>
        </article>

        <article class="interactive-module" id="weatherModule">
            <div class="module-heading">
                <img src="Assets/star.svg" alt="" aria-hidden="true" />
                <div>
                    <h2 data-text-ar="رادار الطقس والحركة" data-text-en="Weather radar and motion sensing">رادار الطقس والحركة</h2>
                    <p class="physics-equation equation ltr-math" dir="ltr">v<sub>radial</sub> ∝ Δf</p>
                </div>
            </div>
            <p data-text-ar="رادار الطقس يقيس المركبة الشعاعية لقطرات المطر أو الجسيمات؛ الحركة الجانبية القوية قد تعطي إزاحة صغيرة." data-text-en="Weather radar measures the radial component of rain or particles; strong sideways motion can produce a small shift.">
                رادار الطقس يقيس المركبة الشعاعية لقطرات المطر أو الجسيمات؛ الحركة الجانبية القوية قد تعطي إزاحة صغيرة.
            </p>
            <canvas id="weatherCanvas" width="760" height="260"></canvas>
            <div class="module-controls">
                <label class="slider-field"><span data-text-ar="سرعة الرياح" data-text-en="Wind speed">سرعة الرياح</span><input id="weatherSpeed" type="range" min="0" max="60" step="1" value="28" /><output id="weatherSpeedOut" class="metric-value">28 m/s</output></label>
                <label class="slider-field"><span data-text-ar="زاوية الحركة" data-text-en="Motion angle">زاوية الحركة</span><input id="weatherAngle" type="range" min="0" max="90" step="1" value="30" /><output id="weatherAngleOut" class="metric-value">30°</output></label>
            </div>
            <div id="weatherResults" class="result-grid"></div>
        </article>
    </section>
</asp:Content>
<asp:Content ID="ApplicationsScripts" ContentPlaceHolderID="ScriptContent" runat="server">
    <script>window.DopplerBoot = <%= BootJson %>;</script>
    <script src="Scripts/applications.js"></script>
</asp:Content>
