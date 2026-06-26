(function (global, document) {
    "use strict";

    var cLight = 299792458;

    function byId(id) {
        return document.getElementById(id);
    }

    function fmt(value, digits) {
        return (isFinite(value) ? value : 0).toFixed(digits);
    }

    function lang() {
        return global.DopplerLocale ? global.DopplerLocale.getLanguage() : "ar";
    }

    function tr(ar, en) {
        return lang() === "en" ? en : ar;
    }

    function setText(id, value) {
        var element = byId(id);
        if (element) {
            element.textContent = value;
        }
    }

    function resultGrid(id, rows) {
        var element = byId(id);
        if (!element) {
            return;
        }
        element.innerHTML = rows.map(function (row) {
            return "<span>" + row.label + "</span><strong class=\"metric-value\">" + row.value + "</strong>";
        }).join("");
    }

    function prepareCanvas(canvas) {
        if (!canvas) {
            return null;
        }
        var rect = canvas.getBoundingClientRect();
        var width = Math.max(320, rect.width || canvas.width);
        var height = Math.max(220, rect.height || canvas.height);
        var dpr = global.devicePixelRatio || 1;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        var ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#091727";
        ctx.fillRect(0, 0, width, height);
        return { ctx: ctx, width: width, height: height };
    }

    function wavelengthToColor(wavelength) {
        var w = Math.max(380, Math.min(750, wavelength));
        var r = 0, g = 0, b = 0;
        if (w < 440) {
            r = -(w - 440) / (440 - 380);
            b = 1;
        } else if (w < 490) {
            g = (w - 440) / (490 - 440);
            b = 1;
        } else if (w < 510) {
            g = 1;
            b = -(w - 510) / (510 - 490);
        } else if (w < 580) {
            r = (w - 510) / (580 - 510);
            g = 1;
        } else if (w < 645) {
            r = 1;
            g = -(w - 645) / (645 - 580);
        } else {
            r = 1;
        }
        var factor = w < 420 ? 0.35 + 0.65 * (w - 380) / 40 : w > 700 ? 0.35 + 0.65 * (750 - w) / 50 : 1;
        return "rgb(" + Math.round(255 * r * factor) + "," + Math.round(255 * g * factor) + "," + Math.round(255 * b * factor) + ")";
    }

    function bindInput(id, render) {
        var element = byId(id);
        if (element) {
            element.addEventListener("input", render);
        }
    }

    function renderRadar() {
        var canvas = byId("radarCanvas");
        if (!canvas) {
            return;
        }
        var speed = Number(byId("radarSpeed").value);
        var fGHz = Number(byId("radarFrequency").value);
        var limit = Number(byId("speedLimit").value);
        var fTransmit = fGHz * 1e9;
        var delta = 2 * fTransmit * speed / cLight;
        var returned = fTransmit + delta;
        var measuredKmh = Math.abs(delta) * cLight / (2 * fTransmit) * 3.6;
        setText("radarSpeedOut", fmt(speed, 1) + " m/s");
        setText("radarFrequencyOut", fmt(fGHz, 3) + " GHz");
        setText("speedLimitOut", fmt(limit, 0) + " km/h");
        resultGrid("radarResults", [
            { label: tr("التردد المرسل", "Transmitted"), value: fmt(fTransmit / 1e9, 3) + " GHz" },
            { label: tr("فرق التردد", "Frequency difference"), value: fmt(delta, 1) + " Hz" },
            { label: tr("التردد العائد", "Returned"), value: fmt(returned / 1e9, 6) + " GHz" },
            { label: tr("السرعة المقاسة", "Measured speed"), value: fmt(measuredKmh, 1) + " km/h" },
            { label: tr("الحكم", "Limit check"), value: measuredKmh > limit ? tr("فوق الحد", "Over limit") : tr("ضمن الحد", "Within limit") }
        ]);

        var surface = prepareCanvas(canvas);
        var ctx = surface.ctx;
        ctx.strokeStyle = "rgba(92,225,255,0.5)";
        ctx.lineWidth = 2;
        for (var i = 0; i < 5; i += 1) {
            ctx.beginPath();
            ctx.arc(90, surface.height / 2, 35 + i * 28, -0.45, 0.45);
            ctx.stroke();
        }
        ctx.fillStyle = "#d8f4ff";
        ctx.fillRect(40, surface.height / 2 - 18, 70, 36);
        ctx.fillStyle = speed >= 0 ? "#5ce1ff" : "#ff9b55";
        var carX = speed >= 0 ? surface.width - 150 : surface.width - 250;
        ctx.fillRect(carX, surface.height / 2 - 22, 100, 38);
        ctx.fillStyle = "#07111f";
        ctx.fillRect(carX + 18, surface.height / 2 + 12, 18, 18);
        ctx.fillRect(carX + 66, surface.height / 2 + 12, 18, 18);
        ctx.fillStyle = "#f8fbff";
        ctx.font = "700 15px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(speed >= 0 ? tr("يقترب", "Approaching") : tr("يبتعد", "Receding"), carX + 50, surface.height / 2 - 36);
    }

    function renderUltrasound() {
        var canvas = byId("ultrasoundCanvas");
        if (!canvas) {
            return;
        }
        var speed = Number(byId("bloodSpeed").value);
        var angle = Number(byId("probeAngle").value);
        var freqMHz = Number(byId("ultrasoundFrequency").value);
        var cTissue = 1540;
        var delta = 2 * freqMHz * 1e6 * speed * Math.cos(angle * Math.PI / 180) / cTissue;
        setText("bloodSpeedOut", fmt(speed, 2) + " m/s");
        setText("probeAngleOut", fmt(angle, 0) + "°");
        setText("ultrasoundFrequencyOut", fmt(freqMHz, 1) + " MHz");
        resultGrid("ultrasoundResults", [
            { label: tr("سرعة الصوت في الأنسجة", "Sound speed in tissue"), value: "1540 m/s" },
            { label: tr("إزاحة التردد", "Frequency shift"), value: fmt(delta, 1) + " Hz" },
            { label: tr("اتجاه الإزاحة", "Shift direction"), value: delta >= 0 ? tr("موجب", "Positive") : tr("سالب", "Negative") },
            { label: tr("تصحيح الزاوية", "Angle factor"), value: "cos(θ) = " + fmt(Math.cos(angle * Math.PI / 180), 3) }
        ]);

        var surface = prepareCanvas(canvas);
        var ctx = surface.ctx;
        var midY = surface.height * 0.55;
        ctx.strokeStyle = "#c94a6a";
        ctx.lineWidth = 28;
        ctx.beginPath();
        ctx.moveTo(70, midY + 30);
        ctx.bezierCurveTo(surface.width * 0.38, midY - 35, surface.width * 0.58, midY + 55, surface.width - 60, midY - 16);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 2;
        for (var x = 120; x < surface.width - 80; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, midY + 4);
            ctx.lineTo(x + (speed >= 0 ? 28 : -28), midY - 4);
            ctx.stroke();
        }
        var probeX = surface.width * 0.5;
        var probeY = 42;
        var beamLength = 190;
        var beamAngle = (90 - angle) * Math.PI / 180;
        ctx.save();
        ctx.translate(probeX, probeY);
        ctx.rotate(beamAngle);
        ctx.fillStyle = "#d8f4ff";
        ctx.fillRect(-24, -18, 48, 36);
        ctx.strokeStyle = "rgba(92,225,255,0.7)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 18);
        ctx.lineTo(-42, beamLength);
        ctx.moveTo(0, 18);
        ctx.lineTo(42, beamLength);
        ctx.stroke();
        ctx.restore();
    }

    function renderAstro() {
        var canvas = byId("astroCanvas");
        if (!canvas) {
            return;
        }
        var beta = Number(byId("astroBeta").value);
        var emit = Number(byId("emitWavelength").value);
        var freqRatio = Math.sqrt((1 - beta) / (1 + beta));
        var lambdaRatio = 1 / freqRatio;
        var observed = emit * lambdaRatio;
        var z = lambdaRatio - 1;
        setText("astroBetaOut", fmt(beta, 2) + " c");
        setText("emitWavelengthOut", fmt(emit, 0) + " nm");
        resultGrid("astroResults", [
            { label: tr("الطول الموجي المرصود", "Observed wavelength"), value: fmt(observed, 1) + " nm" },
            { label: "z", value: fmt(z, 4) },
            { label: tr("النوع", "Type"), value: beta >= 0 ? tr("انزياح أحمر", "Redshift") : tr("انزياح أزرق", "Blueshift") },
            { label: tr("ملاحظة اللون", "Color note"), value: observed < 380 || observed > 750 ? tr("تمثيل توضيحي", "Illustrative") : tr("ضمن المرئي", "Visible") }
        ]);

        var surface = prepareCanvas(canvas);
        var ctx = surface.ctx;
        var earthX = 80;
        var starX = beta >= 0 ? surface.width - 120 : surface.width - 240;
        ctx.fillStyle = "#4ab1ff";
        ctx.beginPath();
        ctx.arc(earthX, surface.height * 0.5, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = wavelengthToColor(observed);
        ctx.beginPath();
        ctx.arc(starX, surface.height * 0.48, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(earthX + 40, surface.height * 0.5);
        ctx.lineTo(starX - 42, surface.height * 0.48);
        ctx.stroke();
        var lineStart = 80;
        var lineEnd = surface.width - 80;
        var x = lineStart + (Math.max(380, Math.min(750, observed)) - 380) / (750 - 380) * (lineEnd - lineStart);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(lineStart, surface.height - 70, lineEnd - lineStart, 22);
        ctx.fillStyle = wavelengthToColor(observed);
        ctx.fillRect(x - 3, surface.height - 76, 6, 34);
        ctx.fillStyle = "#f8fbff";
        ctx.font = "700 14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(fmt(observed, 1) + " nm", x, surface.height - 84);
    }

    function renderWeather() {
        var canvas = byId("weatherCanvas");
        if (!canvas) {
            return;
        }
        var speed = Number(byId("weatherSpeed").value);
        var angle = Number(byId("weatherAngle").value);
        var radial = speed * Math.cos(angle * Math.PI / 180);
        setText("weatherSpeedOut", fmt(speed, 0) + " m/s");
        setText("weatherAngleOut", fmt(angle, 0) + "°");
        resultGrid("weatherResults", [
            { label: tr("المركبة الشعاعية", "Radial component"), value: fmt(radial, 1) + " m/s" },
            { label: tr("المركبة الجانبية", "Sideways component"), value: fmt(speed * Math.sin(angle * Math.PI / 180), 1) + " m/s" }
        ]);
        var surface = prepareCanvas(canvas);
        var ctx = surface.ctx;
        ctx.fillStyle = "#d8f4ff";
        ctx.fillRect(38, surface.height / 2 - 18, 70, 36);
        ctx.strokeStyle = "rgba(92,225,255,0.45)";
        ctx.lineWidth = 2;
        for (var r = 45; r < 260; r += 36) {
            ctx.beginPath();
            ctx.arc(76, surface.height / 2, r, -0.6, 0.6);
            ctx.stroke();
        }
        ctx.fillStyle = "#8fd6ff";
        for (var i = 0; i < 18; i += 1) {
            var x = 190 + (i % 6) * 58;
            var y = 70 + Math.floor(i / 6) * 52;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.strokeStyle = "#ffcf70";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(250, surface.height / 2);
        ctx.lineTo(250 + speed * Math.cos(angle * Math.PI / 180) * 3, surface.height / 2 - speed * Math.sin(angle * Math.PI / 180) * 3);
        ctx.stroke();
    }

    function renderCompare() {
        var input = byId("compareVelocity");
        if (!input) {
            return;
        }
        var v = Number(input.value);
        setText("compareVelocityOut", fmt(v, 1) + " m/s");
        var soundFactor = 343 / (343 - v);
        var beta = v / cLight;
        var lambdaRatio = Math.sqrt((1 + beta) / (1 - beta));
        resultGrid("compareSoundResults", [
            { label: tr("عامل الصوت", "Sound factor"), value: fmt(soundFactor, 5) },
            { label: tr("من 700 Hz إلى", "700 Hz becomes"), value: fmt(700 * soundFactor, 2) + " Hz" }
        ]);
        resultGrid("compareLightResults", [
            { label: tr("نسبة الطول الموجي", "Wavelength ratio"), value: fmt(lambdaRatio, 12) },
            { label: tr("زحزحة 520 nm", "520 nm shifts to"), value: fmt(520 * lambdaRatio, 9) + " nm" }
        ]);
        drawCompareSound(v);
        drawCompareLight(lambdaRatio);
    }

    function drawCompareSound(v) {
        var surface = prepareCanvas(byId("compareSoundCanvas"));
        if (!surface) {
            return;
        }
        var ctx = surface.ctx;
        ctx.fillStyle = "#5ce1ff";
        ctx.fillRect(surface.width * 0.22, surface.height * 0.5 - 18, 96, 36);
        ctx.fillStyle = "#f8fbff";
        ctx.beginPath();
        ctx.arc(surface.width * 0.72, surface.height * 0.5, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = v >= 0 ? "#5ce1ff" : "#ff9b55";
        ctx.lineWidth = 3;
        for (var r = 24; r < 190; r += v >= 0 ? 20 : 34) {
            ctx.beginPath();
            ctx.arc(surface.width * 0.22 + 96, surface.height * 0.5, r, -0.45, 0.45);
            ctx.stroke();
        }
    }

    function drawCompareLight(lambdaRatio) {
        var surface = prepareCanvas(byId("compareLightCanvas"));
        if (!surface) {
            return;
        }
        var ctx = surface.ctx;
        ctx.fillStyle = wavelengthToColor(520 * lambdaRatio);
        ctx.beginPath();
        ctx.arc(surface.width * 0.32, surface.height * 0.5, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4ab1ff";
        ctx.beginPath();
        ctx.arc(surface.width * 0.74, surface.height * 0.5, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.24)";
        ctx.beginPath();
        ctx.moveTo(surface.width * 0.38, surface.height * 0.5);
        ctx.lineTo(surface.width * 0.69, surface.height * 0.5);
        ctx.stroke();
    }

    document.addEventListener("DOMContentLoaded", function () {
        ["radarSpeed", "radarFrequency", "speedLimit"].forEach(function (id) { bindInput(id, renderRadar); });
        ["bloodSpeed", "probeAngle", "ultrasoundFrequency"].forEach(function (id) { bindInput(id, renderUltrasound); });
        ["astroBeta", "emitWavelength"].forEach(function (id) { bindInput(id, renderAstro); });
        ["weatherSpeed", "weatherAngle"].forEach(function (id) { bindInput(id, renderWeather); });
        bindInput("compareVelocity", renderCompare);
        global.addEventListener("resize", function () {
            renderRadar();
            renderUltrasound();
            renderAstro();
            renderWeather();
            renderCompare();
        });
        global.addEventListener("doppler:languagechange", function () {
            renderRadar();
            renderUltrasound();
            renderAstro();
            renderWeather();
            renderCompare();
        });
        renderRadar();
        renderUltrasound();
        renderAstro();
        renderWeather();
        renderCompare();
    });
}(window, document));
