(function (global, document) {
    "use strict";

    function byId(id) {
        return document.getElementById(id);
    }

    function isTyping(target) {
        return target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
    }

    function lang() {
        return global.DopplerLocale ? global.DopplerLocale.getLanguage() : "ar";
    }

    document.addEventListener("DOMContentLoaded", function () {
        var shell = document.querySelector(".presenter-shell");
        var slides = Array.prototype.slice.call(document.querySelectorAll(".presenter-slide"));
        if (!shell || slides.length === 0) {
            return;
        }
        var index = 0;
        var notes = [
            ["ابدأ بالقصة، ثم اسأل: هل تغير صوت المحرك المنبعث نفسه؟", "Open with the story, then ask: did the emitted engine sound itself change?"],
            ["اجمع توقعين أو ثلاثة قبل تشغيل المحاكاة.", "Collect two or three predictions before running the simulation."],
            ["اربط التردد بعدد القمم التي تصل كل ثانية.", "Connect frequency to how many crests arrive each second."],
            ["انتقل إلى المختبر للسحب اليدوي أمام الشاشة.", "Move to the lab for manual dragging on screen."],
            ["أكد أن الدوائر مراكزها مواقع انبعاث قديمة.", "Emphasize that circle centers are old emission positions."],
            ["شغل المرور الخطي أو الحركة الدائرية ووجه الأنظار للرسم المستمر.", "Run the linear pass or circular motion and point to the continuous graph."],
            ["جمد لحظة واسأل أي مركبة تدخل المعادلة.", "Freeze a moment and ask which component enters the equation."],
            ["ضع المستمعين على جهتين لإظهار اختلاف الترددين.", "Place listeners on opposite sides to show different frequencies."],
            ["استخدم تجارب المستمع المتحرك في المختبر.", "Use the moving-observer presets in the lab."],
            ["شدد أن الرادار موجة كهرومغناطيسية منعكسة.", "Stress that radar is a reflected electromagnetic wave."],
            ["ناقش عامل cos(theta) وسبب ضعف القياس عند 90 درجة.", "Discuss cos(theta) and weak measurement near 90 degrees."],
            ["وضح أن الضوء لا يحتاج وسطا وأن النسبية مهمة.", "Explain that light needs no medium and relativity matters."],
            ["لخص الفروقات، ولا تستخدم معادلة الصوت للضوء.", "Summarize differences; do not use the sound equation for light."],
            ["دع طالبا يحاول إنجاز التحدي أمام الجمهور.", "Let a student try the challenge in front of the audience."],
            ["اختم بجملة: الشعاعي للنغمة، والمسافة للعلو.", "Close with: radial for pitch, distance for loudness."]
        ];

        function render() {
            slides.forEach(function (slide, i) {
                slide.classList.toggle("active", i === index);
            });
            byId("presenterIndex").textContent = index + 1;
            byId("presenterTotal").textContent = slides.length;
            byId("speakerNoteText").textContent = lang() === "en" ? notes[index][1] : notes[index][0];
            try {
                global.localStorage.setItem("doppler.presenterIndex", String(index));
            } catch (ex) {
                return false;
            }
            return true;
        }

        function next() {
            index = Math.min(slides.length - 1, index + 1);
            render();
        }

        function prev() {
            index = Math.max(0, index - 1);
            render();
        }

        try {
            var saved = Number(global.localStorage.getItem("doppler.presenterIndex"));
            if (isFinite(saved)) {
                index = Math.max(0, Math.min(slides.length - 1, saved));
            }
        } catch (ex) {
            index = 0;
        }

        byId("presenterNext").addEventListener("click", next);
        byId("presenterPrev").addEventListener("click", prev);
        byId("presenterFullscreen").addEventListener("click", function () {
            var request = shell.requestFullscreen || shell.webkitRequestFullscreen || shell.msRequestFullscreen;
            if (request) {
                request.call(shell);
            }
        });
        byId("presenterHideControls").addEventListener("click", function () {
            shell.classList.toggle("controls-hidden");
        });

        document.addEventListener("keydown", function (event) {
            if (isTyping(event.target)) {
                return;
            }
            if (event.key === "ArrowRight" || event.key === "PageDown") {
                if (document.documentElement.dir === "rtl") {
                    prev();
                } else {
                    next();
                }
            } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
                if (document.documentElement.dir === "rtl") {
                    next();
                } else {
                    prev();
                }
            } else if (event.key === "Home") {
                index = 0;
                render();
            } else if (event.key === "End") {
                index = slides.length - 1;
                render();
            } else if (event.key === "Escape") {
                shell.classList.remove("controls-hidden");
            }
        });
        global.addEventListener("doppler:languagechange", render);
        render();
    });
}(window, document));
