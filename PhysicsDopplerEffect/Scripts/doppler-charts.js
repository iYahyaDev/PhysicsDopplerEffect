(function (global) {
    "use strict";

    function ChartRenderer(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.dpr = 1;
        this.pointer = null;
        this.series = { frequency: true, radial: true, distance: true };
        this.resize();
        canvas.addEventListener("pointermove", function (event) {
            var rect = canvas.getBoundingClientRect();
            this.pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        }.bind(this));
        canvas.addEventListener("pointerleave", function () {
            this.pointer = null;
        }.bind(this));
    }

    function range(values, pad) {
        var min = Infinity;
        var max = -Infinity;
        values.forEach(function (value) {
            if (isFinite(value)) {
                min = Math.min(min, value);
                max = Math.max(max, value);
            }
        });
        if (!isFinite(min) || !isFinite(max)) {
            min = 0;
            max = 1;
        }
        if (Math.abs(max - min) < 1e-6) {
            min -= 1;
            max += 1;
        }
        var extra = (max - min) * (pad || 0.1);
        return { min: min - extra, max: max + extra };
    }

    ChartRenderer.prototype.resize = function () {
        var rect = this.canvas.getBoundingClientRect();
        var width = Math.max(320, rect.width || this.canvas.width);
        var height = Math.max(180, rect.height || this.canvas.height);
        this.dpr = global.devicePixelRatio || 1;
        this.canvas.width = Math.round(width * this.dpr);
        this.canvas.height = Math.round(height * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    };

    ChartRenderer.prototype.setSeries = function (name, enabled) {
        this.series[name] = enabled;
    };

    ChartRenderer.prototype.render = function (metrics, language) {
        var ctx = this.ctx;
        var rect = this.canvas.getBoundingClientRect();
        var width = rect.width || this.canvas.width / this.dpr;
        var height = rect.height || this.canvas.height / this.dpr;
        var history = metrics.chartHistory || [];
        var labels = language === "en" ? {
            frequency: "Observed frequency",
            radial: "Source radial velocity",
            distance: "Distance",
            seconds: "s",
            hz: "Hz",
            ms: "m/s",
            m: "m"
        } : {
            frequency: "التردد المسموع",
            radial: "سرعة المصدر الشعاعية",
            distance: "المسافة",
            seconds: "ث",
            hz: "Hz",
            ms: "m/s",
            m: "m"
        };

        ctx.save();
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#091727";
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        for (var gx = 52; gx < width - 18; gx += 80) {
            ctx.beginPath();
            ctx.moveTo(gx, 18);
            ctx.lineTo(gx, height - 24);
            ctx.stroke();
        }

        var enabled = [];
        if (this.series.frequency) {
            enabled.push({ key: "frequency", label: labels.frequency, unit: labels.hz, color: "#5ce1ff" });
        }
        if (this.series.radial) {
            enabled.push({ key: "radial", label: labels.radial, unit: labels.ms, color: "#ff9b55" });
        }
        if (this.series.distance) {
            enabled.push({ key: "distance", label: labels.distance, unit: labels.m, color: "#9be15d" });
        }
        if (enabled.length === 0) {
            ctx.fillStyle = "#dbe7f3";
            ctx.font = "700 16px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(language === "en" ? "No series selected" : "لا توجد سلسلة محددة", width / 2, height / 2);
            ctx.restore();
            return;
        }

        var plotLeft = 58;
        var plotRight = width - 22;
        var top = 18;
        var bottom = height - 32;
        var bandGap = 14;
        var bandHeight = (bottom - top - bandGap * (enabled.length - 1)) / enabled.length;
        var now = metrics.time || 0;
        var startTime = Math.max(0, now - (metrics.chartWindowSeconds || 18));
        if (history.length > 1) {
            startTime = history[0].t;
        }
        var span = Math.max(4, now - startTime || 4);

        enabled.forEach(function (series, index) {
            var bandTop = top + index * (bandHeight + bandGap);
            var bandBottom = bandTop + bandHeight;
            var values = history.map(function (sample) { return sample[series.key]; });
            var r = range(values, 0.12);
            this.drawBand(history, series, r, startTime, span, plotLeft, plotRight, bandTop, bandBottom, labels);
        }, this);

        ctx.fillStyle = "#b7c7d8";
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("0 " + labels.seconds, plotRight, height - 10);
        ctx.fillText("-" + span.toFixed(0) + " " + labels.seconds, plotLeft, height - 10);

        this.drawTooltip(history, enabled, startTime, span, plotLeft, plotRight, top, bottom, language);
        ctx.restore();
    };

    ChartRenderer.prototype.drawBand = function (history, series, r, startTime, span, left, right, top, bottom, labels) {
        var ctx = this.ctx;
        ctx.fillStyle = "rgba(255,255,255,0.025)";
        ctx.fillRect(left, top, right - left, bottom - top);
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.strokeRect(left, top, right - left, bottom - top);
        ctx.fillStyle = "#eaf4ff";
        ctx.font = "700 12px system-ui, sans-serif";
        ctx.textAlign = "start";
        ctx.fillText(series.label + " (" + series.unit + ")", left + 8, top + 17);
        ctx.fillStyle = "#9fb2c6";
        ctx.textAlign = "end";
        ctx.fillText(r.max.toFixed(series.key === "frequency" ? 0 : 1), left - 8, top + 12);
        ctx.fillText(r.min.toFixed(series.key === "frequency" ? 0 : 1), left - 8, bottom);

        if (history.length < 2) {
            return;
        }

        ctx.beginPath();
        for (var i = 0; i < history.length; i += 1) {
            var sample = history[i];
            var x = right - ((history[history.length - 1].t - sample.t) / span) * (right - left);
            var value = sample[series.key];
            var y = bottom - ((value - r.min) / (r.max - r.min)) * (bottom - top);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.strokeStyle = series.color;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        var current = history[history.length - 1];
        var currentY = bottom - ((current[series.key] - r.min) / (r.max - r.min)) * (bottom - top);
        ctx.fillStyle = series.color;
        ctx.beginPath();
        ctx.arc(right, currentY, 4, 0, Math.PI * 2);
        ctx.fill();
    };

    ChartRenderer.prototype.drawTooltip = function (history, enabled, startTime, span, left, right, top, bottom, language) {
        if (!this.pointer || history.length === 0 || this.pointer.x < left || this.pointer.x > right || this.pointer.y < top || this.pointer.y > bottom) {
            return;
        }
        var ctx = this.ctx;
        var newest = history[history.length - 1].t;
        var targetTime = newest - ((right - this.pointer.x) / (right - left)) * span;
        var nearest = history[0];
        var best = Infinity;
        history.forEach(function (sample) {
            var d = Math.abs(sample.t - targetTime);
            if (d < best) {
                best = d;
                nearest = sample;
            }
        });
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.moveTo(this.pointer.x, top);
        ctx.lineTo(this.pointer.x, bottom);
        ctx.stroke();
        var lines = [(language === "en" ? "t = " : "t = ") + nearest.t.toFixed(2) + " s"];
        enabled.forEach(function (series) {
            lines.push(series.label + ": " + nearest[series.key].toFixed(series.key === "frequency" ? 1 : 2) + " " + series.unit);
        });
        var boxWidth = 230;
        var boxHeight = 22 + lines.length * 18;
        var x = Math.min(this.pointer.x + 12, right - boxWidth);
        var y = Math.max(top + 6, this.pointer.y - boxHeight - 8);
        ctx.fillStyle = "rgba(6, 14, 25, 0.94)";
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, boxWidth, boxHeight, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#f8fbff";
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "start";
        lines.forEach(function (line, index) {
            ctx.fillText(line, x + 12, y + 20 + index * 18);
        });
    };

    global.DopplerChartRenderer = ChartRenderer;
}(window));
