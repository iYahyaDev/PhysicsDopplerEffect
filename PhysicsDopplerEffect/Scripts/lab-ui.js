(function (global, document) {
    "use strict";

    function byId(id) {
        return document.getElementById(id);
    }

    function number(value, fallback) {
        var parsed = Number(value);
        return isFinite(parsed) ? parsed : fallback;
    }

    function fmt(value, digits) {
        return (isFinite(value) ? value : 0).toFixed(digits);
    }

    function setText(id, value) {
        var element = byId(id);
        if (element) {
            element.textContent = value;
        }
    }

    function showDialog(dialog) {
        if (!dialog) {
            return;
        }
        if (dialog.showModal) {
            dialog.showModal();
        } else {
            dialog.setAttribute("open", "open");
        }
    }

    function closeDialog(dialog) {
        if (!dialog) {
            return;
        }
        if (dialog.close) {
            dialog.close();
        } else {
            dialog.removeAttribute("open");
        }
    }

    function isTypingTarget(target) {
        if (!target) {
            return false;
        }
        var tag = target.tagName;
        return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    }

    function saveSetting(key, value) {
        if (global.DopplerLocale) {
            global.DopplerLocale.storageSet("doppler." + key, JSON.stringify(value));
        }
    }

    function loadSetting(key, fallback) {
        try {
            var raw = global.DopplerLocale ? global.DopplerLocale.storageGet("doppler." + key, null) : null;
            return raw === null ? fallback : JSON.parse(raw);
        } catch (ex) {
            return fallback;
        }
    }

    var predictions = [
        {
            ar: "ماذا يحدث للنغمة عندما تقترب الدراجة النارية؟",
            en: "What happens to pitch as the motorcycle approaches?",
            choicesAr: ["ترتفع", "تنخفض", "لا تتغير بسبب الحركة", "تعتمد على لون الدراجة"],
            choicesEn: ["It rises", "It falls", "It never changes because of motion", "It depends on the motorcycle color"],
            correct: 0,
            explainAr: "المصدر يضغط الجبهات أمامه؛ يصل عدد أكبر من القمم كل ثانية.",
            explainEn: "The source compresses wavefronts in front of it, so more crests arrive each second."
        },
        {
            ar: "ماذا يحدث عند حركة مماسية حول المستمع؟",
            en: "What happens during tangential motion around a listener?",
            choicesAr: ["الإزاحة الشعاعية تقارب الصفر", "ترتفع النغمة دائما", "تنخفض النغمة دائما", "تتوقف الموجات"],
            choicesEn: ["Radial shift is nearly zero", "Pitch always rises", "Pitch always falls", "The waves stop"],
            correct: 0,
            explainAr: "السرعة الكلية قد تكون كبيرة، لكن المركبة على خط السمع هي التي تهم.",
            explainEn: "Total speed can be large, but the component along the listening line is what matters."
        },
        {
            ar: "هل مضاعفة العلو تضاعف التردد المسموع؟",
            en: "Does doubling loudness double the observed frequency?",
            choicesAr: ["لا", "نعم دائما", "فقط في الفلك", "فقط عند 20 درجة مئوية"],
            choicesEn: ["No", "Always yes", "Only in astronomy", "Only at 20 Celsius"],
            correct: 0,
            explainAr: "العلو مرتبط بالسعة والمسافة؛ التردد مرتبط بالحركة الشعاعية.",
            explainEn: "Loudness is tied to amplitude and distance; frequency is tied to radial motion."
        },
        {
            ar: "هل يمكن لمستمعين سماع ترددين مختلفين في اللحظة نفسها؟",
            en: "Can two listeners hear different frequencies at the same moment?",
            choicesAr: ["نعم", "لا", "فقط إذا تغير صوت المحرك", "فقط إذا أوقفنا الزمن"],
            choicesEn: ["Yes", "No", "Only if the engine sound changes", "Only if time is frozen"],
            correct: 0,
            explainAr: "كل مستمع له اتجاه مختلف من المصدر، فتختلف السرعة الشعاعية.",
            explainEn: "Each listener has a different direction from the source, so radial velocity differs."
        }
    ];

    document.addEventListener("DOMContentLoaded", function () {
        var canvas = byId("simCanvas");
        if (!canvas || !global.DopplerEngine) {
            return;
        }

        var boot = global.DopplerBoot || {};
        var sim = new global.DopplerEngine.Simulation(boot.settings || {});
        var renderer = new global.DopplerRenderer(canvas);
        var chart = new global.DopplerChartRenderer(byId("chartCanvas"));
        var audio = new global.DopplerAudio();
        var language = global.DopplerLocale ? global.DopplerLocale.getLanguage() : "ar";
        var lastFrame = performance.now();
        var lastDomUpdate = 0;
        var freezeWasRunning = false;
        var selectedPrediction = 0;
        var revealedPrediction = false;
        var overrideEnabled = false;
        var currentChallenge = "target";
        var challengeHold = 0;
        var challengeScore = loadSetting("challengeScore", 0);

        function tr(ar, en) {
            return language === "en" ? en : ar;
        }

        function applySavedSettings() {
            var saved = loadSetting("labSettings", null);
            if (!saved) {
                return;
            }
            [["sourceFrequency", sim.setBaseFrequency], ["sourceSpeed", sim.setSourceSpeedSetting], ["observerSpeed", sim.setObserverSpeedSetting], ["temperature", sim.setTemperature], ["animationSpeed", sim.setAnimationSpeed]].forEach(function (pair) {
                if (saved[pair[0]] !== undefined && byId(pair[0])) {
                    var savedValue = pair[0] === "sourceFrequency" && Number(saved[pair[0]]) > 260 ? 180 : saved[pair[0]];
                    byId(pair[0]).value = savedValue;
                    pair[1].call(sim, savedValue);
                }
            });
            ["circularRadius", "circularSpeed", "circularDirection", "circularCenterMode"].forEach(function (id) {
                if (saved[id] !== undefined && byId(id)) {
                    byId(id).value = saved[id];
                }
            });
            if (saved.options) {
                Object.keys(saved.options).forEach(function (key) {
                    sim.setOption(key, saved.options[key]);
                });
            }
            if (saved.soundMode && byId("soundMode")) {
                var soundMode = saved.soundMode === "tone" ? "tone" : "engine";
                byId("soundMode").value = soundMode;
                sim.options.soundMode = soundMode;
            }
        }

        function saveLabSettings() {
            saveSetting("labSettings", {
                sourceFrequency: byId("sourceFrequency").value,
                sourceSpeed: byId("sourceSpeed").value,
                observerSpeed: byId("observerSpeed").value,
                temperature: byId("temperature").value,
                animationSpeed: byId("animationSpeed").value,
                circularRadius: byId("circularRadius").value,
                circularSpeed: byId("circularSpeed").value,
                circularDirection: byId("circularDirection").value,
                circularCenterMode: byId("circularCenterMode").value,
                soundMode: byId("soundMode").value,
                options: {
                    dopplerPitch: byId("dopplerToggle").checked,
                    distanceLoudness: byId("loudnessToggle").checked,
                    stereo: byId("stereoToggle").checked,
                    inertia: byId("inertiaToggle").checked,
                    showWavefronts: byId("waveBtn").checked,
                    showVectors: byId("vectorsBtn").checked,
                    listenerB: sim.options.listenerB,
                    selectedListener: byId("listenSelect").value
                }
            });
        }

        function updateSliderOutputs() {
            setText("sourceFrequencyOut", fmt(number(byId("sourceFrequency").value, 180), 0) + " Hz");
            setText("sourceSpeedOut", fmt(number(byId("sourceSpeed").value, 25), 1) + " m/s");
            setText("observerSpeedOut", fmt(number(byId("observerSpeed").value, 0), 2) + " m/s");
            setText("temperatureOut", fmt(number(byId("temperature").value, 20), 1) + " °C");
            setText("animationSpeedOut", fmt(number(byId("animationSpeed").value, 1), 1) + "x");
            setText("circularRadiusOut", fmt(number(byId("circularRadius").value, 30), 1) + " m");
            setText("circularSpeedOut", fmt(number(byId("circularSpeed").value, 15), 1) + " m/s");
            setText("soundSpeedOverrideOut", overrideEnabled ? fmt(number(byId("soundSpeedOverride").value, sim.getSoundSpeed()), 1) + " m/s" : tr("تلقائي", "Auto"));
        }

        function bindSlider(id, callback) {
            var element = byId(id);
            element.addEventListener("input", function () {
                callback(element.value);
                updateSliderOutputs();
                saveLabSettings();
            });
        }

        applySavedSettings();
        updateSliderOutputs();

        bindSlider("sourceFrequency", function (value) { sim.setBaseFrequency(value); });
        bindSlider("sourceSpeed", function (value) { sim.setSourceSpeedSetting(value); });
        bindSlider("observerSpeed", function (value) { sim.setObserverSpeedSetting(value); });
        bindSlider("temperature", function (value) {
            sim.setTemperature(value);
            if (!overrideEnabled) {
                byId("soundSpeedOverride").value = sim.getSoundSpeed();
            }
        });
        bindSlider("animationSpeed", function (value) { sim.setAnimationSpeed(value); });
        bindSlider("circularRadius", function () { return true; });
        bindSlider("circularSpeed", function () { return true; });
        bindSlider("soundSpeedOverride", function (value) {
            overrideEnabled = true;
            sim.setSoundSpeedOverride(value, true);
        });

        ["dopplerToggle", "loudnessToggle", "stereoToggle", "inertiaToggle", "waveBtn", "vectorsBtn"].forEach(function (id) {
            byId(id).addEventListener("change", function () {
                var map = {
                    dopplerToggle: "dopplerPitch",
                    loudnessToggle: "distanceLoudness",
                    stereoToggle: "stereo",
                    inertiaToggle: "inertia",
                    waveBtn: "showWavefronts",
                    vectorsBtn: "showVectors"
                };
                sim.setOption(map[id], byId(id).checked);
                saveLabSettings();
            });
        });

        ["seriesFrequency", "seriesRadial", "seriesDistance"].forEach(function (id) {
            byId(id).addEventListener("change", function () {
                var map = { seriesFrequency: "frequency", seriesRadial: "radial", seriesDistance: "distance" };
                chart.setSeries(map[id], byId(id).checked);
            });
        });

        byId("soundMode").addEventListener("change", function () {
            sim.options.soundMode = byId("soundMode").value;
            saveLabSettings();
        });
        ["circularDirection", "circularCenterMode"].forEach(function (id) {
            byId(id).addEventListener("change", function () {
                saveLabSettings();
            });
        });
        byId("listenSelect").addEventListener("change", function () {
            sim.options.selectedListener = byId("listenSelect").value;
            saveLabSettings();
        });
        byId("presetSelect").addEventListener("change", function () {
            sim.applyPreset(byId("presetSelect").value);
        });

        byId("startPauseBtn").addEventListener("click", function () {
            sim.running = !sim.running;
            sim.frozen = false;
            if (sim.running) {
                audio.resume();
            }
        });

        byId("resetBtn").addEventListener("click", function () {
            if (!sim.resetAutomaticMotion()) {
                sim.reset();
            }
            overrideEnabled = false;
            byId("soundSpeedOverride").value = sim.getSoundSpeed();
            updateSliderOutputs();
        });

        byId("audioBtn").addEventListener("click", function () {
            if (audio.started) {
                audio.stop();
            } else if (!audio.start()) {
                var msg = tr("تعذر تشغيل Web Audio في هذا المتصفح.", "Web Audio could not start in this browser.");
                if (global.DopplerLocale) {
                    global.DopplerLocale.toast(msg);
                }
            }
        });

        byId("autoPassBtn").addEventListener("click", function () {
            byId("presetSelect").value = "free";
            sim.startAutoPass();
        });

        byId("circularMotionBtn").addEventListener("click", function () {
            byId("presetSelect").value = "free";
            sim.startCircularMotion({
                radius: number(byId("circularRadius").value, 30),
                speed: number(byId("circularSpeed").value, 15),
                direction: number(byId("circularDirection").value, 1),
                centerMode: byId("circularCenterMode").value
            });
        });

        byId("manualBtn").addEventListener("click", function () {
            byId("presetSelect").value = "free";
            sim.applyPreset("free");
        });

        byId("listenerBBtn").addEventListener("click", function () {
            sim.setOption("listenerB", !sim.options.listenerB);
            byId("listenerBBtn").classList.toggle("active", sim.options.listenerB);
            saveLabSettings();
        });

        byId("fullscreenBtn").addEventListener("click", function () {
            var target = document.querySelector(".lab-shell");
            var request = target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen;
            if (request) {
                request.call(target).catch(function () {
                    if (global.DopplerLocale) {
                        global.DopplerLocale.toast(tr("تعذر فتح ملء الشاشة.", "Fullscreen could not be opened."));
                    }
                });
            }
        });

        byId("freezeBtn").addEventListener("click", freezeAndAnalyze);
        byId("predictionBtn").addEventListener("click", function () {
            selectedPrediction = (selectedPrediction + 1) % predictions.length;
            renderPrediction();
            showDialog(byId("predictionDialog"));
        });
        byId("revealPredictionBtn").addEventListener("click", function () {
            revealedPrediction = true;
            renderPrediction();
        });
        byId("nextPredictionBtn").addEventListener("click", function () {
            selectedPrediction = (selectedPrediction + 1) % predictions.length;
            revealedPrediction = false;
            renderPrediction();
        });
        byId("revealFreezeBtn").addEventListener("click", function () {
            byId("freezeSteps").classList.add("revealed");
            byId("freezeConcept").classList.add("revealed");
        });
        byId("continueBtn").addEventListener("click", function () {
            sim.frozen = false;
            sim.running = freezeWasRunning;
            closeDialog(byId("freezeDialog"));
            audio.resume();
        });

        byId("challengeBtn").addEventListener("click", function () {
            renderChallenge(sim.getMetrics(), 0);
            showDialog(byId("challengeDialog"));
        });
        document.querySelectorAll("[data-challenge]").forEach(function (button) {
            button.addEventListener("click", function () {
                document.querySelectorAll("[data-challenge]").forEach(function (b) { b.classList.remove("active"); });
                button.classList.add("active");
                currentChallenge = button.getAttribute("data-challenge");
                challengeHold = 0;
                renderChallenge(sim.getMetrics(), 0);
            });
        });

        canvas.addEventListener("pointerdown", function (event) {
            var world = renderer.canvasToWorld(event.clientX, event.clientY);
            var picked = sim.pickObject(world);
            if (picked) {
                canvas.setPointerCapture(event.pointerId);
                sim.beginDrag(picked, world, performance.now() / 1000);
                sim.running = true;
            }
        });
        canvas.addEventListener("pointermove", function (event) {
            if (sim.dragging) {
                sim.dragTo(renderer.canvasToWorld(event.clientX, event.clientY), performance.now() / 1000);
            }
        });
        ["pointerup", "pointercancel", "pointerleave"].forEach(function (type) {
            canvas.addEventListener(type, function () {
                if (sim.dragging) {
                    sim.endDrag();
                }
            });
        });

        global.addEventListener("resize", function () {
            renderer.resize();
            chart.resize();
        });
        global.addEventListener("doppler:languagechange", function (event) {
            language = event.detail.language;
            updateSliderOutputs();
            renderPrediction();
            renderChallenge(sim.getMetrics(), 0);
        });
        global.addEventListener("beforeunload", function () {
            audio.stop();
        });
        global.addEventListener("error", function () {
            if (global.DopplerLocale) {
                global.DopplerLocale.toast(tr("حدث خطأ في المتصفح، أعد ضبط المحاكاة إذا توقفت.", "A browser error occurred; reset the simulation if it stopped."));
            }
        });

        document.addEventListener("keydown", function (event) {
            if (isTypingTarget(event.target)) {
                return;
            }
            if (event.code === "Space") {
                event.preventDefault();
                byId("startPauseBtn").click();
            } else if (event.key.toLowerCase() === "r") {
                byId("resetBtn").click();
            } else if (event.key.toLowerCase() === "f") {
                freezeAndAnalyze();
            } else if (event.key.toLowerCase() === "a") {
                byId("autoPassBtn").click();
            } else if (event.key.toLowerCase() === "c") {
                byId("circularMotionBtn").click();
            } else if (event.key.toLowerCase() === "w") {
                byId("waveBtn").checked = !byId("waveBtn").checked;
                byId("waveBtn").dispatchEvent(new Event("change"));
            } else if (event.key.toLowerCase() === "m") {
                byId("audioBtn").click();
            } else if (event.key === "1") {
                byId("listenSelect").value = "A";
                byId("listenSelect").dispatchEvent(new Event("change"));
            } else if (event.key === "2") {
                sim.setOption("listenerB", true);
                byId("listenerBBtn").classList.add("active");
                byId("listenSelect").value = "B";
                byId("listenSelect").dispatchEvent(new Event("change"));
            }
        });

        function freezeAndAnalyze() {
            var metrics = sim.getMetrics();
            var active = getSelectedMetric(metrics);
            freezeWasRunning = sim.running;
            sim.frozen = true;
            sim.running = false;
            audio.suspend();
            byId("freezeEquation").innerHTML =
                "f′ = " + fmt(active.emittedFrequency, 1) + " × (" +
                fmt(active.soundSpeed, 1) + " − " + fmt(-active.observerClosingTowardSource, 2) + ") / (" +
                fmt(active.soundSpeed, 1) + " − " + fmt(active.sourceRadialTowardObserver, 2) + ") = " +
                fmt(active.observedFrequency, 2) + " Hz";
            byId("freezeSteps").classList.remove("revealed");
            byId("freezeConcept").classList.remove("revealed");
            var steps = [
                tr("المسافة الحالية: ", "Current distance: ") + fmt(active.distance, 2) + " m",
                tr("سرعة المصدر الشعاعية نحو المستمع: ", "Source radial speed toward listener: ") + fmt(active.sourceRadialTowardObserver, 3) + " m/s",
                tr("مركبة السرعة المماسية: ", "Tangential speed component: ") + fmt(active.sourceTangentialSpeed || 0, 2) + " m/s",
                tr("سرعة إغلاق المستمع نحو المصدر: ", "Observer closing speed toward source: ") + fmt(active.observerClosingTowardSource, 2) + " m/s",
                tr("عامل دوبلر: ", "Doppler factor: ") + fmt(active.dopplerFactor, 4),
                tr("كسب المسافة: ", "Distance gain: ") + fmt(active.distanceGain || 0, 3),
                tr("التردد المسموع: ", "Observed frequency: ") + fmt(active.observedFrequency, 2) + " Hz"
            ];
            if (metrics.autoMotion && metrics.autoMotion.type === "circular" && metrics.autoMotion.config) {
                var config = metrics.autoMotion.config;
                steps.splice(1, 0,
                    tr("مركز الدائرة: ", "Circle center: ") + "(" + fmt(config.center.x, 2) + ", " + fmt(config.center.y, 2) + ") m",
                    tr("نصف قطر المسار: ", "Path radius: ") + fmt(config.radius, 2) + " m",
                    tr("السرعة المماسية الكلية: ", "Total tangential speed: ") + fmt(config.tangentialSpeed, 2) + " m/s",
                    "v<sub>s</sub> · n̂ ≈ " + fmt(Math.abs(active.sourceRadialTowardObserver) < 0.001 ? 0 : active.sourceRadialTowardObserver, 4) + " m/s"
                );
            }
            byId("freezeSteps").innerHTML = steps.map(function (line) { return "<li>" + line + "</li>"; }).join("");
            byId("freezeConcept").textContent = tr(
                "إذا كانت السرعة مماسية، تبقى المركبة الشعاعية صغيرة حتى لو كانت السرعة الكلية كبيرة. في الدائرة المتمركزة حول المستمع نحصل على vs · n̂ ≈ 0، لذلك fObserved ≈ fEmit. المسافة لا تغير النغمة مباشرة، لكنها تغير العلو.",
                "If motion is tangential, radial velocity stays small even when total speed is large. In the centered circle, vs dot n is approximately zero, so observed frequency is approximately emitted frequency. Distance changes loudness, not pitch."
            );
            showDialog(byId("freezeDialog"));
        }

        function renderPrediction() {
            var item = predictions[selectedPrediction];
            if (!item || !byId("predictionQuestion")) {
                return;
            }
            byId("predictionQuestion").textContent = language === "en" ? item.en : item.ar;
            var choices = language === "en" ? item.choicesEn : item.choicesAr;
            var html = choices.map(function (choice, index) {
                var cls = revealedPrediction && index === item.correct ? "correct" : "";
                return "<button type=\"button\" class=\"" + cls + "\" data-choice=\"" + index + "\">" + choice + "</button>";
            }).join("");
            byId("predictionChoices").innerHTML = html;
            byId("predictionExplanation").textContent = revealedPrediction ? (language === "en" ? item.explainEn : item.explainAr) : "";
        }

        function getSelectedMetric(metrics) {
            if (metrics.options.selectedListener === "B") {
                return metrics.listeners.find(function (m) { return m.id === "B"; }) || metrics.listeners[0];
            }
            return metrics.listeners[0];
        }

        function updateDom(metrics) {
            var active = getSelectedMetric(metrics);
            var listenerB = metrics.listeners.find(function (m) { return m.id === "B"; });
            setText("emitValue", fmt(metrics.emittedNow, 1) + " Hz");
            setText("observedAValue", fmt(metrics.listeners[0].observedFrequency, 1) + " Hz");
            setText("observedBValue", listenerB && !listenerB.inactive ? fmt(listenerB.observedFrequency, 1) + " Hz" : "—");
            setText("factorValue", fmt(active.dopplerFactor, 4));
            setText("distanceValue", fmt(active.distance, 1) + " m");
            setText("speedValue", fmt(active.sourceSpeed, 1) + " m/s · " + fmt(active.sourceSpeed * 3.6, 0) + " km/h");
            setText("sourceRadialValue", fmt(Math.abs(active.sourceRadialTowardObserver) < 0.001 ? 0 : active.sourceRadialTowardObserver, 2) + " m/s");
            setText("observerSpeedValue", fmt(active.observerSpeed, 1) + " m/s");
            setText("observerRadialValue", fmt(active.observerClosingTowardSource, 2) + " m/s");
            setText("soundSpeedValue", fmt(metrics.soundSpeed, 1) + " m/s");
            setText("tempValue", fmt(metrics.temperature, 1) + " °C");
            setText("wavelengthValue", fmt(active.wavelength, 3) + " m");
            setText("distanceGainValue", fmt(active.distanceGain || 0, 3));
            setText("visualStrideValue", tr("كل ", "Every ") + metrics.visualStride + tr(" قمة", "th crest"));
            setText("stateValue", global.DopplerLocale ? global.DopplerLocale.stateLabel(active.state) : active.state);
            byId("stateValue").className = "state-pill " + active.state;
            byId("startPauseBtn").textContent = sim.running ? (global.DopplerLocale ? global.DopplerLocale.t("pause") : "Pause") : (global.DopplerLocale ? global.DopplerLocale.t("start") : "Start");
            byId("audioBtn").textContent = audio.started ? (global.DopplerLocale ? global.DopplerLocale.t("stopAudio") : "Stop Audio") : (global.DopplerLocale ? global.DopplerLocale.t("startAudio") : "Start Audio");
            byId("listenerBMetric").classList.toggle("muted", !(listenerB && !listenerB.inactive));
            if (active.warning) {
                byId("simulationWarning").textContent = tr("تحذير: السرعة الشعاعية قريبة من سرعة الصوت؛ تم تثبيت الحساب.", "Warning: radial speed is near sound speed; calculation was clamped.");
            } else {
                byId("simulationWarning").textContent = "";
            }
        }

        function renderChallenge(metrics, dt) {
            var body = byId("challengeBody");
            if (!body) {
                return;
            }
            var a = metrics.listeners[0];
            var b = metrics.listeners.find(function (m) { return m.id === "B" && !m.inactive; });
            var success = false;
            var html = "";
            if (currentChallenge === "target") {
                var diff = Math.abs(a.observedFrequency - 760);
                success = diff <= 4;
                html = "<p>" + tr("حرك الدراجة النارية حتى يسمع المستمع أ التردد الهدف.", "Move the motorcycle so Listener A hears the target frequency.") + "</p>" +
                    "<div class=\"result-grid\"><span>" + tr("الهدف", "Target") + ": 760 Hz</span><span>" + tr("الحالي", "Current") + ": " + fmt(a.observedFrequency, 1) + " Hz</span><span>" + tr("الفرق", "Difference") + ": " + fmt(diff, 1) + " Hz</span></div>";
            } else if (currentChallenge === "twoListeners") {
                success = !!b && a.observedFrequency > metrics.emittedNow && b.observedFrequency < metrics.emittedNow;
                html = "<p>" + tr("ضع المستمعين بحيث يسمع أ أعلى من المنبعث ويسمع ب أقل منه.", "Place listeners so A hears above emitted and B hears below emitted.") + "</p>" +
                    "<div class=\"result-grid\"><span>A: " + fmt(a.observedFrequency, 1) + " Hz</span><span>B: " + (b ? fmt(b.observedFrequency, 1) : "—") + " Hz</span></div>";
            } else if (currentChallenge === "tangential") {
                success = a.sourceSpeed > 10 && Math.abs(a.sourceRadialTowardObserver) < 1.5;
                html = "<p>" + tr("حرك المصدر بسرعة مع إبقاء المركبة الشعاعية قريبة من الصفر.", "Move the source quickly while keeping radial velocity near zero.") + "</p>" +
                    "<div class=\"result-grid\"><span>" + tr("السرعة الكلية", "Total speed") + ": " + fmt(a.sourceSpeed, 1) + " m/s</span><span>" + tr("الشعاعية", "Radial") + ": " + fmt(a.sourceRadialTowardObserver, 2) + " m/s</span></div>";
            } else if (currentChallenge === "loudness") {
                success = Math.abs(a.dopplerFactor - 1) < 0.02 && a.distance > 45;
                html = "<p>" + tr("غير المسافة من دون صنع سرعة شعاعية كبيرة: العلو يتغير أكثر من النغمة.", "Change distance without large radial velocity: loudness changes more than pitch.") + "</p>" +
                    "<div class=\"result-grid\"><span>" + tr("المسافة", "Distance") + ": " + fmt(a.distance, 1) + " m</span><span>" + tr("عامل دوبلر", "Doppler factor") + ": " + fmt(a.dopplerFactor, 3) + "</span></div>";
            } else {
                success = metrics.mode === "linear" && metrics.chartHistory.length > 20;
                html = "<p>" + tr("الرسم الصحيح للمرور الجانبي منحنى سلس: عال عند الاقتراب، يقترب من الأصل عند أقرب نقطة، ثم ينخفض.", "The correct off-axis pass graph is smooth: high while approaching, near emitted at closest approach, then lower.") + "</p>" +
                    "<div class=\"mini-graphs\"><button type=\"button\">A: " + tr("قفزة حادة", "sharp jump") + "</button><button type=\"button\" class=\"correct\">B: " + tr("منحنى سلس", "smooth curve") + "</button><button type=\"button\">C: " + tr("ثابت دائما", "always flat") + "</button></div>";
            }
            if (success) {
                challengeHold += dt;
                if (challengeHold >= 1) {
                    challengeScore += 1;
                    saveSetting("challengeScore", challengeScore);
                    challengeHold = 0;
                    if (global.DopplerLocale) {
                        global.DopplerLocale.toast(tr("نجاح! أضيفت نقطة.", "Success! One point added."));
                    }
                }
            } else {
                challengeHold = 0;
            }
            body.innerHTML = html + "<div class=\"progress-bar\"><span style=\"width:" + Math.min(100, challengeHold * 100).toFixed(0) + "%\"></span></div>";
            setText("challengeScore", tr("النقاط المحلية: ", "Local score: ") + challengeScore);
        }

        function frame(now) {
            var dt = (now - lastFrame) / 1000;
            lastFrame = now;
            sim.update(dt);
            var metrics = sim.getMetrics();
            renderer.render(metrics);
            chart.render(metrics, language);
            audio.update(metrics);
            if (now - lastDomUpdate > 90) {
                updateDom(metrics);
                renderChallenge(metrics, dt);
                lastDomUpdate = now;
            }
            global.requestAnimationFrame(frame);
        }

        renderPrediction();
        updateDom(sim.getMetrics());
        global.requestAnimationFrame(frame);
    });
}(window, document));
