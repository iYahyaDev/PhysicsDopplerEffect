<%@ Page Title="Lab" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="Lab.aspx.cs" Inherits="DopplerLab.Lab" %>
<asp:Content ID="LabHead" ContentPlaceHolderID="HeadContent" runat="server">
    <meta name="description" content="Drag a motorcycle sound source and hear the Doppler shift in real time." />
</asp:Content>
<asp:Content ID="LabContent" ContentPlaceHolderID="MainContent" runat="server">
    <section class="lab-shell" aria-label="Doppler simulation">
        <div class="canvas-column">
            <div class="canvas-toolbar" aria-label="Simulation controls">
                <button type="button" id="startPauseBtn" class="primary-button" data-i18n="start">تشغيل</button>
                <button type="button" id="resetBtn" class="secondary-button" data-i18n="reset">إعادة ضبط</button>
                <button type="button" id="audioBtn" class="secondary-button" data-i18n="startAudio">بدء الصوت</button>
                <button type="button" id="freezeBtn" class="accent-button" data-i18n="freeze">تجميد وتحليل</button>
                <button type="button" id="autoPassBtn" class="secondary-button" data-text-ar="المرور الخطي التلقائي" data-text-en="Automatic Linear Pass">المرور الخطي التلقائي</button>
                <button type="button" id="circularMotionBtn" class="secondary-button" data-text-ar="الحركة الدائرية التلقائية" data-text-en="Automatic Circular Motion">الحركة الدائرية التلقائية</button>
                <button type="button" id="fullscreenBtn" class="icon-button" title="Fullscreen" aria-label="Fullscreen">⛶</button>
            </div>
            <div class="simulation-stage">
                <canvas id="simCanvas" width="1280" height="720" aria-label="Doppler simulation canvas"></canvas>
                <div id="simulationWarning" class="simulation-warning" role="status" aria-live="polite"></div>
            </div>
            <div class="chart-panel">
                <div class="section-heading">
                    <h2 data-text-ar="رسوم الزمن الحقيقي" data-text-en="Real-time Charts">رسوم الزمن الحقيقي</h2>
                    <div class="toggle-row">
                        <label><input type="checkbox" id="seriesFrequency" checked /> <span data-text-ar="التردد" data-text-en="Frequency">التردد</span></label>
                        <label><input type="checkbox" id="seriesRadial" checked /> <span data-text-ar="السرعة الشعاعية" data-text-en="Radial velocity">السرعة الشعاعية</span></label>
                        <label><input type="checkbox" id="seriesDistance" checked /> <span data-text-ar="المسافة" data-text-en="Distance">المسافة</span></label>
                    </div>
                </div>
                <canvas id="chartCanvas" width="1280" height="320" aria-label="Frequency, radial velocity, and distance chart"></canvas>
            </div>
        </div>

        <aside class="lab-panel">
            <section class="metrics-grid" aria-label="Live measurements">
                <article class="metric-card">
                    <span data-text-ar="التردد الأساسي المنبعث" data-text-en="Emitted fundamental">التردد الأساسي المنبعث</span>
                    <strong id="emitValue" class="metric-value">180 Hz</strong>
                </article>
                <article class="metric-card status-card">
                    <span data-text-ar="المسموع عند أ" data-text-en="Observed at A">المسموع عند أ</span>
                    <strong id="observedAValue" class="metric-value">180 Hz</strong>
                </article>
                <article class="metric-card" id="listenerBMetric">
                    <span data-text-ar="المسموع عند ب" data-text-en="Observed at B">المسموع عند ب</span>
                    <strong id="observedBValue" class="metric-value">180 Hz</strong>
                </article>
                <article class="metric-card">
                    <span data-text-ar="عامل دوبلر" data-text-en="Doppler factor">عامل دوبلر</span>
                    <strong id="factorValue" class="metric-value">1.000</strong>
                </article>
                <article class="metric-card">
                    <span data-text-ar="المسافة" data-text-en="Distance">المسافة</span>
                    <strong id="distanceValue" class="metric-value">0 m</strong>
                </article>
                <article class="metric-card">
                    <span data-text-ar="سرعة الدراجة النارية" data-text-en="Motorcycle speed">سرعة الدراجة النارية</span>
                    <strong id="speedValue" class="metric-value">0 m/s</strong>
                </article>
                <article class="metric-card">
                    <span data-text-ar="شعاعية المصدر" data-text-en="Source radial">شعاعية المصدر</span>
                    <strong id="sourceRadialValue" class="metric-value">0 m/s</strong>
                </article>
                <article class="metric-card">
                    <span data-text-ar="سرعة المستمع" data-text-en="Observer speed">سرعة المستمع</span>
                    <strong id="observerSpeedValue" class="metric-value">0 m/s</strong>
                </article>
                <article class="metric-card">
                    <span data-text-ar="شعاعية المستمع" data-text-en="Observer closing">شعاعية المستمع</span>
                    <strong id="observerRadialValue" class="metric-value">0 m/s</strong>
                </article>
                <article class="metric-card">
                    <span data-text-ar="سرعة الصوت" data-text-en="Sound speed">سرعة الصوت</span>
                    <strong id="soundSpeedValue" class="metric-value">343 m/s</strong>
                </article>
                <article class="metric-card">
                    <span data-text-ar="درجة الحرارة" data-text-en="Temperature">درجة الحرارة</span>
                    <strong id="tempValue" class="metric-value">20 °C</strong>
                </article>
                <article class="metric-card">
                    <span data-text-ar="الطول الموجي" data-text-en="Wavelength">الطول الموجي</span>
                    <strong id="wavelengthValue" class="metric-value">3.81 m</strong>
                </article>
                <article class="metric-card">
                    <span data-text-ar="كسب المسافة" data-text-en="Distance gain">كسب المسافة</span>
                    <strong id="distanceGainValue" class="metric-value">0.12</strong>
                </article>
                <article class="metric-card wide">
                    <span data-text-ar="الحالة الحالية" data-text-en="Current state">الحالة الحالية</span>
                    <strong id="stateValue" class="state-pill">ساكن</strong>
                </article>
                <article class="metric-card wide">
                    <span data-text-ar="الجبهات التمثيلية" data-text-en="Representative wavefronts">الجبهات التمثيلية</span>
                    <strong id="visualStrideValue" class="metric-value">كل 3 قمم</strong>
                </article>
            </section>

            <section class="control-panel" aria-label="Simulation controls">
                <div class="section-heading">
                    <h2 data-text-ar="التحكم" data-text-en="Controls">التحكم</h2>
                    <button type="button" id="predictionBtn" class="ghost-button" data-text-ar="توقع" data-text-en="Predict">توقع</button>
                </div>

                <div class="segmented">
                    <button type="button" id="manualBtn" class="active" data-text-ar="سحب يدوي" data-text-en="Manual Drag">سحب يدوي</button>
                    <button type="button" id="listenerBBtn" data-text-ar="إضافة المستمع ب" data-text-en="Add Listener B">إضافة المستمع ب</button>
                    <button type="button" id="challengeBtn" data-text-ar="تحديات" data-text-en="Challenges">تحديات</button>
                </div>

                <div class="module-controls circular-controls">
                    <label class="field">
                        <span data-text-ar="اتجاه الدوران" data-text-en="Circular direction">اتجاه الدوران</span>
                        <select id="circularDirection">
                            <option value="1" data-text-ar="مع عقارب الساعة" data-text-en="Clockwise">مع عقارب الساعة</option>
                            <option value="-1" data-text-ar="عكس عقارب الساعة" data-text-en="Counterclockwise">عكس عقارب الساعة</option>
                        </select>
                    </label>
                    <label class="slider-field">
                        <span data-text-ar="نصف قطر المسار" data-text-en="Path radius">نصف قطر المسار</span>
                        <input id="circularRadius" type="range" min="8" max="45" step="0.5" value="30" />
                        <output id="circularRadiusOut" class="metric-value">30 m</output>
                    </label>
                    <label class="slider-field">
                        <span data-text-ar="السرعة المماسية" data-text-en="Tangential speed">السرعة المماسية</span>
                        <input id="circularSpeed" type="range" min="1" max="35" step="0.5" value="15" />
                        <output id="circularSpeedOut" class="metric-value">15 m/s</output>
                    </label>
                    <label class="field">
                        <span data-text-ar="مركز الدائرة" data-text-en="Circle center">مركز الدائرة</span>
                        <select id="circularCenterMode">
                            <option value="listener" data-text-ar="المستمع في المركز" data-text-en="Listener at center">المستمع في المركز</option>
                            <option value="fixed" data-text-ar="مركز ثابت، حرّك المستمع" data-text-en="Fixed center, move listener">مركز ثابت، حرّك المستمع</option>
                        </select>
                    </label>
                </div>

                <label class="field">
                    <span data-text-ar="استمع كـ" data-text-en="Listen as">استمع كـ</span>
                    <select id="listenSelect">
                        <option value="A" data-text-ar="المستمع أ" data-text-en="Listener A">المستمع أ</option>
                        <option value="B" data-text-ar="المستمع ب" data-text-en="Listener B">المستمع ب</option>
                        <option value="stereo" data-text-ar="مقارنة ستيريو" data-text-en="Stereo comparison">مقارنة ستيريو</option>
                    </select>
                </label>

                <label class="field">
                    <span data-text-ar="نمط الصوت" data-text-en="Sound mode">نمط الصوت</span>
                    <select id="soundMode">
                        <option value="engine" data-text-ar="صوت المحرك" data-text-en="Motorcycle engine">صوت المحرك</option>
                        <option value="tone" data-text-ar="نغمة علمية" data-text-en="Scientific tone">نغمة علمية</option>
                    </select>
                </label>

                <label class="slider-field">
                    <span data-text-ar="تردد المحرك الأساسي" data-text-en="Engine fundamental">تردد المحرك الأساسي</span>
                    <input id="sourceFrequency" type="range" min="40" max="220" step="1" value="180" />
                    <output id="sourceFrequencyOut" class="metric-value">180 Hz</output>
                </label>
                <label class="slider-field">
                    <span data-text-ar="سرعة الدراجة النارية" data-text-en="Motorcycle speed">سرعة الدراجة النارية</span>
                    <input id="sourceSpeed" type="range" min="0" max="60" step="0.5" value="25" />
                    <output id="sourceSpeedOut" class="metric-value">25 m/s</output>
                </label>
                <label class="slider-field">
                    <span data-text-ar="سرعة المستمع" data-text-en="Observer speed">سرعة المستمع</span>
                    <input id="observerSpeed" type="range" min="0" max="15" step="0.25" value="0" />
                    <output id="observerSpeedOut" class="metric-value">0 m/s</output>
                </label>
                <label class="slider-field">
                    <span data-text-ar="درجة حرارة الهواء" data-text-en="Air temperature">درجة حرارة الهواء</span>
                    <input id="temperature" type="range" min="0" max="40" step="0.5" value="20" />
                    <output id="temperatureOut" class="metric-value">20 °C</output>
                </label>
                <label class="slider-field">
                    <span data-text-ar="تجاوز سرعة الصوت" data-text-en="Sound-speed override">تجاوز سرعة الصوت</span>
                    <input id="soundSpeedOverride" type="range" min="300" max="360" step="0.5" value="343.42" />
                    <output id="soundSpeedOverrideOut" class="metric-value">تلقائي</output>
                </label>
                <label class="slider-field">
                    <span data-text-ar="سرعة الزمن" data-text-en="Animation speed">سرعة الزمن</span>
                    <input id="animationSpeed" type="range" min="0.1" max="2" step="0.1" value="1" />
                    <output id="animationSpeedOut" class="metric-value">1.0x</output>
                </label>

                <div class="toggle-grid">
                    <label><input type="checkbox" id="dopplerToggle" checked /> <span data-text-ar="تفعيل تغير النغمة" data-text-en="Enable Doppler pitch">تفعيل تغير النغمة</span></label>
                    <label><input type="checkbox" id="loudnessToggle" checked /> <span data-text-ar="علو حسب المسافة" data-text-en="Distance loudness">علو حسب المسافة</span></label>
                    <label><input type="checkbox" id="stereoToggle" checked /> <span data-text-ar="تحريك ستيريو" data-text-en="Stereo panning">تحريك ستيريو</span></label>
                    <label><input type="checkbox" id="inertiaToggle" /> <span data-text-ar="قصور بعد السحب" data-text-en="Inertia after drag">قصور بعد السحب</span></label>
                    <label><input type="checkbox" id="waveBtn" checked /> <span data-text-ar="إظهار الجبهات" data-text-en="Show wavefronts">إظهار الجبهات</span></label>
                    <label><input type="checkbox" id="vectorsBtn" checked /> <span data-text-ar="إظهار المتجهات" data-text-en="Show vectors">إظهار المتجهات</span></label>
                </div>

                <label class="field">
                    <span data-text-ar="تجارب حركة المستمع" data-text-en="Moving-observer presets">تجارب حركة المستمع</span>
                    <select id="presetSelect">
                        <option value="free" data-text-ar="حر" data-text-en="Free">حر</option>
                        <option value="observerApproaches" data-text-ar="مصدر ساكن، المستمع يقترب" data-text-en="Stationary source, observer approaches">مصدر ساكن، المستمع يقترب</option>
                        <option value="observerRecedes" data-text-ar="مصدر ساكن، المستمع يبتعد" data-text-en="Stationary source, observer recedes">مصدر ساكن، المستمع يبتعد</option>
                        <option value="bothApproach" data-text-ar="كلاهما يقترب" data-text-en="Both approach each other">كلاهما يقترب</option>
                        <option value="bothApart" data-text-ar="كلاهما يبتعد" data-text-en="Both move apart">كلاهما يبتعد</option>
                        <option value="sameDirection" data-text-ar="نفس الاتجاه" data-text-en="Same direction">نفس الاتجاه</option>
                        <option value="movingPass" data-text-ar="مصدر يمر بمستمع متحرك" data-text-en="Source passes moving observer">مصدر يمر بمستمع متحرك</option>
                        <option value="observerTangential" data-text-ar="حركة مماسية للمستمع" data-text-en="Purely tangential observer motion">حركة مماسية للمستمع</option>
                    </select>
                </label>
            </section>

            <section class="assumptions-panel">
                <h2 data-text-ar="افتراضات النموذج" data-text-en="Model assumptions">افتراضات النموذج</h2>
                <ul>
                    <li data-text-ar="الصوت كلاسيكي في هواء ساكن ومتجانس بلا رياح." data-text-en="Classical sound in a stationary, homogeneous air medium with no wind.">الصوت كلاسيكي في هواء ساكن ومتجانس بلا رياح.</li>
                    <li data-text-ar="المسافة تغير السعة والعلو؛ لا تغير التردد وحدها." data-text-en="Distance changes amplitude and loudness; it does not change frequency by itself.">المسافة تغير السعة والعلو؛ لا تغير التردد وحدها.</li>
                    <li data-text-ar="المركبة الشعاعية فقط تدخل في إزاحة دوبلر من الدرجة الأولى." data-text-en="Only the radial component contributes to the first-order Doppler shift.">المركبة الشعاعية فقط تدخل في إزاحة دوبلر من الدرجة الأولى.</li>
                    <li data-text-ar="لا يحاكي هذا الوضع موجات صدمة أو طفرات صوتية." data-text-en="This normal mode does not simulate shock waves or sonic booms.">لا يحاكي هذا الوضع موجات صدمة أو طفرات صوتية.</li>
                </ul>
            </section>
        </aside>
    </section>

    <dialog id="predictionDialog" class="lab-dialog">
        <form method="dialog">
            <h2 data-text-ar="توقع قبل التجربة" data-text-en="Predict before the experiment">توقع قبل التجربة</h2>
            <p id="predictionQuestion"></p>
            <div id="predictionChoices" class="choice-list"></div>
            <p id="predictionExplanation" class="explanation"></p>
            <div class="dialog-actions">
                <button type="button" id="revealPredictionBtn" class="primary-button" data-i18n="reveal">إظهار الإجابة</button>
                <button type="button" id="nextPredictionBtn" class="secondary-button" data-text-ar="سؤال آخر" data-text-en="Another question">سؤال آخر</button>
                <button type="submit" class="ghost-button" data-text-ar="إغلاق" data-text-en="Close">إغلاق</button>
            </div>
        </form>
    </dialog>

    <dialog id="freezeDialog" class="lab-dialog wide-dialog">
        <form method="dialog">
            <h2 data-i18n="freeze">تجميد وتحليل</h2>
            <div id="freezeEquation" class="freeze-equation physics-equation ltr-math" dir="ltr"></div>
            <ol id="freezeSteps" class="analysis-steps"></ol>
            <p id="freezeConcept" class="explanation"></p>
            <div class="dialog-actions">
                <button type="button" id="revealFreezeBtn" class="primary-button" data-i18n="reveal">إظهار الإجابة</button>
                <button type="button" id="continueBtn" class="secondary-button" data-i18n="continue">متابعة</button>
            </div>
        </form>
    </dialog>

    <dialog id="challengeDialog" class="lab-dialog wide-dialog">
        <form method="dialog">
            <h2 data-text-ar="تحديات تفاعلية" data-text-en="Interactive Challenges">تحديات تفاعلية</h2>
            <div class="challenge-tabs">
                <button type="button" data-challenge="target" class="active" data-text-ar="تردد هدف" data-text-en="Target frequency">تردد هدف</button>
                <button type="button" data-challenge="twoListeners" data-text-ar="مستمعان يختلفان" data-text-en="Two listeners disagree">مستمعان يختلفان</button>
                <button type="button" data-challenge="tangential" data-text-ar="حركة مماسية" data-text-en="Tangential motion">حركة مماسية</button>
                <button type="button" data-challenge="loudness" data-text-ar="علو مقابل نغمة" data-text-en="Loudness vs pitch">علو مقابل نغمة</button>
                <button type="button" data-challenge="graph" data-text-ar="توقع الرسم" data-text-en="Predict graph">توقع الرسم</button>
            </div>
            <div id="challengeBody" class="challenge-body"></div>
            <div id="challengeScore" class="score-line"></div>
            <div class="dialog-actions">
                <button type="submit" class="secondary-button" data-text-ar="إغلاق" data-text-en="Close">إغلاق</button>
            </div>
        </form>
    </dialog>
</asp:Content>
<asp:Content ID="LabScripts" ContentPlaceHolderID="ScriptContent" runat="server">
    <script>window.DopplerBoot = <%= BootJson %>;</script>
    <script src="Scripts/doppler-engine.js"></script>
    <script src="Scripts/doppler-audio.js"></script>
    <script src="Scripts/doppler-renderer.js"></script>
    <script src="Scripts/doppler-charts.js"></script>
    <script src="Scripts/lab-ui.js"></script>
</asp:Content>
