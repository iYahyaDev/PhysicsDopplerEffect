(function (global, document) {
    "use strict";

    function storageGet(key, fallback) {
        try {
            var value = global.localStorage.getItem(key);
            return value === null ? fallback : value;
        } catch (ex) {
            return fallback;
        }
    }

    function storageSet(key, value) {
        try {
            global.localStorage.setItem(key, value);
        } catch (ex) {
            return false;
        }
        return true;
    }

    function storageRemovePrefix(prefix) {
        try {
            var keys = [];
            for (var i = 0; i < global.localStorage.length; i += 1) {
                var key = global.localStorage.key(i);
                if (key && key.indexOf(prefix) === 0) {
                    keys.push(key);
                }
            }
            keys.forEach(function (key) { global.localStorage.removeItem(key); });
        } catch (ex) {
            return false;
        }
        return true;
    }

    function getBoot() {
        return global.DopplerBoot || {};
    }

    function getDictionary(language) {
        var boot = getBoot();
        return boot.localization && boot.localization[language] ? boot.localization[language] : {};
    }

    var pageTitleKeys = {
        home: "navHome",
        lab: "navLab",
        applications: "navApplications",
        compare: "navCompare",
        quiz: "navQuiz",
        presenter: "navPresenter",
        validation: "navValidation"
    };

    function textFor(element, language) {
        if (element.hasAttribute("data-i18n")) {
            var key = element.getAttribute("data-i18n");
            var dict = getDictionary(language);
            if (dict[key]) {
                return dict[key];
            }
        }
        if (language === "en" && element.hasAttribute("data-text-en")) {
            return element.getAttribute("data-text-en");
        }
        if (element.hasAttribute("data-text-ar")) {
            return element.getAttribute("data-text-ar");
        }
        return null;
    }

    function applyDocumentTitle(language) {
        var boot = getBoot();
        var key = pageTitleKeys[boot.page];
        var dict = getDictionary(language);
        if (key && dict[key]) {
            document.title = dict[key] + " - Doppler Lab";
        }
    }

    function localizedAttribute(element, language, name) {
        var suffix = language === "en" ? "-en" : "-ar";
        var value = element.getAttribute("data-" + name + suffix);
        if (value) {
            element.setAttribute(name, value);
        }
    }

    function applyLanguage(language) {
        var lang = language === "en" ? "en" : "ar";
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
        document.body.classList.toggle("is-ltr", lang === "en");
        document.body.classList.toggle("is-rtl", lang !== "en");
        applyDocumentTitle(lang);

        var elements = document.querySelectorAll("[data-i18n], [data-text-ar], [data-text-en]");
        elements.forEach(function (element) {
            var text = textFor(element, lang);
            if (text === null) {
                return;
            }
            if (element.tagName === "INPUT" && (element.type === "button" || element.type === "submit")) {
                element.value = text;
            } else {
                element.textContent = text;
            }
        });

        document.querySelectorAll("[data-title-ar], [data-title-en]").forEach(function (element) {
            localizedAttribute(element, lang, "title");
        });

        document.querySelectorAll("[data-aria-label-ar], [data-aria-label-en]").forEach(function (element) {
            localizedAttribute(element, lang, "aria-label");
        });

        global.dispatchEvent(new CustomEvent("doppler:languagechange", { detail: { language: lang } }));
    }

    function getLanguage() {
        var saved = storageGet("doppler.language", null);
        if (saved === "ar" || saved === "en") {
            return saved;
        }
        var boot = getBoot();
        var configured = boot.settings && (boot.settings.DefaultLanguage || boot.settings.defaultLanguage);
        return configured === "en" ? "en" : "ar";
    }

    function setLanguage(language) {
        var lang = language === "en" ? "en" : "ar";
        storageSet("doppler.language", lang);
        applyLanguage(lang);
    }

    function t(key) {
        var dict = getDictionary(getLanguage());
        return dict[key] || key;
    }

    function stateLabel(state) {
        if (state === "approaching") {
            return t("approaching");
        }
        if (state === "receding") {
            return t("receding");
        }
        if (state === "tangential") {
            return t("tangential");
        }
        return t("stationary");
    }

    function toast(message) {
        var region = document.getElementById("toastRegion");
        if (!region) {
            return;
        }
        var item = document.createElement("div");
        item.className = "toast";
        item.textContent = message;
        region.appendChild(item);
        global.setTimeout(function () {
            item.classList.add("leaving");
            global.setTimeout(function () {
                if (item.parentNode) {
                    item.parentNode.removeChild(item);
                }
            }, 260);
        }, 3200);
    }

    document.addEventListener("DOMContentLoaded", function () {
        applyLanguage(getLanguage());
        var toggle = document.getElementById("languageToggle");
        if (toggle) {
            toggle.addEventListener("click", function () {
                setLanguage(getLanguage() === "ar" ? "en" : "ar");
            });
        }
        var reset = document.getElementById("resetStorageBtn");
        if (reset) {
            reset.addEventListener("click", function () {
                storageRemovePrefix("doppler.");
                setLanguage("ar");
                toast(getLanguage() === "en" ? "Saved settings were reset." : "تم مسح الإعدادات المحفوظة.");
            });
        }
    });

    global.DopplerLocale = {
        getLanguage: getLanguage,
        setLanguage: setLanguage,
        applyLanguage: applyLanguage,
        t: t,
        stateLabel: stateLabel,
        toast: toast,
        storageGet: storageGet,
        storageSet: storageSet
    };
}(window, document));
