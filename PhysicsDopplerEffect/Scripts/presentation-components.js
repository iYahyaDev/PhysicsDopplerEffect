(function () {
    "use strict";

    var cLight = 299792458;
    var acousticSprites = {
        motorcycle: loadSprite("Assets/motorcycle-source.png"),
        listener: loadSprite("Assets/custom-listener.png")
    };
    var spriteCache = {};

    function loadSprite(src) {
        var image = new Image();
        image.src = src;
        return image;
    }

    function spriteFromConfig(src, fallbackName) {
        if (!src) {
            return acousticSprites[fallbackName];
        }
        if (!spriteCache[src]) {
            spriteCache[src] = loadSprite(src);
        }
        return spriteCache[src];
    }

    function currentLanguage(options) {
        if (options && options.language) {
            return options.language;
        }
        try {
            return localStorage.getItem("doppler.language") || "ar";
        } catch (ignore) {
            return "ar";
        }
    }

    function localText(value, language) {
        if (value === null || value === undefined) {
            return "";
        }
        if (typeof value === "string") {
            return value;
        }
        return value[language] || value[language === "ar" ? "en" : "ar"] || value.Ar || value.En || "";
    }

    function normalizeChoice(choice, index, language) {
        if (choice && choice.text) {
            return {
                id: choice.id || String.fromCharCode(97 + index),
                text: choice.text
            };
        }
        return {
            id: choice && choice.id ? choice.id : String.fromCharCode(97 + index),
            text: choice
        };
    }

    function normalizeQuestion(question, language, index) {
        question = question || {};
        var text = question.text || question.prompt || question.q || question.question || question.title ||
            (question.content && (question.content.text || question.content));
        var choices = (question.choices || []).map(function (choice, choiceIndex) {
            return normalizeChoice(choice, choiceIndex, language);
        });
        var correctChoiceId = question.correctChoiceId;
        if (!correctChoiceId && question.correct !== undefined && choices[Number(question.correct)]) {
            correctChoiceId = choices[Number(question.correct)].id;
        }
        if (!correctChoiceId && question.correctIndex !== undefined && choices[Number(question.correctIndex)]) {
            correctChoiceId = choices[Number(question.correctIndex)].id;
        }
        if (!correctChoiceId && question.answer !== undefined && choices[Number(question.answer)]) {
            correctChoiceId = choices[Number(question.answer)].id;
        }
        return {
            id: question.id || ("q" + (index + 1)),
            text: text,
            choices: choices,
            correctChoiceId: correctChoiceId || (choices[0] && choices[0].id) || "a",
            explanation: question.explanation || question.reason || question.feedback || {}
        };
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) {
            node.className = className;
        }
        if (text !== undefined && text !== null) {
            node.textContent = text;
        }
        return node;
    }

    function button(label, className) {
        var btn = el("button", className || "component-button", label);
        btn.type = "button";
        return btn;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function fmt(value, digits) {
        return Number(value).toFixed(digits === undefined ? 1 : digits);
    }

    function resizeCanvas(canvas) {
        var rect = canvas.getBoundingClientRect();
        var ratio = Math.min(window.devicePixelRatio || 1, 2);
        var width = Math.max(320, Math.floor(rect.width * ratio));
        var height = Math.max(180, Math.floor(rect.height * ratio));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        return { width: width, height: height, ratio: ratio };
    }

    function makeMotorcycleSound() {
        var context;
        var components = [];
        var noise;
        var noiseFilter;
        var noiseGain;
        var gain;
        var running = false;
        var baseFrequency = 180;
        var harmonics = [
            { ratio: 1, gain: 0.38, type: "sawtooth" },
            { ratio: 2, gain: 0.2, type: "triangle" },
            { ratio: 3, gain: 0.1, type: "sine" },
            { ratio: 4, gain: 0.05, type: "sine" }
        ];

        function ensure() {
            if (!context) {
                var AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) {
                    return false;
                }
                context = new AudioContext();
            }
            return true;
        }

        return {
            start: function () {
                if (running || !ensure()) {
                    return;
                }
                if (context.state === "suspended") {
                    context.resume();
                }
                gain = context.createGain();
                gain.gain.value = 0.0001;
                components = [];
                harmonics.forEach(function (harmonic) {
                    var oscillator = context.createOscillator();
                    var harmonicGain = context.createGain();
                    oscillator.type = harmonic.type;
                    oscillator.frequency.value = baseFrequency * harmonic.ratio;
                    harmonicGain.gain.value = harmonic.gain;
                    oscillator.connect(harmonicGain);
                    harmonicGain.connect(gain);
                    oscillator.start();
                    components.push({ oscillator: oscillator, gain: harmonicGain, harmonic: harmonic });
                });

                noise = context.createBufferSource();
                noise.buffer = createNoiseBuffer(context);
                noise.loop = true;
                noiseFilter = context.createBiquadFilter();
                noiseFilter.type = "bandpass";
                noiseFilter.frequency.value = 720;
                noiseFilter.Q.value = 0.8;
                noiseGain = context.createGain();
                noiseGain.gain.value = 0.025;
                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(gain);
                noise.start();

                gain.connect(context.destination);
                gain.gain.setTargetAtTime(0.12, context.currentTime, 0.03);
                running = true;
            },
            update: function (dopplerFactor, loudness) {
                if (!running || !context) {
                    return;
                }
                var now = context.currentTime;
                var observed = clamp(baseFrequency * (isFinite(dopplerFactor) ? dopplerFactor : 1), 60, 900);
                components.forEach(function (component) {
                    component.oscillator.frequency.setTargetAtTime(observed * component.harmonic.ratio, now, 0.035);
                });
                if (noiseFilter) {
                    noiseFilter.frequency.setTargetAtTime(clamp(observed * 4, 160, 1800), now, 0.08);
                }
                gain.gain.setTargetAtTime(clamp(loudness === undefined ? 0.12 : loudness, 0.0001, 0.25), now, 0.05);
            },
            stop: function () {
                if (!running || !gain) {
                    return;
                }
                var now = context.currentTime;
                gain.gain.setTargetAtTime(0.0001, now, 0.025);
                setTimeout(function () {
                    components.forEach(function (component) {
                        try { component.oscillator.stop(); } catch (ignore) { }
                    });
                    try { if (noise) noise.stop(); } catch (ignore2) { }
                    components = [];
                    noise = null;
                    gain = null;
                    running = false;
                }, 120);
            },
            isRunning: function () {
                return running;
            }
        };
    }

    function createNoiseBuffer(context) {
        var length = Math.max(1, Math.floor(context.sampleRate * 1.5));
        var buffer = context.createBuffer(1, length, context.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < length; i += 1) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    function renderSlide(container, presentation, slide, options) {
        options = options || {};
        var language = currentLanguage(options);
        var controllers = [];
        container.innerHTML = "";
        container.setAttribute("dir", language === "ar" ? "rtl" : "ltr");
        container.setAttribute("lang", language);
        container.style.setProperty("--presentation-bg", (presentation.theme && (presentation.theme.background || presentation.theme.Background)) || "#071521");
        container.style.setProperty("--presentation-surface", (presentation.theme && (presentation.theme.surface || presentation.theme.Surface)) || "#102535");
        container.style.setProperty("--presentation-accent", sectionAccent(presentation, slide));
        container.style.setProperty("--presentation-text", (presentation.theme && (presentation.theme.text || presentation.theme.Text)) || "#f5fbff");

        var scene = el("article", "presentation-scene template-" + (slide.template || "title-with-text"));
        scene.dataset.slideId = slide.id;
        scene.dataset.sectionId = slide.sectionId || "";
        applySlideBackground(scene, slide.background || {});

        var section = findSection(presentation, slide.sectionId);
        if (section) {
            var sectionLabel = el("p", "scene-section", localText(section.title, language));
            scene.appendChild(sectionLabel);
        }

        (slide.blocks || []).forEach(function (block) {
            var rendered = renderBlock(block, language, options);
            if (rendered && rendered.node) {
                scene.appendChild(rendered.node);
            }
            if (rendered && rendered.controller) {
                controllers.push(rendered.controller);
            }
        });

        container.appendChild(scene);

        return {
            pause: function () {
                controllers.forEach(function (controller) {
                    if (controller && typeof controller.pause === "function") {
                        controller.pause();
                    }
                });
            },
            resume: function () {
                controllers.forEach(function (controller) {
                    if (controller && typeof controller.resume === "function") {
                        controller.resume();
                    }
                });
            },
            resize: function () {
                controllers.forEach(function (controller) {
                    if (controller && typeof controller.resize === "function") {
                        controller.resize();
                    }
                });
            },
            dispose: function () {
                controllers.forEach(function (controller) {
                    if (controller && typeof controller.dispose === "function") {
                        controller.dispose();
                    }
                });
            }
        };
    }

    function renderBlock(block, language, options) {
        var type = block.type || "text";
        var node = el("div", "slide-block block-" + type + " width-" + (block.width || "full") + " align-" + (block.align || "start") + " emphasis-" + (block.emphasis || ""));
        var data = block.data || {};
        var revealStep = Number(data.revealStep || data.RevealStep || 0);
        if (revealStep > 0) {
            node.classList.add("reveal-step");
            node.dataset.revealStep = String(revealStep);
            if (!options.editorMode && revealStep > Number(options.revealStep || 1)) {
                node.classList.add("is-hidden-step");
            }
            if (!options.editorMode && revealStep === Number(options.revealStep || 1)) {
                node.classList.add("is-current-step");
            }
        }

        if (type === "heading") {
            node.appendChild(el(block.emphasis === "hero" ? "h1" : "h2", "", localText(data.text, language)));
        } else if (type === "text") {
            var text = localText(data.text, language);
            if (!text && !options.editorMode) {
                return null;
            }
            node.appendChild(el("p", "", text || (language === "ar" ? "انقر لإضافة شرح" : "Click to add explanation")));
        } else if (type === "bullet-list") {
            var list = el("ul", "presentation-bullets");
            (data.items || []).forEach(function (item) {
                var textItem = localText(item, language);
                if (textItem || options.editorMode) {
                    list.appendChild(el("li", "", textItem));
                }
            });
            if (!list.children.length && !options.editorMode) {
                return null;
            }
            node.appendChild(list);
        } else if (type === "image") {
            if (!data.src && !options.editorMode) {
                return null;
            }
            var img = el("img", "slide-image");
            img.src = data.src || "";
            img.alt = localText(data.alt, language);
            img.style.objectFit = data.fit || "contain";
            img.onerror = function () {
                img.replaceWith(el("div", "missing-media", language === "ar" ? "وسيط غير متاح" : "Media unavailable"));
            };
            node.appendChild(img);
        } else if (type === "callout") {
            var callout = el("div", "slide-callout", localText(data.text, language));
            node.appendChild(callout);
        } else if (type === "comparison") {
            renderComparison(node, data, language);
        } else if (type === "question") {
            node.appendChild(renderQuestionBlock(data, language));
        } else if (type === "table") {
            renderTable(node, data, language);
        } else if (type === "reference-list") {
            var refs = data.items || [];
            if (!refs.length && !options.editorMode) {
                return null;
            }
            var refList = el("ol", "reference-list");
            refs.forEach(function (item) {
                refList.appendChild(el("li", "", localText(item, language)));
            });
            node.appendChild(refList);
        } else if (type === "button") {
            (data.buttons || []).forEach(function (item) {
                var btn = button(localText(item.label, language), "component-button");
                btn.addEventListener("click", function () {
                    if (options && typeof options.onAction === "function") {
                        options.onAction(item.action || "");
                    }
                });
                node.appendChild(btn);
            });
        } else if (type === "spacer") {
            node.style.minHeight = (data.size || 2) + "rem";
        } else if (type === "video") {
            var video = el("video", "slide-video");
            video.controls = true;
            video.src = data.src || "";
            node.appendChild(video);
        } else if (type === "audio-control") {
            var audio = el("audio", "slide-audio");
            audio.controls = true;
            audio.src = data.src || "";
            node.appendChild(audio);
        } else if (type === "interactive") {
            var componentId = data.componentId || "";
            var component = registry[componentId] || unknownComponent;
            var controller = component(node, data.config || {}, language, options);
            renderInteractiveOverlays(node, data.config || {}, language, controller);
            return { node: node, controller: controller };
        }

        return { node: node };
    }

    function renderComparison(node, data, language) {
        var grid = el("div", "comparison-grid");
        (data.items || []).forEach(function (item) {
            var card = el("div", "comparison-card");
            card.appendChild(el("h3", "", localText(item.title, language)));
            card.appendChild(el("p", "", localText(item.text, language)));
            grid.appendChild(card);
        });
        node.appendChild(grid);
    }

    function renderQuestionBlock(data, language) {
        var q = normalizeQuestion(data, language, 0);
        var box = el("div", "component-card question-card");
        var questionText = localText(q.text, language);
        box.appendChild(el("p", "question-progress", language === "ar" ? "السؤال 1 / 1" : "Question 1 / 1"));
        box.appendChild(el("h3", "question-prompt", questionText || (language === "ar" ? "خطأ في التحرير: نص السؤال مفقود." : "Editor error: question text is missing.")));
        var choices = el("div", "choice-row");
        var feedback = el("p", "component-result", "");
        q.choices.forEach(function (choice) {
            var choiceButton = button(localText(choice.text, language), "choice-button");
            choiceButton.addEventListener("click", function () {
                choices.querySelectorAll("button").forEach(function (btn) { btn.classList.remove("selected", "correct", "wrong"); });
                choiceButton.classList.add("selected");
                if (choice.id === q.correctChoiceId) {
                    choiceButton.classList.add("correct");
                } else {
                    choiceButton.classList.add("wrong");
                }
                feedback.textContent = localText(q.explanation, language);
            });
            choices.appendChild(choiceButton);
        });
        box.appendChild(choices);
        box.appendChild(feedback);
        return box;
    }

    function renderTable(node, data, language) {
        var table = el("table", "presentation-table");
        var thead = el("thead");
        var headerRow = el("tr");
        var headers = (data.headers && (data.headers[language] || data.headers.en || data.headers.ar)) || [];
        headers.forEach(function (header) {
            headerRow.appendChild(el("th", "", header));
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        var tbody = el("tbody");
        (data.rows || []).forEach(function (row) {
            var tr = el("tr");
            var values = row[language] || row.en || row.ar || [];
            values.forEach(function (value) {
                tr.appendChild(el("td", "", value));
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        node.appendChild(table);
    }

    function renderInteractiveOverlays(node, config, language, controller) {
        var labels = labelsFor(language);
        var resultText = localText(config.resultText, language);
        var freezeText = localText(config.freezeText, language);
        if (!resultText && !freezeText) {
            return;
        }

        var actions = el("div", "simulation-overlay-actions");
        var overlay = el("div", "simulation-result-overlay");
        overlay.hidden = true;
        var card = el("div", "simulation-result-card");
        var body = el("p", "", "");
        card.appendChild(body);
        var close = controlButton(labels.continueExperiment, function () {
            overlay.hidden = true;
            if (controller && controller.resume) controller.resume();
        });
        card.appendChild(close);
        overlay.appendChild(card);

        function openOverlay(text) {
            body.textContent = text;
            overlay.hidden = false;
            if (controller && controller.pause) controller.pause();
        }

        if (freezeText) {
            actions.appendChild(controlButton(labels.freezeExplain, function () { openOverlay(freezeText); }));
        }
        if (resultText) {
            actions.appendChild(controlButton(labels.showResult, function () { openOverlay(resultText); }));
        }

        node.appendChild(actions);
        node.appendChild(overlay);
    }

    function findSection(presentation, sectionId) {
        return (presentation.sections || []).filter(function (section) { return section.id === sectionId; })[0] || null;
    }

    function sectionAccent(presentation, slide) {
        var section = findSection(presentation, slide.sectionId);
        return (section && section.accent) || (presentation.theme && (presentation.theme.accent || presentation.theme.Accent)) || "#27b3ff";
    }

    function applySlideBackground(scene, background) {
        var color = background.color || background.Color || "";
        var image = background.image || background.Image || "";
        if (!color && !image) return;

        if (image) {
            var safeImage = String(image).replace(/"/g, "%22");
            scene.style.background = "linear-gradient(135deg, rgba(5, 16, 29, .82), rgba(5, 16, 29, .58)), url(\"" + safeImage + "\") center/cover no-repeat";
            if (color) {
                scene.style.backgroundColor = color;
            }
        } else {
            scene.style.background = color;
        }
    }

    function unknownComponent(node, config, language) {
        node.appendChild(el("div", "component-error", language === "ar" ? "مكون غير معروف" : "Unknown component"));
        return { dispose: function () { } };
    }

    function makeCanvasShell(node, title, language) {
        var shell = el("div", "interactive-shell");
        var top = el("div", "component-topline");
        top.appendChild(el("h3", "", title));
        var controls = el("div", "component-controls");
        top.appendChild(controls);
        var canvas = el("canvas", "component-canvas");
        shell.appendChild(top);
        shell.appendChild(canvas);
        node.appendChild(shell);
        return { shell: shell, controls: controls, canvas: canvas };
    }

    function waveBasics(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, labels.soundWaves, language);
        var running = true;
        var slow = false;
        ui.controls.appendChild(controlButton(labels.pause, function (btn) {
            running = !running;
            btn.textContent = running ? labels.pause : labels.start;
        }));
        ui.controls.appendChild(controlButton(labels.reset, function () { time = 0; }));
        ui.controls.appendChild(controlButton(labels.slow, function (btn) {
            slow = !slow;
            btn.classList.toggle("active", slow);
        }));
        var time = 0;
        return animate(ui.canvas, function (ctx, size, dt) {
            if (running) {
                time += dt * (slow ? 0.25 : 1);
            }
            ctx.clearRect(0, 0, size.width, size.height);
            drawGrid(ctx, size);
            var cx = size.width * 0.22;
            var cy = size.height * 0.52;
            drawSpeaker(ctx, cx, cy, 28 + Math.sin(time * 10) * 3);
            for (var i = 0; i < 9; i++) {
                var r = ((time * 90 + i * 58) % (size.width * 0.9));
                ctx.strokeStyle = i % 2 ? "rgba(39,179,255,.35)" : "rgba(255,180,92,.45)";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(cx, cy, r, -0.7, 0.7);
                ctx.stroke();
            }
            drawLabel(ctx, labels.compressions, size.width * 0.66, size.height * 0.34);
            drawLabel(ctx, labels.rarefactions, size.width * 0.68, size.height * 0.68);
        });
    }

    function waveformPitch(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, labels.frequencyPitch, language);
        var frequency = 440;
        var tone = makeTone();
        ui.controls.appendChild(controlButton(labels.low, function () { frequency = 220; tone.set(frequency, 0.12); }));
        ui.controls.appendChild(controlButton(labels.medium, function () { frequency = 440; tone.set(frequency, 0.12); }));
        ui.controls.appendChild(controlButton(labels.high, function () { frequency = 760; tone.set(frequency, 0.12); }));
        ui.controls.appendChild(controlButton(labels.playTone, function (btn) {
            if (tone.isRunning()) {
                tone.stop();
                btn.textContent = labels.playTone;
            } else {
                tone.start(frequency, 0.12);
                btn.textContent = labels.stop;
            }
        }));
        var slider = document.createElement("input");
        slider.type = "range";
        slider.min = "120";
        slider.max = "900";
        slider.value = frequency;
        slider.addEventListener("input", function () {
            frequency = Number(slider.value);
            tone.set(frequency, 0.12);
        });
        ui.controls.appendChild(slider);
        var controller = animate(ui.canvas, function (ctx, size) {
            ctx.clearRect(0, 0, size.width, size.height);
            drawGrid(ctx, size);
            ctx.strokeStyle = "#27b3ff";
            ctx.lineWidth = 5;
            ctx.beginPath();
            for (var x = 0; x < size.width; x++) {
                var y = size.height * 0.52 + Math.sin(x / size.width * Math.PI * 2 * (frequency / 90)) * size.height * 0.18;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            drawLabel(ctx, frequency < 330 ? labels.lowerPitch : frequency > 620 ? labels.higherPitch : labels.mediumPitch, size.width * 0.5, size.height * 0.18);
        });
        return joinControllers(controller, { dispose: function () { tone.stop(); } });
    }

    function pitchLoudness(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, labels.pitchLoudness, language);
        var frequency = 440;
        var volume = 0.25;
        var tone = makeTone();
        var playBtn = controlButton(labels.playTone, function () {
            if (tone.isRunning()) {
                tone.stop();
                playBtn.textContent = labels.playTone;
            } else {
                tone.start(frequency, volume);
                playBtn.textContent = labels.stop;
            }
        });
        ui.controls.appendChild(playBtn);
        ["pitch", "volume"].forEach(function (kind) {
            var input = document.createElement("input");
            input.type = "range";
            input.min = kind === "pitch" ? "160" : "0";
            input.max = kind === "pitch" ? "820" : "100";
            input.value = kind === "pitch" ? frequency : volume * 100;
            input.addEventListener("input", function () {
                if (kind === "pitch") {
                    frequency = Number(input.value);
                } else {
                    volume = Number(input.value) / 100;
                }
                tone.set(frequency, volume);
            });
            input.setAttribute("aria-label", kind);
            ui.controls.appendChild(input);
        });
        var controller = animate(ui.canvas, function (ctx, size) {
            ctx.clearRect(0, 0, size.width, size.height);
            drawGrid(ctx, size);
            drawBar(ctx, size.width * 0.22, size.height * 0.75, size.height * 0.42 * (frequency / 820), "#27b3ff", labels.pitch);
            drawBar(ctx, size.width * 0.67, size.height * 0.75, size.height * 0.58 * volume, "#ffb45c", labels.loudness);
        });
        return joinControllers(controller, { dispose: function () { tone.stop(); } });
    }

    function dopplerComponent(mode) {
        return function (node, config, language) {
            var labels = labelsFor(language);
            var ui = makeCanvasShell(node, titleForMode(mode, labels, language), language);
            var running = !config.startPaused;
            var slow = !!config.slowMotion;
            var showGraph = config.showGraph !== false;
            var showWaves = config.showWaves !== false;
            var sound = makeMotorcycleSound();
            var speed = Number(config.speed || 1);
            var radius = Number(config.radius || 0.28);
            var direction = Number(config.direction || 1);
            var time = 0;
            var customMode = config.mode || mode;
            ui.controls.appendChild(controlButton(labels.startPause, function () { running = !running; }));
            ui.controls.appendChild(controlButton(labels.reset, function () { time = 0; }));
            if (mode === "lab-speed-compare") {
                ui.controls.appendChild(controlButton(labels.slow, function () { speed = 0.7; time = 0; }));
                ui.controls.appendChild(controlButton(labels.medium, function () { speed = 1.2; time = 0; }));
                ui.controls.appendChild(controlButton(labels.fast, function () { speed = 1.9; time = 0; }));
            }
            if (mode === "lab-sideways-circular") {
                ui.controls.appendChild(controlButton(labels.sideways, function () { customMode = "sideways"; time = 0; }));
                ui.controls.appendChild(controlButton(labels.clockwise, function () { customMode = "circular"; direction = 1; time = 0; }));
                ui.controls.appendChild(controlButton(labels.counterClockwise, function () { customMode = "circular"; direction = -1; time = 0; }));
                var radiusSlider = document.createElement("input");
                radiusSlider.type = "range";
                radiusSlider.min = "18";
                radiusSlider.max = "42";
                radiusSlider.value = "28";
                radiusSlider.addEventListener("input", function () { radius = Number(radiusSlider.value) / 100; });
                ui.controls.appendChild(radiusSlider);
            }
            if (mode === "lab-auto-pass" || mode === "opening-sound") {
                ui.controls.appendChild(controlButton(labels.sound, function (btn) {
                    if (sound.isRunning()) {
                        sound.stop();
                        btn.classList.remove("active");
                    } else {
                        sound.start();
                        btn.classList.add("active");
                    }
                }));
            }
            ui.controls.appendChild(controlButton(labels.waves, function (btn) { showWaves = !showWaves; btn.classList.toggle("muted", !showWaves); }));
            ui.controls.appendChild(controlButton(labels.graph, function (btn) { showGraph = !showGraph; btn.classList.toggle("muted", !showGraph); }));
            ui.controls.appendChild(controlButton(labels.slowMotion, function (btn) { slow = !slow; btn.classList.toggle("active", slow); }));
            var history = [];
            var controller = animate(ui.canvas, function (ctx, size, dt) {
                if (running) {
                    time += dt * speed * (slow ? 0.35 : 1);
                }
                var state = sourceState(customMode, time, direction, radius);
                drawDopplerScene(ctx, size, state, labels, showWaves, config);
                var factor = dopplerFactor(state);
                history.push(factor);
                if (history.length > 180) history.shift();
                drawQualitative(ctx, size, factor, labels);
                if (showGraph) drawMiniGraph(ctx, size, history);
                var dx = state.listener.x - state.x;
                var dy = state.listener.y - state.y;
                var distance = Math.sqrt(dx * dx + dy * dy);
                var loudness = config.distanceLoudness ? clamp(0.18 / Math.max(0.08, distance), 0.04, 0.18) : 0.12;
                sound.update(factor, loudness);
            });
            return joinControllers(controller, { dispose: function () { sound.stop(); } });
        };
    }

    function openingSound(node, config, language, options) {
        var controller = dopplerComponent("opening-sound")(node, config, language, options);
        var labels = labelsFor(language);
        var question = el("div", "component-card question-card");
        question.appendChild(el("h3", "", language === "ar" ? "اختر التوقع الصحيح" : "Choose the best prediction"));
        var choices = el("div", "choice-row");
        (config.choices || []).forEach(function (choice, index) {
            var btn = button(localText(choice, language), "choice-button");
            btn.addEventListener("click", function () {
                choices.querySelectorAll("button").forEach(function (item) { item.classList.remove("selected", "correct", "wrong"); });
                btn.classList.add("selected");
            });
            choices.appendChild(btn);
        });
        var reveal = button(labels.reveal, "component-button");
        reveal.addEventListener("click", function () {
            Array.prototype.forEach.call(choices.children, function (item, index) {
                item.classList.toggle("correct", index === Number(config.correctIndex || 0));
                item.classList.toggle("wrong", item.classList.contains("selected") && index !== Number(config.correctIndex || 0));
            });
        });
        question.appendChild(choices);
        question.appendChild(reveal);
        node.appendChild(question);
        return controller;
    }

    function prediction(node, config, language) {
        var labels = labelsFor(language);
        var box = el("div", "component-card");
        box.appendChild(el("h3", "", language === "ar" ? "ما الحالة التي ترفع النغمة؟" : "Which case raises pitch?"));
        var scenarios = [
            { id: "near", label: { ar: "ساكن وقريب", en: "Stationary and close" }, answer: false },
            { id: "approach", label: { ar: "اقتراب", en: "Approaching" }, answer: true },
            { id: "recede", label: { ar: "ابتعاد", en: "Receding" }, answer: false },
            { id: "sideways", label: { ar: "حركة جانبية", en: "Sideways motion" }, answer: false }
        ];
        var result = el("p", "component-result");
        scenarios.forEach(function (scenario) {
            var btn = button(localText(scenario.label, language), "choice-button");
            btn.addEventListener("click", function () {
                result.textContent = scenario.answer ? labels.correctApproach : labels.tryRadial;
                btn.classList.toggle("correct", scenario.answer);
            });
            box.appendChild(btn);
        });
        box.appendChild(controlButton(labels.reset, function () { result.textContent = ""; box.querySelectorAll("button").forEach(function (b) { b.classList.remove("correct"); }); }));
        box.appendChild(result);
        node.appendChild(box);
        return { dispose: function () { } };
    }

    function labChallenge(node, config, language) {
        var labels = labelsFor(language);
        var box = el("div", "component-card lab-challenge");
        var status = el("p", "component-result", "");
        var target = "higher";
        [
            { id: "higher", label: { ar: "اجعل التردد أعلى", en: "Make frequency higher" } },
            { id: "lower", label: { ar: "اجعل التردد أقل", en: "Make frequency lower" } },
            { id: "small", label: { ar: "حركة سريعة بتغير صغير", en: "Move fast with small shift" } }
        ].forEach(function (challenge) {
            var btn = button(localText(challenge.label, language), "choice-button");
            btn.addEventListener("click", function () {
                target = challenge.id;
                status.textContent = labels.dragHint;
            });
            box.appendChild(btn);
        });
        var slider = document.createElement("input");
        slider.type = "range";
        slider.min = "-100";
        slider.max = "100";
        slider.value = "0";
        slider.addEventListener("input", function () {
            var value = Number(slider.value);
            var ok = target === "higher" ? value > 35 : target === "lower" ? value < -35 : Math.abs(value) < 12;
            status.textContent = ok ? labels.challengeMet : labels.adjustMotion;
        });
        box.appendChild(slider);
        box.appendChild(status);
        node.appendChild(box);
        return { dispose: function () { } };
    }

    function radarComponent(context) {
        return function (node, config, language) {
            var labels = labelsFor(language);
            var ui = makeCanvasShell(node, context === "sports" ? labels.sportsRadar : labels.policeRadar, language);
            var running = !config.startPaused;
            var speed = Number(config.speed || 25);
            var direction = Number(config.direction || -1);
            var limit = Number(config.limit || 80);
            var time = 0;
            ui.controls.appendChild(controlButton(labels.startPause, function () { running = !running; }));
            ui.controls.appendChild(controlButton(labels.replay, function () { time = 0; }));
            ui.controls.appendChild(controlButton(labels.slow, function () { speed = 12; }));
            ui.controls.appendChild(controlButton(labels.medium, function () { speed = 25; }));
            ui.controls.appendChild(controlButton(labels.fast, function () { speed = 42; }));
            if (context !== "sports") {
                ui.controls.appendChild(controlButton(labels.direction, function () { direction *= -1; }));
                var limitInput = document.createElement("input");
                limitInput.type = "range";
                limitInput.min = "30";
                limitInput.max = "140";
                limitInput.value = limit;
                limitInput.addEventListener("input", function () { limit = Number(limitInput.value); });
                ui.controls.appendChild(limitInput);
            }
            return animate(ui.canvas, function (ctx, size, dt) {
                if (running) time += dt;
                drawRadar(ctx, size, time, speed, direction, limit, context, labels);
            });
        };
    }

    function medicalDoppler(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, labels.medicalDoppler, language);
        var speed = Number(config.speed || 0.7);
        var angle = Number(config.angle || 45);
        var direction = Number(config.direction || 1);
        var running = !config.startPaused;
        var time = 0;
        ui.controls.appendChild(controlButton(labels.startPause, function () { running = !running; }));
        ui.controls.appendChild(controlButton(labels.reset, function () { time = 0; }));
        ui.controls.appendChild(controlButton(labels.normal, function () { speed = 0.45; }));
        ui.controls.appendChild(controlButton(labels.slow, function () { speed = 0.2; }));
        ui.controls.appendChild(controlButton(labels.fast, function () { speed = 1.1; }));
        ui.controls.appendChild(controlButton(labels.direction, function () { direction *= -1; }));
        [0, 45, 90].forEach(function (preset) {
            ui.controls.appendChild(controlButton(preset + "°", function () { angle = preset; }));
        });
        return animate(ui.canvas, function (ctx, size, dt) {
            if (running) time += dt;
            drawMedical(ctx, size, time, speed, angle, direction, labels, false);
        });
    }

    function medicalComparison(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, labels.medicalComparison, language);
        var revealed = false;
        var time = 0;
        ui.controls.appendChild(controlButton(labels.reveal, function () { revealed = !revealed; }));
        return animate(ui.canvas, function (ctx, size, dt) {
            time += dt;
            drawMedicalComparison(ctx, size, time, revealed, labels);
        });
    }

    function lightDoppler(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, labels.lightDoppler, language);
        var beta = Number(config.beta || 0.25);
        ui.controls.appendChild(controlButton(labels.approaching, function () { beta = -0.35; }));
        ui.controls.appendChild(controlButton(labels.receding, function () { beta = 0.35; }));
        ui.controls.appendChild(controlButton(labels.reset, function () { beta = 0; }));
        return animate(ui.canvas, function (ctx, size, dt, elapsed) {
            drawSpectrum(ctx, size, beta, elapsed, labels);
        });
    }

    function astronomy(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, labels.astronomy, language);
        var beta = Number(config.beta || 0.22);
        var reveal = false;
        ui.controls.appendChild(controlButton(labels.approaching, function () { beta = -0.22; }));
        ui.controls.appendChild(controlButton(labels.receding, function () { beta = 0.22; }));
        ui.controls.appendChild(controlButton(labels.reveal, function () { reveal = !reveal; }));
        return animate(ui.canvas, function (ctx, size, dt, elapsed) {
            drawAstronomy(ctx, size, beta, reveal, elapsed, labels);
        });
    }

    function weatherRadar(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, labels.weatherRadar, language);
        var speed = Number(config.speed || 28);
        var angle = Number(config.angle || 30);
        var time = 0;
        ui.controls.appendChild(controlButton(labels.slow, function () { speed = 14; }));
        ui.controls.appendChild(controlButton(labels.medium, function () { speed = 28; }));
        ui.controls.appendChild(controlButton(labels.fast, function () { speed = 48; }));
        var input = document.createElement("input");
        input.type = "range";
        input.min = "0";
        input.max = "180";
        input.value = angle;
        input.addEventListener("input", function () { angle = Number(input.value); });
        ui.controls.appendChild(input);
        return animate(ui.canvas, function (ctx, size, dt) {
            time += dt;
            drawWeather(ctx, size, time, speed, angle, labels);
        });
    }

    function conceptQuiz(node, config, language) {
        var labels = labelsFor(language);
        var questions = (config.questions || []).map(function (question, questionIndex) {
            return normalizeQuestion(question, language, questionIndex);
        });
        var index = 0;
        var score = 0;
        var answered = {};
        var box = el("div", "component-card concept-quiz");
        node.appendChild(box);

        function render() {
            box.innerHTML = "";
            var q = questions[index];
            if (!q) return;
            box.appendChild(el("p", "question-progress", (language === "ar" ? "السؤال " : "Question ") + (index + 1) + " / " + questions.length));
            box.appendChild(el("h3", "question-prompt", localText(q.text, language) || (language === "ar" ? "خطأ في التحرير: نص السؤال مفقود." : "Editor error: question text is missing.")));
            (q.choices || []).forEach(function (choice) {
                var btn = button(localText(choice.text, language), "choice-button");
                if (answered[index] !== undefined) {
                    btn.classList.toggle("correct", choice.id === q.correctChoiceId);
                    btn.classList.toggle("wrong", answered[index] === choice.id && choice.id !== q.correctChoiceId);
                    btn.disabled = true;
                }
                btn.addEventListener("click", function () {
                    if (answered[index] !== undefined) return;
                    answered[index] = choice.id;
                    if (choice.id === q.correctChoiceId) score++;
                    render();
                });
                box.appendChild(btn);
            });
            if (answered[index] !== undefined) {
                box.appendChild(el("p", "component-result", localText(q.explanation, language)));
            }
            var nav = el("div", "component-controls");
            nav.appendChild(controlButton(labels.previous, function () { index = Math.max(0, index - 1); render(); }));
            nav.appendChild(controlButton(labels.next, function () { index = Math.min(questions.length - 1, index + 1); render(); }));
            nav.appendChild(controlButton(labels.restart, function () { index = 0; score = 0; answered = {}; render(); }));
            nav.appendChild(el("span", "quiz-score", score + " / " + questions.length));
            box.appendChild(nav);
        }

        render();
        return { dispose: function () { } };
    }

    function collectReferencedComponents(presentation) {
        var references = {};
        ((presentation && (presentation.slides || presentation.Slides)) || []).forEach(function (slide) {
            (slide.blocks || slide.Blocks || []).forEach(function (block) {
                var data = block.data || block.Data || {};
                if (data.componentId) {
                    references[data.componentId] = references[data.componentId] || [];
                    references[data.componentId].push(slide.id || slide.Id || "");
                }
            });
        });
        return references;
    }

    function diagnostics(presentation) {
        var referenced = collectReferencedComponents(presentation);
        var registered = Object.keys(registry).sort();
        var missing = Object.keys(referenced).filter(function (id) { return !registry[id]; }).sort();
        var unused = registered.filter(function (id) { return !referenced[id]; });
        return {
            registeredComponents: registered,
            referencedComponents: Object.keys(referenced).sort(),
            missingComponents: missing,
            unusedRegisteredComponents: unused
        };
    }

    function coverComponent(node, config, language) {
        var labels = labelsFor(language);
        var shell = el("div", "cover-actions");
        shell.appendChild(controlButton(labels.startPresentation, function () {
            if (window.PresentationRuntime) {
                window.PresentationRuntime.next();
            }
        }));
        shell.appendChild(controlButton(labels.fullscreen, function () {
            var target = document.documentElement;
            if (target.requestFullscreen) target.requestFullscreen();
        }));
        var engineSound = makeMotorcycleSound();
        shell.appendChild(controlButton(labels.sound, function (btn) {
            if (engineSound.isRunning()) {
                engineSound.stop();
                btn.classList.remove("active");
            } else {
                engineSound.start();
                btn.classList.add("active");
            }
        }));
        node.appendChild(shell);
        var background = el("div", "cover-orbit");
        node.appendChild(background);
        return { dispose: function () { engineSound.stop(); } };
    }

    function animate(canvas, draw) {
        var disposed = false;
        var paused = false;
        var last = performance.now();
        var start = last;
        function frame(now) {
            if (disposed) return;
            var size = resizeCanvas(canvas);
            var ctx = canvas.getContext("2d");
            var dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (!paused) {
                draw(ctx, size, dt, (now - start) / 1000);
            }
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
        return {
            pause: function () { paused = true; },
            resume: function () { paused = false; },
            dispose: function () {
                disposed = true;
            }
        };
    }

    function controlButton(label, handler) {
        var btn = button(label, "component-button");
        btn.addEventListener("click", function () { handler(btn); });
        return btn;
    }

    function joinControllers() {
        var controllers = Array.prototype.slice.call(arguments);
        return {
            pause: function () {
                controllers.forEach(function (controller) {
                    if (controller && controller.pause) controller.pause();
                });
            },
            resume: function () {
                controllers.forEach(function (controller) {
                    if (controller && controller.resume) controller.resume();
                });
            },
            dispose: function () {
                controllers.forEach(function (controller) {
                    if (controller && controller.dispose) controller.dispose();
                });
            }
        };
    }

    function makeTone() {
        var context, osc, gain, running = false;
        return {
            start: function (frequency, volume) {
                if (running) return;
                var AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                context = context || new AudioContext();
                if (context.state === "suspended") context.resume();
                osc = context.createOscillator();
                gain = context.createGain();
                osc.type = "sine";
                osc.frequency.value = frequency;
                gain.gain.value = Math.max(0.0001, volume);
                osc.connect(gain);
                gain.connect(context.destination);
                osc.start();
                running = true;
            },
            set: function (frequency, volume) {
                if (osc) osc.frequency.setTargetAtTime(frequency, context.currentTime, 0.02);
                if (gain) gain.gain.setTargetAtTime(Math.max(0.0001, volume), context.currentTime, 0.02);
            },
            stop: function () {
                if (!running) return;
                try { osc.stop(); } catch (ignore) { }
                running = false;
                osc = null;
                gain = null;
            },
            isRunning: function () { return running; }
        };
    }

    function labelsFor(language) {
        var ar = language === "ar";
        return {
            start: ar ? "تشغيل" : "Start",
            pause: ar ? "إيقاف مؤقت" : "Pause",
            startPause: ar ? "تشغيل/إيقاف" : "Start/Pause",
            reset: ar ? "إعادة" : "Reset",
            replay: ar ? "إعادة العرض" : "Replay",
            slow: ar ? "بطيء" : "Slow",
            medium: ar ? "متوسط" : "Medium",
            fast: ar ? "سريع" : "Fast",
            high: ar ? "عال" : "High",
            low: ar ? "منخفض" : "Low",
            normal: ar ? "طبيعي" : "Normal",
            sound: ar ? "الصوت" : "Sound",
            waves: ar ? "الجبهات" : "Waves",
            graph: ar ? "الرسم" : "Graph",
            slowMotion: ar ? "تصوير بطيء" : "Slow motion",
            fullscreen: ar ? "ملء الشاشة" : "Fullscreen",
            startPresentation: ar ? "ابدأ العرض" : "Start presentation",
            reveal: ar ? "كشف" : "Reveal",
            showResult: ar ? "إظهار النتيجة" : "Show result",
            freezeExplain: ar ? "تجميد وشرح" : "Freeze and explain",
            continueExperiment: ar ? "متابعة التجربة" : "Continue experiment",
            stop: ar ? "إيقاف" : "Stop",
            playTone: ar ? "تشغيل النغمة" : "Play tone",
            lowerPitch: ar ? "نغمة أخفض" : "Lower pitch",
            mediumPitch: ar ? "نغمة متوسطة" : "Medium pitch",
            higherPitch: ar ? "نغمة أعلى" : "Higher pitch",
            pitch: ar ? "النغمة" : "Pitch",
            loudness: ar ? "العلو" : "Loudness",
            soundWaves: ar ? "انتشار الصوت" : "Sound propagation",
            compressions: ar ? "تضاغطات" : "Compressions",
            rarefactions: ar ? "تخلخلات" : "Rarefactions",
            frequencyPitch: ar ? "التردد والنغمة" : "Frequency and pitch",
            pitchLoudness: ar ? "النغمة والعلو" : "Pitch and loudness",
            stationary: ar ? "ساكن" : "Stationary",
            approaching: ar ? "اقتراب" : "Approaching",
            receding: ar ? "ابتعاد" : "Receding",
            higher: ar ? "أعلى" : "Higher",
            lower: ar ? "أقل" : "Lower",
            noShift: ar ? "لا تغير دوبلري" : "No Doppler shift",
            redshift: ar ? "انزياح نحو الأحمر" : "Redshift",
            blueshift: ar ? "انزياح نحو الأزرق" : "Blueshift",
            motorcycle: ar ? "الدراجة" : "Motorcycle",
            listener: ar ? "المستمع" : "Listener",
            policeRadar: ar ? "رادار الشرطة" : "Police radar",
            sportsRadar: ar ? "رادار الرياضة" : "Sports radar",
            medicalDoppler: ar ? "دوبلر طبي" : "Medical Doppler",
            medicalComparison: ar ? "مقارنة التدفق" : "Flow comparison",
            lightDoppler: ar ? "دوبلر الضوء" : "Light Doppler",
            astronomy: ar ? "الفلك" : "Astronomy",
            weatherRadar: ar ? "رادار الطقس" : "Weather radar",
            direction: ar ? "تغيير الاتجاه" : "Change direction",
            sideways: ar ? "جانبي" : "Sideways",
            clockwise: ar ? "مع عقارب الساعة" : "Clockwise",
            counterClockwise: ar ? "عكس عقارب الساعة" : "Counterclockwise",
            correctApproach: ar ? "صحيح: الاقتراب يرفع النغمة." : "Correct: approaching raises pitch.",
            tryRadial: ar ? "فكر في المركبة الشعاعية للحركة." : "Think about the radial component of motion.",
            dragHint: ar ? "حرك المنزلق لاختبار الفكرة." : "Move the slider to test the idea.",
            challengeMet: ar ? "تم تحقيق التحدي." : "Challenge met.",
            adjustMotion: ar ? "عدل الحركة أكثر." : "Adjust the motion.",
            previous: ar ? "السابق" : "Previous",
            next: ar ? "التالي" : "Next",
            restart: ar ? "إعادة الاختبار" : "Restart"
        };
    }

    function titleForMode(mode, labels, language) {
        if (mode.indexOf("stationary") >= 0) return labels.stationary;
        if (mode.indexOf("approach") >= 0) return labels.approaching;
        if (mode.indexOf("recede") >= 0) return labels.receding;
        if (mode === "sideways") return labels.sideways;
        if (mode === "circular") return language === "ar" ? "حركة دائرية" : "Circular motion";
        return labels.motorcycle;
    }

    function sourceState(mode, time, direction, radius) {
        var listener = { x: 0.68, y: 0.55 };
        if (mode === "stationary" || mode === "doppler-stationary" || mode === "lab-stationary-near") {
            return { x: mode === "lab-stationary-near" ? 0.56 : 0.32, y: 0.55, vx: 0, vy: 0, listener: listener };
        }
        if (mode === "recede") {
            var xr = 0.45 + (time * 0.18 % 0.48);
            return { x: xr, y: 0.55, vx: 0.18, vy: 0, listener: listener };
        }
        if (mode === "sideways") {
            return { x: 0.55, y: 0.18 + (time * 0.17 % 0.72), vx: 0, vy: 0.17, listener: listener };
        }
        if (mode === "circular") {
            var theta = direction * time * 1.4;
            return { x: listener.x + radius * Math.cos(theta), y: listener.y + radius * Math.sin(theta), vx: -direction * radius * 1.4 * Math.sin(theta), vy: direction * radius * 1.4 * Math.cos(theta), listener: listener };
        }
        var x = 0.88 - (time * 0.22 % 0.76);
        return { x: x, y: 0.55, vx: -0.22, vy: 0, listener: listener };
    }

    function dopplerFactor(state) {
        var dx = state.listener.x - state.x;
        var dy = state.listener.y - state.y;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var radial = (state.vx * dx + state.vy * dy) / len;
        return 1 / Math.max(0.7, 1 - radial * 1.7);
    }

    function drawDopplerScene(ctx, size, state, labels, showWaves, config) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        var sx = state.x * size.width;
        var sy = state.y * size.height;
        var lx = state.listener.x * size.width;
        var ly = state.listener.y * size.height;
        if (showWaves) {
            for (var i = 0; i < 8; i++) {
                var r = 24 + i * 36;
                ctx.strokeStyle = "rgba(39,179,255,.25)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(sx - state.vx * size.width * i * 0.28, sy - state.vy * size.height * i * 0.28, r, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        drawMotorcycleSprite(ctx, sx, sy, 118, state.vx > 0, spriteFromConfig(config && config.sourceImage, "motorcycle"));
        drawListenerSprite(ctx, lx, ly, 132, spriteFromConfig(config && config.listenerImage, "listener"));
        drawArrow(ctx, sx, sy - 45, sx + state.vx * size.width * 0.8, sy - 45 + state.vy * size.height * 0.8, "#ffb45c");
        drawLine(ctx, sx, sy, lx, ly, "rgba(255,255,255,.38)");
        drawLabel(ctx, labels.motorcycle, sx, sy + 78);
        drawLabel(ctx, labels.listener, lx, ly + 116);
    }

    function drawQualitative(ctx, size, factor, labels) {
        var text = Math.abs(factor - 1) < 0.025 ? labels.noShift : factor > 1 ? labels.higher : labels.lower;
        ctx.fillStyle = factor > 1 ? "#9be15d" : factor < 1 ? "#ffb45c" : "#d9f4ff";
        roundRect(ctx, size.width * 0.05, size.height * 0.06, size.width * 0.28, 44, 18, true);
        ctx.fillStyle = "#061323";
        ctx.font = "bold " + Math.max(18, size.width * 0.022) + "px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, size.width * 0.19, size.height * 0.06 + 22);
    }

    function drawMiniGraph(ctx, size, values) {
        var x = size.width * 0.58, y = size.height * 0.08, w = size.width * 0.34, h = size.height * 0.2;
        ctx.fillStyle = "rgba(8,20,34,.75)";
        roundRect(ctx, x, y, w, h, 14, true);
        ctx.strokeStyle = "rgba(255,255,255,.18)";
        ctx.strokeRect(x, y, w, h);
        ctx.beginPath();
        values.forEach(function (value, index) {
            var px = x + index / Math.max(1, values.length - 1) * w;
            var py = y + h * 0.5 - (value - 1) * h;
            if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = "#27b3ff";
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    function drawRadar(ctx, size, time, speed, direction, limit, context, labels) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        var radarX = size.width * 0.15;
        var radarY = size.height * 0.58;
        var targetX = size.width * (0.75 + Math.sin(time * 0.8 * direction) * 0.12);
        var targetY = size.height * 0.58;
        drawRadarDish(ctx, radarX, radarY);
        if (context === "sports") {
            drawBall(ctx, targetX, targetY, 26);
        } else {
            drawMotorcycleSprite(ctx, targetX, targetY, 106, direction > 0);
        }
        for (var i = 0; i < 5; i++) {
            drawLine(ctx, radarX + 24, radarY - i * 8, targetX - 36, targetY - i * 3, i % 2 ? "rgba(39,179,255,.35)" : "rgba(255,180,92,.35)");
        }
        var radial = speed * -direction;
        var delta = 2 * 24.125e9 * radial / cLight;
        var kph = Math.abs(speed) * 3.6;
        var status = context === "sports" ? labels.fast + ": " + fmt(kph, 0) + " km/h" : (kph > limit ? (labels.fast + " / " + fmt(kph, 0) + " km/h") : (labels.medium + " / " + fmt(kph, 0) + " km/h"));
        drawLabel(ctx, status, size.width * 0.5, size.height * 0.22);
        drawLabel(ctx, (radial >= 0 ? labels.approaching : labels.receding) + " Δ " + fmt(delta / 1000, 1) + " kHz", size.width * 0.5, size.height * 0.32);
    }

    function drawMedical(ctx, size, time, speed, angle, direction, labels) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        ctx.fillStyle = "rgba(255,111,145,.18)";
        roundRect(ctx, size.width * 0.15, size.height * 0.47, size.width * 0.7, size.height * 0.16, 38, true);
        ctx.fillStyle = "#ff6f91";
        for (var i = 0; i < 16; i++) {
            var x = size.width * (0.16 + ((i / 16 + time * speed * 0.08 * direction) % 0.68));
            var y = size.height * (0.55 + Math.sin(i) * 0.035);
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        drawProbe(ctx, size.width * 0.24, size.height * 0.25, angle);
        var shift = 2 * 5e6 * speed * Math.cos(angle * Math.PI / 180) / 1540 * direction;
        drawLabel(ctx, Math.abs(shift) < 100 ? labels.noShift : shift > 0 ? labels.approaching : labels.receding, size.width * 0.55, size.height * 0.28);
    }

    function drawMedicalComparison(ctx, size, time, revealed, labels) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        drawVessel(ctx, size.width * 0.08, size.height * 0.28, size.width * 0.36, size.height * 0.16, time, 0.5, labels.normal);
        drawVessel(ctx, size.width * 0.56, size.height * 0.28, size.width * 0.36, size.height * 0.09, time, 1.15, labels.fast);
        if (revealed) {
            drawLabel(ctx, labels.fast, size.width * 0.74, size.height * 0.65);
        }
    }

    function drawSpectrum(ctx, size, beta, elapsed, labels) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        var colors = ["#6a4cff", "#277cff", "#27d3ff", "#3cff82", "#ffe45c", "#ff8c3c", "#ff3c58"];
        colors.forEach(function (color, i) {
            ctx.fillStyle = color;
            ctx.fillRect(size.width * 0.12 + i * size.width * 0.1, size.height * 0.44, size.width * 0.1, size.height * 0.18);
        });
        var shift = clamp(beta, -0.8, 0.8) * size.width * 0.18;
        ctx.strokeStyle = beta > 0 ? "#ff6f61" : "#5ce1ff";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(size.width * 0.5 + shift, size.height * 0.38);
        ctx.lineTo(size.width * 0.5 + shift, size.height * 0.68);
        ctx.stroke();
        drawLabel(ctx, beta > 0 ? labels.redshift : beta < 0 ? labels.blueshift : labels.noShift, size.width * 0.5, size.height * 0.24);
    }

    function drawAstronomy(ctx, size, beta, reveal, elapsed, labels) {
        drawSpectrum(ctx, size, beta, elapsed, labels);
        ctx.fillStyle = "#f8fdff";
        ctx.beginPath();
        ctx.arc(size.width * 0.18, size.height * 0.24, 28 + Math.sin(elapsed * 2) * 2, 0, Math.PI * 2);
        ctx.fill();
        if (reveal) {
            drawLabel(ctx, beta > 0 ? labels.receding : labels.approaching, size.width * 0.72, size.height * 0.25);
        }
    }

    function drawWeather(ctx, size, time, speed, angle, labels) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        var rx = size.width * 0.5, ry = size.height * 0.55;
        drawRadarDish(ctx, rx, ry);
        var theta = angle * Math.PI / 180;
        var radial = speed * Math.cos(theta);
        for (var i = 0; i < 18; i++) {
            var x = size.width * (0.18 + (i % 6) * 0.12 + Math.sin(time + i) * 0.02);
            var y = size.height * (0.2 + Math.floor(i / 6) * 0.16 + Math.cos(time * 0.7 + i) * 0.02);
            ctx.fillStyle = radial > 3 ? "#5ce1ff" : radial < -3 ? "#ff9b55" : "#d9f4ff";
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.fill();
        }
        drawArrow(ctx, rx, ry, rx + Math.cos(theta) * 160, ry - Math.sin(theta) * 120, "#ffb45c");
        drawLabel(ctx, Math.abs(radial) < 3 ? labels.noShift : radial > 0 ? labels.approaching : labels.receding, size.width * 0.5, size.height * 0.18);
    }

    function drawGrid(ctx, size) {
        var gradient = ctx.createLinearGradient(0, 0, size.width, size.height);
        gradient.addColorStop(0, "#071521");
        gradient.addColorStop(1, "#102535");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size.width, size.height);
        ctx.strokeStyle = "rgba(255,255,255,.06)";
        ctx.lineWidth = 1;
        for (var x = 0; x < size.width; x += 48) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.height); ctx.stroke();
        }
        for (var y = 0; y < size.height; y += 48) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.width, y); ctx.stroke();
        }
    }

    function drawAnchoredSprite(ctx, image, x, y, height, anchor, flip) {
        if (!image || !image.complete || !image.naturalWidth || !image.naturalHeight) {
            return false;
        }
        var width = height * image.naturalWidth / image.naturalHeight;
        ctx.save();
        if (flip) {
            ctx.translate(x, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(image, -width * (1 - anchor.x), y - height * anchor.y, width, height);
        } else {
            ctx.drawImage(image, x - width * anchor.x, y - height * anchor.y, width, height);
        }
        ctx.restore();
        return true;
    }

    function drawMotorcycleSprite(ctx, x, y, height, flip, image) {
        if (drawAnchoredSprite(ctx, image || acousticSprites.motorcycle, x, y, height, { x: 0.46, y: 0.48 }, flip)) {
            return;
        }
        ctx.save();
        ctx.fillStyle = "#111927";
        roundRect(ctx, x - height * 0.38, y - height * 0.18, height * 0.76, height * 0.36, 12, true);
        ctx.strokeStyle = "#d9f4ff";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x - height * 0.28, y + height * 0.2, height * 0.16, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + height * 0.26, y + height * 0.2, height * 0.16, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    function drawListenerSprite(ctx, x, y, height, image) {
        if (drawAnchoredSprite(ctx, image || acousticSprites.listener, x, y, height, { x: 0.52, y: 0.17 }, false)) {
            return;
        }
        ctx.fillStyle = "#d9f4ff";
        ctx.beginPath(); ctx.arc(x, y, height * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - height * 0.08, y + height * 0.1, height * 0.16, height * 0.42);
    }

    function drawSpeaker(ctx, x, y, radius) {
        ctx.fillStyle = "#d9f4ff";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0.5, Math.PI * 1.5);
        ctx.lineTo(x + radius * 0.9, y - radius * 0.55);
        ctx.lineTo(x + radius * 0.9, y + radius * 0.55);
        ctx.closePath();
        ctx.fill();
    }

    function drawRadarDish(ctx, x, y) {
        ctx.strokeStyle = "#5ce1ff";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(x, y, 44, -0.7, 0.7);
        ctx.stroke();
        ctx.fillStyle = "#d9f4ff";
        ctx.fillRect(x - 8, y + 36, 16, 56);
    }

    function drawCar(ctx, x, y, width) {
        ctx.fillStyle = "#ffb45c";
        roundRect(ctx, x - width / 2, y - width * 0.22, width, width * 0.32, 12, true);
        ctx.fillStyle = "#12243a";
        ctx.beginPath(); ctx.arc(x - width * 0.25, y + width * 0.14, width * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + width * 0.25, y + width * 0.14, width * 0.09, 0, Math.PI * 2); ctx.fill();
    }

    function drawBall(ctx, x, y, r) {
        ctx.fillStyle = "#f8fdff";
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#12243a";
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    function drawProbe(ctx, x, y, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle * Math.PI / 180);
        ctx.fillStyle = "#d9f4ff";
        roundRect(ctx, -24, -14, 48, 80, 10, true);
        ctx.restore();
        drawArrow(ctx, x, y + 34, x + Math.cos(angle * Math.PI / 180) * 120, y + 34 + Math.sin(angle * Math.PI / 180) * 90, "#5ce1ff");
    }

    function drawVessel(ctx, x, y, w, h, time, speed, label) {
        ctx.fillStyle = "rgba(255,111,145,.2)";
        roundRect(ctx, x, y, w, h, h / 2, true);
        ctx.fillStyle = "#ff6f91";
        for (var i = 0; i < 12; i++) {
            ctx.beginPath();
            ctx.arc(x + ((i / 12 + time * speed * 0.08) % 1) * w, y + h / 2 + Math.sin(i) * h * 0.18, 7, 0, Math.PI * 2);
            ctx.fill();
        }
        drawLabel(ctx, label, x + w / 2, y - 26);
    }

    function drawArrow(ctx, x1, y1, x2, y2, color) {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        var a = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - Math.cos(a - 0.5) * 14, y2 - Math.sin(a - 0.5) * 14);
        ctx.lineTo(x2 - Math.cos(a + 0.5) * 14, y2 - Math.sin(a + 0.5) * 14);
        ctx.closePath(); ctx.fill();
    }

    function drawLine(ctx, x1, y1, x2, y2, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    function drawLabel(ctx, text, x, y) {
        ctx.save();
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        var width = ctx.measureText(text).width + 24;
        ctx.fillStyle = "rgba(6,19,35,.78)";
        roundRect(ctx, x - width / 2, y - 18, width, 36, 14, true);
        ctx.fillStyle = "#f5fbff";
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    function drawBar(ctx, x, base, height, color, label) {
        ctx.fillStyle = "rgba(255,255,255,.13)";
        roundRect(ctx, x - 42, base - 220, 84, 220, 18, true);
        ctx.fillStyle = color;
        roundRect(ctx, x - 42, base - height, 84, height, 18, true);
        drawLabel(ctx, label, x, base + 34);
    }

    function roundRect(ctx, x, y, width, height, radius, fill) {
        radius = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
        if (fill) ctx.fill(); else ctx.stroke();
    }

    var registry = {
        "cover": coverComponent,
        "opening-sound": openingSound,
        "wave-basics": waveBasics,
        "waveform-pitch": waveformPitch,
        "pitch-loudness": pitchLoudness,
        "doppler-stationary": dopplerComponent("stationary"),
        "doppler-approach": dopplerComponent("approach"),
        "doppler-recede": dopplerComponent("recede"),
        "prediction": prediction,
        "lab-overview": dopplerComponent("stationary"),
        "lab-stationary-near": dopplerComponent("lab-stationary-near"),
        "lab-auto-pass": dopplerComponent("lab-auto-pass"),
        "lab-speed-compare": dopplerComponent("lab-speed-compare"),
        "lab-sideways-circular": dopplerComponent("lab-sideways-circular"),
        "lab-sideways": dopplerComponent("sideways"),
        "lab-circular": dopplerComponent("circular"),
        "lab-challenge": labChallenge,
        "police-radar": radarComponent("police"),
        "sports-radar": radarComponent("sports"),
        "medical-doppler": medicalDoppler,
        "medical-comparison": medicalComparison,
        "light-doppler": lightDoppler,
        "astronomy": astronomy,
        "weather-radar": weatherRadar,
        "concept-quiz": conceptQuiz
    };

    window.PresentationComponents = {
        renderSlide: renderSlide,
        renderBlock: renderBlock,
        registry: registry,
        labelsFor: labelsFor,
        localText: localText,
        normalizeQuestion: normalizeQuestion,
        diagnostics: diagnostics
    };
})();
