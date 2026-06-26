(function (global) {
    "use strict";

    var EPS = 1e-9;

    function point(p) {
        return { x: Number(p && (p.x !== undefined ? p.x : p.X)) || 0, y: Number(p && (p.y !== undefined ? p.y : p.Y)) || 0 };
    }

    function add(a, b) {
        return { x: a.x + b.x, y: a.y + b.y };
    }

    function subtract(a, b) {
        return { x: a.x - b.x, y: a.y - b.y };
    }

    function multiply(a, scalar) {
        return { x: a.x * scalar, y: a.y * scalar };
    }

    function magnitude(a) {
        return Math.sqrt(a.x * a.x + a.y * a.y);
    }

    function normalize(a) {
        var m = magnitude(a);
        if (m < EPS) {
            return { x: 1, y: 0 };
        }
        return { x: a.x / m, y: a.y / m };
    }

    function dot(a, b) {
        return a.x * b.x + a.y * b.y;
    }

    function clamp(value, min, max) {
        if (!isFinite(value)) {
            return min;
        }
        return Math.max(min, Math.min(max, value));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function lerpVec(a, b, t) {
        return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    }

    function soundSpeedFromTemperature(temperatureCelsius) {
        return 331.3 + 0.606 * temperatureCelsius;
    }

    function classify(closingSpeed, sourceSpeed, observerSpeed) {
        if (sourceSpeed < 0.05 && observerSpeed < 0.05) {
            return "stationary";
        }
        if (Math.abs(closingSpeed) < 0.25) {
            return "tangential";
        }
        return closingSpeed > 0 ? "approaching" : "receding";
    }

    function calculateDoppler(sourcePosition, observerPosition, sourceVelocity, observerVelocity, soundSpeed, emittedFrequency) {
        var rs = point(sourcePosition);
        var ro = point(observerPosition);
        var vs = point(sourceVelocity);
        var vo = point(observerVelocity);
        var c = clamp(Number(soundSpeed) || 343, 300, 360);
        var f = clamp(Number(emittedFrequency) || 700, 1, 20000);
        var separation = subtract(ro, rs);
        var distance = Math.max(magnitude(separation), 0.5);
        var n = normalize(separation);
        var sourceRadial = dot(vs, n);
        var observerDot = dot(vo, n);
        var observerClosing = -observerDot;
        var denominator = c - sourceRadial;
        var warning = "";
        var valid = true;
        var minimumDenominator = c * 0.08;

        if (denominator <= minimumDenominator) {
            warning = "near-sonic";
            denominator = minimumDenominator;
            valid = false;
        }

        var numerator = c - observerDot;
        if (numerator <= 0) {
            warning = "invalid-observer-speed";
            numerator = c * 0.02;
            valid = false;
        }

        var factor = numerator / denominator;
        if (!isFinite(factor) || factor <= 0) {
            warning = "invalid-frequency";
            factor = 0.01;
            valid = false;
        }

        return {
            emittedFrequency: f,
            observedFrequency: f * factor,
            dopplerFactor: factor,
            distance: distance,
            sourceSpeed: magnitude(vs),
            observerSpeed: magnitude(vo),
            sourceRadialTowardObserver: sourceRadial,
            sourceTangentialSpeed: Math.sqrt(Math.max(0, magnitude(vs) * magnitude(vs) - sourceRadial * sourceRadial)),
            observerRadialTerm: observerDot,
            observerClosingTowardSource: observerClosing,
            relativeRadialClosingSpeed: sourceRadial + observerClosing,
            soundSpeed: c,
            wavelength: c / f,
            distanceGain: distanceGain(distance),
            state: classify(sourceRadial + observerClosing, magnitude(vs), magnitude(vo)),
            direction: n,
            isValid: valid,
            warning: warning
        };
    }

    function distanceGain(distance) {
        return clamp(16 / Math.max(Number(distance) || 20, 4), 0.025, 0.28);
    }

    function linearKinematics(config, elapsed) {
        var speed = Math.max(0.1, Number(config.speed) || 25);
        var startX = Number(config.startX) || 0;
        var endX = Number(config.endX) || startX;
        var y = Number(config.pathY) || 0;
        var t = Math.max(0, Number(elapsed) || 0);
        var x = startX + speed * t;
        var completed = x >= endX;
        if (completed) {
            x = endX;
        }
        return {
            x: x,
            y: y,
            vx: completed ? 0 : speed,
            vy: 0,
            completed: completed
        };
    }

    function circularKinematics(config, elapsed) {
        var center = point(config.center);
        var radius = Math.max(1, Number(config.radius) || 30);
        var speed = Math.max(0.1, Number(config.tangentialSpeed) || 15);
        var direction = Number(config.direction) < 0 ? -1 : 1;
        var omega = Math.abs(Number(config.angularVelocity) || speed / radius);
        var theta0 = Number(config.initialAngle) || 0;
        var theta = theta0 + direction * omega * Math.max(0, Number(elapsed) || 0);
        return {
            x: center.x + radius * Math.cos(theta),
            y: center.y + radius * Math.sin(theta),
            vx: -direction * radius * omega * Math.sin(theta),
            vy: direction * radius * omega * Math.cos(theta),
            theta: theta,
            omega: omega,
            speed: radius * omega,
            radius: radius,
            center: center,
            direction: direction
        };
    }

    function cloneBody(body) {
        return {
            id: body.id,
            label: body.label,
            x: body.x,
            y: body.y,
            vx: body.vx,
            vy: body.vy,
            radius: body.radius,
            active: body.active !== false
        };
    }

    function sampleFromBody(time, body) {
        return {
            t: time,
            pos: { x: body.x, y: body.y },
            vel: { x: body.vx, y: body.vy }
        };
    }

    function interpolateSample(a, b, t) {
        if (!a) {
            return b;
        }
        if (!b) {
            return a;
        }
        var span = Math.max(EPS, b.t - a.t);
        var u = clamp((t - a.t) / span, 0, 1);
        return {
            t: t,
            pos: lerpVec(a.pos, b.pos, u),
            vel: lerpVec(a.vel, b.vel, u)
        };
    }

    function Simulation(settings) {
        this.settings = settings || {};
        this.world = {
            width: Number(this.settings.WorldWidthMeters || this.settings.worldWidthMeters || 200),
            height: Number(this.settings.WorldHeightMeters || this.settings.worldHeightMeters || 112.5)
        };
        this.maxWavefronts = Number(this.settings.MaxWavefronts || this.settings.maxWavefronts || 120);
        this.chartWindowSeconds = Number(this.settings.ChartWindowSeconds || this.settings.chartWindowSeconds || 18);
        this.baseFrequency = Number(this.settings.SourceFrequency || this.settings.sourceFrequency || 90);
        this.sourceSpeedSetting = Number(this.settings.SourceSpeed || this.settings.sourceSpeed || 25);
        this.observerSpeedSetting = Number(this.settings.ObserverSpeed || this.settings.observerSpeed || 0);
        this.temperature = Number(this.settings.TemperatureCelsius || this.settings.temperatureCelsius || 20);
        this.soundSpeedOverride = null;
        this.animationSpeed = 1;
        this.mode = "free";
        this.autoState = "idle";
        this.autoMotion = {
            type: "none",
            elapsed: 0,
            config: null
        };
        this.dragging = null;
        this.dragSamples = [];
        this.options = {
            showWavefronts: true,
            showVectors: true,
            dopplerPitch: true,
            distanceLoudness: true,
            stereo: true,
            inertia: false,
            listenerB: false,
            selectedListener: "A",
            soundMode: "engine",
            circularDirection: 1,
            circularRadius: 30,
            circularSpeed: 15,
            circularCenterMode: "listener"
        };
        this.reset();
    }

    Simulation.prototype.reset = function () {
        this.time = 0;
        this.running = false;
        this.frozen = false;
        this.mode = "free";
        this.autoState = "idle";
        this.autoMotion = {
            type: "none",
            elapsed: 0,
            config: null
        };
        this.nextWaveTime = 0;
        this.wavefronts = [];
        this.history = [];
        this.chartHistory = [];
        this.closestApproach = null;
        this.source = {
            id: "source",
            label: "Motorcycle",
            x: this.world.width * 0.28,
            y: this.world.height * 0.5,
            vx: 0,
            vy: 0,
            radius: 4,
            active: true
        };
        this.listeners = [
            {
                id: "A",
                label: "A",
                x: this.world.width * 0.68,
                y: this.world.height * 0.5,
                vx: 0,
                vy: 0,
                radius: 3.5,
                active: true
            },
            {
                id: "B",
                label: "B",
                x: this.world.width * 0.42,
                y: this.world.height * 0.28,
                vx: 0,
                vy: 0,
                radius: 3.5,
                active: false
            }
        ];
        this.pushHistory();
    };

    Simulation.prototype.getSoundSpeed = function () {
        if (this.soundSpeedOverride !== null) {
            return clamp(this.soundSpeedOverride, 300, 360);
        }
        return clamp(soundSpeedFromTemperature(this.temperature), 300, 360);
    };

    Simulation.prototype.setOption = function (name, value) {
        if (Object.prototype.hasOwnProperty.call(this.options, name)) {
            this.options[name] = value;
        }
        if (name === "listenerB") {
            this.listeners[1].active = !!value;
        }
    };

    Simulation.prototype.setTemperature = function (value) {
        this.temperature = clamp(Number(value), 0, 40);
    };

    Simulation.prototype.setSoundSpeedOverride = function (value, enabled) {
        this.soundSpeedOverride = enabled ? clamp(Number(value), 300, 360) : null;
    };

    Simulation.prototype.setBaseFrequency = function (value) {
        this.baseFrequency = clamp(Number(value), 35, 1200);
    };

    Simulation.prototype.setSourceSpeedSetting = function (value) {
        this.sourceSpeedSetting = clamp(Number(value), 0, 60);
        if (this.autoMotion.type === "linear" && this.autoMotion.config) {
            this.autoMotion.config.speed = Math.max(1, this.sourceSpeedSetting);
        }
    };

    Simulation.prototype.setObserverSpeedSetting = function (value) {
        this.observerSpeedSetting = clamp(Number(value), 0, 15);
    };

    Simulation.prototype.setAnimationSpeed = function (value) {
        this.animationSpeed = clamp(Number(value), 0.1, 2);
    };

    Simulation.prototype.getEmittedFrequencyAt = function (time) {
        var base = this.baseFrequency;
        if (this.options.soundMode !== "engine") {
            return base;
        }
        return clamp(base, 35, 260);
    };

    Simulation.prototype.getVisualStride = function () {
        var wavelength = this.getSoundSpeed() / Math.max(1, this.baseFrequency);
        return Math.max(1, Math.ceil(8 / wavelength));
    };

    Simulation.prototype.pushHistory = function () {
        var sample = sampleFromBody(this.time, this.source);
        this.history.push(sample);
        var minTime = this.time - 3.5;
        while (this.history.length > 2 && this.history[0].t < minTime) {
            this.history.shift();
        }
    };

    Simulation.prototype.sampleSourceAt = function (targetTime) {
        if (this.history.length === 0) {
            return sampleFromBody(this.time, this.source);
        }
        if (targetTime <= this.history[0].t) {
            return this.history[0];
        }
        for (var i = 0; i < this.history.length - 1; i += 1) {
            var a = this.history[i];
            var b = this.history[i + 1];
            if (targetTime >= a.t && targetTime <= b.t) {
                return interpolateSample(a, b, targetTime);
            }
        }
        return this.history[this.history.length - 1];
    };

    Simulation.prototype.findRetardedSample = function (listener) {
        var c = this.getSoundSpeed();
        if (this.history.length < 2) {
            return sampleFromBody(this.time, this.source);
        }

        var ro = { x: listener.x, y: listener.y };
        var now = this.time;
        var lo = this.history[0].t;
        var hi = now;
        var self = this;

        function residual(te) {
            var sample = self.sampleSourceAt(te);
            return magnitude(subtract(ro, sample.pos)) - c * (now - te);
        }

        if (residual(lo) > 0) {
            return sampleFromBody(this.time, this.source);
        }

        for (var i = 0; i < 24; i += 1) {
            var mid = (lo + hi) * 0.5;
            if (residual(mid) > 0) {
                hi = mid;
            } else {
                lo = mid;
            }
        }

        return this.sampleSourceAt((lo + hi) * 0.5);
    };

    Simulation.prototype.update = function (dtReal) {
        var dt = clamp(dtReal || 0, 0, 0.05) * this.animationSpeed;
        if (!this.running || this.frozen) {
            if (this.autoMotion.type !== "none" && this.autoState !== "completed") {
                this.autoState = "paused";
            }
            return;
        }

        if (this.autoMotion.type === "linear") {
            this.autoState = "running-linear";
        } else if (this.autoMotion.type === "circular") {
            this.autoState = "running-circular";
        }

        this.time += dt;
        this.updateMotion(dt);
        this.keepInside(this.source);
        for (var i = 0; i < this.listeners.length; i += 1) {
            this.keepInside(this.listeners[i]);
        }
        this.pushHistory();
        this.emitRepresentativeWavefronts();
        this.updateChartHistory();
    };

    Simulation.prototype.updateMotion = function (dt) {
        if (this.autoMotion.type === "linear") {
            this.autoMotion.elapsed += dt;
            this.applyLinearMotion();
            return;
        }

        if (this.autoMotion.type === "circular") {
            this.autoMotion.elapsed += dt;
            this.applyCircularMotion();
            return;
        }

        if (this.mode === "preset") {
            this.source.x += this.source.vx * dt;
            this.source.y += this.source.vy * dt;
            for (var i = 0; i < this.listeners.length; i += 1) {
                if (this.listeners[i].active) {
                    this.listeners[i].x += this.listeners[i].vx * dt;
                    this.listeners[i].y += this.listeners[i].vy * dt;
                }
            }
            return;
        }

        if (!this.dragging && this.options.inertia) {
            this.source.x += this.source.vx * dt;
            this.source.y += this.source.vy * dt;
            this.source.vx *= Math.pow(0.985, dt * 60);
            this.source.vy *= Math.pow(0.985, dt * 60);
        }
    };

    Simulation.prototype.emitRepresentativeWavefronts = function () {
        if (!this.options.showWavefronts) {
            return;
        }
        var stride = this.getVisualStride();
        var frequency = Math.max(1, this.baseFrequency);
        var interval = stride / frequency;
        if (this.nextWaveTime <= 0) {
            this.nextWaveTime = this.time;
        }
        var guard = 0;
        while (this.nextWaveTime <= this.time && guard < 8) {
            var originSample = this.sampleSourceAt(this.nextWaveTime);
            this.wavefronts.push({
                x: originSample.pos.x,
                y: originSample.pos.y,
                t: this.nextWaveTime,
                stride: stride
            });
            this.nextWaveTime += interval;
            guard += 1;
        }
        var c = this.getSoundSpeed();
        var diagonal = Math.sqrt(this.world.width * this.world.width + this.world.height * this.world.height);
        this.wavefronts = this.wavefronts.filter(function (w) {
            return c * (this.time - w.t) < diagonal + 30;
        }, this);
        while (this.wavefronts.length > this.maxWavefronts) {
            this.wavefronts.shift();
        }
    };

    Simulation.prototype.updateChartHistory = function () {
        var metrics = this.getMetrics();
        var a = metrics.listeners[0];
        this.chartHistory.push({
            t: this.time,
            frequency: a.observedFrequency,
            radial: a.sourceRadialTowardObserver,
            distance: a.distance
        });
        var minTime = this.time - this.chartWindowSeconds;
        while (this.chartHistory.length > 2 && this.chartHistory[0].t < minTime) {
            this.chartHistory.shift();
        }
    };

    Simulation.prototype.getMetrics = function () {
        var c = this.getSoundSpeed();
        var emittedNow = this.getEmittedFrequencyAt(this.time);
        var listenerMetrics = [];
        for (var i = 0; i < this.listeners.length; i += 1) {
            var listener = this.listeners[i];
            if (!listener.active) {
                continue;
            }
            var retarded = this.findRetardedSample(listener);
            var emittedAtSource = this.getEmittedFrequencyAt(retarded.t);
            var result = calculateDoppler(
                retarded.pos,
                { x: listener.x, y: listener.y },
                retarded.vel,
                { x: listener.vx, y: listener.vy },
                c,
                emittedAtSource);
            result.id = listener.id;
            result.listener = cloneBody(listener);
            result.retardedSource = retarded;
            result.emittedAtSource = emittedAtSource;
            listenerMetrics.push(result);
        }

        if (listenerMetrics.length === 1 && this.listeners[1].active === false) {
            var b = this.listeners[1];
            var bResult = calculateDoppler(
                { x: this.source.x, y: this.source.y },
                { x: b.x, y: b.y },
                { x: this.source.vx, y: this.source.vy },
                { x: b.vx, y: b.vy },
                c,
                emittedNow);
            bResult.id = "B";
            bResult.listener = cloneBody(b);
            bResult.retardedSource = sampleFromBody(this.time, this.source);
            bResult.inactive = true;
            listenerMetrics.push(bResult);
        }

        var activeA = listenerMetrics[0] || calculateDoppler(
            this.source,
            this.listeners[0],
            { x: this.source.vx, y: this.source.vy },
            { x: this.listeners[0].vx, y: this.listeners[0].vy },
            c,
            emittedNow);
        return {
            time: this.time,
            running: this.running,
            frozen: this.frozen,
            mode: this.mode,
            autoState: this.autoState,
            autoMotion: {
                type: this.autoMotion.type,
                elapsed: this.autoMotion.elapsed,
                config: this.autoMotion.config ? JSON.parse(JSON.stringify(this.autoMotion.config)) : null
            },
            closestApproach: this.closestApproach ? Object.assign({}, this.closestApproach) : null,
            source: cloneBody(this.source),
            listeners: listenerMetrics,
            selectedListener: this.options.selectedListener,
            emittedNow: emittedNow,
            soundSpeed: c,
            temperature: this.temperature,
            visualStride: this.getVisualStride(),
            wavefronts: this.wavefronts.slice(0),
            chartHistory: this.chartHistory.slice(0),
            world: this.world,
            options: Object.assign({}, this.options),
            warning: activeA.warning,
            state: activeA.state
        };
    };

    Simulation.prototype.resetTimeSeries = function () {
        this.time = 0;
        this.wavefronts = [];
        this.chartHistory = [];
        this.history = [];
        this.nextWaveTime = 0;
    };

    Simulation.prototype.cancelAutomaticMotion = function () {
        this.autoState = "idle";
        this.autoMotion = {
            type: "none",
            elapsed: 0,
            config: null
        };
    };

    Simulation.prototype.applyLinearMotion = function () {
        var state = linearKinematics(this.autoMotion.config, this.autoMotion.elapsed);
        this.source.x = state.x;
        this.source.y = state.y;
        this.source.vx = state.vx;
        this.source.vy = state.vy;
        if (state.completed) {
            this.running = false;
            this.autoState = "completed";
        }
    };

    Simulation.prototype.applyCircularMotion = function () {
        var state = circularKinematics(this.autoMotion.config, this.autoMotion.elapsed);
        this.source.x = state.x;
        this.source.y = state.y;
        this.source.vx = state.vx;
        this.source.vy = state.vy;
    };

    Simulation.prototype.startAutoPass = function () {
        this.frozen = false;
        this.running = true;
        this.mode = "linear";
        this.autoState = "running-linear";
        this.resetTimeSeries();
        var listener = this.listeners[0];
        listener.x = this.world.width * 0.5;
        listener.y = this.world.height * 0.58;
        listener.vx = 0;
        listener.vy = 0;
        var startX = Math.max(5, listener.x - 90);
        var endX = Math.min(this.world.width - 5, listener.x + 90);
        var pathY = clamp(listener.y - 15, 12, this.world.height - 12);
        this.autoMotion = {
            type: "linear",
            elapsed: 0,
            config: {
                startX: startX,
                endX: endX,
                pathY: pathY,
                speed: Math.max(1, this.sourceSpeedSetting)
            }
        };
        this.closestApproach = { x: listener.x, y: pathY, label: "closest" };
        this.applyLinearMotion();
        this.pushHistory();
    };

    Simulation.prototype.startCircularMotion = function (options) {
        options = options || {};
        this.frozen = false;
        this.running = true;
        this.mode = "circular";
        this.autoState = "running-circular";
        this.resetTimeSeries();
        var listener = this.listeners[0];
        var radius = clamp(options.radius === undefined ? 30 : Number(options.radius), 8, 45);
        var tangentialSpeed = clamp(options.speed === undefined ? 15 : Number(options.speed), 1, 35);
        var direction = Number(options.direction) < 0 ? -1 : 1;
        var center;
        if (options.centerMode === "fixed") {
            center = { x: this.world.width * 0.5, y: this.world.height * 0.5 };
        } else {
            listener.x = this.world.width * 0.5;
            listener.y = this.world.height * 0.5;
            listener.vx = 0;
            listener.vy = 0;
            center = { x: listener.x, y: listener.y };
        }
        center.x = clamp(center.x, radius + 5, this.world.width - radius - 5);
        center.y = clamp(center.y, radius + 5, this.world.height - radius - 5);
        if (options.centerMode !== "fixed") {
            listener.x = center.x;
            listener.y = center.y;
        }
        this.closestApproach = null;
        this.autoMotion = {
            type: "circular",
            elapsed: 0,
            config: {
                center: center,
                radius: radius,
                tangentialSpeed: tangentialSpeed,
                angularVelocity: tangentialSpeed / radius,
                direction: direction,
                initialAngle: Math.PI
            }
        };
        this.applyCircularMotion();
        this.pushHistory();
    };

    Simulation.prototype.resetAutomaticMotion = function () {
        if (this.autoMotion.type === "linear") {
            this.autoMotion.elapsed = 0;
            this.running = false;
            this.autoState = "paused";
            this.resetTimeSeries();
            this.applyLinearMotion();
            this.source.vx = 0;
            this.source.vy = 0;
            this.pushHistory();
            return true;
        }
        if (this.autoMotion.type === "circular") {
            this.autoMotion.elapsed = 0;
            this.running = false;
            this.autoState = "paused";
            this.resetTimeSeries();
            this.applyCircularMotion();
            this.source.vx = 0;
            this.source.vy = 0;
            this.pushHistory();
            return true;
        }
        return false;
    };

    Simulation.prototype.applyPreset = function (name) {
        this.cancelAutomaticMotion();
        this.mode = name === "free" ? "free" : "preset";
        this.running = name !== "free";
        this.frozen = false;
        this.source.x = this.world.width * 0.38;
        this.source.y = this.world.height * 0.5;
        this.listeners[0].x = this.world.width * 0.68;
        this.listeners[0].y = this.world.height * 0.5;
        this.source.vx = 0;
        this.source.vy = 0;
        this.listeners[0].vx = 0;
        this.listeners[0].vy = 0;
        var ss = Math.max(1, this.sourceSpeedSetting);
        var os = Math.max(1, this.observerSpeedSetting || 10);

        if (name === "observerApproaches") {
            this.listeners[0].vx = -os;
        } else if (name === "observerRecedes") {
            this.listeners[0].x = this.world.width * 0.55;
            this.listeners[0].vx = os;
        } else if (name === "bothApproach") {
            this.source.x = this.world.width * 0.28;
            this.listeners[0].x = this.world.width * 0.72;
            this.source.vx = ss;
            this.listeners[0].vx = -os;
        } else if (name === "bothApart") {
            this.source.x = this.world.width * 0.5;
            this.listeners[0].x = this.world.width * 0.58;
            this.source.vx = -ss;
            this.listeners[0].vx = os;
        } else if (name === "sameDirection") {
            this.source.x = this.world.width * 0.3;
            this.listeners[0].x = this.world.width * 0.55;
            this.source.vx = ss;
            this.listeners[0].vx = Math.min(os, ss * 0.45);
        } else if (name === "movingPass") {
            this.source.x = 8;
            this.source.y = this.world.height * 0.42;
            this.listeners[0].x = this.world.width * 0.55;
            this.listeners[0].y = this.world.height * 0.58;
            this.source.vx = ss;
            this.listeners[0].vx = Math.min(os, 8);
        } else if (name === "observerTangential") {
            this.source.x = this.world.width * 0.5;
            this.source.y = this.world.height * 0.5;
            this.listeners[0].x = this.world.width * 0.5;
            this.listeners[0].y = this.world.height * 0.25;
            this.listeners[0].vx = os;
        }

        if (name === "free") {
            this.source.vx = 0;
            this.source.vy = 0;
            this.listeners[0].vx = 0;
            this.listeners[0].vy = 0;
        }
        this.wavefronts = [];
        this.chartHistory = [];
        this.history = [];
        this.nextWaveTime = 0;
        this.time = 0;
        this.pushHistory();
    };

    Simulation.prototype.keepInside = function (body) {
        body.x = clamp(body.x, 0, this.world.width);
        body.y = clamp(body.y, 0, this.world.height);
        if (body.x <= 0 || body.x >= this.world.width) {
            body.vx = 0;
        }
        if (body.y <= 0 || body.y >= this.world.height) {
            body.vy = 0;
        }
    };

    Simulation.prototype.pickObject = function (worldPoint) {
        var p = point(worldPoint);
        var candidates = [this.source].concat(this.listeners.filter(function (l) { return l.active; }));
        var best = null;
        var bestDistance = Infinity;
        for (var i = 0; i < candidates.length; i += 1) {
            var body = candidates[i];
            var d = magnitude(subtract(p, body));
            if (d < Math.max(7, body.radius * 2.2) && d < bestDistance) {
                best = body.id;
                bestDistance = d;
            }
        }
        return best;
    };

    Simulation.prototype.getBodyById = function (id) {
        if (id === "source") {
            return this.source;
        }
        for (var i = 0; i < this.listeners.length; i += 1) {
            if (this.listeners[i].id === id) {
                return this.listeners[i];
            }
        }
        return null;
    };

    Simulation.prototype.beginDrag = function (id, worldPoint, realTime) {
        var body = this.getBodyById(id);
        if (!body) {
            return;
        }
        this.cancelAutomaticMotion();
        this.mode = "free";
        this.dragging = id;
        this.dragSamples = [];
        this.dragBodyTo(body, worldPoint, realTime);
    };

    Simulation.prototype.dragBodyTo = function (body, worldPoint, realTime) {
        var p = point(worldPoint);
        p.x = clamp(p.x, 0, this.world.width);
        p.y = clamp(p.y, 0, this.world.height);
        var now = Number(realTime) || 0;
        this.dragSamples.push({ t: now, x: p.x, y: p.y });
        while (this.dragSamples.length > 2 && now - this.dragSamples[0].t > 0.22) {
            this.dragSamples.shift();
        }
        if (this.dragSamples.length >= 2) {
            var first = this.dragSamples[0];
            var last = this.dragSamples[this.dragSamples.length - 1];
            var span = Math.max(0.016, last.t - first.t);
            var vx = clamp((last.x - first.x) / span, -90, 90);
            var vy = clamp((last.y - first.y) / span, -90, 90);
            body.vx = body.vx * 0.55 + vx * 0.45;
            body.vy = body.vy * 0.55 + vy * 0.45;
        }
        body.x = p.x;
        body.y = p.y;
    };

    Simulation.prototype.dragTo = function (worldPoint, realTime) {
        var body = this.getBodyById(this.dragging);
        if (!body) {
            return;
        }
        this.dragBodyTo(body, worldPoint, realTime);
        if (body.id === "source") {
            this.pushHistory();
        }
    };

    Simulation.prototype.endDrag = function () {
        var body = this.getBodyById(this.dragging);
        if (body && !this.options.inertia) {
            body.vx = 0;
            body.vy = 0;
        }
        this.dragging = null;
        this.dragSamples = [];
    };

    global.DopplerEngine = {
        Vec: {
            add: add,
            subtract: subtract,
            multiply: multiply,
            magnitude: magnitude,
            normalize: normalize,
            dot: dot,
            clamp: clamp,
            lerp: lerp,
            lerpVec: lerpVec
        },
        Simulation: Simulation,
        calculateDoppler: calculateDoppler,
        distanceGain: distanceGain,
        linearKinematics: linearKinematics,
        circularKinematics: circularKinematics,
        soundSpeedFromTemperature: soundSpeedFromTemperature
    };
}(window));
