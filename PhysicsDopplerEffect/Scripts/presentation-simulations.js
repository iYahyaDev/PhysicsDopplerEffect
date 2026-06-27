(function (global, document) {
    "use strict";

    var cLight = 299792458;
    var tissueSoundSpeed = 1540;
    var engine = global.DopplerEngine;
    var PC = global.PresentationComponents;
    var motorcycleImage = loadSprite("Assets/motorcycle-source.png");
    var listenerImage = loadSprite("Assets/custom-listener.png");
    var acousticWorldScale = 3.25;
    var acousticWorld = { width: 160 * acousticWorldScale, height: 90 * acousticWorldScale };

    function loadSprite(src) {
        var image = new Image();
        image.src = src;
        return image;
    }

    function clamp(value, min, max) {
        value = Number(value);
        if (!isFinite(value)) {
            return min;
        }
        return Math.max(min, Math.min(max, value));
    }

    function fmt(value, digits) {
        return (isFinite(value) ? Number(value) : 0).toFixed(digits === undefined ? 1 : digits);
    }

    function norm(v) {
        var m = Math.sqrt(v.x * v.x + v.y * v.y);
        return m < 1e-9 ? { x: 1, y: 0 } : { x: v.x / m, y: v.y / m };
    }

    function dot(a, b) {
        return a.x * b.x + a.y * b.y;
    }

    function localText(value, language) {
        if (PC && PC.localText) {
            return PC.localText(value, language);
        }
        if (typeof value === "string") {
            return value;
        }
        value = value || {};
        return value[language] || value[language === "ar" ? "en" : "ar"] || value.Ar || value.En || "";
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

    function button(label, handler) {
        var btn = el("button", "component-button", label);
        btn.type = "button";
        btn.addEventListener("click", function () {
            handler(btn);
        });
        return btn;
    }

    function labelsFor(language) {
        var base = PC && PC.labelsFor ? PC.labelsFor(language) : {};
        var ar = language === "ar";
        var extra = {
            start: ar ? "تشغيل" : "Start",
            pause: ar ? "إيقاف مؤقت" : "Pause",
            reset: ar ? "إعادة" : "Reset",
            replay: ar ? "إعادة القياس" : "Replay",
            sound: ar ? "صوت الدراجة" : "Motorcycle sound",
            sonification: ar ? "تمثيل صوتي تعليمي" : "Educational sonification",
            normalSpeed: ar ? "سرعة عادية" : "Normal speed",
            slowMotion: ar ? "تصوير بطيء" : "Slow motion",
            verySlow: ar ? "بطيء جدًا" : "Very slow",
            waves: ar ? "الجبهات" : "Wavefronts",
            graph: ar ? "الرسم" : "Graph",
            far: ar ? "بعيد" : "Far",
            medium: ar ? "متوسط" : "Medium",
            near: ar ? "قريب" : "Near",
            slow: ar ? "بطيء" : "Slow",
            fast: ar ? "سريع" : "Fast",
            higher: ar ? "أعلى" : "Higher",
            lower: ar ? "أقل" : "Lower",
            noShift: ar ? "لا تغير دوبلري" : "No Doppler shift",
            stationary: ar ? "ساكن" : "Stationary",
            approaching: ar ? "اقتراب" : "Approaching",
            receding: ar ? "ابتعاد" : "Receding",
            transverse: ar ? "حركة عرضية" : "Transverse",
            motorcycle: ar ? "الدراجة" : "Motorcycle",
            listener: ar ? "المستمع" : "Listener",
            emitted: ar ? "التردد المنبعث" : "Emitted frequency",
            observed: ar ? "التردد المرصود" : "Observed frequency",
            radial: ar ? "السرعة الشعاعية" : "Radial speed",
            distance: ar ? "المسافة" : "Distance",
            speed: ar ? "السرعة" : "Speed",
            state: ar ? "الحالة" : "State",
            distanceLoudness: ar ? "علو حسب المسافة" : "Distance loudness",
            startMeasurement: ar ? "ابدأ القياس" : "Start measurement",
            launch: ar ? "إطلاق" : "Launch",
            direction: ar ? "تغيير الاتجاه" : "Change direction",
            speedLimit: ar ? "حد السرعة" : "Speed limit",
            resultReady: ar ? "اكتمل القياس" : "Measurement complete",
            waiting: ar ? "انتظار" : "Waiting",
            transmitting: ar ? "إرسال موجة" : "Transmitting",
            outbound: ar ? "الموجة إلى الهدف" : "Wave to target",
            reflection: ar ? "انعكاس" : "Reflection",
            returning: ar ? "الإشارة عائدة" : "Return signal",
            processing: ar ? "حساب النتيجة" : "Calculating",
            withinLimit: ar ? "ضمن الحد" : "Within limit",
            overLimit: ar ? "تجاوز الحد" : "Over limit",
            football: ar ? "كرة قدم" : "Football",
            tennis: ar ? "كرة تنس" : "Tennis ball",
            baseball: ar ? "كرة بيسبول" : "Baseball",
            history: ar ? "آخر المحاولات" : "Last attempts",
            probe: ar ? "المسبار" : "Probe",
            vessel: ar ? "الوعاء الدموي" : "Blood vessel",
            narrow: ar ? "تضيق" : "Narrowed",
            reverse: ar ? "عكس التدفق" : "Reverse flow",
            goodAngle: ar ? "زاوية جيدة" : "Good angle",
            reducedAngle: ar ? "حساسية أقل" : "Reduced sensitivity",
            unsuitableAngle: ar ? "قريبة من الصفر" : "Near zero",
            redshift: ar ? "انزياح نحو الأحمر" : "Redshift",
            blueshift: ar ? "انزياح نحو الأزرق" : "Blueshift",
            towardRadar: ar ? "نحو الرادار" : "Toward radar",
            awayRadar: ar ? "بعيدًا عن الرادار" : "Away from radar",
            rotatingStorm: ar ? "عاصفة دوارة" : "Rotating storm",
            sideways: ar ? "جانبي" : "Sideways",
            actualMotion: ar ? "الحركة الفعلية" : "Actual motion",
            radialMap: ar ? "خريطة السرعة الشعاعية" : "Radial velocity map",
            compression: ar ? "تضاغط" : "Compression",
            rarefaction: ar ? "تخلخل" : "Rarefaction",
            trackParticle: ar ? "تتبع جسيمًا" : "Track one particle",
            showCompression: ar ? "إظهار التضاغطات" : "Show compressions",
            showRarefaction: ar ? "إظهار التخلخلات" : "Show rarefactions",
            resultParticles: ar ? "الجسيمات تهتز حول مواضع اتزانها بينما ينتقل الاضطراب والطاقة خلال الوسط." : "Particles oscillate around equilibrium while the disturbance and energy propagate through the medium.",
            challengeHigher: ar ? "اجعل التردد المرصود أعلى" : "Make observed frequency higher",
            challengeLower: ar ? "اجعل التردد المرصود أقل" : "Make observed frequency lower",
            challengeFastSmall: ar ? "حركة سريعة بتغير صغير" : "Fast movement with small shift",
            challengeMet: ar ? "تم تحقيق التحدي من الحالة الفيزيائية." : "Challenge met from the physics state.",
            adjustMotion: ar ? "عدّل السرعة أو الزاوية." : "Adjust speed or angle.",
            towardListener: ar ? "نحو المستمع" : "Toward listener",
            awayListener: ar ? "بعيدًا عن المستمع" : "Away from listener",
            rightTransverse: ar ? "جانبي يمين" : "Right transverse",
            leftTransverse: ar ? "جانبي يسار" : "Left transverse",
            selectedSpeedLimit: ar ? "حد السرعة المختار" : "Selected speed limit",
            measuredSpeed: ar ? "السرعة التي يقيسها الرادار" : "Radar measured speed",
            trueSpeed: ar ? "السرعة الحقيقية" : "True speed",
            launchAngle: ar ? "زاوية الإطلاق" : "Launch angle",
            measurementQuality: ar ? "جودة القياس" : "Measurement quality",
            medicalPurpose: ar ? "يستخدم دوبلر الطبي لقياس اتجاه تدفق الدم والجزء من سرعته الواقعة على اتجاه حزمة الموجات فوق الصوتية." : "Medical Doppler measures blood-flow direction and the component of velocity along the ultrasound beam.",
            medicalCaution: ar ? "لا يقيس الجهاز سرعة الدم كاملة دائمًا؛ تعتمد القراءة على زاوية المسبار بالنسبة إلى اتجاه التدفق." : "The device does not always measure the full blood speed; the reading depends on the probe angle relative to the flow.",
            bloodFlowTarget: ar ? "الهدف: قياس تدفق الدم" : "Goal: measure blood flow",
            emittedWavelength: ar ? "الطول الموجي المنبعث" : "Emitted wavelength",
            observedWavelength: ar ? "الطول الموجي المرصود" : "Observed wavelength"
        };
        Object.keys(extra).forEach(function (key) {
            base[key] = extra[key];
        });
        return base;
    }

    function makeCanvasShell(node, title, language) {
        var shell = el("div", "interactive-shell enhanced-sim");
        var top = el("div", "component-topline");
        top.appendChild(el("h3", "", title));
        var controls = el("div", "component-controls");
        top.appendChild(controls);
        var canvas = el("canvas", "component-canvas enhanced-canvas");
        var readout = el("div", "component-readout");
        shell.appendChild(top);
        shell.appendChild(canvas);
        shell.appendChild(readout);
        node.appendChild(shell);
        return { shell: shell, controls: controls, canvas: canvas, readout: readout };
    }

    function resizeCanvas(canvas) {
        var rect = canvas.getBoundingClientRect();
        var ratio = Math.min(global.devicePixelRatio || 1, 2);
        var width = Math.max(480, Math.floor(rect.width * ratio));
        var height = Math.max(270, Math.floor(rect.height * ratio));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        return { width: width, height: height, ratio: ratio, cssWidth: rect.width, cssHeight: rect.height };
    }

    function animate(canvas, draw) {
        var disposed = false;
        var paused = false;
        var raf = 0;
        var last = performance.now();
        var started = last;
        var observer = global.ResizeObserver ? new ResizeObserver(function () { render(0); }) : null;
        if (observer) {
            observer.observe(canvas);
        }

        function render(dt, now) {
            if (disposed) {
                return;
            }
            var size = resizeCanvas(canvas);
            var ctx = canvas.getContext("2d");
            draw(ctx, size, paused ? 0 : dt, ((now || performance.now()) - started) / 1000);
        }

        function frame(now) {
            if (disposed) {
                return;
            }
            var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
            last = now;
            render(dt, now);
            raf = global.requestAnimationFrame(frame);
        }

        raf = global.requestAnimationFrame(frame);
        return {
            pause: function () { paused = true; },
            resume: function () { paused = false; last = performance.now(); },
            resize: function () { render(0); },
            dispose: function () {
                disposed = true;
                if (raf) {
                    global.cancelAnimationFrame(raf);
                }
                if (observer) {
                    observer.disconnect();
                }
            }
        };
    }

    function joinControllers() {
        var controllers = Array.prototype.slice.call(arguments);
        return {
            pause: function () { controllers.forEach(function (c) { if (c && c.pause) c.pause(); }); },
            resume: function () { controllers.forEach(function (c) { if (c && c.resume) c.resume(); }); },
            resize: function () { controllers.forEach(function (c) { if (c && c.resize) c.resize(); }); },
            dispose: function () { controllers.forEach(function (c) { if (c && c.dispose) c.dispose(); }); }
        };
    }

    function makeMotorAudio() {
        var audio = global.DopplerAudio ? new global.DopplerAudio() : null;
        var wanted = false;
        return {
            start: function () {
                wanted = true;
                return audio ? audio.start() : false;
            },
            stop: function () {
                wanted = false;
                if (audio) {
                    audio.stop();
                }
            },
            update: function (metrics) {
                if (wanted && audio && audio.started) {
                    audio.update(metrics);
                }
            },
            pause: function () {
                if (audio && audio.suspend) {
                    audio.suspend();
                }
            },
            resume: function () {
                if (wanted && audio && audio.resume) {
                    audio.resume();
                }
            },
            isRunning: function () {
                return !!(wanted && audio && audio.started);
            },
            debugState: function () {
                return { wanted: wanted, started: !!(audio && audio.started), contextState: audio && audio.context ? audio.context.state : "none" };
            }
        };
    }

    function makeSonification() {
        var context, oscillator, gain, running = false;
        var currentFrequency = 440;
        var currentGain = 0;
        function ensure() {
            var AudioContext = global.AudioContext || global.webkitAudioContext;
            if (!AudioContext) {
                return false;
            }
            context = context || new AudioContext();
            if (context.state === "suspended") {
                context.resume();
            }
            return true;
        }
        return {
            start: function () {
                if (running || !ensure()) {
                    return;
                }
                oscillator = context.createOscillator();
                gain = context.createGain();
                oscillator.type = "sine";
                oscillator.frequency.value = 440;
                gain.gain.value = 0.0001;
                oscillator.connect(gain);
                gain.connect(context.destination);
                oscillator.start();
                gain.gain.setTargetAtTime(0.08, context.currentTime, 0.03);
                running = true;
            },
            update: function (signedShift, magnitudeScale) {
                if (!running || !context) {
                    return;
                }
                var normalized = clamp(Number(signedShift) / Math.max(1, magnitudeScale || 1), -1, 1);
                var frequency = clamp(440 + normalized * 260, 160, 900);
                currentFrequency = frequency;
                currentGain = 0.04 + Math.abs(normalized) * 0.07;
                oscillator.frequency.setTargetAtTime(frequency, context.currentTime, 0.04);
                gain.gain.setTargetAtTime(currentGain, context.currentTime, 0.06);
            },
            stop: function () {
                if (!running || !context) {
                    return;
                }
                var now = context.currentTime;
                gain.gain.setTargetAtTime(0.0001, now, 0.025);
                try { oscillator.stop(now + 0.12); } catch (ignore) { }
                running = false;
            },
            pause: function () { if (context && context.state === "running") context.suspend(); },
            resume: function () { if (context && context.state === "suspended") context.resume(); },
            isRunning: function () { return running; },
            debugState: function () {
                return {
                    running: running,
                    contextState: context ? context.state : "none",
                    frequency: currentFrequency,
                    gain: currentGain
                };
            }
        };
    }

    function radarShift(transmitFrequency, radialVelocity) {
        return 2 * transmitFrequency * radialVelocity / cLight;
    }

    function ultrasoundShift(transmitFrequency, bloodVelocity, angleDegrees) {
        return 2 * transmitFrequency * bloodVelocity * Math.cos(angleDegrees * Math.PI / 180) / tissueSoundSpeed;
    }

    function lightRatios(beta) {
        beta = clamp(beta, -0.95, 0.95);
        return {
            frequency: Math.sqrt((1 - beta) / (1 + beta)),
            wavelength: Math.sqrt((1 + beta) / (1 - beta))
        };
    }

    function opticalDoppler(beta, emittedWavelengthNm) {
        beta = clamp(beta, -0.95, 0.95);
        emittedWavelengthNm = Number(emittedWavelengthNm || 656.3);
        var ratios = lightRatios(beta);
        var emittedFrequency = cLight / (emittedWavelengthNm * 1e-9);
        var observedWavelength = emittedWavelengthNm * ratios.wavelength;
        var observedFrequency = emittedFrequency * ratios.frequency;
        return {
            beta: beta,
            frequencyRatio: ratios.frequency,
            wavelengthRatio: ratios.wavelength,
            emittedWavelengthNm: emittedWavelengthNm,
            observedWavelengthNm: observedWavelength,
            emittedFrequencyHz: emittedFrequency,
            observedFrequencyHz: observedFrequency,
            z: ratios.wavelength - 1,
            photonEnergyJ: 6.62607015e-34 * observedFrequency
        };
    }

    function radialProjection(objectPosition, observerPosition, velocity) {
        var lineOfSight = norm({
            x: objectPosition.x - observerPosition.x,
            y: objectPosition.y - observerPosition.y
        });
        var radial = dot(velocity, lineOfSight);
        var radialVector = { x: lineOfSight.x * radial, y: lineOfSight.y * radial };
        return {
            lineOfSight: lineOfSight,
            radial: radial,
            radialVector: radialVector,
            transverseVector: {
                x: velocity.x - radialVector.x,
                y: velocity.y - radialVector.y
            }
        };
    }

    function weatherRadial(dropPosition, radarPosition, dropVelocity) {
        return radialProjection(dropPosition, radarPosition, dropVelocity).radial;
    }

    function classifyRadial(radial, threshold) {
        threshold = threshold === undefined ? 0.8 : threshold;
        if (radial < -threshold) return "toward";
        if (radial > threshold) return "away";
        return "zero";
    }

    global.PresentationPhysics = {
        radarShift: radarShift,
        ultrasoundShift: ultrasoundShift,
        lightRatios: lightRatios,
        opticalDoppler: opticalDoppler,
        radialProjection: radialProjection,
        weatherRadial: weatherRadial,
        classifyRadial: classifyRadial,
        soundParticleX: function (equilibriumX, time, amplitude, waveNumber, angularFrequency) {
            return equilibriumX + amplitude * Math.sin(waveNumber * equilibriumX - angularFrequency * time);
        }
    };

    if (!PC || !PC.registry || !engine) {
        return;
    }

    function projector(size, world) {
        var plot = { x: size.width * 0.055, y: size.height * 0.1, w: size.width * 0.89, h: size.height * 0.62 };
        var scale = Math.min(plot.w / world.width, plot.h / world.height);
        var ox = plot.x + (plot.w - world.width * scale) / 2;
        var oy = plot.y + (plot.h - world.height * scale) / 2;
        return {
            plot: plot,
            scale: scale,
            point: function (p) { return { x: ox + p.x * scale, y: oy + p.y * scale }; },
            length: function (meters) { return meters * scale; }
        };
    }

    function makeAcousticState(mode, config) {
        var state = {
            mode: mode,
            scenario: acousticScenarioFor(mode, config),
            speed: Number(config.speed || 25),
            speedLabel: "medium",
            position: "medium",
            direction: Number(config.direction || 1),
            radius: Number(config.radius || 26),
            visualScale: config.slowMotion ? 0.5 : 1,
            running: config.startPaused ? false : true,
            showWaves: config.showWaves !== false,
            showGraph: config.showGraph !== false,
            distanceLoudness: !!config.distanceLoudness,
            elapsed: 0,
            traces: {},
            audio: makeMotorAudio(),
            sim: null
        };

        state.reset = function () {
            state.sim = new engine.Simulation({
                WorldWidthMeters: acousticWorld.width,
                WorldHeightMeters: acousticWorld.height,
                SourceFrequency: 180,
                SourceSpeed: state.speed,
                MaxWavefronts: 34,
                ChartWindowSeconds: 9,
                RepresentativeWaveInterval: 0.68
            });
            state.sim.setBaseFrequency(180);
            state.sim.setSourceSpeedSetting(state.speed);
            state.sim.setOption("distanceLoudness", state.distanceLoudness);
            state.sim.setOption("selectedListener", "A");
            state.sim.setOption("soundMode", "engine");
            state.sim.running = state.running;
            state.elapsed = 0;
            setAcousticBodies(state, true);
            state.sim.pushHistory();
        };

        state.reset();
        return state;
    }

    function acousticScenarioFor(mode, config) {
        var requested = (config && config.mode) || mode;
        if (requested === "doppler-approach" || requested === "approach" || requested === "opening-sound") return "approach";
        if (requested === "doppler-recede" || requested === "recede") return "recede";
        if (requested === "lab-auto-pass" || requested === "lab-speed-compare" || requested === "pass") return "pass";
        if (requested === "lab-sideways-circular" || requested === "sideways") return "sideways";
        if (requested === "circular") return "circular";
        return "stationary";
    }

    function aw(value) {
        return value * acousticWorldScale;
    }

    function setAcousticBodies(state, initial) {
        var sim = state.sim;
        var source = sim.source;
        var listener = sim.listeners[0];
        listener.active = true;
        listener.vx = 0;
        listener.vy = 0;
        var e = state.elapsed;
        var s = state.speed;

        if (state.scenario === "stationary") {
            var x = state.position === "far" ? aw(35) : state.position === "near" ? aw(92) : aw(65);
            source.x = x;
            source.y = aw(46);
            source.vx = 0;
            source.vy = 0;
            listener.x = aw(122);
            listener.y = aw(46);
            return;
        }

        if (state.scenario === "recede") {
            listener.x = aw(42);
            listener.y = aw(48);
            source.x = aw(56) + (e * s) % aw(82);
            source.y = aw(48);
            source.vx = s;
            source.vy = 0;
            return;
        }

        if (state.scenario === "sideways") {
            listener.x = aw(82);
            listener.y = aw(48);
            var travel = aw(68);
            var y = aw(14) + (e * s) % travel;
            source.x = aw(82);
            source.y = y;
            source.vx = 0;
            source.vy = s;
            return;
        }

        if (state.scenario === "circular") {
            listener.x = aw(95);
            listener.y = aw(47);
            var center = { x: aw(78), y: aw(47) };
            var radiusMeters = aw(state.radius);
            var omega = s / Math.max(8, radiusMeters);
            var theta = Math.PI + state.direction * omega * e;
            source.x = center.x + radiusMeters * Math.cos(theta);
            source.y = center.y + radiusMeters * Math.sin(theta);
            source.vx = -state.direction * radiusMeters * omega * Math.sin(theta);
            source.vy = state.direction * radiusMeters * omega * Math.cos(theta);
            sim.closestApproach = { x: center.x, y: center.y, label: "center" };
            return;
        }

        listener.x = state.scenario === "pass" ? aw(80) : aw(122);
        listener.y = state.scenario === "pass" ? aw(52) : aw(46);
        var startX = state.scenario === "pass" ? aw(12) : aw(22);
        var path = state.scenario === "pass" ? aw(136) : aw(84);
        source.x = startX + (e * s) % path;
        source.y = state.scenario === "pass" ? aw(38) : aw(46);
        source.vx = s;
        source.vy = 0;
        if (initial) {
            sim.closestApproach = { x: listener.x, y: source.y, label: "closest" };
        }
    }

    function stepAcoustic(state, dt) {
        var sim = state.sim;
        if (state.running && dt > 0) {
            var visualDt = dt * state.visualScale;
            var previousPhase = Math.floor(state.elapsed / 12);
            state.elapsed += visualDt;
            sim.time += visualDt;
            if (Math.floor(state.elapsed / 12) !== previousPhase && state.scenario !== "stationary" && state.scenario !== "circular") {
                sim.resetTimeSeries();
                sim.time = 0;
                state.elapsed = 0;
            }
            setAcousticBodies(state, false);
            sim.running = true;
            sim.pushHistory();
            sim.emitRepresentativeWavefronts();
            sim.updateChartHistory();
        }
        sim.setOption("distanceLoudness", state.distanceLoudness);
        var metrics = sim.getMetrics();
        metrics.options.selectedListener = "A";
        metrics.options.soundMode = "engine";
        metrics.options.distanceLoudness = state.distanceLoudness;
        state.audio.update(metrics);
        return metrics;
    }

    function acousticComponent(mode) {
        return function (node, config, language) {
            return mountAcoustic(node, config || {}, language, mode);
        };
    }

    function mountAcoustic(node, config, language, mode) {
        var labels = labelsFor(language);
        var state = makeAcousticState(mode, config);
        var ui = makeCanvasShell(node, acousticTitle(mode, labels), language);
        ui.shell.__presentationDebug = { type: "acoustic", state: state };
        var soundButton = button(labels.sound, function (btn) {
            if (state.audio.isRunning()) {
                state.audio.stop();
                btn.classList.remove("active");
            } else {
                state.audio.start();
                btn.classList.add("active");
            }
        });
        ui.controls.appendChild(button(labels.start + "/" + labels.pause, function (btn) {
            state.running = !state.running;
            btn.classList.toggle("active", state.running);
        }));
        ui.controls.appendChild(button(labels.reset, function () {
            state.reset();
            state.traces = {};
        }));
        ui.controls.appendChild(soundButton);
        ui.controls.appendChild(button(labels.waves, function (btn) {
            state.showWaves = !state.showWaves;
            btn.classList.toggle("muted", !state.showWaves);
        }));
        ui.controls.appendChild(button(labels.graph, function (btn) {
            state.showGraph = !state.showGraph;
            btn.classList.toggle("muted", !state.showGraph);
        }));
        ui.controls.appendChild(button(labels.slowMotion, function (btn) {
            state.visualScale = state.visualScale === 1 ? 0.5 : state.visualScale === 0.5 ? 0.25 : 1;
            btn.textContent = state.visualScale === 1 ? labels.normalSpeed : state.visualScale === 0.5 ? labels.slowMotion : labels.verySlow;
            btn.classList.toggle("active", state.visualScale < 1);
        }));

        if (state.scenario === "stationary") {
            ["far", "medium", "near"].forEach(function (pos) {
                ui.controls.appendChild(button(labels[pos], function () {
                    state.position = pos;
                    state.reset();
                }));
            });
            ui.controls.appendChild(button(labels.distanceLoudness, function (btn) {
                state.distanceLoudness = !state.distanceLoudness;
                btn.classList.toggle("active", state.distanceLoudness);
            }));
        }

        if (mode === "lab-speed-compare" || state.scenario !== "stationary") {
            [
                { label: labels.slow, value: 10, key: "slow" },
                { label: labels.medium, value: 25, key: "medium" },
                { label: labels.fast, value: 45, key: "fast" }
            ].forEach(function (preset) {
                ui.controls.appendChild(button(preset.label, function () {
                    state.traces[state.speedLabel] = (state.sim.chartHistory || []).slice(-140);
                    state.speed = preset.value;
                    state.speedLabel = preset.key;
                    state.reset();
                }));
            });
        }

        if (mode === "lab-sideways-circular") {
            ui.controls.appendChild(button(labels.sideways, function () {
                state.scenario = "sideways";
                state.reset();
            }));
            ui.controls.appendChild(button(labels.rotatingStorm.replace(labels.rotatingStorm, language === "ar" ? "حركة دائرية" : "Circular"), function () {
                state.scenario = "circular";
                state.reset();
            }));
            ui.controls.appendChild(button(labels.direction, function () {
                state.direction *= -1;
                state.reset();
            }));
        }

        var controller = animate(ui.canvas, function (ctx, size, dt) {
            var metrics = stepAcoustic(state, dt);
            drawAcousticScene(ctx, size, metrics, state, labels);
            updateAcousticReadout(ui.readout, metrics, state, labels);
        });

        return joinControllers(controller, {
            pause: function () { state.audio.pause(); },
            resume: function () { state.audio.resume(); },
            dispose: function () { state.audio.stop(); }
        });
    }

    function acousticTitle(mode, labels) {
        if (mode === "doppler-approach" || mode === "opening-sound") return labels.approaching;
        if (mode === "doppler-recede") return labels.receding;
        if (mode === "lab-speed-compare") return labels.speed;
        if (mode === "lab-sideways-circular") return labels.transverse;
        if (mode === "sideways") return labels.transverse;
        if (mode === "circular") return languageLabel("حركة دائرية", "Circular motion");
        if (mode === "lab-auto-pass") return labels.motorcycle;
        return labels.stationary;
    }

    function updateAcousticReadout(node, metrics, state, labels) {
        var m = metrics.listeners[0];
        node.innerHTML = "";
        [
            labels.emitted + ": " + fmt(m.emittedFrequency, 1) + " Hz",
            labels.observed + ": " + fmt(m.observedFrequency, 1) + " Hz",
            labels.radial + ": " + fmt(m.sourceRadialTowardObserver, 1) + " m/s",
            labels.distance + ": " + fmt(m.distance, 1) + " m",
            labels.state + ": " + stateLabel(m.state, labels)
        ].forEach(function (text) {
            node.appendChild(el("span", "", text));
        });
    }

    function stateLabel(state, labels) {
        if (state === "approaching") return labels.approaching;
        if (state === "receding") return labels.receding;
        if (state === "tangential") return labels.transverse;
        return labels.stationary;
    }

    function drawAcousticScene(ctx, size, metrics, state, labels) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        var map = projector(size, metrics.world);
        var source = metrics.source;
        var listenerMetric = metrics.listeners[0];
        var listener = listenerMetric.listener;
        drawPlotFrame(ctx, map.plot);
        if (state.showWaves) {
            drawEngineWavefronts(ctx, map, metrics);
        }
        drawPathGuides(ctx, map, metrics, state, labels);
        var sp = map.point(source);
        var lp = map.point(listener);
        drawLine(ctx, sp.x, sp.y, lp.x, lp.y, "rgba(255,255,255,.45)");
        drawArrow(ctx, sp.x, sp.y - 28, sp.x + source.vx * map.scale * 0.8, sp.y - 28 + source.vy * map.scale * 0.8, "#ffb45c");
        drawMotorcycleSprite(ctx, sp.x, sp.y, Math.max(74, size.height * 0.16), source.vx > 0);
        drawListenerSprite(ctx, lp.x, lp.y, Math.max(88, size.height * 0.19));
        drawLabel(ctx, labels.motorcycle, sp.x, sp.y + Math.max(48, size.height * 0.085));
        drawLabel(ctx, labels.listener, lp.x, lp.y + Math.max(72, size.height * 0.12));
        drawAcousticBadge(ctx, size, listenerMetric, labels);
        if (state.showGraph) {
            drawFrequencyGraph(ctx, size, metrics, state, labels);
        }
    }

    function drawEngineWavefronts(ctx, map, metrics) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(map.plot.x, map.plot.y, map.plot.w, map.plot.h);
        ctx.clip();
        metrics.wavefronts.forEach(function (wave, index) {
            var center = map.point(wave);
            var radius = map.length(metrics.soundSpeed * Math.max(0, metrics.time - wave.t));
            ctx.strokeStyle = index % 2 ? "rgba(39,179,255,.33)" : "rgba(255,180,92,.3)";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.restore();
    }

    function drawPathGuides(ctx, map, metrics, state, labels) {
        if (state.scenario === "circular" && metrics.autoMotion && metrics.autoMotion.config) {
            var center = metrics.autoMotion.config.center;
            if (center) {
                var c = map.point(center);
                ctx.strokeStyle = "rgba(255,180,92,.45)";
                ctx.setLineDash([10, 10]);
                ctx.beginPath();
                ctx.arc(c.x, c.y, map.length(state.radius), 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                drawLabel(ctx, languageLabel("المركز", "center"), c.x, c.y - 28);
            }
        }
        if (metrics.closestApproach) {
            var p = map.point(metrics.closestApproach);
            ctx.strokeStyle = "rgba(155,225,93,.65)";
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.moveTo(p.x, map.plot.y);
            ctx.lineTo(p.x, map.plot.y + map.plot.h);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    function languageLabel(ar, en) {
        return document.documentElement.lang === "en" ? en : ar;
    }

    function drawAcousticBadge(ctx, size, metric, labels) {
        var text = Math.abs(metric.observedFrequency - metric.emittedFrequency) < 0.5 ? labels.noShift :
            metric.observedFrequency > metric.emittedFrequency ? labels.higher : labels.lower;
        var color = metric.observedFrequency > metric.emittedFrequency ? "#9be15d" :
            metric.observedFrequency < metric.emittedFrequency ? "#ffb45c" : "#d9f4ff";
        ctx.fillStyle = color;
        roundRect(ctx, size.width * 0.055, size.height * 0.035, size.width * 0.27, 42, 16, true);
        ctx.fillStyle = "#061323";
        ctx.font = "bold " + Math.max(18, size.width * 0.018) + "px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, size.width * 0.19, size.height * 0.035 + 21);
    }

    function drawFrequencyGraph(ctx, size, metrics, state, labels) {
        var x = size.width * 0.58;
        var y = size.height * 0.035;
        var w = size.width * 0.36;
        var h = size.height * 0.22;
        ctx.fillStyle = "rgba(8,20,34,.78)";
        roundRect(ctx, x, y, w, h, 12, true);
        ctx.strokeStyle = "rgba(255,255,255,.2)";
        ctx.strokeRect(x, y, w, h);
        ctx.font = "bold " + Math.max(14, size.width * 0.012) + "px Arial";
        ctx.fillStyle = "#f5fbff";
        ctx.fillText(labels.observed, x + w / 2, y + 18);
        var traces = [];
        Object.keys(state.traces).forEach(function (key) {
            if (state.traces[key] && state.traces[key].length > 2) {
                traces.push({ data: state.traces[key], color: key === "fast" ? "#ff6f61" : key === "slow" ? "#9be15d" : "#ffb45c" });
            }
        });
        traces.push({ data: metrics.chartHistory || [], color: "#27b3ff" });
        traces.forEach(function (trace) {
            ctx.beginPath();
            trace.data.slice(-160).forEach(function (point, index, arr) {
                var px = x + index / Math.max(1, arr.length - 1) * w;
                var py = y + h * 0.58 - (point.frequency - 180) / 80 * h * 0.38;
                py = clamp(py, y + 28, y + h - 10);
                if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            });
            ctx.strokeStyle = trace.color;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        });
    }

    function openingSound(node, config, language) {
        node.classList.add("opening-question-block");
        var controller = mountAcoustic(node, config || {}, language, "opening-sound");
        var labels = labelsFor(language);
        var question = el("div", "component-card compact-question");
        question.appendChild(el("h3", "", language === "ar" ? "اختر التوقع الصحيح" : "Choose the best prediction"));
        var choices = el("div", "choice-row");
        (config.choices || []).forEach(function (choice, index) {
            var btn = button(localText(choice, language), function () {
                Array.prototype.forEach.call(choices.children, function (item) { item.classList.remove("selected", "correct", "wrong"); });
                btn.classList.add(index === Number(config.correctIndex || 0) ? "correct" : "wrong");
            });
            btn.className = "choice-button";
            choices.appendChild(btn);
        });
        question.appendChild(choices);
        question.appendChild(el("p", "component-result", labels.challengeHigher));
        node.appendChild(question);
        return controller;
    }

    function waveBasics(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, labels.soundWaves || (language === "ar" ? "انتشار الصوت" : "Sound propagation"), language);
        var state = {
            running: true,
            speedScale: 1,
            showCompression: true,
            showRarefaction: true,
            track: false,
            time: 0,
            tone: makeSonification()
        };
        ui.controls.appendChild(button(labels.start + "/" + labels.pause, function (btn) {
            state.running = !state.running;
            btn.classList.toggle("active", state.running);
        }));
        ui.controls.appendChild(button(labels.reset, function () { state.time = 0; }));
        ui.controls.appendChild(button(labels.normalSpeed, function () { state.speedScale = 1; }));
        ui.controls.appendChild(button(labels.slowMotion, function () { state.speedScale = 0.25; }));
        ui.controls.appendChild(button(labels.showCompression, function (btn) { state.showCompression = !state.showCompression; btn.classList.toggle("muted", !state.showCompression); }));
        ui.controls.appendChild(button(labels.showRarefaction, function (btn) { state.showRarefaction = !state.showRarefaction; btn.classList.toggle("muted", !state.showRarefaction); }));
        ui.controls.appendChild(button(labels.trackParticle, function (btn) { state.track = !state.track; btn.classList.toggle("active", state.track); }));
        ui.controls.appendChild(button(language === "ar" ? "صوت" : "Sound", function (btn) {
            if (state.tone.isRunning()) {
                state.tone.stop();
                btn.classList.remove("active");
            } else {
                state.tone.start();
                btn.classList.add("active");
            }
        }));
        var controller = animate(ui.canvas, function (ctx, size, dt) {
            if (state.running) {
                state.time += dt * state.speedScale;
            }
            state.tone.update(Math.sin(state.time * 4) * 30, 80);
            drawParticleWave(ctx, size, state, labels);
            ui.readout.textContent = labels.resultParticles;
        });
        return joinControllers(controller, { dispose: function () { state.tone.stop(); }, pause: function () { state.tone.pause(); }, resume: function () { state.tone.resume(); } });
    }

    function drawParticleWave(ctx, size, state, labels) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        var left = size.width * 0.11;
        var right = size.width * 0.9;
        var rows = 4;
        var cols = 30;
        var amplitude = size.width * 0.014;
        var k = Math.PI * 2 / ((right - left) * 0.28);
        var omega = 5.8;
        drawSpeaker(ctx, left - 48, size.height * 0.5, 28 + Math.sin(state.time * omega) * 5);
        drawArrow(ctx, left - 10, size.height * 0.17, right, size.height * 0.17, "#ffb45c");
        for (var c = 0; c < cols; c += 1) {
            var eqX = left + c / (cols - 1) * (right - left);
            var phase = Math.sin(k * eqX - omega * state.time);
            if (state.showCompression && phase > 0.82) {
                ctx.fillStyle = "rgba(39,179,255,.14)";
                ctx.fillRect(eqX - 18, size.height * 0.25, 36, size.height * 0.48);
            }
            if (state.showRarefaction && phase < -0.82) {
                ctx.fillStyle = "rgba(255,180,92,.14)";
                ctx.fillRect(eqX - 18, size.height * 0.25, 36, size.height * 0.48);
            }
        }
        for (var r = 0; r < rows; r += 1) {
            var y = size.height * (0.34 + r * 0.1);
            for (var i = 0; i < cols; i += 1) {
                var equilibrium = left + i / (cols - 1) * (right - left);
                var x = global.PresentationPhysics.soundParticleX(equilibrium, state.time, amplitude, k, omega);
                var tracked = state.track && i === 12 && r === 1;
                ctx.strokeStyle = tracked ? "#ffb45c" : "rgba(255,255,255,.22)";
                ctx.beginPath();
                ctx.moveTo(equilibrium, y - 16);
                ctx.lineTo(equilibrium, y + 16);
                ctx.stroke();
                ctx.fillStyle = tracked ? "#ffb45c" : "#d9f4ff";
                ctx.beginPath();
                ctx.arc(x, y, tracked ? 9 : 6, 0, Math.PI * 2);
                ctx.fill();
                if (tracked) {
                    drawLine(ctx, equilibrium, y + 24, x, y + 24, "#ffb45c");
                    drawLabel(ctx, languageLabel("موضع الاتزان", "equilibrium"), equilibrium, y + 50);
                }
            }
        }
        drawLabel(ctx, labels.compression, size.width * 0.38, size.height * 0.78);
        drawLabel(ctx, labels.rarefaction, size.width * 0.66, size.height * 0.78);
    }

    function openingDemoSequence(node, config, language) {
        var labels = labelsFor(language);
        var demoController = null;
        var step = 0;
        var copy = config || {};

        function clearDemo() {
            if (demoController && demoController.dispose) {
                demoController.dispose();
            }
            demoController = null;
            node.innerHTML = "";
        }

        function paragraph(text) {
            var p = el("p", "", localText(text, language));
            return p;
        }

        function renderIntro() {
            clearDemo();
            var card = el("div", "component-card sequence-card");
            card.appendChild(paragraph(copy.initialText || {
                ar: "سنبدأ بموقف نسمعه في حياتنا اليومية. تخيلوا أن دراجة نارية تصدر صوتًا ثابتًا، ثم تقترب من شخص يقف بجانب الطريق، تمر أمامه، وبعد ذلك تبتعد عنه.",
                en: "We begin with an everyday situation. Imagine a motorcycle producing a steady sound, approaching a person beside the road, passing them, and then moving away."
            }));
            var controls = el("div", "component-controls");
            controls.appendChild(button(localText(copy.watchLabel || { ar: "شاهد التجربة", en: "Watch the demonstration" }, language), function () {
                step = 1;
                renderDemo();
            }));
            card.appendChild(controls);
            node.appendChild(card);
        }

        function renderDemo() {
            clearDemo();
            var state = makeAcousticState("lab-auto-pass", { speed: 25, showWaves: true, showGraph: false });
            state.running = false;
            var ui = makeCanvasShell(node, localText(copy.demoTitle || { ar: "تجربة مرور الدراجة", en: "Motorcycle pass demonstration" }, language), language);
            ui.shell.__presentationDebug = { type: "opening-demo", state: state };
            ui.controls.appendChild(button(localText({ ar: "ابدأ", en: "Start" }, language), function () { state.running = true; }));
            ui.controls.appendChild(button(localText({ ar: "إيقاف مؤقت", en: "Pause" }, language), function () { state.running = false; }));
            ui.controls.appendChild(button(localText({ ar: "إعادة التجربة", en: "Replay" }, language), function () {
                state.reset();
                state.running = true;
            }));
            ui.controls.appendChild(button(labels.sound, function (btn) {
                if (state.audio.isRunning()) {
                    state.audio.stop();
                    btn.classList.remove("active");
                } else {
                    state.audio.start();
                    btn.classList.add("active");
                }
            }));
            ui.controls.appendChild(button(localText({ ar: "متابعة الشرح", en: "Continue explanation" }, language), function () {
                step = 2;
                renderConclusion();
            }));
            demoController = animate(ui.canvas, function (ctx, size, dt) {
                var metrics = stepAcoustic(state, dt);
                drawAcousticScene(ctx, size, metrics, state, labels);
                updateAcousticReadout(ui.readout, metrics, state, labels);
            });
        }

        function renderConclusion() {
            clearDemo();
            var card = el("div", "component-card sequence-card");
            card.appendChild(paragraph(copy.observationText || {
                ar: "نلاحظ أن صوت الدراجة يبدو أحدّ أثناء اقترابها، ثم يصبح أغلظ بعد أن تمر وتبدأ بالابتعاد.",
                en: "We observe that the motorcycle sounds higher while it approaches, then lower after it passes and begins to recede."
            }));
            card.appendChild(paragraph(copy.explanationText || {
                ar: "صوت المحرك الأصلي بقي ثابتًا، لذلك لا يمكن تفسير ما سمعناه بتغير صادر من المحرك نفسه. التغير ناتج عن حركة الدراجة بالنسبة إلى المستمع، وهو ما سنفسره من خلال تأثير دوبلر.",
                en: "The original engine sound stayed constant, so the heard change did not come from the engine changing itself. It came from the motorcycle motion relative to the listener, which is the idea explained by the Doppler effect."
            }));
            var controls = el("div", "component-controls");
            controls.appendChild(button(localText({ ar: "إعادة المشاهدة", en: "Watch again" }, language), function () {
                step = 1;
                renderDemo();
            }));
            card.appendChild(controls);
            node.appendChild(card);
        }

        renderIntro();
        return {
            pause: function () { if (demoController && demoController.pause) demoController.pause(); },
            resume: function () { if (demoController && demoController.resume) demoController.resume(); },
            resize: function () { if (demoController && demoController.resize) demoController.resize(); },
            dispose: clearDemo
        };
    }

    function radialVelocityLab(node, config, language) {
        var ui = makeCanvasShell(node, localText({ ar: "مختبر السرعة الشعاعية", en: "Radial velocity lab" }, language), language);
        var state = {
            speed: Number(config.speed || 30),
            angle: Number(config.angle || 0),
            dragging: false
        };
        ui.shell.__presentationDebug = { type: "radial-velocity", state: state };

        function setAngle(value) {
            state.angle = ((Number(value) % 360) + 360) % 360;
            angle.value = String(Math.round(state.angle));
        }

        [
            { label: localText({ ar: "0° نحو المراقب", en: "0° toward" }, language), value: 0 },
            { label: localText({ ar: "90° جانبية", en: "90° transverse" }, language), value: 90 },
            { label: localText({ ar: "180° بعيدًا", en: "180° away" }, language), value: 180 }
        ].forEach(function (preset) {
            ui.controls.appendChild(button(preset.label, function () { setAngle(preset.value); }));
        });

        var speed = document.createElement("input");
        speed.type = "range";
        speed.min = "0";
        speed.max = "60";
        speed.value = String(state.speed);
        speed.setAttribute("aria-label", localText({ ar: "السرعة الكلية", en: "Total speed" }, language));
        speed.addEventListener("input", function () { state.speed = Number(speed.value); });
        ui.controls.appendChild(speed);

        var angle = document.createElement("input");
        angle.type = "range";
        angle.min = "0";
        angle.max = "360";
        angle.value = String(state.angle);
        angle.setAttribute("aria-label", localText({ ar: "زاوية الحركة", en: "Motion angle" }, language));
        angle.addEventListener("input", function () { state.angle = Number(angle.value); });
        ui.controls.appendChild(angle);

        function pointerAngle(event) {
            var rect = ui.canvas.getBoundingClientRect();
            var sx = (event.clientX - rect.left) * (ui.canvas.width / rect.width);
            var sy = (event.clientY - rect.top) * (ui.canvas.height / rect.height);
            var observer = { x: ui.canvas.width * 0.2, y: ui.canvas.height * 0.55 };
            var object = { x: ui.canvas.width * 0.64, y: ui.canvas.height * 0.55 };
            var toward = Math.atan2(observer.y - object.y, observer.x - object.x);
            var chosen = Math.atan2(sy - object.y, sx - object.x);
            setAngle((chosen - toward) * 180 / Math.PI);
        }

        ui.canvas.addEventListener("pointerdown", function (event) {
            state.dragging = true;
            ui.canvas.setPointerCapture(event.pointerId);
            pointerAngle(event);
        });
        ui.canvas.addEventListener("pointermove", function (event) {
            if (state.dragging) pointerAngle(event);
        });
        ui.canvas.addEventListener("pointerup", function (event) {
            state.dragging = false;
            try { ui.canvas.releasePointerCapture(event.pointerId); } catch (ignore) { }
        });

        return animate(ui.canvas, function (ctx, size) {
            drawRadialVelocityScene(ctx, size, state, language, ui.readout);
        });
    }

    function drawRadialVelocityScene(ctx, size, state, language, readout) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        var observer = { x: size.width * 0.2, y: size.height * 0.55 };
        var object = { x: size.width * 0.64, y: size.height * 0.55 };
        var los = norm({ x: object.x - observer.x, y: object.y - observer.y });
        var toward = { x: -los.x, y: -los.y };
        var angleRad = state.angle * Math.PI / 180;
        var velocity = {
            x: state.speed * (toward.x * Math.cos(angleRad) - toward.y * Math.sin(angleRad)),
            y: state.speed * (toward.x * Math.sin(angleRad) + toward.y * Math.cos(angleRad))
        };
        var projection = radialProjection(object, observer, velocity);
        var radialToward = -projection.radial;
        var stateText = Math.abs(radialToward) < 1 ?
            localText({ ar: "حركة جانبية تقريبًا", en: "Nearly transverse motion" }, language) :
            radialToward > 0 ? localText({ ar: "حركة نحو المراقب", en: "Motion toward the observer" }, language) :
                localText({ ar: "حركة بعيدًا عن المراقب", en: "Motion away from the observer" }, language);

        drawListenerSprite(ctx, observer.x, observer.y, Math.max(80, size.height * 0.18));
        ctx.fillStyle = "#ffb45c";
        ctx.beginPath(); ctx.arc(object.x, object.y, 22, 0, Math.PI * 2); ctx.fill();
        drawLabel(ctx, localText({ ar: "المراقب", en: "Observer" }, language), observer.x, observer.y + 76);
        drawLabel(ctx, localText({ ar: "الجسم المتحرك", en: "Moving object" }, language), object.x, object.y + 58);
        drawLine(ctx, observer.x, observer.y, object.x, object.y, "rgba(255,255,255,.55)");
        drawLabel(ctx, localText({ ar: "خط النظر", en: "Line of sight" }, language), (observer.x + object.x) / 2, observer.y - 30);
        var scale = Math.max(3.2, size.width * 0.004);
        drawArrow(ctx, object.x, object.y, object.x + velocity.x * scale, object.y + velocity.y * scale, "#ffb45c");
        drawArrow(ctx, object.x, object.y + 26, object.x + projection.radialVector.x * scale, object.y + 26 + projection.radialVector.y * scale, "#5ce1ff");
        drawArrow(ctx, object.x, object.y + 52, object.x + projection.transverseVector.x * scale, object.y + 52 + projection.transverseVector.y * scale, "#9be15d");
        drawLabel(ctx, localText({ ar: "السرعة الكلية", en: "Total velocity" }, language), object.x + velocity.x * scale, object.y + velocity.y * scale - 22);
        drawLabel(ctx, localText({ ar: "المركبة الشعاعية", en: "Radial component" }, language), object.x + projection.radialVector.x * scale, object.y + 26 + projection.radialVector.y * scale + 28);
        drawLabel(ctx, localText({ ar: "المركبة الجانبية", en: "Transverse component" }, language), object.x + projection.transverseVector.x * scale, object.y + 52 + projection.transverseVector.y * scale + 28);
        drawLabel(ctx, stateText, size.width * 0.5, size.height * 0.18);

        readout.innerHTML = "";
        [
            localText({ ar: "السرعة الكلية", en: "Total speed" }, language) + ": " + fmt(state.speed, 1) + " m/s",
            localText({ ar: "السرعة الشعاعية", en: "Radial velocity" }, language) + ": " + fmt(radialToward, 1) + " m/s",
            localText({ ar: "الزاوية", en: "Angle" }, language) + ": " + fmt(state.angle, 0) + "°",
            stateText
        ].forEach(function (text) { readout.appendChild(el("span", "", text)); });
    }

    function labChallenge(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, language === "ar" ? "تحديات فيزيائية" : "Physics challenges", language);
        var state = { target: "higher", speed: 25, angle: 0, source: { x: 55, y: 45 }, listener: { x: 118, y: 45 }, sound: makeMotorAudio(), sim: null };
        ui.shell.__presentationDebug = { type: "challenge", state: state };
        var angleLabel = el("span", "inline-status", "");
        function resetSim() {
            state.sim = new engine.Simulation({ WorldWidthMeters: 160, WorldHeightMeters: 90, SourceFrequency: 180, MaxWavefronts: 18, RepresentativeWaveInterval: 0.7 });
            state.sim.listeners[0].x = state.listener.x;
            state.sim.listeners[0].y = state.listener.y;
            state.sim.source.x = state.source.x;
            state.sim.source.y = state.source.y;
            var rad = state.angle * Math.PI / 180;
            state.sim.source.vx = state.speed * Math.cos(rad);
            state.sim.source.vy = state.speed * Math.sin(rad);
            state.sim.running = true;
            state.sim.pushHistory();
            state.sim.emitRepresentativeWavefronts();
            state.sim.updateChartHistory();
            angleLabel.textContent = (language === "ar" ? "الزاوية: " : "Angle: ") + fmt(state.angle, 0) + "°";
        }
        resetSim();
        [
            { id: "higher", label: labels.challengeHigher },
            { id: "lower", label: labels.challengeLower },
            { id: "small", label: labels.challengeFastSmall }
        ].forEach(function (item) {
            ui.controls.appendChild(button(item.label, function () { state.target = item.id; }));
        });
        var speed = document.createElement("input");
        speed.type = "range"; speed.min = "0"; speed.max = "60"; speed.value = "25"; speed.setAttribute("aria-label", labels.speed);
        speed.addEventListener("input", function () { state.speed = Number(speed.value); resetSim(); });
        ui.controls.appendChild(speed);
        var angle = document.createElement("input");
        angle.type = "range"; angle.min = "0"; angle.max = "360"; angle.value = "0"; angle.setAttribute("aria-label", language === "ar" ? "زاوية الحركة" : "Motion angle");
        angle.addEventListener("input", function () { state.angle = Number(angle.value); resetSim(); });
        ui.controls.appendChild(angle);
        ui.controls.appendChild(angleLabel);
        [
            { label: labels.towardListener, angle: 0, source: { x: 55, y: 45 } },
            { label: labels.awayListener, angle: 180, source: { x: 55, y: 45 } },
            { label: labels.rightTransverse, angle: 90, source: { x: 55, y: 45 } },
            { label: labels.leftTransverse, angle: 270, source: { x: 55, y: 45 } }
        ].forEach(function (preset) {
            ui.controls.appendChild(button(preset.label, function () {
                state.angle = preset.angle;
                state.source = { x: preset.source.x, y: preset.source.y };
                angle.value = String(preset.angle);
                resetSim();
            }));
        });
        ui.controls.appendChild(button(labels.sound, function (btn) {
            if (state.sound.isRunning()) { state.sound.stop(); btn.classList.remove("active"); } else { state.sound.start(); btn.classList.add("active"); }
        }));
        ui.canvas.addEventListener("pointerdown", function (event) {
            var rect = ui.canvas.getBoundingClientRect();
            var px = (event.clientX - rect.left) / rect.width * 160;
            var py = (event.clientY - rect.top) / rect.height * 90;
            state.source.x = clamp(px, 12, 148);
            state.source.y = clamp(py, 12, 78);
            resetSim();
        });
        var controller = animate(ui.canvas, function (ctx, size, dt) {
            state.sim.update(dt);
            var metrics = state.sim.getMetrics();
            state.sound.update(metrics);
            var m = metrics.listeners[0];
            var ok = state.target === "higher" ? m.observedFrequency > m.emittedFrequency + 0.5 :
                state.target === "lower" ? m.observedFrequency < m.emittedFrequency - 0.5 :
                    m.sourceSpeed >= 40 && Math.abs(m.sourceRadialTowardObserver) <= 4;
            drawAcousticScene(ctx, size, metrics, { showWaves: true, showGraph: true, traces: {}, scenario: "challenge" }, labels);
            ui.readout.textContent = (ok ? labels.challengeMet : labels.adjustMotion) + " " +
                labels.speed + ": " + fmt(m.sourceSpeed, 1) + " m/s | " +
                labels.radial + ": " + fmt(m.sourceRadialTowardObserver, 1) + " m/s | " +
                labels.emitted + ": " + fmt(m.emittedFrequency, 1) + " Hz | " +
                labels.observed + ": " + fmt(m.observedFrequency, 1) + " Hz";
        });
        return joinControllers(controller, { dispose: function () { state.sound.stop(); } });
    }

    function radarCalculation(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, language === "ar" ? "حساب قراءة الرادار" : "Radar reading calculation", language);
        var state = {
            trueSpeed: Number(config.trueSpeed || 25),
            angle: Number(config.angle || 0),
            frequency: Number(config.frequency || 24.125e9)
        };
        ui.shell.__presentationDebug = { type: "radar-calculation", state: state };
        var angleSlider = document.createElement("input");
        angleSlider.type = "range";
        angleSlider.min = "0";
        angleSlider.max = "90";
        angleSlider.value = String(state.angle);
        angleSlider.setAttribute("aria-label", language === "ar" ? "زاوية القياس" : "Measurement angle");
        angleSlider.addEventListener("input", function () { state.angle = Number(angleSlider.value); });
        ui.controls.appendChild(angleSlider);
        [0, 15, 30, 60, 90].forEach(function (angle) {
            ui.controls.appendChild(button(angle + "°", function () { state.angle = angle; angleSlider.value = String(angle); }));
        });
        var controller = animate(ui.canvas, function (ctx, size) {
            var radial = state.trueSpeed * Math.cos(state.angle * Math.PI / 180);
            var shift = radarShift(state.frequency, radial);
            drawRadarCalculationScene(ctx, size, state, radial, shift, labels, language);
            ui.readout.textContent = "f0: " + fmt(state.frequency / 1e9, 3) + " GHz | " +
                labels.speed + ": " + fmt(state.trueSpeed * 3.6, 0) + " km/h = " + fmt(state.trueSpeed, 0) + " m/s | " +
                labels.radial + ": " + fmt(radial, 2) + " m/s | Δf: " + fmt(shift / 1000, 2) + " kHz";
        });
        return controller;
    }

    function drawRadarCalculationScene(ctx, size, state, radial, shift, labels, language) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        var radar = { x: size.width * 0.18, y: size.height * 0.56 };
        var target = { x: size.width * 0.72, y: size.height * 0.56 };
        var angle = state.angle * Math.PI / 180;
        drawRadarDish(ctx, radar.x, radar.y);
        drawMotorcycleSprite(ctx, target.x, target.y, 108, false);
        drawLine(ctx, radar.x + 36, radar.y, target.x - 58, target.y, "rgba(255,255,255,.55)");
        drawArrow(ctx, target.x, target.y - 42, target.x + Math.cos(angle) * 120, target.y - 42 - Math.sin(angle) * 120, "#ffb45c");
        drawArrow(ctx, target.x, target.y + 52, target.x + radial / Math.max(1, state.trueSpeed) * 120, target.y + 52, "#5ce1ff");
        ctx.strokeStyle = "rgba(255,255,255,.65)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(target.x, target.y - 42, 54, -angle, 0); ctx.stroke();
        drawLabel(ctx, state.angle + "°", target.x + 72, target.y - 72);
        drawLabel(ctx, "Δf = 2 f0 vr / c", size.width * 0.5, size.height * 0.18);
        drawLabel(ctx, fmt(shift / 1000, 2) + " kHz", size.width * 0.5, size.height * 0.29);
        drawLabel(ctx, language === "ar" ? "المقاس = الحقيقي × cos(θ)" : "measured = true × cos(θ)", size.width * 0.5, size.height * 0.82);
    }

    function radarComponent(context) {
        return function (node, config, language) {
            var labels = labelsFor(language);
            var ui = makeCanvasShell(node, context === "sports" ? labels.sportsRadar : labels.policeRadar, language);
            var state = {
                context: context,
                phase: "idle",
                phaseTime: 0,
                running: false,
                speed: Number(config.speed || 25),
                direction: Number(config.direction || -1),
                angle: Number(config.angle || 0),
                limit: Number(config.limit || 80),
                object: "football",
                attempts: [],
                sonification: makeSonification(),
                stepMode: false,
                showHistory: config.showHistory !== false
            };
            ui.shell.__presentationDebug = { type: context === "sports" ? "sports-radar" : "police-radar", state: state };
            ui.controls.appendChild(button(context === "sports" ? labels.launch : labels.startMeasurement, function () { startRadar(state); }));
            ui.controls.appendChild(button(labels.pause, function () { state.running = !state.running; }));
            ui.controls.appendChild(button(labels.replay, function () { startRadar(state); }));
            ui.controls.appendChild(button(labels.reset, function () { state.phase = "idle"; state.phaseTime = 0; state.running = false; state.attempts = context === "sports" ? [] : state.attempts; }));
            [
                { label: labels.slow, value: 12 },
                { label: labels.medium, value: 25 },
                { label: labels.fast, value: 42 }
            ].forEach(function (preset) {
                ui.controls.appendChild(button(preset.label, function () { state.speed = preset.value; state.phase = "idle"; }));
            });
            if (context === "sports") {
                [
                    { key: "football", label: labels.football },
                    { key: "tennis", label: labels.tennis },
                    { key: "baseball", label: labels.baseball }
                ].forEach(function (item) {
                    ui.controls.appendChild(button(item.label, function () { state.object = item.key; state.phase = "idle"; }));
                });
                var launchAngle = document.createElement("input");
                launchAngle.type = "range";
                launchAngle.min = "0";
                launchAngle.max = "360";
                launchAngle.value = String(state.angle);
                launchAngle.setAttribute("aria-label", language === "ar" ? "زاوية الإطلاق" : "Launch angle");
                launchAngle.addEventListener("input", function () {
                    state.angle = Number(launchAngle.value);
                    state.phase = "idle";
                });
                ui.controls.appendChild(launchAngle);
                [
                    { label: language === "ar" ? "نحو الرادار" : "Toward radar", angle: 180 },
                    { label: language === "ar" ? "بعيدًا" : "Away", angle: 0 },
                    { label: language === "ar" ? "زاوية صغيرة" : "Slight angle", angle: 25 },
                    { label: language === "ar" ? "عمودي" : "Perpendicular", angle: 90 }
                ].forEach(function (preset) {
                    ui.controls.appendChild(button(preset.label, function () {
                        state.angle = preset.angle;
                        launchAngle.value = String(preset.angle);
                        state.phase = "idle";
                    }));
                });
            } else {
                ui.controls.appendChild(button(labels.direction, function () { state.direction *= -1; state.phase = "idle"; }));
                [0, 30, 60, 90].forEach(function (angle) {
                    ui.controls.appendChild(button(angle + "°", function () { state.angle = angle; state.phase = "idle"; }));
                });
                var limit = document.createElement("input");
                limit.type = "range"; limit.min = "30"; limit.max = "140"; limit.value = state.limit; limit.setAttribute("aria-label", labels.speedLimit);
                limit.addEventListener("input", function () { state.limit = Number(limit.value); });
                ui.controls.appendChild(limit);
            }
            ui.controls.appendChild(button(labels.sonification, function (btn) {
                if (state.sonification.isRunning()) { state.sonification.stop(); btn.classList.remove("active"); } else { state.sonification.start(); btn.classList.add("active"); }
            }));
            var controller = animate(ui.canvas, function (ctx, size, dt) {
                updateRadarState(state, dt);
                drawRadarMeasurement(ctx, size, state, labels);
                updateRadarReadout(ui.readout, state, labels);
            });
            return joinControllers(controller, { dispose: function () { state.sonification.stop(); }, pause: function () { state.sonification.pause(); }, resume: function () { state.sonification.resume(); } });
        };
    }

    function startRadar(state) {
        state.phase = "transmitting";
        state.phaseTime = 0;
        state.running = true;
        state.resultStored = false;
    }

    function updateRadarState(state, dt) {
        if (!state.running || dt <= 0) {
            return;
        }
        state.phaseTime += dt;
        var durations = { transmitting: 0.55, outbound: 0.95, reflection: 0.35, returning: 0.95, processing: 0.55, ready: 999 };
        if (state.phase === "transmitting" && state.phaseTime > durations.transmitting) changePhase(state, "outbound");
        else if (state.phase === "outbound" && state.phaseTime > durations.outbound) changePhase(state, "reflection");
        else if (state.phase === "reflection" && state.phaseTime > durations.reflection) changePhase(state, "returning");
        else if (state.phase === "returning" && state.phaseTime > durations.returning) changePhase(state, "processing");
        else if (state.phase === "processing" && state.phaseTime > durations.processing) {
            changePhase(state, "ready");
            state.running = false;
            if (state.context === "sports" && !state.resultStored) {
                var r = radarResult(state);
                state.attempts.unshift({ object: state.object, speed: r.actualKph, measured: r.measuredKph, shift: r.shift });
                state.attempts = state.attempts.slice(0, 3);
                state.resultStored = true;
            }
        }
        state.sonification.update(radarResult(state).shift, 8000);
    }

    function changePhase(state, phase) {
        state.phase = phase;
        state.phaseTime = 0;
    }

    function radarResult(state) {
        var radial = state.context === "sports" ?
            state.speed * Math.cos(state.angle * Math.PI / 180) :
            (state.direction < 0 ? state.speed : -state.speed) * Math.cos(state.angle * Math.PI / 180);
        var shift = radarShift(24.125e9, radial);
        return {
            radial: radial,
            shift: shift,
            actualKph: Math.abs(state.speed) * 3.6,
            measuredKph: Math.abs(radial) * 3.6,
            approaching: radial < 0,
            over: Math.abs(radial) * 3.6 > state.limit
        };
    }

    function drawRadarMeasurement(ctx, size, state, labels) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        var radar = { x: size.width * 0.13, y: size.height * 0.58 };
        var baseTarget = size.width * 0.77;
        var moving = (state.phase === "idle" ? 0 : state.phaseTime) * state.speed * 1.3;
        var vx = state.context === "sports" ? Math.cos(state.angle * Math.PI / 180) : state.direction * Math.cos(state.angle * Math.PI / 180);
        var vy = state.context === "sports" ? Math.sin(state.angle * Math.PI / 180) : Math.sin(state.angle * Math.PI / 180);
        var target = {
            x: clamp(baseTarget + moving * vx, size.width * 0.34, size.width * 0.9),
            y: clamp(radar.y + moving * vy, size.height * 0.25, size.height * 0.82)
        };
        drawRadarDish(ctx, radar.x, radar.y);
        drawArrow(ctx, target.x - vx * 58, target.y - vy * 58, target.x, target.y, "#ffb45c");
        if (state.context === "sports") drawSportsBall(ctx, target.x, target.y, state.object); else drawMotorcycleSprite(ctx, target.x, target.y, 112, vx > 0);
        drawLine(ctx, radar.x + 34, radar.y, target.x - 44, target.y, "rgba(255,255,255,.45)");
        drawRadarPulses(ctx, radar, target, state);
        var status = phaseLabel(state.phase, labels);
        drawLabel(ctx, status, size.width * 0.5, size.height * 0.18);
        var result = radarResult(state);
        if (state.phase === "ready") {
            drawLabel(ctx, fmt(result.measuredKph, 0) + " km/h | " + fmt(Math.abs(result.shift) / 1000, 1) + " kHz", size.width * 0.5, size.height * 0.29);
            drawLabel(ctx, state.context === "sports" ? labels.resultReady : (result.over ? labels.overLimit : labels.withinLimit), size.width * 0.5, size.height * 0.38);
        }
        if (state.context === "police") {
            drawLabel(ctx, labels.selectedSpeedLimit + ": " + fmt(state.limit, 0) + " km/h", size.width * 0.78, size.height * 0.18);
            drawLabel(ctx, languageLabel("زاوية القياس", "Angle") + ": " + fmt(state.angle, 0) + "°", size.width * 0.78, size.height * 0.3);
        } else {
            drawLabel(ctx, labels.launchAngle + ": " + fmt(state.angle, 0) + "°", size.width * 0.78, size.height * 0.18);
            drawLabel(ctx, labels.measuredSpeed + ": " + fmt(result.measuredKph, 0) + " km/h", size.width * 0.78, size.height * 0.3);
        }
        if (state.context === "sports" && state.showHistory && state.attempts.length) {
            ctx.font = "bold " + Math.max(16, size.width * 0.014) + "px Arial";
            ctx.fillStyle = "#f5fbff";
            ctx.textAlign = "start";
            ctx.fillText(labels.history + ": " + state.attempts.map(function (a) { return fmt(a.measured, 0); }).join(" / ") + " km/h", size.width * 0.08, size.height * 0.88);
        }
    }

    function drawRadarPulses(ctx, radar, target, state) {
        var p = state.phaseTime;
        var outT = state.phase === "outbound" ? clamp(p / 0.95, 0, 1) : state.phase === "reflection" || state.phase === "returning" || state.phase === "processing" || state.phase === "ready" ? 1 : 0;
        var backT = state.phase === "returning" ? clamp(p / 0.95, 0, 1) : state.phase === "processing" || state.phase === "ready" ? 1 : 0;
        if (state.phase === "transmitting") outT = clamp(p / 0.55, 0, 0.2);
        if (outT > 0) {
            var ox = radar.x + (target.x - radar.x) * outT;
            drawLine(ctx, radar.x + 36, radar.y - 14, ox, radar.y - 14, "rgba(39,179,255,.85)");
        }
        if (backT > 0) {
            var bx = target.x + (radar.x - target.x) * backT;
            drawLine(ctx, target.x - 40, radar.y + 16, bx, radar.y + 16, "rgba(255,180,92,.9)");
        }
    }

    function updateRadarReadout(node, state, labels) {
        var r = radarResult(state);
        node.innerHTML = "";
        [
            phaseLabel(state.phase, labels),
            labels.trueSpeed + ": " + fmt(r.actualKph, 0) + " km/h",
            (state.context === "police" ? labels.selectedSpeedLimit + ": " + fmt(state.limit, 0) + " km/h" : labels.launchAngle + ": " + fmt(state.angle, 0) + "°"),
            labels.measuredSpeed + ": " + fmt(r.measuredKph, 0) + " km/h",
            labels.radial + ": " + fmt(r.radial, 1) + " m/s",
            "Δf: " + (state.phase === "ready" ? fmt(r.shift / 1000, 2) + " kHz" : "...")
        ].forEach(function (text) { node.appendChild(el("span", "", text)); });
    }

    function phaseLabel(phase, labels) {
        return labels[phase] || labels.waiting;
    }

    function medicalDoppler(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, labels.medicalDoppler, language);
        var state = { running: true, time: 0, speed: Number(config.speed || 0.7), angle: Number(config.angle || 45), direction: 1, narrowed: false, sonification: makeSonification() };
        ui.shell.__presentationDebug = { type: "medical", state: state };
        ui.controls.appendChild(button(labels.start + "/" + labels.pause, function () { state.running = !state.running; }));
        ui.controls.appendChild(button(labels.reset, function () { state.time = 0; }));
        [{ label: labels.slow, v: 0.25 }, { label: labels.normal, v: 0.7 }, { label: labels.fast, v: 1.2 }].forEach(function (p) {
            ui.controls.appendChild(button(p.label, function () { state.speed = p.v; }));
        });
        ui.controls.appendChild(button(labels.reverse, function () { state.direction *= -1; }));
        var angleSlider = document.createElement("input");
        angleSlider.type = "range";
        angleSlider.min = "0";
        angleSlider.max = "90";
        angleSlider.value = String(state.angle);
        angleSlider.setAttribute("aria-label", language === "ar" ? "زاوية الحزمة مع التدفق" : "Beam-flow angle");
        angleSlider.addEventListener("input", function () { state.angle = Number(angleSlider.value); });
        ui.controls.appendChild(angleSlider);
        [0, 30, 45, 60, 90].forEach(function (angle) {
            ui.controls.appendChild(button(angle + "°", function () { state.angle = angle; }));
            ui.controls.lastChild.addEventListener("click", function () { angleSlider.value = String(angle); });
        });
        ui.controls.appendChild(button(labels.narrow, function (btn) { state.narrowed = !state.narrowed; btn.classList.toggle("active", state.narrowed); }));
        ui.controls.appendChild(button(labels.sonification, function (btn) {
            if (state.sonification.isRunning()) { state.sonification.stop(); btn.classList.remove("active"); } else { state.sonification.start(); btn.classList.add("active"); }
        }));
        var controller = animate(ui.canvas, function (ctx, size, dt) {
            if (state.running) state.time += dt;
            var shift = ultrasoundShift(5e6, state.speed * state.direction * (state.narrowed ? 1.45 : 1), state.angle);
            state.sonification.update(shift, 8000);
            drawMedicalScene(ctx, size, state, shift, labels);
            var effectiveSpeed = state.speed * (state.narrowed ? 1.45 : 1);
            var projected = effectiveSpeed * state.direction * Math.cos(state.angle * Math.PI / 180);
            ui.readout.innerHTML = "";
            [
                labels.medicalPurpose,
                labels.medicalCaution,
                labels.bloodFlowTarget,
                labels.trueSpeed + ": " + fmt(effectiveSpeed, 2) + " m/s",
                (language === "ar" ? "زاوية القياس" : "Measurement angle") + ": " + fmt(state.angle, 0) + "°",
                labels.radial + ": " + fmt(projected, 2) + " m/s",
                "Δf: " + fmt(shift, 0) + " Hz",
                labels.measurementQuality + ": " + angleQuality(state.angle, labels)
            ].forEach(function (text) { ui.readout.appendChild(el("span", "", text)); });
        });
        return joinControllers(controller, { dispose: function () { state.sonification.stop(); }, pause: function () { state.sonification.pause(); }, resume: function () { state.sonification.resume(); } });
    }

    function drawMedicalScene(ctx, size, state, shift, labels) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        var x = size.width * 0.12, y = size.height * 0.49, w = size.width * 0.74, h = size.height * (state.narrowed ? 0.105 : 0.16);
        drawLabel(ctx, labels.medicalPurpose, size.width * 0.5, size.height * 0.14);
        ctx.fillStyle = "rgba(255,111,145,.18)";
        roundRect(ctx, x, y, w, h, h / 2, true);
        ctx.strokeStyle = "#ff6f91";
        ctx.lineWidth = 4;
        ctx.stroke();
        if (state.narrowed) {
            ctx.fillStyle = "rgba(7,21,33,.8)";
            roundRect(ctx, x + w * 0.43, y - 10, w * 0.16, h + 20, 16, true);
            drawLabel(ctx, labels.narrow, x + w * 0.51, y - 34);
        }
        var effectiveSpeed = state.speed * (state.narrowed ? 1.45 : 1) * state.direction;
        for (var i = 0; i < 18; i += 1) {
            var px = x + ((i / 18 + state.time * Math.abs(effectiveSpeed) * 0.08 * state.direction + 2) % 1) * w;
            var py = y + h / 2 + Math.sin(i * 1.7) * h * 0.22;
            ctx.fillStyle = "#ff6f91";
            ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
        }
        var target = { x: x + w * 0.48, y: y + h * 0.5 };
        var angleRad = state.angle * Math.PI / 180;
        var beamDir = { x: state.direction * Math.cos(angleRad), y: Math.sin(angleRad) };
        var beamAngle = Math.atan2(beamDir.y, beamDir.x);
        var beamLength = Math.min(size.width * 0.34, size.height * 0.36);
        var probe = { x: target.x - beamDir.x * beamLength, y: target.y - beamDir.y * beamLength };
        drawProbe(ctx, probe.x, probe.y, beamAngle * 180 / Math.PI);
        drawLine(ctx, probe.x, probe.y, target.x, target.y, "rgba(39,179,255,.75)");
        var pulseT = (state.time * 0.75) % 1;
        var out = { x: probe.x + beamDir.x * beamLength * pulseT, y: probe.y + beamDir.y * beamLength * pulseT };
        var back = { x: target.x - beamDir.x * beamLength * pulseT, y: target.y - beamDir.y * beamLength * pulseT };
        ctx.fillStyle = "#5ce1ff";
        ctx.beginPath(); ctx.arc(out.x, out.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffb45c";
        ctx.beginPath(); ctx.arc(back.x, back.y, 6, 0, Math.PI * 2); ctx.fill();
        var baseAngle = state.direction > 0 ? 0 : Math.PI;
        ctx.strokeStyle = "rgba(255,255,255,.65)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(target.x, target.y, 54, Math.min(baseAngle, beamAngle), Math.max(baseAngle, beamAngle));
        ctx.stroke();
        drawLabel(ctx, fmt(state.angle, 0) + "°", target.x + 70 * Math.cos((baseAngle + beamAngle) / 2), target.y + 70 * Math.sin((baseAngle + beamAngle) / 2));
        drawArrow(ctx, x + w * 0.22, y + h + 38, x + w * 0.22 + state.direction * 120, y + h + 38, "#ffb45c");
        drawLabel(ctx, labels.probe, probe.x, probe.y - 34);
        drawLabel(ctx, labels.vessel, x + w * 0.5, y + h + 74);
        drawLabel(ctx, angleQuality(state.angle, labels) + " | Δf " + fmt(shift, 0) + " Hz", size.width * 0.62, size.height * 0.25);
        drawLabel(ctx, state.direction > 0 ? labels.towardRadar : labels.awayRadar, size.width * 0.3, size.height * 0.82);
    }

    function angleQuality(angle, labels) {
        if (Math.abs(angle) < 25) return labels.goodAngle;
        if (Math.abs(angle) < 75) return labels.reducedAngle;
        return labels.unsuitableAngle;
    }

    function medicalComparison(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, labels.medicalComparison || (language === "ar" ? "مقارنة التدفق" : "Flow comparison"), language);
        var time = 0;
        return animate(ui.canvas, function (ctx, size, dt) {
            time += dt;
            ctx.clearRect(0, 0, size.width, size.height);
            drawGrid(ctx, size);
            drawVessel(ctx, size.width * 0.09, size.height * 0.36, size.width * 0.34, size.height * 0.16, time, 0.7, labels.normal);
            drawVessel(ctx, size.width * 0.58, size.height * 0.39, size.width * 0.34, size.height * 0.08, time, 1.25, labels.narrow);
            ui.readout.textContent = language === "ar" ? "نموذج تعليمي: إذا بقي التدفق الحجمي قريبًا من الثبات، تزداد سرعة الخلايا في المقطع الأضيق." : "Educational model: if volume flow is roughly conserved, cell speed increases in the narrower segment.";
        });
    }

    function astronomy(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, labels.astronomy, language);
        var state = { beta: Number(config.beta || 0.22), sonification: makeSonification() };
        ui.shell.__presentationDebug = { type: "astronomy", state: state };
        ui.controls.appendChild(button(labels.approaching, function () { state.beta = -0.22; }));
        ui.controls.appendChild(button(labels.receding, function () { state.beta = 0.22; }));
        ui.controls.appendChild(button(labels.stationary, function () { state.beta = 0; }));
        ui.controls.appendChild(button(labels.sonification, function (btn) {
            if (state.sonification.isRunning()) { state.sonification.stop(); btn.classList.remove("active"); } else { state.sonification.start(); btn.classList.add("active"); }
        }));
        var controller = animate(ui.canvas, function (ctx, size) {
            var ratios = lightRatios(state.beta);
            state.sonification.update(-state.beta * 100, 40);
            drawAstronomyScene(ctx, size, state.beta, ratios, labels);
            ui.readout.textContent = (state.beta > 0 ? labels.redshift : state.beta < 0 ? labels.blueshift : labels.noShift) + " | λ ratio " + fmt(ratios.wavelength, 3) + " | f ratio " + fmt(ratios.frequency, 3) + " | " + labels.sonification;
        });
        return joinControllers(controller, { dispose: function () { state.sonification.stop(); } });
    }

    function lightDoppler(node, config, language) {
        return astronomy(node, config, language);
    }

    function opticalLab(view) {
        return function (node, config, language) {
            var labels = labelsFor(language);
            var titleMap = {
                scene: language === "ar" ? "مختبر دوبلر الضوئي" : "Optical Doppler lab",
                spectrum: language === "ar" ? "الخطوط الطيفية" : "Spectral lines",
                graphs: language === "ar" ? "تجميد وتحليل" : "Freeze and analyze",
                calculation: language === "ar" ? "حساب الانزياح" : "Shift calculation",
                challenge: language === "ar" ? "نجم مجهول" : "Unknown star"
            };
            var ui = makeCanvasShell(node, titleMap[view] || labels.astronomy, language);
            var state = {
                view: view,
                speedKmS: Number(config.speedKmS || (view === "calculation" ? 14989.6 : 12000)),
                angle: Number(config.angle !== undefined ? config.angle : (view === "calculation" ? 0 : 0)),
                lineNm: Number(config.lineNm || 656.3),
                running: true,
                time: 0,
                frozen: false,
                advanced: config.advanced !== false,
                mode: config.mode || "manual",
                challengeAnswer: null,
                history: []
            };
            ui.shell.__presentationDebug = { type: "optical-" + view, state: state };
            if (view !== "calculation") {
                [{ label: labels.approaching, angle: 180 }, { label: labels.receding, angle: 0 }, { label: labels.transverse, angle: 90 }].forEach(function (item) {
                    ui.controls.appendChild(button(item.label, function () { state.angle = item.angle; state.mode = "manual"; }));
                });
                var speed = document.createElement("input");
                speed.type = "range"; speed.min = "0"; speed.max = "60000"; speed.step = "500"; speed.value = String(state.speedKmS);
                speed.setAttribute("aria-label", language === "ar" ? "سرعة النجم" : "Star speed");
                speed.addEventListener("input", function () { state.speedKmS = Number(speed.value); state.mode = "manual"; });
                ui.controls.appendChild(speed);
                var angle = document.createElement("input");
                angle.type = "range"; angle.min = "0"; angle.max = "360"; angle.value = String(state.angle);
                angle.setAttribute("aria-label", language === "ar" ? "اتجاه الحركة" : "Motion direction");
                angle.addEventListener("input", function () { state.angle = Number(angle.value); state.mode = "manual"; });
                ui.controls.appendChild(angle);
                ui.controls.appendChild(button(language === "ar" ? "تذبذب" : "Oscillate", function () { state.mode = state.mode === "oscillate" ? "manual" : "oscillate"; }));
                ui.controls.appendChild(button(language === "ar" ? "تجميد" : "Freeze", function () { state.frozen = !state.frozen; }));
                if (view === "spectrum" || view === "calculation" || view === "challenge") {
                    [
                        { label: "Hα 656.3", nm: 656.3 },
                        { label: "Hβ 486.1", nm: 486.1 },
                        { label: "Na 589.0", nm: 589.0 }
                    ].forEach(function (line) {
                        ui.controls.appendChild(button(line.label, function () { state.lineNm = line.nm; }));
                    });
                }
            } else {
                ui.controls.appendChild(button("β = 0.05", function () { state.speedKmS = 299792.458 * 0.05; state.angle = 0; }));
                ui.controls.appendChild(button(language === "ar" ? "اقتراب" : "Approach", function () { state.speedKmS = 299792.458 * 0.05; state.angle = 180; }));
                ui.controls.appendChild(button(language === "ar" ? "أساسي/متقدم" : "Basic/advanced", function () { state.advanced = !state.advanced; }));
            }
            if (view === "challenge") {
                [{ key: "receding", label: labels.redshift }, { key: "approaching", label: labels.blueshift }, { key: "zero", label: labels.noShift }].forEach(function (item) {
                    ui.controls.appendChild(button(item.label, function () { state.challengeAnswer = item.key; }));
                });
            }
            var controller = animate(ui.canvas, function (ctx, size, dt) {
                if (state.running && !state.frozen) {
                    state.time += dt;
                    if (state.mode === "oscillate") {
                        state.angle = (Math.cos(state.time * 0.65) > 0 ? 0 : 180);
                        state.speedKmS = 16000 + 8000 * Math.abs(Math.sin(state.time * 0.65));
                    }
                    var sample = opticalState(state);
                    state.history.push({ t: state.time, radial: sample.radialKmS, lambda: sample.observedWavelengthNm, freqRatio: sample.frequencyRatio, z: sample.z });
                    state.history = state.history.slice(-160);
                }
                var current = opticalState(state);
                drawOpticalView(ctx, size, state, current, labels, language);
                updateOpticalReadout(ui.readout, state, current, labels, language);
            });
            return controller;
        };
    }

    function opticalState(state) {
        var radialKmS = state.speedKmS * Math.cos(state.angle * Math.PI / 180);
        var beta = clamp(radialKmS / 299792.458, -0.95, 0.95);
        var result = opticalDoppler(beta, state.lineNm);
        result.radialKmS = radialKmS;
        result.speedKmS = state.speedKmS;
        result.angle = state.angle;
        return result;
    }

    function drawOpticalView(ctx, size, state, current, labels, language) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        if (state.view === "spectrum") drawOpticalSpectrum(ctx, size, state, current, language);
        else if (state.view === "graphs") drawOpticalGraphs(ctx, size, state, current, language);
        else if (state.view === "calculation") drawOpticalCalculation(ctx, size, state, current, language);
        else if (state.view === "challenge") drawOpticalChallenge(ctx, size, state, current, labels, language);
        else drawOpticalScene(ctx, size, state, current, labels, language);
    }

    function drawOpticalScene(ctx, size, state, current, labels, language) {
        var earth = { x: size.width * 0.18, y: size.height * 0.56 };
        var star = { x: size.width * 0.72, y: size.height * 0.42 };
        drawLine(ctx, earth.x, earth.y, star.x, star.y, "rgba(255,255,255,.45)");
        ctx.fillStyle = "#277cff";
        ctx.beginPath(); ctx.arc(earth.x, earth.y, 38, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3cff82";
        ctx.beginPath(); ctx.arc(earth.x + 8, earth.y - 8, 10, 0, Math.PI * 2); ctx.fill();
        var glow = ctx.createRadialGradient(star.x, star.y, 4, star.x, star.y, 58);
        glow.addColorStop(0, "#fff7b0"); glow.addColorStop(0.36, "#ffe45c"); glow.addColorStop(1, "rgba(255,228,92,0)");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(star.x, star.y, 58, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffe45c"; ctx.beginPath(); ctx.arc(star.x, star.y, 24, 0, Math.PI * 2); ctx.fill();
        var a = state.angle * Math.PI / 180;
        drawArrow(ctx, star.x, star.y, star.x + Math.cos(a) * 120, star.y + Math.sin(a) * 120, "#ffb45c");
        drawArrow(ctx, star.x, star.y + 42, star.x + Math.sign(current.radialKmS || 1) * Math.abs(current.radialKmS) / Math.max(1, state.speedKmS) * 110, star.y + 42, current.radialKmS >= 0 ? "#ff6f61" : "#5ce1ff");
        drawLabel(ctx, language === "ar" ? "الأرض" : "Earth", earth.x, earth.y + 62);
        drawLabel(ctx, language === "ar" ? "النجم" : "Star", star.x, star.y - 66);
        drawLabel(ctx, current.beta > 0 ? labels.redshift : current.beta < 0 ? labels.blueshift : labels.noShift, size.width * 0.5, size.height * 0.18);
        drawMiniSpectrum(ctx, size.width * 0.28, size.height * 0.76, size.width * 0.5, size.height * 0.07, current);
    }

    function drawOpticalSpectrum(ctx, size, state, current, language) {
        drawLabel(ctx, language === "ar" ? "موضع خط الامتصاص قبل وبعد الحركة" : "Absorption line before and after motion", size.width * 0.5, size.height * 0.17);
        drawSpectrumBar(ctx, size.width * 0.13, size.height * 0.33, size.width * 0.74, size.height * 0.11, state.lineNm, "#f5fbff", language === "ar" ? "منبعث" : "Emitted");
        drawSpectrumBar(ctx, size.width * 0.13, size.height * 0.56, size.width * 0.74, size.height * 0.11, current.observedWavelengthNm, current.beta > 0 ? "#ff6f61" : current.beta < 0 ? "#5ce1ff" : "#f5fbff", language === "ar" ? "مرصود" : "Observed");
        drawLabel(ctx, "λemit " + fmt(state.lineNm, 1) + " nm  →  λobs " + fmt(current.observedWavelengthNm, 1) + " nm", size.width * 0.5, size.height * 0.78);
    }

    function drawSpectrumBar(ctx, x, y, w, h, lineNm, color, label) {
        var gradient = ctx.createLinearGradient(x, y, x + w, y);
        [
            [0, "#4b35ff"], [.18, "#277cff"], [.36, "#27d3ff"], [.52, "#3cff82"],
            [.68, "#ffe45c"], [.84, "#ff8c3c"], [1, "#ff3c58"]
        ].forEach(function (stop) { gradient.addColorStop(stop[0], stop[1]); });
        ctx.fillStyle = gradient;
        roundRect(ctx, x, y, w, h, 10, true);
        ctx.strokeStyle = "rgba(255,255,255,.5)";
        ctx.lineWidth = 2; ctx.stroke();
        var visible = lineNm >= 380 && lineNm <= 750;
        var lineX = x + clamp((lineNm - 380) / 370, 0, 1) * w;
        drawLine(ctx, lineX, y - 18, lineX, y + h + 18, color);
        drawLabel(ctx, label, x - 60, y + h / 2);
        if (!visible) {
            drawLabel(ctx, lineNm < 380 ? "UV" : "IR", lineX, y + h + 46);
        }
    }

    function drawMiniSpectrum(ctx, x, y, w, h, current) {
        drawSpectrumBar(ctx, x, y, w, h, current.emittedWavelengthNm, "rgba(245,251,255,.85)", "emit");
        drawSpectrumBar(ctx, x, y + h + 22, w, h, current.observedWavelengthNm, current.beta > 0 ? "#ff6f61" : "#5ce1ff", "obs");
    }

    function drawOpticalGraphs(ctx, size, state, current, language) {
        drawLabel(ctx, state.frozen ? (language === "ar" ? "التحليل مجمّد" : "Frozen analysis") : (language === "ar" ? "رسم حي" : "Live graph"), size.width * 0.5, size.height * 0.13);
        var plots = [
            { key: "radial", label: "v radial km/s", color: "#ffb45c", min: -60000, max: 60000, x: size.width * 0.09, y: size.height * 0.23 },
            { key: "lambda", label: "λ obs nm", color: "#5ce1ff", min: 560, max: 760, x: size.width * 0.54, y: size.height * 0.23 },
            { key: "z", label: "z", color: "#ff6f61", min: -0.25, max: 0.25, x: size.width * 0.09, y: size.height * 0.58 },
            { key: "freqRatio", label: "f ratio", color: "#3cff82", min: 0.75, max: 1.25, x: size.width * 0.54, y: size.height * 0.58 }
        ];
        plots.forEach(function (plot) {
            plot.w = size.width * 0.36; plot.h = size.height * 0.22;
            drawPlotFrame(ctx, plot);
            drawLabel(ctx, plot.label, plot.x + plot.w / 2, plot.y - 24);
            ctx.strokeStyle = plot.color; ctx.lineWidth = 3; ctx.beginPath();
            var history = state.history.length ? state.history : [current];
            history.forEach(function (sample, i) {
                var value = sample[plot.key];
                var px = plot.x + (history.length === 1 ? 1 : i / (history.length - 1)) * plot.w;
                var py = plot.y + plot.h - clamp((value - plot.min) / (plot.max - plot.min), 0, 1) * plot.h;
                if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
            });
            ctx.stroke();
        });
    }

    function drawOpticalCalculation(ctx, size, state, current, language) {
        var x = size.width * 0.12, y = size.height * 0.18, w = size.width * 0.76, h = size.height * 0.64;
        ctx.fillStyle = "rgba(16,37,53,.84)";
        roundRect(ctx, x, y, w, h, 14, true);
        ctx.fillStyle = "#f5fbff";
        ctx.font = "bold " + Math.max(20, size.width * 0.026) + "px Arial";
        ctx.textAlign = "start";
        var betaText = "β = v/c = " + fmt(current.beta, 3);
        var ratioText = "λobs/λemit = sqrt((1+β)/(1-β)) = " + fmt(current.wavelengthRatio, 4);
        var lambdaText = "Hα: 656.3 nm × " + fmt(current.wavelengthRatio, 4) + " = " + fmt(current.observedWavelengthNm, 1) + " nm";
        var zText = "z = λobs/λemit - 1 = " + fmt(current.z, 4);
        [language === "ar" ? "مثال: نجم يبتعد بسرعة β = 0.05" : "Example: star receding at β = 0.05",
            betaText, ratioText, lambdaText, zText,
            state.advanced ? "fobs/femit = sqrt((1-β)/(1+β)) = " + fmt(current.frequencyRatio, 4) : ""].filter(Boolean)
            .forEach(function (line, i) { ctx.fillText(line, x + 40, y + 70 + i * 54, w - 80); });
    }

    function drawOpticalChallenge(ctx, size, state, current, labels, language) {
        drawOpticalSpectrum(ctx, size, state, current, language);
        var correct = Math.abs(current.z) < 0.002 ? "zero" : current.z > 0 ? "receding" : "approaching";
        var message = !state.challengeAnswer ? (language === "ar" ? "اختر تفسير الخط المرصود." : "Choose the observed-line interpretation.") :
            state.challengeAnswer === correct ? (language === "ar" ? "صحيح: علامة z تكشف الاتجاه." : "Correct: the sign of z gives the direction.") :
                (language === "ar" ? "راجع اتجاه انتقال الخط ثم حاول مرة أخرى." : "Check which way the line moved and try again.");
        drawLabel(ctx, message, size.width * 0.5, size.height * 0.88);
        drawLabel(ctx, "z = " + fmt(current.z, 4), size.width * 0.78, size.height * 0.2);
    }

    function updateOpticalReadout(node, state, current, labels, language) {
        node.innerHTML = "";
        [
            (current.beta > 0 ? labels.redshift : current.beta < 0 ? labels.blueshift : labels.noShift),
            (language === "ar" ? "السرعة الشعاعية" : "Radial velocity") + ": " + fmt(current.radialKmS, 0) + " km/s",
            "β: " + fmt(current.beta, 4),
            "z: " + fmt(current.z, 4),
            "λobs: " + fmt(current.observedWavelengthNm, 1) + " nm",
            "fobs/femit: " + fmt(current.frequencyRatio, 4)
        ].forEach(function (text) { node.appendChild(el("span", "", text)); });
    }

    function drawAstronomyScene(ctx, size, beta, ratios, labels) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        var x = size.width * 0.12, y = size.height * 0.43, w = size.width * 0.76, h = size.height * 0.2;
        var colors = ["#6a4cff", "#277cff", "#27d3ff", "#3cff82", "#ffe45c", "#ff8c3c", "#ff3c58"];
        colors.forEach(function (color, i) {
            ctx.fillStyle = color;
            ctx.fillRect(x + i * w / colors.length, y, w / colors.length + 1, h);
        });
        var rest = x + w * 0.5;
        var shifted = rest + (ratios.wavelength - 1) * w * 0.35;
        drawLine(ctx, rest, y - 38, rest, y + h + 38, "rgba(255,255,255,.62)");
        drawLine(ctx, shifted, y - 50, shifted, y + h + 50, beta > 0 ? "#ff6f61" : beta < 0 ? "#5ce1ff" : "#d9f4ff");
        drawLabel(ctx, beta > 0 ? labels.redshift : beta < 0 ? labels.blueshift : labels.noShift, size.width * 0.5, size.height * 0.24);
    }

    function weatherRadar(node, config, language) {
        var labels = labelsFor(language);
        var ui = makeCanvasShell(node, labels.weatherRadar, language);
        var allowedScenarios = config.allowedScenarios || ["toward", "away", "sideways", "rotating"];
        var state = {
            scenario: config.scenario || allowedScenarios[0] || "rotating",
            speed: Number(config.speed || 28),
            time: 0,
            running: config.running !== false,
            selectedIndex: Number(config.selectedIndex || 3),
            sonification: makeSonification(),
            drops: makeDrops()
        };
        ui.shell.__presentationDebug = { type: "weather", state: state };
        ui.controls.appendChild(button(labels.start + "/" + labels.pause, function () { state.running = !state.running; }));
        ui.controls.appendChild(button(labels.reset, function () { state.time = 0; state.drops = makeDrops(); }));
        ui.controls.appendChild(button(language === "ar" ? "اختر خلية" : "Select cell", function () { state.selectedIndex = (state.selectedIndex + 1) % state.drops.length; }));
        [
            { key: "toward", label: labels.towardRadar },
            { key: "away", label: labels.awayRadar },
            { key: "sideways", label: labels.sideways },
            { key: "rotating", label: labels.rotatingStorm }
        ].filter(function (item) {
            return allowedScenarios.indexOf(item.key) >= 0;
        }).forEach(function (item) {
            if (allowedScenarios.length > 1) {
                ui.controls.appendChild(button(item.label, function () { state.scenario = item.key; state.time = 0; }));
            }
        });
        [{ label: labels.slow, v: 14 }, { label: labels.medium, v: 28 }, { label: labels.fast, v: 48 }].forEach(function (item) {
            ui.controls.appendChild(button(item.label, function () { state.speed = item.v; }));
        });
        ui.controls.appendChild(button(labels.sonification, function (btn) {
            if (state.sonification.isRunning()) { state.sonification.stop(); btn.classList.remove("active"); } else { state.sonification.start(); btn.classList.add("active"); }
        }));
        ui.canvas.addEventListener("pointerdown", function (event) {
            if (!state.lastPositions || !state.lastPositions.length) return;
            var rect = ui.canvas.getBoundingClientRect();
            var px = (event.clientX - rect.left) * (ui.canvas.width / rect.width);
            var py = (event.clientY - rect.top) * (ui.canvas.height / rect.height);
            var best = 0, bestD = Infinity;
            state.lastPositions.forEach(function (item, index) {
                var d = Math.pow(item.pos.x - px, 2) + Math.pow(item.pos.y - py, 2);
                if (d < bestD) { bestD = d; best = index; }
            });
            state.selectedIndex = best;
        });
        var controller = animate(ui.canvas, function (ctx, size, dt) {
            if (state.running) state.time += dt;
            var selected = drawWeatherScene(ctx, size, state, labels);
            state.sonification.update(selected.radial, state.speed);
            ui.readout.textContent = labels.radial + ": " + fmt(selected.radial, 1) + " m/s | " +
                weatherStateText(selected.classification, labels) + " | " +
                labels.speed + ": " + fmt(state.speed, 0) + " m/s | " +
                (state.running ? labels.start : labels.pause);
        });
        return joinControllers(controller, { dispose: function () { state.sonification.stop(); } });
    }

    function makeDrops() {
        var drops = [];
        for (var i = 0; i < 24; i += 1) {
            drops.push({
                angle: i * Math.PI * 2 / 24,
                radius: 34 + (i % 5) * 5,
                phase: ((i * 37) % 100) / 100,
                row: Math.floor(i / 6),
                col: i % 6
            });
        }
        return drops;
    }

    function wrap01(value) {
        value = value % 1;
        return value < 0 ? value + 1 : value;
    }

    function drawWeatherScene(ctx, size, state, labels) {
        ctx.clearRect(0, 0, size.width, size.height);
        drawGrid(ctx, size);
        var radar = { x: size.width * 0.25, y: size.height * 0.55 };
        var center = { x: size.width * 0.58, y: size.height * 0.49 };
        drawRadarDish(ctx, radar.x, radar.y);
        drawLabel(ctx, labels.actualMotion, size.width * 0.31, size.height * 0.16);
        drawLabel(ctx, labels.radialMap, size.width * 0.74, size.height * 0.16);
        ctx.strokeStyle = "rgba(255,180,92,.55)";
        ctx.beginPath(); ctx.arc(center.x, center.y, 70, 0, Math.PI * 2); ctx.stroke();
        var selected = null;
        state.lastPositions = [];
        state.drops.forEach(function (drop, index) {
            var pos, vel;
            if (state.scenario === "rotating") {
                var a = drop.angle + state.time * state.speed / 42;
                pos = { x: center.x + Math.cos(a) * drop.radius * 1.6, y: center.y + Math.sin(a) * drop.radius * 1.1 };
                var omega = state.speed / 42;
                vel = { x: -omega * (pos.y - center.y), y: omega * (pos.x - center.x) };
            } else {
                var phase = wrap01(drop.phase + state.time * state.speed / 520);
                if (state.scenario === "toward") {
                    pos = { x: size.width * (0.86 - phase * 0.46), y: size.height * (0.32 + drop.row * 0.08 + Math.sin(index) * 0.015) };
                    vel = { x: -state.speed, y: 0 };
                } else if (state.scenario === "away") {
                    pos = { x: size.width * (0.38 + phase * 0.46), y: size.height * (0.32 + drop.row * 0.08 + Math.sin(index) * 0.015) };
                    vel = { x: state.speed, y: 0 };
                } else {
                    pos = { x: size.width * (0.43 + drop.col * 0.055), y: size.height * (0.25 + phase * 0.42) };
                    vel = { x: 0, y: state.speed };
                }
            }
            var radial = weatherRadial(pos, radar, vel);
            var classification = classifyRadial(radial, 2.5);
            ctx.fillStyle = classification === "toward" ? "#5ce1ff" : classification === "away" ? "#ff9b55" : "#d9f4ff";
            ctx.beginPath(); ctx.arc(pos.x, pos.y, index === state.selectedIndex ? 12 : 8, 0, Math.PI * 2); ctx.fill();
            if (index === state.selectedIndex || index % 4 === 0) drawArrow(ctx, pos.x, pos.y, pos.x + vel.x * 0.45, pos.y + vel.y * 0.45, "rgba(255,255,255,.55)");
            var mapX = size.width * 0.69 + (pos.x - center.x) * 0.42;
            var mapY = size.height * 0.5 + (pos.y - center.y) * 0.42;
            ctx.fillStyle = classification === "toward" ? "#5ce1ff" : classification === "away" ? "#ff9b55" : "#d9f4ff";
            ctx.fillRect(mapX - 8, mapY - 8, 16, 16);
            state.lastPositions[index] = { pos: pos, vel: vel, radial: radial, classification: classification };
            if (index === state.selectedIndex) {
                selected = { pos: pos, vel: vel, radial: radial, classification: classification };
            }
        });
        if (!selected) selected = { radial: 0, classification: "zero", pos: center, vel: { x: 0, y: 0 } };
        drawLine(ctx, radar.x, radar.y, selected.pos.x, selected.pos.y, "rgba(255,255,255,.55)");
        drawArrow(ctx, selected.pos.x, selected.pos.y, selected.pos.x + selected.vel.x * 0.7, selected.pos.y + selected.vel.y * 0.7, "#ffb45c");
        drawLabel(ctx, labels.speed + ": " + fmt(Math.sqrt(selected.vel.x * selected.vel.x + selected.vel.y * selected.vel.y), 0) + " m/s", size.width * 0.32, size.height * 0.84);
        drawLabel(ctx, weatherStateText(selected.classification, labels), size.width * 0.5, size.height * 0.84);
        return selected;
    }

    function weatherStateText(value, labels) {
        if (value === "toward") return labels.towardRadar;
        if (value === "away") return labels.awayRadar;
        return labels.noShift;
    }

    function drawGrid(ctx, size) {
        var gradient = ctx.createLinearGradient(0, 0, size.width, size.height);
        gradient.addColorStop(0, "#071521");
        gradient.addColorStop(1, "#102535");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size.width, size.height);
        ctx.strokeStyle = "rgba(255,255,255,.055)";
        ctx.lineWidth = 1;
        for (var x = 0; x < size.width; x += 52) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.height); ctx.stroke();
        }
        for (var y = 0; y < size.height; y += 52) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.width, y); ctx.stroke();
        }
    }

    function drawPlotFrame(ctx, plot) {
        ctx.strokeStyle = "rgba(255,255,255,.22)";
        ctx.lineWidth = 2;
        roundRect(ctx, plot.x, plot.y, plot.w, plot.h, 16, false);
    }

    function drawAnchoredSprite(ctx, image, x, y, height, anchor, flip) {
        if (!image || !image.complete || !image.naturalWidth || !image.naturalHeight) {
            return false;
        }
        var maxWidth = height * 1.8;
        var ratio = Math.min(maxWidth / image.naturalWidth, height / image.naturalHeight);
        var width = image.naturalWidth * ratio;
        height = image.naturalHeight * ratio;
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

    function drawMotorcycleSprite(ctx, x, y, height, flip) {
        if (drawAnchoredSprite(ctx, motorcycleImage, x, y, height, { x: 0.46, y: 0.5 }, flip)) {
            return;
        }
        ctx.fillStyle = "#111927";
        roundRect(ctx, x - height * 0.36, y - height * 0.2, height * 0.72, height * 0.34, 12, true);
        ctx.strokeStyle = "#d9f4ff";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x - height * 0.24, y + height * 0.17, height * 0.13, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + height * 0.24, y + height * 0.17, height * 0.13, 0, Math.PI * 2); ctx.stroke();
    }

    function drawListenerSprite(ctx, x, y, height) {
        if (drawAnchoredSprite(ctx, listenerImage, x, y, height, { x: 0.52, y: 0.17 }, false)) {
            return;
        }
        ctx.fillStyle = "#d9f4ff";
        ctx.beginPath(); ctx.arc(x, y, height * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - height * 0.07, y + height * 0.1, height * 0.14, height * 0.42);
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
        ctx.arc(x, y, 44, -0.8, 0.8);
        ctx.stroke();
        ctx.fillStyle = "#d9f4ff";
        roundRect(ctx, x - 10, y + 34, 20, 58, 6, true);
    }

    function drawSportsBall(ctx, x, y, kind) {
        ctx.save();
        ctx.translate(x, y);
        ctx.lineCap = "round";
        if (kind === "tennis") {
            ctx.fillStyle = "#d7ff5c";
            ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#f5fbff";
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(-24, 0, 24, -1.15, 1.15); ctx.stroke();
            ctx.beginPath(); ctx.arc(24, 0, 24, Math.PI - 1.15, Math.PI + 1.15); ctx.stroke();
        } else if (kind === "baseball") {
            ctx.fillStyle = "#f8fdff";
            ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#e8505b";
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(-20, 0, 19, -1.2, 1.2); ctx.stroke();
            ctx.beginPath(); ctx.arc(20, 0, 19, Math.PI - 1.2, Math.PI + 1.2); ctx.stroke();
            for (var i = -18; i <= 18; i += 9) {
                ctx.beginPath(); ctx.moveTo(-11, i); ctx.lineTo(-4, i + 4); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(11, i); ctx.lineTo(4, i + 4); ctx.stroke();
            }
        } else {
            ctx.fillStyle = "#f8fdff";
            ctx.beginPath(); ctx.arc(0, 0, 29, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#12243a";
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, 29, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "#12243a";
            ctx.beginPath();
            for (var p = 0; p < 5; p += 1) {
                var a = -Math.PI / 2 + p * Math.PI * 2 / 5;
                ctx[p ? "lineTo" : "moveTo"](Math.cos(a) * 10, Math.sin(a) * 10);
            }
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "#12243a";
            ctx.lineWidth = 2;
            for (var s = 0; s < 5; s += 1) {
                var sa = -Math.PI / 2 + s * Math.PI * 2 / 5;
                drawLine(ctx, Math.cos(sa) * 10, Math.sin(sa) * 10, Math.cos(sa) * 25, Math.sin(sa) * 25, "#12243a");
            }
        }
        ctx.restore();
    }

    function drawProbe(ctx, x, y, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((angle - 90) * Math.PI / 180);
        ctx.fillStyle = "#d9f4ff";
        roundRect(ctx, -24, -12, 48, 82, 10, true);
        ctx.restore();
    }

    function drawVessel(ctx, x, y, w, h, time, speed, label) {
        ctx.fillStyle = "rgba(255,111,145,.2)";
        roundRect(ctx, x, y, w, h, h / 2, true);
        ctx.strokeStyle = "#ff6f91";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = "#ff6f91";
        for (var i = 0; i < 14; i += 1) {
            ctx.beginPath();
            ctx.arc(x + ((i / 14 + time * speed * 0.07) % 1) * w, y + h / 2 + Math.sin(i) * h * 0.18, 7, 0, Math.PI * 2);
            ctx.fill();
        }
        drawLabel(ctx, label, x + w / 2, y - 28);
    }

    function drawArrow(ctx, x1, y1, x2, y2, color) {
        if (Math.abs(x2 - x1) + Math.abs(y2 - y1) < 2) {
            return;
        }
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        var a = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - Math.cos(a - 0.5) * 15, y2 - Math.sin(a - 0.5) * 15);
        ctx.lineTo(x2 - Math.cos(a + 0.5) * 15, y2 - Math.sin(a + 0.5) * 15);
        ctx.closePath(); ctx.fill();
    }

    function drawLine(ctx, x1, y1, x2, y2, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    function drawLabel(ctx, text, x, y) {
        ctx.save();
        ctx.font = "bold " + Math.max(16, Math.min(24, ctx.canvas.width * 0.017)) + "px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        var width = Math.min(ctx.canvas.width * 0.46, ctx.measureText(text).width + 24);
        ctx.fillStyle = "rgba(6,19,35,.82)";
        roundRect(ctx, x - width / 2, y - 18, width, 36, 12, true);
        ctx.fillStyle = "#f5fbff";
        ctx.fillText(text, x, y, width - 14);
        ctx.restore();
    }

    function roundRect(ctx, x, y, width, height, radius, fill) {
        radius = Math.max(0, Math.min(radius, width / 2, height / 2));
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
        if (fill) ctx.fill(); else ctx.stroke();
    }

    PC.registry["opening-sound"] = openingSound;
    PC.registry["wave-basics"] = waveBasics;
    PC.registry["doppler-stationary"] = acousticComponent("doppler-stationary");
    PC.registry["doppler-approach"] = acousticComponent("doppler-approach");
    PC.registry["doppler-recede"] = acousticComponent("doppler-recede");
    PC.registry["lab-overview"] = acousticComponent("lab-overview");
    PC.registry["lab-stationary-near"] = acousticComponent("lab-stationary-near");
    PC.registry["lab-auto-pass"] = acousticComponent("lab-auto-pass");
    PC.registry["lab-speed-compare"] = acousticComponent("lab-speed-compare");
    PC.registry["lab-sideways-circular"] = acousticComponent("lab-sideways-circular");
    PC.registry["lab-sideways"] = acousticComponent("sideways");
    PC.registry["lab-circular"] = acousticComponent("circular");
    PC.registry["lab-challenge"] = labChallenge;
    PC.registry["radar-calculation"] = radarCalculation;
    PC.registry["police-radar"] = radarComponent("police");
    PC.registry["sports-radar"] = radarComponent("sports");
    PC.registry["medical-doppler"] = medicalDoppler;
    PC.registry["medical-comparison"] = medicalComparison;
    PC.registry["astronomy"] = astronomy;
    PC.registry["light-doppler"] = lightDoppler;
    PC.registry["opening-demo-sequence"] = openingDemoSequence;
    PC.registry["radial-velocity-lab"] = radialVelocityLab;
    PC.registry["optical-lab"] = opticalLab("scene");
    PC.registry["optical-spectrum"] = opticalLab("spectrum");
    PC.registry["optical-graphs"] = opticalLab("graphs");
    PC.registry["optical-calculation"] = opticalLab("calculation");
    PC.registry["optical-challenge"] = opticalLab("challenge");
    PC.registry["weather-radar"] = weatherRadar;
}(window, document));
