(function (global) {
    "use strict";

    function DopplerRenderer(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.dpr = 1;
        this.viewport = { scale: 1, offsetX: 0, offsetY: 0, width: 1, height: 1 };
        this.images = {
            motorcycle: loadImage("Assets/motorcycle-source.png"),
            listener: loadImage("Assets/custom-listener.png")
        };
        this.resize();
    }

    var SPRITES = {
        motorcycle: {
            worldHeight: 23,
            visualAnchor: { x: 0.48, y: 0.96 },
            acousticPoint: { x: 0.46, y: 0.48 }
        },
        listener: {
            worldHeight: 25,
            visualAnchor: { x: 0.48, y: 0.98 },
            acousticPoint: { x: 0.52, y: 0.17 }
        }
    };

    function loadImage(src) {
        var image = new Image();
        image.src = src;
        return image;
    }

    DopplerRenderer.prototype.resize = function () {
        var rect = this.canvas.getBoundingClientRect();
        var width = Math.max(320, rect.width || this.canvas.width);
        var height = Math.max(180, rect.height || this.canvas.height);
        this.dpr = global.devicePixelRatio || 1;
        this.canvas.width = Math.round(width * this.dpr);
        this.canvas.height = Math.round(height * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    };

    DopplerRenderer.prototype.computeViewport = function (world) {
        var rect = this.canvas.getBoundingClientRect();
        var width = rect.width || this.canvas.width / this.dpr;
        var height = rect.height || this.canvas.height / this.dpr;
        var scale = Math.min(width / world.width, height / world.height);
        this.viewport = {
            scale: scale,
            offsetX: (width - world.width * scale) * 0.5,
            offsetY: (height - world.height * scale) * 0.5,
            width: width,
            height: height
        };
    };

    DopplerRenderer.prototype.worldToCanvas = function (point) {
        return {
            x: this.viewport.offsetX + point.x * this.viewport.scale,
            y: this.viewport.offsetY + point.y * this.viewport.scale
        };
    };

    DopplerRenderer.prototype.canvasToWorld = function (clientX, clientY) {
        var rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left - this.viewport.offsetX) / this.viewport.scale,
            y: (clientY - rect.top - this.viewport.offsetY) / this.viewport.scale
        };
    };

    DopplerRenderer.prototype.render = function (metrics) {
        this.computeViewport(metrics.world);
        var ctx = this.ctx;
        var vp = this.viewport;
        ctx.save();
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, vp.width, vp.height);
        this.drawBackground(metrics);
        this.drawAutomaticGuides(metrics);
        if (metrics.options.showWavefronts) {
            this.drawWavefronts(metrics);
        }
        this.drawListeners(metrics);
        this.drawSource(metrics);
        this.drawDistanceLines(metrics);
        if (metrics.options.showVectors) {
            this.drawVectors(metrics);
        }
        this.drawScale(metrics);
        ctx.restore();
    };

    DopplerRenderer.prototype.drawAutomaticGuides = function (metrics) {
        var auto = metrics.autoMotion || {};
        var config = auto.config || {};
        var ctx = this.ctx;
        if (auto.type === "linear") {
            ctx.save();
            ctx.strokeStyle = "rgba(255, 207, 112, 0.7)";
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            this.line({ x: config.startX, y: config.pathY }, { x: config.endX, y: config.pathY });
            ctx.setLineDash([]);
            if (metrics.closestApproach) {
                var ca = this.worldToCanvas(metrics.closestApproach);
                ctx.fillStyle = "#ffcf70";
                ctx.beginPath();
                ctx.arc(ca.x, ca.y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = "700 12px system-ui, sans-serif";
                ctx.fillText("closest", ca.x + 8, ca.y - 8);
            }
            ctx.restore();
        } else if (auto.type === "circular" && config.center) {
            var center = this.worldToCanvas(config.center);
            var radius = (Number(config.radius) || 30) * this.viewport.scale;
            ctx.save();
            ctx.strokeStyle = "rgba(255, 207, 112, 0.72)";
            ctx.fillStyle = "#ffcf70";
            ctx.lineWidth = 2;
            ctx.setLineDash([9, 7]);
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(center.x, center.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = "700 12px system-ui, sans-serif";
            ctx.fillText("center", center.x + 8, center.y - 8);
            ctx.restore();
        }
    };

    DopplerRenderer.prototype.drawBackground = function (metrics) {
        var ctx = this.ctx;
        var world = metrics.world;
        var topLeft = this.worldToCanvas({ x: 0, y: 0 });
        var bottomRight = this.worldToCanvas({ x: world.width, y: world.height });
        ctx.fillStyle = "#081421";
        ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
        ctx.fillStyle = "#0d1d2e";
        ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);

        ctx.strokeStyle = "rgba(151, 193, 210, 0.15)";
        ctx.lineWidth = 1;
        for (var x = 0; x <= world.width; x += 10) {
            this.line({ x: x, y: 0 }, { x: x, y: world.height });
        }
        for (var y = 0; y <= world.height; y += 10) {
            this.line({ x: 0, y: y }, { x: world.width, y: y });
        }

        var roadY = world.height * 0.58;
        var roadTop = this.worldToCanvas({ x: 0, y: roadY - 9 });
        var roadBottom = this.worldToCanvas({ x: world.width, y: roadY + 9 });
        ctx.fillStyle = "#182332";
        ctx.fillRect(roadTop.x, roadTop.y, roadBottom.x - roadTop.x, roadBottom.y - roadTop.y);
        ctx.setLineDash([14, 12]);
        ctx.strokeStyle = "rgba(255,255,255,0.36)";
        ctx.lineWidth = 2;
        this.line({ x: 0, y: roadY }, { x: world.width, y: roadY });
        ctx.setLineDash([]);
    };

    DopplerRenderer.prototype.drawWavefronts = function (metrics) {
        var ctx = this.ctx;
        var c = metrics.soundSpeed;
        var maxRadius = Math.sqrt(metrics.world.width * metrics.world.width + metrics.world.height * metrics.world.height);
        for (var i = 0; i < metrics.wavefronts.length; i += 1) {
            var w = metrics.wavefronts[i];
            var age = metrics.time - w.t;
            if (age < 0) {
                continue;
            }
            var radius = c * age;
            var alpha = Math.max(0, 1 - radius / (maxRadius + 20));
            var center = this.worldToCanvas(w);
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius * this.viewport.scale, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(84, 214, 255, " + (0.34 * alpha).toFixed(3) + ")";
            ctx.lineWidth = Math.max(1, 1.6 * alpha);
            ctx.stroke();
        }
    };

    DopplerRenderer.prototype.drawSource = function (metrics) {
        var source = metrics.source;
        var p = this.worldToCanvas(source);
        var sprite = SPRITES.motorcycle;
        var height = Math.max(70, sprite.worldHeight * this.viewport.scale);
        var img = this.images.motorcycle;
        var aspect = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0.801;
        var width = height * aspect;
        var ctx = this.ctx;
        ctx.save();
        var x = p.x - width * sprite.acousticPoint.x;
        var y = p.y - height * sprite.acousticPoint.y;
        var footX = x + width * sprite.visualAnchor.x;
        var footY = y + height * sprite.visualAnchor.y;
        ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
        ctx.beginPath();
        ctx.ellipse(footX, footY, width * 0.25, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        if (img.complete && img.naturalWidth) {
            ctx.drawImage(img, x, y, width, height);
        } else {
            ctx.fillStyle = "#f7fbff";
            ctx.fillRect(x, y, width, height);
        }
        ctx.fillStyle = "#ffcf70";
        ctx.strokeStyle = "#07111f";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffcf70";
        ctx.font = "700 12px system-ui, sans-serif";
        ctx.fillText("source", p.x + 8, p.y - 8);
        ctx.restore();
    };

    DopplerRenderer.prototype.drawListeners = function (metrics) {
        var ctx = this.ctx;
        for (var i = 0; i < metrics.listeners.length; i += 1) {
            var data = metrics.listeners[i];
            if (data.inactive) {
                continue;
            }
            var listener = data.listener;
            var p = this.worldToCanvas(listener);
            var sprite = SPRITES.listener;
            var height = Math.max(90, sprite.worldHeight * this.viewport.scale);
            var img = this.images.listener;
            var aspect = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0.344;
            var width = height * aspect;
            ctx.save();
            var x = p.x - width * sprite.acousticPoint.x;
            var y = p.y - height * sprite.acousticPoint.y;
            var footX = x + width * sprite.visualAnchor.x;
            var footY = y + height * sprite.visualAnchor.y;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
            ctx.fillStyle = listener.id === "A" ? "rgba(102, 221, 255, 0.15)" : "rgba(255, 183, 90, 0.16)";
            ctx.fill();
            ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
            ctx.beginPath();
            ctx.ellipse(footX, footY, width * 0.34, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            if (img.complete && img.naturalWidth) {
                ctx.drawImage(img, x, y, width, height);
            } else {
                ctx.fillStyle = "#d9f7ff";
                ctx.fillRect(x, y, width, height);
            }
            ctx.fillStyle = listener.id === "A" ? "#5ce1ff" : "#ffb75a";
            ctx.strokeStyle = "#07111f";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(p.x + 8, p.y - 1, 3.5, -Math.PI * 0.65, Math.PI * 0.65);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(p.x + 8, p.y - 1, 6, -Math.PI * 0.65, Math.PI * 0.65);
            ctx.stroke();
            ctx.fillStyle = "#f8fbff";
            ctx.strokeStyle = "rgba(0,0,0,0.65)";
            ctx.lineWidth = 3;
            ctx.font = "800 14px system-ui, sans-serif";
            ctx.textAlign = "center";
            var labelY = y - 8;
            ctx.strokeText(listener.id, p.x, labelY);
            ctx.fillText(listener.id, p.x, labelY);
            ctx.restore();
        }
    };
    DopplerRenderer.prototype.drawDistanceLines = function (metrics) {
        var ctx = this.ctx;
        for (var i = 0; i < metrics.listeners.length; i += 1) {
            var data = metrics.listeners[i];
            if (data.inactive) {
                continue;
            }
            var source = data.retardedSource ? data.retardedSource.pos : metrics.source;
            var listener = data.listener;
            var a = this.worldToCanvas(source);
            var b = this.worldToCanvas(listener);
            ctx.strokeStyle = data.id === "A" ? "rgba(102,221,255,0.75)" : "rgba(255,183,90,0.75)";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    };

    DopplerRenderer.prototype.drawVectors = function (metrics) {
        var source = metrics.source;
        var auto = metrics.autoMotion || {};
        if (auto.type === "circular" && auto.config && auto.config.center) {
            this.arrow(
                auto.config.center,
                { x: source.x, y: source.y },
                "#ffcf70",
                "r"
            );
        }
        this.arrow(
            { x: source.x, y: source.y },
            { x: source.x + source.vx * 0.45, y: source.y + source.vy * 0.45 },
            "#f8fbff",
            "v"
        );
        var active = metrics.listeners.filter(function (m) { return !m.inactive; });
        for (var i = 0; i < active.length; i += 1) {
            var data = active[i];
            var direction = data.direction || { x: 1, y: 0 };
            var radial = data.sourceRadialTowardObserver;
            this.arrow(
                { x: metrics.source.x, y: metrics.source.y },
                {
                    x: metrics.source.x + direction.x * radial * 0.45,
                    y: metrics.source.y + direction.y * radial * 0.45
                },
                data.state === "approaching" ? "#5ce1ff" : data.state === "receding" ? "#ff9b55" : "#b6c7d6",
                "vᵣ " + data.id
            );
            var listener = data.listener;
            this.arrow(
                { x: listener.x, y: listener.y },
                { x: listener.x + listener.vx * 0.45, y: listener.y + listener.vy * 0.45 },
                "#d9b7ff",
                "u " + listener.id
            );
        }
    };

    DopplerRenderer.prototype.drawScale = function (metrics) {
        var ctx = this.ctx;
        var barMeters = 25;
        var start = this.worldToCanvas({ x: metrics.world.width - 34, y: metrics.world.height - 8 });
        var end = this.worldToCanvas({ x: metrics.world.width - 34 + barMeters, y: metrics.world.height - 8 });
        ctx.strokeStyle = "#f8fbff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.fillStyle = "#f8fbff";
        ctx.font = "700 13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("25 m", (start.x + end.x) / 2, start.y - 8);
    };

    DopplerRenderer.prototype.line = function (a, b) {
        var pa = this.worldToCanvas(a);
        var pb = this.worldToCanvas(b);
        this.ctx.beginPath();
        this.ctx.moveTo(pa.x, pa.y);
        this.ctx.lineTo(pb.x, pb.y);
        this.ctx.stroke();
    };

    DopplerRenderer.prototype.arrow = function (a, b, color, label) {
        var ctx = this.ctx;
        var pa = this.worldToCanvas(a);
        var pb = this.worldToCanvas(b);
        var dx = pb.x - pa.x;
        var dy = pb.y - pa.y;
        var length = Math.sqrt(dx * dx + dy * dy);
        if (length < 6) {
            return;
        }
        var angle = Math.atan2(dy, dx);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
        ctx.translate(pb.x, pb.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, -5);
        ctx.lineTo(-10, 5);
        ctx.closePath();
        ctx.fill();
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.font = "700 12px system-ui, sans-serif";
        ctx.fillText(label, pb.x + 6, pb.y - 6);
        ctx.restore();
    };

    global.DopplerRenderer = DopplerRenderer;
}(window));
