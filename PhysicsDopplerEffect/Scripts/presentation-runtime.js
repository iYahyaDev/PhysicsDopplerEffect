(function () {
    "use strict";

    var presentation;
    var slides = [];
    var current = 0;
    var revealStep = 1;
    var maxRevealStep = 1;
    var mounted;
    var language = getLanguage();
    var resizeTimer;

    var els = {
        app: document.getElementById("presentationApp"),
        stage: document.getElementById("presentationStage"),
        overview: document.getElementById("presentationOverview"),
        controls: document.getElementById("presentationControls"),
        showControls: document.getElementById("runtimeShowControls"),
        prev: document.getElementById("runtimePrev"),
        next: document.getElementById("runtimeNext"),
        overviewBtn: document.getElementById("runtimeOverview"),
        reset: document.getElementById("runtimeReset"),
        fullscreen: document.getElementById("runtimeFullscreen"),
        language: document.getElementById("runtimeLanguage"),
        hide: document.getElementById("runtimeHideControls"),
        slideNumber: document.getElementById("runtimeSlideNumber"),
        slideTotal: document.getElementById("runtimeSlideTotal"),
        stepDots: document.getElementById("runtimeStepDots"),
        progress: document.getElementById("runtimeProgress"),
        status: document.getElementById("runtimeStatus")
    };

    function getLanguage() {
        try {
            return localStorage.getItem("doppler.language") || "ar";
        } catch (ignore) {
            return "ar";
        }
    }

    function setLanguage(value) {
        language = value === "en" ? "en" : "ar";
        try {
            localStorage.setItem("doppler.language", language);
        } catch (ignore) { }
        document.documentElement.lang = language;
        document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
        updateControlLabels();
        renderCurrent();
    }

    function q(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function load() {
        var id = q("id") || (window.DopplerBoot && window.DopplerBoot.defaultPresentationId) || "doppler-main";
        var version = q("version") === "draft" || q("preview") === "1" ? "draft" : "published";
        setStatus(language === "ar" ? "جار تحميل العرض..." : "Loading presentation...");
        PresentationStorage.get(id, version).then(function (data) {
            presentation = data;
            slides = (presentation.slides || []).filter(function (slide) { return !slide.hidden; });
            if (!slides.length) {
                throw new Error(language === "ar" ? "لا توجد شرائح منشورة." : "No published slides.");
            }
            var start = parseInt(q("start") || q("slide") || "1", 10);
            current = clamp((isNaN(start) ? 1 : start) - 1, 0, slides.length - 1);
            setStatus("");
            renderCurrent();
        }).catch(function (error) {
            setStatus(error.message || (language === "ar" ? "تعذر تحميل العرض." : "Could not load presentation."));
            els.stage.innerHTML = "";
            var card = document.createElement("div");
            card.className = "presentation-not-found";
            card.textContent = language === "ar" ? "العرض غير متاح أو لم ينشر بعد." : "The presentation is unavailable or not published yet.";
            els.stage.appendChild(card);
        });
    }

    function renderCurrent() {
        if (!presentation || !slides.length) {
            return;
        }
        if (mounted) {
            mounted.dispose();
            mounted = null;
        }
        els.overview.hidden = true;
        els.stage.hidden = false;
        mounted = PresentationComponents.renderSlide(els.stage, presentation, slides[current], {
            language: language,
            revealStep: revealStep,
            onAction: handleSlideAction
        });
        els.stage.focus({ preventScroll: true });
        scheduleResize();
        updateCounters();
    }

    function handleSlideAction(action) {
        if (action === "reset") {
            goTo(0);
        } else if (action === "overview") {
            showOverview();
        } else if (action === "next") {
            next();
        }
    }

    function updateCounters() {
        maxRevealStep = slideMaxReveal(slides[current]);
        if (revealStep > maxRevealStep) {
            revealStep = maxRevealStep;
        }
        els.slideNumber.textContent = String(current + 1);
        els.slideTotal.textContent = String(slides.length);
        els.progress.style.width = (((current + (revealStep / maxRevealStep)) / slides.length) * 100) + "%";
        els.prev.disabled = current === 0 && revealStep === 1;
        els.next.disabled = current === slides.length - 1 && revealStep >= maxRevealStep;
        renderStepDots();
    }

    function slideMaxReveal(slide) {
        var max = 1;
        (slide.blocks || []).forEach(function (block) {
            var data = block.data || {};
            var step = Number(data.revealStep || data.RevealStep || 0);
            if (step > max) {
                max = step;
            }
        });
        return max;
    }

    function renderStepDots() {
        if (!els.stepDots) {
            return;
        }
        els.stepDots.innerHTML = "";
        if (maxRevealStep <= 1 || !els.overview.hidden) {
            els.stepDots.hidden = true;
            return;
        }
        els.stepDots.hidden = false;
        for (var i = 1; i <= maxRevealStep; i += 1) {
            var dot = document.createElement("span");
            dot.className = i <= revealStep ? "active" : "";
            els.stepDots.appendChild(dot);
        }
    }

    function updateControlLabels() {
        document.documentElement.lang = language;
        document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
        Array.prototype.forEach.call(document.querySelectorAll("[data-label-ar]"), function (node) {
            node.textContent = language === "ar" ? node.getAttribute("data-label-ar") : node.getAttribute("data-label-en");
        });
        els.language.textContent = language === "ar" ? "English" : "العربية";
    }

    function next() {
        if (revealStep < slideMaxReveal(slides[current])) {
            revealStep += 1;
            renderCurrent();
            return;
        }
        goTo(current + 1);
    }

    function prev() {
        if (revealStep > 1 && els.overview.hidden) {
            revealStep -= 1;
            renderCurrent();
            return;
        }
        goTo(current - 1);
    }

    function goTo(index) {
        current = clamp(index, 0, slides.length - 1);
        revealStep = 1;
        renderCurrent();
    }

    function showOverview() {
        if (!presentation) {
            return;
        }
        if (mounted) {
            mounted.dispose();
            mounted = null;
        }
        els.stage.hidden = true;
        els.overview.hidden = false;
        if (els.stepDots) {
            els.stepDots.hidden = true;
        }
        els.overview.innerHTML = "";
        slides.forEach(function (slide, index) {
            var card = document.createElement("button");
            card.type = "button";
            card.className = "overview-card";
            var title = slide.internalTitle || (slide.blocks[0] && PresentationComponents.localText(slide.blocks[0].data.text, language)) || slide.id;
            card.innerHTML = "<span>" + (index + 1) + "</span><strong></strong>";
            card.querySelector("strong").textContent = title;
            card.addEventListener("click", function () {
                goTo(index);
            });
            els.overview.appendChild(card);
        });
    }

    function reset() {
        goTo(0);
    }

    function toggleFullscreen() {
        var target = document.documentElement;
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(function () { }).finally(scheduleResize);
        } else if (target.requestFullscreen) {
            target.requestFullscreen().catch(function () {
                setStatus(language === "ar" ? "تعذر تفعيل ملء الشاشة." : "Fullscreen was not allowed.");
            }).finally(scheduleResize);
        }
    }

    function hideControls() {
        setControlsHidden(true);
    }

    function showControls() {
        setControlsHidden(false);
    }

    function setControlsHidden(hidden) {
        els.app.classList.toggle("controls-hidden", !!hidden);
        els.controls.hidden = false;
        els.showControls.hidden = !hidden;
        scheduleResize();
    }

    function scheduleResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (mounted && typeof mounted.resize === "function") {
                mounted.resize();
            }
            updateCounters();
        }, 80);
    }

    function setStatus(message) {
        els.status.textContent = message || "";
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function isTyping(target) {
        if (!target) return false;
        var tag = target.tagName;
        return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    }

    function bind() {
        els.prev.addEventListener("click", prev);
        els.next.addEventListener("click", next);
        els.overviewBtn.addEventListener("click", showOverview);
        els.reset.addEventListener("click", reset);
        els.fullscreen.addEventListener("click", toggleFullscreen);
        els.hide.addEventListener("click", hideControls);
        els.showControls.addEventListener("click", showControls);
        els.language.addEventListener("click", function () {
            setLanguage(language === "ar" ? "en" : "ar");
        });
        document.addEventListener("keydown", function (event) {
            if (isTyping(event.target)) {
                return;
            }
            if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
                event.preventDefault();
                next();
            } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
                event.preventDefault();
                prev();
            } else if (event.key === "Home") {
                event.preventDefault();
                goTo(0);
            } else if (event.key === "End") {
                event.preventDefault();
                goTo(slides.length - 1);
            } else if (event.key === "o" || event.key === "O") {
                showOverview();
            } else if (event.key === "Escape") {
                showControls();
                if (!els.overview.hidden) {
                    renderCurrent();
                }
            } else if (event.key === "h" || event.key === "H") {
                event.preventDefault();
                setControlsHidden(!els.app.classList.contains("controls-hidden"));
            }
        });
        document.addEventListener("fullscreenchange", scheduleResize);
        window.addEventListener("resize", scheduleResize);
        document.addEventListener("mousemove", function (event) {
            if (els.app.classList.contains("controls-hidden") && event.clientY >= window.innerHeight - 10) {
                els.showControls.focus({ preventScroll: true });
            }
        });
        var touchStart = null;
        document.addEventListener("touchstart", function (event) {
            touchStart = event.touches.length ? event.touches[0].clientX : null;
        }, { passive: true });
        document.addEventListener("touchend", function (event) {
            if (touchStart === null || !event.changedTouches.length) {
                return;
            }
            var dx = event.changedTouches[0].clientX - touchStart;
            if (Math.abs(dx) > 60) {
                dx < 0 ? next() : prev();
            }
            touchStart = null;
        }, { passive: true });
    }

    bind();
    updateControlLabels();
    load();

    window.PresentationRuntime = {
        next: next,
        prev: prev,
        goTo: goTo,
        reset: reset,
        showOverview: showOverview
    };
})();
