(function (global) {
    "use strict";

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function createNoiseBuffer(context) {
        var length = Math.max(1, Math.floor(context.sampleRate * 2));
        var buffer = context.createBuffer(1, length, context.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < length; i += 1) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    function EngineVoice(context, panValue) {
        this.context = context;
        this.mix = context.createGain();
        this.tremolo = context.createGain();
        this.gain = context.createGain();
        this.panner = context.createStereoPanner ? context.createStereoPanner() : null;
        this.components = [];
        this.harmonics = [
            { ratio: 1, gain: 0.44, type: "sawtooth" },
            { ratio: 2, gain: 0.22, type: "triangle" },
            { ratio: 3, gain: 0.13, type: "sine" },
            { ratio: 4, gain: 0.06, type: "sine" }
        ];

        this.tremolo.gain.value = 0.92;
        this.gain.gain.value = 0.0001;
        this.mix.connect(this.tremolo);
        this.tremolo.connect(this.gain);

        this.modOscillator = context.createOscillator();
        this.modGain = context.createGain();
        this.modOscillator.type = "sine";
        this.modOscillator.frequency.value = 7.5;
        this.modGain.gain.value = 0.04;
        this.modOscillator.connect(this.modGain);
        this.modGain.connect(this.tremolo.gain);
        this.modOscillator.start();

        this.harmonics.forEach(function (harmonic) {
            var oscillator = context.createOscillator();
            var gain = context.createGain();
            oscillator.type = harmonic.type;
            oscillator.frequency.value = 90 * harmonic.ratio;
            gain.gain.value = harmonic.gain;
            oscillator.connect(gain);
            gain.connect(this.mix);
            oscillator.start();
            this.components.push({ oscillator: oscillator, gain: gain, harmonic: harmonic });
        }, this);

        this.noise = context.createBufferSource();
        this.noise.buffer = createNoiseBuffer(context);
        this.noise.loop = true;
        this.noiseFilter = context.createBiquadFilter();
        this.noiseFilter.type = "bandpass";
        this.noiseFilter.frequency.value = 420;
        this.noiseFilter.Q.value = 0.9;
        this.noiseGain = context.createGain();
        this.noiseGain.gain.value = 0.035;
        this.noise.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.mix);
        this.noise.start();

        if (this.panner) {
            this.panner.pan.value = panValue;
            this.gain.connect(this.panner);
        } else {
            this.output = this.gain;
        }
    }

    EngineVoice.prototype.connect = function (node) {
        if (this.panner) {
            this.panner.connect(node);
        } else {
            this.gain.connect(node);
        }
    };

    EngineVoice.prototype.update = function (emittedFundamental, dopplerFactor, gain, pan, mode) {
        var now = this.context.currentTime;
        var emitted = clamp(isFinite(emittedFundamental) ? emittedFundamental : 90, 35, 260);
        var observedFundamental = clamp(emitted * (isFinite(dopplerFactor) ? dopplerFactor : 1), 25, 1200);
        var engineMode = mode !== "tone";
        this.components.forEach(function (component, index) {
            component.oscillator.frequency.setTargetAtTime(observedFundamental * component.harmonic.ratio, now, 0.035);
            component.gain.gain.setTargetAtTime(engineMode ? component.harmonic.gain : (index === 0 ? 0.65 : 0.0001), now, 0.05);
        });
        this.noiseFilter.frequency.setTargetAtTime(clamp(observedFundamental * 5, 120, 2200), now, 0.08);
        this.noiseGain.gain.setTargetAtTime(engineMode ? 0.035 : 0.0001, now, 0.08);
        this.modGain.gain.setTargetAtTime(engineMode ? 0.04 : 0.0001, now, 0.08);
        this.gain.gain.setTargetAtTime(clamp(gain, 0.0001, 0.35), now, 0.06);
        if (this.panner) {
            this.panner.pan.setTargetAtTime(clamp(pan, -1, 1), now, 0.08);
        }
    };

    EngineVoice.prototype.stop = function () {
        var now = this.context.currentTime;
        this.gain.gain.setTargetAtTime(0.0001, now, 0.03);
        this.components.forEach(function (component) {
            try {
                component.oscillator.stop(now + 0.12);
            } catch (ex) {
                // Some browsers throw if a stopped node is stopped again.
            }
        });
        [this.noise, this.modOscillator].forEach(function (source) {
            try {
                source.stop(now + 0.12);
            } catch (ex) {
                // Some browsers throw if a stopped node is stopped again.
            }
        });
    };

    function DopplerAudio() {
        this.context = null;
        this.master = null;
        this.voices = null;
        this.started = false;
        this.available = !!(global.AudioContext || global.webkitAudioContext);
        this.lastError = "";
    }

    DopplerAudio.prototype.start = function () {
        if (!this.available) {
            this.lastError = "audio-unavailable";
            return false;
        }
        if (this.started) {
            return true;
        }
        var AudioCtor = global.AudioContext || global.webkitAudioContext;
        try {
            this.context = new AudioCtor();
            this.master = this.context.createGain();
            this.master.gain.value = 0.75;
            this.master.connect(this.context.destination);
            this.voices = {
                A: new EngineVoice(this.context, -0.28),
                B: new EngineVoice(this.context, 0.28)
            };
            this.voices.A.connect(this.master);
            this.voices.B.connect(this.master);
            if (this.context.state === "suspended") {
                this.context.resume();
            }
            this.started = true;
            this.lastError = "";
            return true;
        } catch (ex) {
            this.lastError = "audio-start-failed";
            this.started = false;
            return false;
        }
    };

    DopplerAudio.prototype.stop = function () {
        if (!this.started || !this.context) {
            return;
        }
        this.voices.A.stop();
        this.voices.B.stop();
        var context = this.context;
        this.started = false;
        this.context = null;
        this.master = null;
        this.voices = null;
        global.setTimeout(function () {
            if (context && context.state !== "closed") {
                context.close();
            }
        }, 180);
    };

    DopplerAudio.prototype.suspend = function () {
        if (this.context && this.context.state === "running") {
            this.context.suspend();
        }
    };

    DopplerAudio.prototype.resume = function () {
        if (this.context && this.context.state === "suspended") {
            this.context.resume();
        }
    };

    DopplerAudio.prototype.update = function (metrics) {
        if (!this.started || !this.context || !this.voices) {
            return;
        }
        var listeners = metrics.listeners || [];
        var byId = {};
        listeners.forEach(function (listener) {
            byId[listener.id] = listener;
        });
        var selected = metrics.options.selectedListener || "A";
        var stereoCompare = selected === "stereo";
        var mode = metrics.options.soundMode;
        var worldWidth = metrics.world.width || 200;

        ["A", "B"].forEach(function (id) {
            var data = byId[id] || byId.A;
            if (!data) {
                return;
            }
            var distance = Math.max(4, data.distance || 20);
            var fallbackGain = clamp(16 / distance, 0.025, 0.28);
            var distanceGain = metrics.options.distanceLoudness ? (isFinite(data.distanceGain) ? data.distanceGain : fallbackGain) : 0.12;
            var selectedGain = stereoCompare ? 0.75 : (selected === id ? 1 : 0);
            if (data.inactive && !stereoCompare) {
                selectedGain = 0;
            }
            var emitted = data.emittedAtSource || metrics.emittedNow;
            var dopplerFactor = metrics.options.dopplerPitch ? data.dopplerFactor : 1;
            var pan = 0;
            if (metrics.options.stereo && data.listener) {
                pan = (data.listener.x / worldWidth) * 2 - 1;
            }
            if (stereoCompare) {
                pan = id === "A" ? -0.65 : 0.65;
            }
            this.voices[id].update(emitted, dopplerFactor, distanceGain * selectedGain, pan, mode);
        }, this);
    };

    global.DopplerAudio = DopplerAudio;
}(window));
