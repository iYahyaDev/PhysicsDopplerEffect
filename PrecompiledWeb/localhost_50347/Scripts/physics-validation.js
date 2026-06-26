(function (global, document) {
    "use strict";

    function byId(id) {
        return document.getElementById(id);
    }

    function lang() {
        return global.DopplerLocale ? global.DopplerLocale.getLanguage() : "ar";
    }

    function tr(ar, en) {
        return lang() === "en" ? en : ar;
    }

    function prop(object, key) {
        return object[key] !== undefined ? object[key] : object[key.charAt(0).toLowerCase() + key.slice(1)];
    }

    function fmt(value, digits) {
        return (isFinite(value) ? value : 0).toFixed(digits);
    }

    function distance(a, b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function finitePoint(p) {
        return p && isFinite(p.x) && isFinite(p.y);
    }

    function passText(passed) {
        return passed ? tr("نجح", "Pass") : tr("فشل", "Fail");
    }

    function extraRow(id, nameAr, nameEn, notesAr, notesEn, expected, client, error, tolerance, passed) {
        return {
            id: id,
            name: tr(nameAr, nameEn),
            notes: tr(notesAr, notesEn),
            expected: expected,
            server: "—",
            client: client,
            error: error,
            tolerance: tolerance,
            passed: passed
        };
    }

    function runExtraTests() {
        var engine = global.DopplerEngine;
        var rows = [];
        var c = 343;
        var f = 700;
        var center = { x: 100, y: 56.25 };
        var circle = {
            center: center,
            radius: 30,
            tangentialSpeed: 15,
            angularVelocity: 15 / 30,
            direction: 1,
            initialAngle: 0
        };
        var period = Math.PI * 2 / circle.angularVelocity;
        var maxRadial = 0;
        var maxDistanceError = 0;
        var maxSpeedError = 0;
        var maxFrequencyError = 0;
        var centeredOk = true;
        var samples = 48;

        for (var i = 0; i < samples; i += 1) {
            var state = engine.circularKinematics(circle, period * i / samples);
            var result = engine.calculateDoppler(
                { x: state.x, y: state.y },
                center,
                { x: state.vx, y: state.vy },
                { x: 0, y: 0 },
                c,
                f);
            maxRadial = Math.max(maxRadial, Math.abs(result.sourceRadialTowardObserver));
            maxDistanceError = Math.max(maxDistanceError, Math.abs(result.distance - circle.radius));
            maxSpeedError = Math.max(maxSpeedError, Math.abs(result.sourceSpeed - circle.tangentialSpeed));
            maxFrequencyError = Math.max(maxFrequencyError, Math.abs(result.observedFrequency - f));
            centeredOk = centeredOk &&
                finitePoint(state) &&
                Math.abs(result.sourceRadialTowardObserver) < 0.001 &&
                Math.abs(result.distance - circle.radius) < 0.001 &&
                Math.abs(result.sourceSpeed - circle.tangentialSpeed) < 0.001 &&
                Math.abs(result.observedFrequency - f) < 0.02;
        }
        rows.push(extraRow(
            "E",
            "دائرة متمركزة عبر دورة كاملة",
            "Centered circular motion over a full revolution",
            "يجب أن تبقى المسافة ثابتة وأن تبقى v_s·n̂ قريبة من الصفر في زوايا كثيرة.",
            "Distance must remain constant and v_s dot n must stay near zero at many angles.",
            "700.000 Hz",
            "max |v_s·n̂| = " + fmt(maxRadial, 6) + " m/s",
            maxFrequencyError,
            0.02,
            centeredOk));

        var start = engine.circularKinematics(circle, 0);
        var closed = engine.circularKinematics(circle, period);
        var closureError = distance(start, closed);
        rows.push(extraRow(
            "F",
            "إغلاق المسار الدائري بعد دورة",
            "Circular path closure after one period",
            "بعد T = 2π/ω يجب أن تعود الدراجة إلى موضع البداية.",
            "After T = 2π/ω the motorcycle should return to the starting position.",
            "0.000000 m",
            fmt(closureError, 8) + " m",
            closureError,
            0.000001,
            closureError < 0.000001));

        var targetElapsed = 2.4;
        var reference = engine.circularKinematics(circle, targetElapsed);
        var maxFrameError = 0;
        [30, 60, 120].forEach(function (fps) {
            var elapsed = 0;
            var step = 1 / fps;
            var frames = Math.round(targetElapsed * fps);
            for (var frame = 0; frame < frames; frame += 1) {
                elapsed += step;
            }
            var stepped = engine.circularKinematics(circle, elapsed);
            maxFrameError = Math.max(maxFrameError, distance(reference, stepped));
        });
        rows.push(extraRow(
            "G",
            "استقلالية معدل الإطارات",
            "Frame-rate independence",
            "الحساب التحليلي يعطي الموضع نفسه عند الزمن نفسه لـ 30 و60 و120 FPS.",
            "The analytical calculation gives the same position at the same elapsed time for 30, 60, and 120 FPS.",
            "0.000000 m",
            fmt(maxFrameError, 8) + " m",
            maxFrameError,
            0.000001,
            maxFrameError < 0.000001));

        var near = engine.calculateDoppler({ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 15 }, { x: 0, y: 0 }, c, f);
        var far = engine.calculateDoppler({ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 0, y: 15 }, { x: 0, y: 0 }, c, f);
        var loudnessChanged = Math.abs(near.distanceGain - far.distanceGain) > 0.05;
        var distanceFrequencyError = Math.max(Math.abs(near.observedFrequency - f), Math.abs(far.observedFrequency - f));
        rows.push(extraRow(
            "H",
            "تغيير المسافة فقط",
            "Distance-only change",
            "عندما تكون السرعة الشعاعية صفرا، يتغير الكسب مع المسافة ويبقى التردد ثابتا.",
            "With zero radial velocity, gain changes with distance while frequency stays fixed.",
            "700.000 Hz",
            "gain " + fmt(near.distanceGain, 3) + " → " + fmt(far.distanceGain, 3),
            distanceFrequencyError,
            0.02,
            loudnessChanged && distanceFrequencyError < 0.02));

        var sim = new engine.Simulation({
            SourceFrequency: 700,
            SourceSpeed: 25,
            WorldWidthMeters: 200,
            WorldHeightMeters: 112.5
        });
        sim.startAutoPass();
        var startX = sim.autoMotion.config.startX;
        var stateStart = sim.autoState === "running-linear" && sim.mode === "linear" && sim.running && Math.abs(sim.source.x - startX) < 0.000001;
        sim.update(0.5);
        var elapsedAfterRun = sim.autoMotion.elapsed;
        var movingOk = sim.source.vx === 25 && finitePoint(sim.source);
        sim.running = false;
        sim.update(0.5);
        var pausedOk = sim.autoState === "paused" && Math.abs(sim.autoMotion.elapsed - elapsedAfterRun) < 0.000001;
        sim.running = true;
        sim.update(0.5);
        var resumedOk = sim.autoState === "running-linear" && sim.autoMotion.elapsed > elapsedAfterRun;
        for (var j = 0; j < 500 && sim.autoState !== "completed"; j += 1) {
            sim.update(0.05);
        }
        var completeOk = sim.autoState === "completed" && !sim.running && Math.abs(sim.source.x - sim.autoMotion.config.endX) < 0.000001;
        var resetOk = sim.resetAutomaticMotion() && sim.autoState === "paused" && Math.abs(sim.source.x - startX) < 0.000001;
        sim.startAutoPass();
        sim.update(0.2);
        var metrics = sim.getMetrics();
        var numbersOk = finitePoint(sim.source) &&
            isFinite(sim.source.vx) &&
            isFinite(sim.source.vy) &&
            isFinite(metrics.listeners[0].observedFrequency) &&
            isFinite(metrics.listeners[0].sourceRadialTowardObserver);
        var noTimerFields = sim.requestAnimationFrameId === undefined &&
            sim.animationFrameId === undefined &&
            sim.timerId === undefined &&
            sim.intervalId === undefined;
        var linearOk = stateStart && movingOk && pausedOk && resumedOk && completeOk && resetOk && numbersOk && noTimerFields;
        rows.push(extraRow(
            "I",
            "آلة حالات المرور الخطي",
            "Automatic linear pass state machine",
            "يتحقق من البدء والإيقاف المؤقت والاستئناف والإكمال وإعادة الضبط والتشغيل النظيف بلا قيم غير رقمية أو مؤقتات داخلية.",
            "Checks start, pause, resume, completion, reset, clean replay, finite values, and no internal timers.",
            tr("كل الحالات سليمة", "All states valid"),
            linearOk ? tr("سليم", "valid") : tr("خلل", "invalid"),
            linearOk ? 0 : 1,
            0,
            linearOk));

        var offCenterListener = { x: center.x + 18, y: center.y - 8 };
        var minObserved = Infinity;
        var maxObserved = -Infinity;
        var minDistance = Infinity;
        var maxDistance = -Infinity;
        var offCenterOk = true;
        for (var k = 0; k < samples; k += 1) {
            var offState = engine.circularKinematics(circle, period * k / samples);
            var offResult = engine.calculateDoppler(
                { x: offState.x, y: offState.y },
                offCenterListener,
                { x: offState.vx, y: offState.vy },
                { x: 0, y: 0 },
                c,
                f);
            minObserved = Math.min(minObserved, offResult.observedFrequency);
            maxObserved = Math.max(maxObserved, offResult.observedFrequency);
            minDistance = Math.min(minDistance, offResult.distance);
            maxDistance = Math.max(maxDistance, offResult.distance);
            offCenterOk = offCenterOk && isFinite(offResult.observedFrequency) && isFinite(offResult.distance);
        }
        var periodicSpread = maxObserved - minObserved;
        var distanceSpread = maxDistance - minDistance;
        rows.push(extraRow(
            "J",
            "دائرة غير متمركزة",
            "Off-center circular motion",
            "عندما لا يكون المستمع في المركز، يجب أن تتغير المسافة والتردد دوريا وبسلاسة.",
            "When the listener is off center, distance and observed frequency should vary periodically and smoothly.",
            tr("تغير دوري", "periodic variation"),
            "Δf = " + fmt(periodicSpread, 3) + " Hz, Δr = " + fmt(distanceSpread, 3) + " m",
            0,
            0,
            offCenterOk && periodicSpread > 1 && distanceSpread > 1));

        return rows;
    }

    function render() {
        if (!byId("validationRows") || !global.DopplerEngine) {
            return;
        }
        var rows = [];
        var cases = (global.DopplerBoot && global.DopplerBoot.validationCases) || [];
        var serverPass = 0;
        var clientPass = 0;
        var maxError = 0;
        cases.forEach(function (item) {
            var tc = prop(item, "testCase");
            var expected = prop(tc, "ExpectedFrequency");
            var tolerance = prop(tc, "Tolerance");
            var client = global.DopplerEngine.calculateDoppler(
                prop(tc, "SourcePosition"),
                prop(tc, "ObserverPosition"),
                prop(tc, "SourceVelocity"),
                prop(tc, "ObserverVelocity"),
                prop(tc, "SoundSpeed"),
                prop(tc, "EmittedFrequency")
            );
            var clientError = Math.abs(client.observedFrequency - expected);
            var browserPassed = clientError <= tolerance;
            if (prop(tc, "ExpectWarning")) {
                browserPassed = browserPassed && !!client.warning && isFinite(client.observedFrequency) && client.observedFrequency > 0;
            }
            if (prop(tc, "Id") === 8) {
                var opposite = global.DopplerEngine.calculateDoppler(
                    prop(tc, "SourcePosition"),
                    { x: -20, y: 0 },
                    prop(tc, "SourceVelocity"),
                    { x: 0, y: 0 },
                    prop(tc, "SoundSpeed"),
                    prop(tc, "EmittedFrequency")
                );
                browserPassed = browserPassed && client.observedFrequency > prop(tc, "EmittedFrequency") && opposite.observedFrequency < prop(tc, "EmittedFrequency");
            }
            if (prop(item, "passed")) {
                serverPass += 1;
            }
            if (browserPassed) {
                clientPass += 1;
            }
            maxError = Math.max(maxError, clientError);
            var serverResult = prop(item, "serverResult");
            var serverObserved = serverResult ? prop(serverResult, "ObservedFrequency") : 0;
            var name = lang() === "en" ? prop(tc, "NameEn") : prop(tc, "NameAr");
            rows.push("<tr class=\"" + (browserPassed && prop(item, "passed") ? "passed" : "failed") + "\">" +
                "<td>" + prop(tc, "Id") + "</td>" +
                "<td>" + name + "<small>" + (lang() === "en" ? prop(tc, "NotesEn") : prop(tc, "NotesAr")) + "</small></td>" +
                "<td class=\"metric-value\">" + fmt(expected, 3) + " Hz</td>" +
                "<td class=\"metric-value\">" + fmt(serverObserved, 3) + " Hz</td>" +
                "<td class=\"metric-value\">" + fmt(client.observedFrequency, 3) + " Hz</td>" +
                "<td class=\"metric-value\">" + fmt(clientError, 5) + "</td>" +
                "<td>" + passText(browserPassed && prop(item, "passed")) + "</td>" +
                "</tr>");
        });

        var extras = runExtraTests();
        var extraPass = 0;
        extras.forEach(function (extra) {
            if (extra.passed) {
                extraPass += 1;
            }
            maxError = Math.max(maxError, extra.error);
            rows.push("<tr class=\"" + (extra.passed ? "passed" : "failed") + "\">" +
                "<td>" + extra.id + "</td>" +
                "<td>" + extra.name + "<small>" + extra.notes + "</small></td>" +
                "<td class=\"metric-value\">" + extra.expected + "</td>" +
                "<td class=\"metric-value\">" + extra.server + "</td>" +
                "<td class=\"metric-value\">" + extra.client + "</td>" +
                "<td class=\"metric-value\">" + fmt(extra.error, 5) + "</td>" +
                "<td>" + passText(extra.passed) + "</td>" +
                "</tr>");
        });

        byId("validationRows").innerHTML = rows.join("");
        byId("serverPassCount").textContent = serverPass + " / " + cases.length;
        byId("clientPassCount").textContent = (clientPass + extraPass) + " / " + (cases.length + extras.length);
        byId("maxError").textContent = fmt(maxError, 5);
    }

    document.addEventListener("DOMContentLoaded", render);
    global.addEventListener("doppler:languagechange", render);
}(window, document));
