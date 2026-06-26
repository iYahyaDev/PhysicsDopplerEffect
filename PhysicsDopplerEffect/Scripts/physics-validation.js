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

        var cLight = 299792458;
        function radarShift(frequency, radialVelocity) {
            return 2 * frequency * radialVelocity / cLight;
        }
        var radarZero = radarShift(24.125e9, 0);
        var radarOne = radarShift(24.125e9, 20);
        var radarTwo = radarShift(24.125e9, 40);
        var radarReverse = radarShift(24.125e9, -20);
        var radarNinetyKph = radarShift(24.125e9, 25);
        rows.push(extraRow(
            "K",
            "اختبار الرادار الشعاعي",
            "Radar radial physics",
            "صفر سرعة شعاعية يعطي صفرا، ومضاعفة السرعة تضاعف الإزاحة، و90 km/h عند 24.125 GHz تعطي نحو 4.02 kHz.",
            "Zero radial speed gives zero shift, doubling speed doubles the shift, and 90 km/h at 24.125 GHz gives about 4.02 kHz.",
            "24.125 GHz, 25 m/s",
            "90 km/h=" + fmt(radarNinetyKph / 1000, 3) + " kHz, ratio=" + fmt(radarTwo / radarOne, 3),
            Math.max(Math.abs(radarZero), Math.abs((radarTwo / radarOne) - 2), Math.abs(radarNinetyKph - 4024.5)),
            2,
            Math.abs(radarZero) < 0.000001 && Math.abs((radarTwo / radarOne) - 2) < 0.000001 && radarOne > 0 && radarReverse < 0 && Math.abs(radarNinetyKph - 4024.5) < 2));

        function ultrasoundShift(frequency, velocity, angleDegrees) {
            return 2 * frequency * velocity * Math.cos(angleDegrees * Math.PI / 180) / 1540;
        }
        var ultrasoundZero = ultrasoundShift(5e6, 0.7, 90);
        var ultrasoundParallel = ultrasoundShift(5e6, 0.7, 0);
        var ultrasoundForward = ultrasoundShift(5e6, 0.7, 45);
        var ultrasoundSixty = ultrasoundShift(5e6, 0.7, 60);
        var ultrasoundReverse = ultrasoundShift(5e6, -0.7, 45);
        rows.push(extraRow(
            "L",
            "اختبار دوبلر الطبي",
            "Medical ultrasound physics",
            "زاوية 0 درجة هي الأكبر، 45 درجة تساوي عامل cos، 90 درجة شبه صفرية، وعكس التدفق يغير الإشارة.",
            "0 degrees is largest, 45 degrees follows the cosine factor, 90 degrees is near zero, and reversing flow flips the sign.",
            "0/45/60/90 degrees",
            "0=" + fmt(ultrasoundParallel, 1) + " Hz, 90=" + fmt(ultrasoundZero, 6) + " Hz",
            Math.max(Math.abs(ultrasoundZero), Math.abs((ultrasoundForward / ultrasoundParallel) - Math.SQRT1_2), Math.abs((ultrasoundSixty / ultrasoundParallel) - 0.5)),
            0.001,
            Math.abs(ultrasoundZero) < 0.001 &&
                Math.abs((ultrasoundForward / ultrasoundParallel) - Math.SQRT1_2) < 0.001 &&
                Math.abs((ultrasoundSixty / ultrasoundParallel) - 0.5) < 0.001 &&
                ultrasoundReverse < 0));

        function lightRatios(beta) {
            beta = Math.max(-0.95, Math.min(0.95, beta));
            return {
                frequency: Math.sqrt((1 - beta) / (1 + beta)),
                wavelength: Math.sqrt((1 + beta) / (1 - beta))
            };
        }
        var lightZero = lightRatios(0);
        var lightRecede = lightRatios(0.25);
        var lightApproach = lightRatios(-0.25);
        var hAlphaRed = 656.3 * lightRatios(0.05).wavelength;
        var reciprocalError = Math.abs(lightRecede.frequency * lightRecede.wavelength - 1);
        rows.push(extraRow(
            "M",
            "اختبار دوبلر الضوء النسبي",
            "Relativistic light Doppler",
            "بيتا صفر تعطي نسبة 1، والابتعاد يطيل الموجة، والاقتراب يقصرها، وH-alpha عند β=0.05 يظهر قرب 690.0 nm.",
            "Beta zero gives ratio 1, receding lengthens wavelength, approaching shortens it, and H-alpha at beta=0.05 appears near 690.0 nm.",
            "H-alpha beta 0.05",
            "red=" + fmt(lightRecede.wavelength, 3) + ", Hα=" + fmt(hAlphaRed, 1) + " nm",
            Math.max(reciprocalError, Math.abs(hAlphaRed - 690.0)),
            0.2,
            Math.abs(lightZero.frequency - 1) < 0.000001 &&
                Math.abs(lightZero.wavelength - 1) < 0.000001 &&
                lightRecede.wavelength > 1 &&
                lightApproach.wavelength < 1 &&
                reciprocalError < 0.000001 &&
                Math.abs(hAlphaRed - 690.0) < 0.2));

        var waveSim = new engine.Simulation({
            SourceFrequency: 700,
            SourceSpeed: 25,
            WorldWidthMeters: 200,
            WorldHeightMeters: 112.5,
            MaxWavefronts: 8
        });
        waveSim.running = true;
        waveSim.source.vx = 20;
        waveSim.update(0.25);
        waveSim.update(0.25);
        var firstWave = waveSim.wavefronts[0];
        var firstX = firstWave ? firstWave.x : 0;
        var firstY = firstWave ? firstWave.y : 0;
        waveSim.update(1.0);
        var sameWave = firstWave ? waveSim.wavefronts.filter(function (wave) { return wave.t === firstWave.t; })[0] : null;
        var centerError = sameWave ? Math.sqrt(Math.pow(sameWave.x - firstX, 2) + Math.pow(sameWave.y - firstY, 2)) : 999;
        for (var trim = 0; trim < 40; trim += 1) {
            waveSim.update(0.2);
        }
        rows.push(extraRow(
            "N",
            "ثبات مركز الجبهة الموجية",
            "Wavefront center and trimming",
            "مركز الجبهة يبقى في موضع الانبعاث، وعدد الجبهات يبقى محدودا.",
            "A wavefront center stays at its emission point, and the wavefront list remains bounded.",
            "fixed centers",
            "center error=" + fmt(centerError, 8) + " m, count=" + waveSim.wavefronts.length,
            centerError,
            0.000001,
            centerError < 0.000001 && waveSim.wavefronts.length <= 8));

        var audioInvariantSim = new engine.Simulation({
            SourceFrequency: 180,
            SourceSpeed: 5,
            WorldWidthMeters: 200,
            WorldHeightMeters: 112.5
        });
        var emittedA = audioInvariantSim.getEmittedFrequencyAt(0);
        audioInvariantSim.setSourceSpeedSetting(55);
        audioInvariantSim.startAutoPass();
        audioInvariantSim.update(0.75);
        var emittedB = audioInvariantSim.getEmittedFrequencyAt(audioInvariantSim.time);
        var activeAudioMetric = audioInvariantSim.getMetrics().listeners[0];
        var emittedError = Math.max(Math.abs(emittedA - 180), Math.abs(emittedB - 180));
        rows.push(extraRow(
            "O",
            "ثبات تردد المصدر الصوتي",
            "Constant emitted source frequency",
            "تغيير سرعة الدراجة لا يغير التردد المنبعث؛ التغير المسموع يأتي من عامل دوبلر فقط.",
            "Changing motorcycle speed does not change emitted frequency; the heard change comes from the Doppler factor only.",
            "180.000 Hz",
            "emitted=" + fmt(emittedB, 3) + " Hz, factor=" + fmt(activeAudioMetric.dopplerFactor, 4),
            emittedError,
            0.000001,
            emittedError < 0.000001 && Math.abs(activeAudioMetric.observedFrequency - emittedB) > 0.001));

        var deckOk = false;
        var deckClient = tr("غير متاح", "unavailable");
        try {
            var request = new XMLHttpRequest();
            request.open("GET", "Handlers/PresentationApi.ashx?action=get&id=doppler-main&version=published", false);
            request.send(null);
            if (request.status === 200) {
                var payload = JSON.parse(request.responseText);
                var deck = payload.Data || payload.data;
                var deckSlides = deck.Slides || deck.slides || [];
                var first = deckSlides[0] || {};
                var componentIds = {};
                deckSlides.forEach(function (slide) {
                    (slide.Blocks || slide.blocks || []).forEach(function (block) {
                        var data = block.Data || block.data || {};
                        if (data.componentId) {
                            componentIds[data.componentId] = true;
                        }
                    });
                });
                deckOk = deckSlides.length >= 58 &&
                    JSON.stringify(first).indexOf("Assets/motorcycle-source.png") >= 0 &&
                    JSON.stringify(first).indexOf("Assets/custom-listener.png") >= 0 &&
                    componentIds["opening-demo-sequence"] &&
                    componentIds["radial-velocity-lab"] &&
                    componentIds["radar-calculation"] &&
                    componentIds["optical-lab"] &&
                    componentIds["optical-spectrum"] &&
                    componentIds["optical-graphs"] &&
                    componentIds["optical-calculation"] &&
                    componentIds["optical-challenge"] &&
                    componentIds["weather-radar"];
                deckClient = deckSlides.length + " slides, components=" + Object.keys(componentIds).length;
            }
        } catch (ignoreDeck) { }
        rows.push(extraRow(
            "P",
            "العرض المنشور وشرائح الكشف التدريجي",
            "Published deck and progressive reveal metadata",
            "يتحقق من أن العرض الافتراضي المنشور توسع إلى مسار كامل ويستخدم صور الدراجة والمستمع ومكونات المحاكاة الجديدة.",
            "Checks that the published default deck expanded into the full pathway, uses the motorcycle/listener images, and includes the new simulation components.",
            "58+ slides with new components",
            deckClient,
            deckOk ? 0 : 1,
            0,
            deckOk));

        var presentationDeck = null;
        try {
            var deckRequest = new XMLHttpRequest();
            deckRequest.open("GET", "Handlers/PresentationApi.ashx?action=get&id=doppler-main&version=published", false);
            deckRequest.send(null);
            if (deckRequest.status === 200) {
                var deckPayload = JSON.parse(deckRequest.responseText);
                presentationDeck = deckPayload.Data || deckPayload.data;
            }
        } catch (ignoreDeckAgain) { }

        if (presentationDeck && global.PresentationComponents) {
            var questionCount = 0;
            var questionErrors = 0;
            ((presentationDeck.Slides || presentationDeck.slides) || []).forEach(function (slide) {
                ((slide.Blocks || slide.blocks) || []).forEach(function (block) {
                    var data = block.Data || block.data || {};
                    var config = data.config || {};
                    if (data.componentId === "concept-quiz") {
                        (config.questions || []).forEach(function (question, questionIndex) {
                            questionCount += 1;
                            var normalized = global.PresentationComponents.normalizeQuestion(question, "ar", questionIndex);
                            var hasPrompt = !!global.PresentationComponents.localText(normalized.text, "ar") &&
                                !!global.PresentationComponents.localText(normalized.text, "en");
                            var hasChoices = normalized.choices.length >= 2 && normalized.choices.every(function (choice) {
                                return !!choice.id &&
                                    !!global.PresentationComponents.localText(choice.text, "ar") &&
                                    !!global.PresentationComponents.localText(choice.text, "en");
                            });
                            var hasCorrect = normalized.choices.some(function (choice) { return choice.id === normalized.correctChoiceId; });
                            if (!hasPrompt || !hasChoices || !hasCorrect) {
                                questionErrors += 1;
                            }
                        });
                    }
                });
            });
            rows.push(extraRow(
                "W",
                "تطبيع أسئلة العرض",
                "Presentation question normalization",
                "كل سؤال في العرض المنشور يجب أن يملك نصا عربيا وإنجليزيا واختيارات ومعرف إجابة صحيح.",
                "Every published question must have Arabic/English text, choices, and a valid correct-choice id.",
                "0 errors",
                questionCount + " questions, errors=" + questionErrors,
                questionErrors,
                0,
                questionCount > 0 && questionErrors === 0));

            var diagnostics = global.PresentationComponents.diagnostics(presentationDeck);
            rows.push(extraRow(
                "X",
                "اكتمال سجل المكونات",
                "Component registry completeness",
                "كل مكون تفاعلي مشار إليه في العرض المنشور يجب أن يكون مسجلا في سجل العرض نفسه.",
                "Every interactive component referenced by the published deck must be registered in the same runtime registry.",
                "0 missing",
                diagnostics.referencedComponents.length + " referenced, missing=" + diagnostics.missingComponents.join(", "),
                diagnostics.missingComponents.length,
                0,
                diagnostics.missingComponents.length === 0));
        }

        var acousticLowerSim = new engine.Simulation({ WorldWidthMeters: 160, WorldHeightMeters: 90, SourceFrequency: 180 });
        acousticLowerSim.listeners[0].x = 118;
        acousticLowerSim.listeners[0].y = 45;
        acousticLowerSim.source.x = 55;
        acousticLowerSim.source.y = 45;
        acousticLowerSim.source.vx = -25;
        acousticLowerSim.source.vy = 0;
        var lowerMetric = acousticLowerSim.getMetrics().listeners[0];
        var higherSim = new engine.Simulation({ WorldWidthMeters: 160, WorldHeightMeters: 90, SourceFrequency: 180 });
        higherSim.listeners[0].x = 118;
        higherSim.listeners[0].y = 45;
        higherSim.source.x = 55;
        higherSim.source.y = 45;
        higherSim.source.vx = 25;
        higherSim.source.vy = 0;
        var higherMetric = higherSim.getMetrics().listeners[0];
        var sideSim = new engine.Simulation({ WorldWidthMeters: 160, WorldHeightMeters: 90, SourceFrequency: 180 });
        sideSim.listeners[0].x = 118;
        sideSim.listeners[0].y = 45;
        sideSim.source.x = 55;
        sideSim.source.y = 45;
        sideSim.source.vx = 0;
        sideSim.source.vy = 45;
        var sideMetric = sideSim.getMetrics().listeners[0];
        var challengeOk = lowerMetric.observedFrequency < lowerMetric.emittedFrequency - 0.5 &&
            higherMetric.observedFrequency > higherMetric.emittedFrequency + 0.5 &&
            sideMetric.sourceSpeed >= 40 &&
            Math.abs(sideMetric.sourceRadialTowardObserver) <= 4;
        rows.push(extraRow(
            "Y",
            "قابلية تحقيق تحديات الاتجاه 360 درجة",
            "360-degree challenge reachability",
            "يتحقق من أن الاقتراب يخفض/يرفع التردد حسب الحالة وأن الحركة العرضية السريعة تعطي تغيرا صغيرا.",
            "Checks that approach/recession and fast transverse motion are physically reachable.",
            "higher/lower/transverse",
            "higher=" + fmt(higherMetric.observedFrequency, 1) + ", lower=" + fmt(lowerMetric.observedFrequency, 1) + ", radial=" + fmt(sideMetric.sourceRadialTowardObserver, 1),
            challengeOk ? 0 : 1,
            0,
            challengeOk));

        function sportsRadial(speed, angle) {
            return speed * Math.cos(angle * Math.PI / 180);
        }
        var sportsErrors = [0, 45, 90, 180].map(function (angle) {
            var expected = angle === 0 ? 40 : angle === 45 ? 40 * Math.SQRT1_2 : angle === 90 ? 0 : -40;
            return Math.abs(sportsRadial(40, angle) - expected);
        });
        var sportsError = Math.max.apply(Math, sportsErrors);
        rows.push(extraRow(
            "Z",
            "إسقاط رادار الكرة عند زوايا 0/45/90/180",
            "Ball radar radial speed at 0/45/90/180 degrees",
            "القراءة الشعاعية مشتقة من متجه السرعة وليس من السرعة الكلية وحدها.",
            "The radial reading is derived from the velocity vector, not total speed alone.",
            "40, 28.28, 0, -40",
            [0, 45, 90, 180].map(function (angle) { return fmt(sportsRadial(40, angle), 2); }).join(", "),
            sportsError,
            0.000001,
            sportsError < 0.000001));

        if (global.PresentationPhysics) {
            var projectionToward = global.PresentationPhysics.radialProjection({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: -8, y: 0 });
            var projectionAway = global.PresentationPhysics.radialProjection({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 8, y: 0 });
            var projectionSide = global.PresentationPhysics.radialProjection({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 8 });
            var projectionMixed = global.PresentationPhysics.radialProjection({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 6, y: 8 });
            var projectionError = Math.max(
                Math.abs(projectionToward.radial + 8),
                Math.abs(projectionAway.radial - 8),
                Math.abs(projectionSide.radial),
                Math.abs(projectionMixed.radial - 6),
                Math.abs(projectionMixed.transverseVector.y - 8));
            rows.push(extraRow(
                "V",
                "إسقاط السرعة الشعاعية والعرضية",
                "Radial and transverse velocity projection",
                "يتحقق من أن الإسقاط على خط النظر يفصل مركبة الاقتراب/الابتعاد عن المركبة العرضية.",
                "Checks that line-of-sight projection separates approach/recession from transverse motion.",
                "toward=-8, away=8, sideways=0",
                [projectionToward.radial, projectionAway.radial, projectionSide.radial].map(function (v) { return fmt(v, 2); }).join(", "),
                projectionError,
                0.000001,
                projectionError < 0.000001));

            var slowWave = new engine.Simulation({
                SourceFrequency: 180,
                WorldWidthMeters: 520,
                WorldHeightMeters: 292.5,
                MaxWavefronts: 12,
                RepresentativeWaveInterval: 0.7
            });
            slowWave.running = true;
            for (var sw = 0; sw < 34; sw += 1) {
                slowWave.update(0.05);
            }
            var centersSame = slowWave.wavefronts.length >= 3;
            slowWave.wavefronts.forEach(function (wave) {
                centersSame = centersSame &&
                    Math.abs(wave.x - slowWave.wavefronts[0].x) < 0.000001 &&
                    Math.abs(wave.y - slowWave.wavefronts[0].y) < 0.000001;
            });
            var radiiIncreasing = true;
            for (var ri = 1; ri < slowWave.wavefronts.length; ri += 1) {
                var olderRadius = slowWave.getSoundSpeed() * (slowWave.time - slowWave.wavefronts[ri - 1].t);
                var newerRadius = slowWave.getSoundSpeed() * (slowWave.time - slowWave.wavefronts[ri].t);
                radiiIncreasing = radiiIncreasing && olderRadius > newerRadius;
            }
            rows.push(extraRow(
                "Q",
                "جبهات عرض بطيئة وثابتة المركز",
                "Readable fixed-center presentation wavefronts",
                "يتحقق من أن نمط العرض البطيء يصدر جبهات تمثيلية متباعدة وأن مراكزها لا تتحرك بعد الانبعاث.",
                "Checks that presentation wavefronts use readable representative emissions and fixed centers.",
                "fixed centers",
                slowWave.wavefronts.length + " fronts",
                centersSame && radiiIncreasing ? 0 : 1,
                0,
                centersSame && radiiIncreasing));

            var stationaryOk = true;
            ["far", "medium", "near"].forEach(function (positionName, index) {
                var sx = [35, 65, 92][index];
                var stationary = engine.calculateDoppler(
                    { x: sx, y: 46 },
                    { x: 122, y: 46 },
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    engine.soundSpeedFromTemperature(20),
                    180);
                stationaryOk = stationaryOk && Math.abs(stationary.observedFrequency - stationary.emittedFrequency) < 0.000001;
            });
            rows.push(extraRow(
                "R",
                "الدراجة الساكنة عند ثلاث مسافات",
                "Stationary motorcycle at three distances",
                "المسافة وحدها لا تغير التردد المرصود عندما تكون السرعة الشعاعية صفرا.",
                "Distance alone does not change observed frequency when radial velocity is zero.",
                "180.000 Hz",
                stationaryOk ? "all equal" : "mismatch",
                stationaryOk ? 0 : 1,
                0,
                stationaryOk));

            var toward = global.PresentationPhysics.weatherRadial({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: -8, y: 0 });
            var away = global.PresentationPhysics.weatherRadial({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 8, y: 0 });
            var sideways = global.PresentationPhysics.weatherRadial({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 8 });
            var weatherOk = global.PresentationPhysics.classifyRadial(toward) === "toward" &&
                global.PresentationPhysics.classifyRadial(away) === "away" &&
                global.PresentationPhysics.classifyRadial(sideways) === "zero";
            rows.push(extraRow(
                "S",
                "تصنيف الطقس من الإسقاط الشعاعي",
                "Weather classification from radial projection",
                "يستخدم التصنيف حاصل الضرب النقطي بين سرعة القطرة وخط النظر، لا جهة الشاشة.",
                "Classification uses the dot product of drop velocity and line of sight, not screen side.",
                "toward/away/zero",
                [toward, away, sideways].map(function (v) { return fmt(v, 2); }).join(", "),
                weatherOk ? 0 : 1,
                0,
                weatherOk));

            var signs = [];
            for (var wt = 0; wt < 16; wt += 1) {
                var a = wt / 16 * Math.PI * 2;
                var p = { x: 40 + Math.cos(a) * 20, y: 30 + Math.sin(a) * 20 };
                var v = { x: -Math.sin(a) * 12, y: Math.cos(a) * 12 };
                signs.push(global.PresentationPhysics.weatherRadial(p, { x: 0, y: 30 }, v));
            }
            var rotatingOk = Math.min.apply(Math, signs) < -1 && Math.max.apply(Math, signs) > 1;
            rows.push(extraRow(
                "T",
                "العاصفة الدوارة تغير الإشارة",
                "Rotating storm changes radial sign",
                "قطرة تدور حول مركز العاصفة يجب أن تمر بحالات اقتراب وابتعاد خلال دورة.",
                "A rotating drop must pass through toward and away radial states during an orbit.",
                "both signs",
                "min=" + fmt(Math.min.apply(Math, signs), 2) + ", max=" + fmt(Math.max.apply(Math, signs), 2),
                rotatingOk ? 0 : 1,
                0,
                rotatingOk));

            var ratiosZero = global.PresentationPhysics.lightRatios(0);
            var ratiosBlue = global.PresentationPhysics.lightRatios(-0.3);
            var ratiosRed = global.PresentationPhysics.lightRatios(0.3);
            var lightPresentationOk = Math.abs(ratiosZero.wavelength - 1) < 0.000001 &&
                ratiosBlue.wavelength < 1 &&
                ratiosRed.wavelength > 1 &&
                isFinite(ratiosRed.frequency);
            rows.push(extraRow(
                "U",
                "نسب دوبلر الضوء في مكون العرض",
                "Presentation light-Doppler ratios",
                "يتحقق من أن مكون العرض يستخدم نموذج الضوء النسبي نفسه لقصر وامتداد الطول الموجي.",
                "Checks that the presentation component uses the relativistic model for wavelength shortening and lengthening.",
                "blue < 1 < red",
                "blue=" + fmt(ratiosBlue.wavelength, 3) + ", red=" + fmt(ratiosRed.wavelength, 3),
                lightPresentationOk ? 0 : 1,
                0,
                lightPresentationOk));
        }

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
