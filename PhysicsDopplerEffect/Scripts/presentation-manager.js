(function () {
    "use strict";

    var list = document.getElementById("presentationList");
    var status = document.getElementById("presentationManagerStatus");
    var createBtn = document.getElementById("createPresentationBtn");
    var importInput = document.getElementById("importPresentationInput");

    function lang() {
        try {
            return localStorage.getItem("doppler.language") || "ar";
        } catch (ignore) {
            return "ar";
        }
    }

    function t(ar, en) {
        return lang() === "ar" ? ar : en;
    }

    function text(value) {
        value = value || {};
        return value.Ar || value.ar || value.En || value.en || "";
    }

    function setStatus(message, isError) {
        status.textContent = message || "";
        status.classList.toggle("error", !!isError);
    }

    function load() {
        setStatus(t("جار تحميل العروض...", "Loading presentations..."));
        PresentationStorage.list().then(function (items) {
            render(items);
            setStatus("");
        }).catch(function (error) {
            setStatus(error.message, true);
        });
    }

    function render(items) {
        list.innerHTML = "";
        if (!items.length) {
            list.appendChild(cardEmpty());
            return;
        }

        items.forEach(function (item) {
            var id = item.Id || item.id;
            var card = document.createElement("article");
            card.className = "presentation-list-card";
            var title = document.createElement("h2");
            title.textContent = text(item.Title || item.title) || id;
            card.appendChild(title);
            var meta = document.createElement("p");
            meta.textContent = t("عدد الشرائح: ", "Slides: ") + (item.SlideCount || item.slideCount || 0);
            card.appendChild(meta);
            var actions = document.createElement("div");
            actions.className = "card-actions";
            actions.appendChild(linkButton(t("تحرير", "Edit"), "PresentationEditor.aspx?id=" + encodeURIComponent(id), "primary-button"));
            actions.appendChild(linkButton(t("عرض", "Present"), "Presenter.aspx?id=" + encodeURIComponent(id), "secondary-button"));
            actions.appendChild(actionButton(t("نسخ", "Duplicate"), function () { duplicate(id); }));
            actions.appendChild(linkButton(t("تصدير", "Export"), PresentationStorage.exportUrl(id), "ghost-button"));
            actions.appendChild(actionButton(t("نسخة احتياطية", "Restore backup"), function () { restoreBackup(id); }));
            actions.appendChild(actionButton(t("حذف", "Delete"), function () { remove(id); }, "danger-button"));
            card.appendChild(actions);
            list.appendChild(card);
        });
    }

    function cardEmpty() {
        var card = document.createElement("article");
        card.className = "presentation-list-card empty";
        card.textContent = t("لا توجد عروض بعد.", "No presentations yet.");
        return card;
    }

    function linkButton(label, href, className) {
        var a = document.createElement("a");
        a.className = className || "ghost-button";
        a.href = href;
        a.textContent = label;
        return a;
    }

    function actionButton(label, handler, className) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = className || "ghost-button";
        btn.textContent = label;
        btn.addEventListener("click", handler);
        return btn;
    }

    function create() {
        var title = prompt(t("عنوان العرض الجديد", "New presentation title"), t("عرض دوبلر", "Doppler presentation"));
        if (!title) {
            return;
        }
        var id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "presentation";
        PresentationStorage.create(id, title, title).then(function (presentation) {
            window.location.href = "PresentationEditor.aspx?id=" + encodeURIComponent(presentation.id);
        }).catch(function (error) {
            setStatus(error.message, true);
        });
    }

    function duplicate(id) {
        PresentationStorage.duplicate(id).then(function () {
            load();
        }).catch(function (error) {
            setStatus(error.message, true);
        });
    }

    function remove(id) {
        if (!confirm(t("هل تريد حذف هذا العرض؟", "Delete this presentation?"))) {
            return;
        }
        PresentationStorage.deletePresentation(id).then(load).catch(function (error) {
            setStatus(error.message, true);
        });
    }

    function restoreBackup(id) {
        PresentationStorage.backups(id).then(function (backups) {
            if (!backups || !backups.length) {
                setStatus(t("لا توجد نسخ احتياطية.", "No backups available."));
                return;
            }
            var first = backups[0].Id || backups[0].id;
            if (!confirm(t("استعادة أحدث نسخة احتياطية؟", "Restore the newest backup?"))) {
                return;
            }
            return PresentationStorage.restoreBackup(id, first).then(load);
        }).catch(function (error) {
            setStatus(error.message, true);
        });
    }

    createBtn.addEventListener("click", create);
    importInput.addEventListener("change", function () {
        if (!importInput.files.length) {
            return;
        }
        PresentationStorage.importZip(importInput.files[0]).then(function () {
            importInput.value = "";
            load();
        }).catch(function (error) {
            importInput.value = "";
            setStatus(error.message, true);
        });
    });

    window.addEventListener("languagechange", load);
    load();
})();
