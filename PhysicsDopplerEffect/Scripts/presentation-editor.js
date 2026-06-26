(function () {
    "use strict";

    var presentation;
    var selectedSlideId;
    var selectedBlockId;
    var editLang = "ar";
    var dirty = false;
    var saveTimer;
    var saveInFlight = null;
    var saveQueued = false;
    var undoStack = [];
    var redoStack = [];
    var copiedSlide = null;
    var mountedPreview = null;
    var id = new URLSearchParams(window.location.search).get("id") || (window.DopplerBoot && window.DopplerBoot.defaultPresentationId) || "doppler-main";

    var els = {
        slideList: document.getElementById("slideList"),
        preview: document.getElementById("slidePreview"),
        props: document.getElementById("propertiesForm"),
        saveState: document.getElementById("editorSaveState"),
        addSlide: document.getElementById("addSlideBtn"),
        templateSelect: document.getElementById("slideTemplateSelect"),
        save: document.getElementById("saveDraftBtn"),
        publish: document.getElementById("publishBtn"),
        previewSlide: document.getElementById("previewSlideBtn"),
        previewDeck: document.getElementById("previewDeckBtn"),
        startFromSlide: document.getElementById("startFromSlideBtn"),
        undo: document.getElementById("undoBtn"),
        redo: document.getElementById("redoBtn"),
        exportDeck: document.getElementById("exportDeckBtn"),
        mediaInput: document.getElementById("mediaUploadInput"),
        cleanupMedia: document.getElementById("cleanupMediaBtn"),
        mediaLibrary: document.getElementById("mediaLibrary"),
        backups: document.getElementById("backupList"),
        refreshBackups: document.getElementById("refreshBackupsBtn"),
        importInput: document.getElementById("editorImportInput"),
        ar: document.getElementById("editArabicBtn"),
        en: document.getElementById("editEnglishBtn"),
        translationWarning: document.getElementById("translationWarning")
    };

    var templates = [
        "title", "section-divider", "title-with-text", "title-with-image", "image-with-explanation",
        "two-column-comparison", "three-card-layout", "interactive-question", "interactive-simulation",
        "full-screen-simulation", "applications-overview", "summary", "references", "conclusion"
    ];

    var componentIds = Object.keys(PresentationComponents.registry);

    function t(ar, en) {
        return editLang === "ar" ? ar : en;
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function recoveryKey() {
        return "doppler.presentationRecovery." + id;
    }

    function markDirty() {
        dirty = true;
        els.saveState.textContent = t("تغييرات غير محفوظة", "Unsaved changes");
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveRecovery, 650);
    }

    function pushHistory() {
        if (!presentation) return;
        undoStack.push(clone(presentation));
        if (undoStack.length > 50) {
            undoStack.shift();
        }
        redoStack = [];
        updateHistoryButtons();
    }

    function updateHistoryButtons() {
        els.undo.disabled = undoStack.length === 0;
        els.redo.disabled = redoStack.length === 0;
    }

    function saveRecovery() {
        try {
            localStorage.setItem(recoveryKey(), JSON.stringify({ savedUtc: new Date().toISOString(), presentation: presentation }));
        } catch (ignore) { }
    }

    function clearRecovery() {
        try {
            localStorage.removeItem(recoveryKey());
        } catch (ignore) { }
    }

    function load() {
        fillTemplates();
        PresentationStorage.get(id, "draft").then(function (data) {
            presentation = data;
            var recovered = loadRecovery();
            if (recovered && confirm(t("توجد نسخة محلية غير محفوظة. هل تريد استعادتها؟", "A local unsaved recovery copy exists. Restore it?"))) {
                presentation = recovered;
            }
            selectedSlideId = (presentation.slides[0] && presentation.slides[0].id) || null;
            selectedBlockId = null;
            els.exportDeck.href = PresentationStorage.exportUrl(presentation.id);
            renderAll();
            loadBackups();
            dirty = false;
            els.saveState.textContent = t("تم التحميل", "Loaded");
        }).catch(function (error) {
            els.saveState.textContent = error.message;
            els.saveState.classList.add("error");
        });
    }

    function loadRecovery() {
        try {
            var raw = localStorage.getItem(recoveryKey());
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            return parsed.presentation || null;
        } catch (ignore) {
            return null;
        }
    }

    function fillTemplates() {
        templates.forEach(function (template) {
            var option = document.createElement("option");
            option.value = template;
            option.textContent = template.replace(/-/g, " ");
            els.templateSelect.appendChild(option);
        });
    }

    function renderAll() {
        renderSlideList();
        renderPreview();
        renderProperties();
        renderMedia();
        updateWarnings();
        updateHistoryButtons();
    }

    function currentSlide() {
        return presentation.slides.filter(function (slide) { return slide.id === selectedSlideId; })[0] || presentation.slides[0];
    }

    function currentBlock() {
        var slide = currentSlide();
        if (!slide) return null;
        return (slide.blocks || []).filter(function (block) { return block.id === selectedBlockId; })[0] || null;
    }

    function renderSlideList() {
        els.slideList.innerHTML = "";
        presentation.slides.forEach(function (slide, index) {
            var item = document.createElement("button");
            item.type = "button";
            item.className = "slide-thumb" + (slide.id === selectedSlideId ? " active" : "") + (slide.hidden ? " hidden-slide" : "");
            item.draggable = true;
            item.dataset.slideId = slide.id;
            item.innerHTML = "<span></span><strong></strong><small></small>";
            item.querySelector("span").textContent = index + 1;
            item.querySelector("strong").textContent = slide.internalTitle || slide.id;
            item.querySelector("small").textContent = slide.template + (slide.hidden ? " · hidden" : "");
            item.addEventListener("click", function () {
                selectedSlideId = slide.id;
                selectedBlockId = null;
                renderAll();
            });
            item.addEventListener("dragstart", function (event) {
                event.dataTransfer.setData("text/plain", slide.id);
            });
            item.addEventListener("dragover", function (event) { event.preventDefault(); });
            item.addEventListener("drop", function (event) {
                event.preventDefault();
                var draggedId = event.dataTransfer.getData("text/plain");
                reorderSlide(draggedId, slide.id);
            });
            els.slideList.appendChild(item);
        });
    }

    function renderPreview() {
        if (mountedPreview) {
            mountedPreview.dispose();
        }
        var slide = currentSlide();
        if (!slide) return;
        mountedPreview = PresentationComponents.renderSlide(els.preview, presentation, slide, {
            language: editLang,
            editorMode: true,
            onAction: function () { }
        });
    }

    function renderProperties() {
        var slide = currentSlide();
        var block = currentBlock();
        els.props.innerHTML = "";
        if (!slide) return;
        if (block) {
            renderBlockProperties(slide, block);
        } else {
            renderSlideProperties(slide);
        }
    }

    function renderSlideProperties(slide) {
        els.props.appendChild(field("Presentation title", inputText(presentation.title[editLang] || "", function (value) {
            change(function () { presentation.title[editLang] = value; });
        })));
        els.props.appendChild(field("Slide title", inputText(slide.internalTitle || "", function (value) {
            change(function () { slide.internalTitle = value; });
        })));
        els.props.appendChild(field("Template", select(templates, slide.template, function (value) {
            change(function () { slide.template = value; });
        })));
        els.props.appendChild(field("Section", select(presentation.sections.map(function (section) { return section.id; }), slide.sectionId, function (value) {
            change(function () { slide.sectionId = value; });
        })));
        els.props.appendChild(field("Transition", select(["fade", "none", "slide"], slide.transition, function (value) {
            change(function () { slide.transition = value; });
        })));
        slide.background = slide.background || {};
        els.props.appendChild(field("Background color", inputText(slide.background.color || "", function (value) {
            change(function () {
                slide.background = slide.background || {};
                slide.background.color = value.trim();
            });
        })));
        els.props.appendChild(field("Background image", inputText(slide.background.image || "", function (value) {
            change(function () {
                slide.background = slide.background || {};
                slide.background.image = value.trim();
            });
        })));
        els.props.appendChild(checkField(t("إخفاء الشريحة", "Hide slide"), slide.hidden, function (checked) {
            change(function () { slide.hidden = checked; });
        }));
        els.props.appendChild(field("Notes", textarea((slide.notes && slide.notes[editLang]) || "", function (value) {
            change(function () { slide.notes = slide.notes || { ar: "", en: "" }; slide.notes[editLang] = value; });
        })));

        var row = document.createElement("div");
        row.className = "property-actions";
        row.appendChild(action(t("نسخ", "Copy"), function () { copiedSlide = clone(slide); }));
        row.appendChild(action(t("لصق", "Paste"), function () { if (copiedSlide) pasteSlide(); }));
        row.appendChild(action(t("تكرار", "Duplicate"), function () { duplicateSlide(slide); }));
        row.appendChild(action(t("حذف", "Delete"), function () { deleteSlide(slide); }, "danger-button"));
        els.props.appendChild(row);

        var blocks = document.createElement("div");
        blocks.className = "block-list-editor";
        blocks.appendChild(document.createElement("hr"));
        (slide.blocks || []).forEach(function (block, index) {
            var btn = action((index + 1) + ". " + block.type, function () {
                selectedBlockId = block.id;
                renderAll();
            });
            blocks.appendChild(btn);
        });
        els.props.appendChild(blocks);
    }

    function renderBlockProperties(slide, block) {
        els.props.appendChild(action(t("رجوع لخصائص الشريحة", "Back to slide"), function () {
            selectedBlockId = null;
            renderAll();
        }));
        els.props.appendChild(field("Type", select(["heading", "text", "bullet-list", "image", "callout", "comparison", "question", "audio-control", "video", "button", "table", "reference-list", "spacer", "interactive"], block.type, function (value) {
            change(function () { block.type = value; normalizeBlockData(block); });
        })));
        els.props.appendChild(field("Width", select(["full", "half", "third"], block.width || "full", function (value) {
            change(function () { block.width = value; });
        })));
        els.props.appendChild(field("Align", select(["start", "center", "end"], block.align || "start", function (value) {
            change(function () { block.align = value; });
        })));
        els.props.appendChild(field("Emphasis", select(["", "hero", "lead", "soft"], block.emphasis || "", function (value) {
            change(function () { block.emphasis = value; });
        })));

        if (block.type === "interactive") {
            els.props.appendChild(field("Component", select(componentIds, block.data.componentId || componentIds[0], function (value) {
                change(function () { block.data.componentId = value; block.data.config = block.data.config || {}; });
            })));
            renderComponentConfigFields(block);
        } else if (block.type === "image" || block.type === "video" || block.type === "audio-control") {
            els.props.appendChild(field("Source", inputText(block.data.src || "", function (value) {
                change(function () { block.data.src = value; });
            })));
            if (block.type === "image") {
                els.props.appendChild(field("Alt text", inputText(local(block.data.alt), function (value) {
                    change(function () { block.data.alt = block.data.alt || { ar: "", en: "" }; block.data.alt[editLang] = value; });
                })));
                els.props.appendChild(field("Fit", select(["contain", "cover", "fill"], block.data.fit || "contain", function (value) {
                    change(function () { block.data.fit = value; });
                })));
            }
        } else if (block.type === "bullet-list") {
            els.props.appendChild(field("Items", textarea(localizedListToText(block.data.items), function (value) {
                change(function () { block.data.items = textToLocalizedList(value, block.data.items); });
            })));
        } else if (block.type === "table") {
            els.props.appendChild(field("Headers", inputText(((block.data.headers && block.data.headers[editLang]) || []).join(" | "), function (value) {
                change(function () {
                    block.data.headers = block.data.headers || { ar: [], en: [] };
                    block.data.headers[editLang] = splitPiped(value);
                });
            })));
            els.props.appendChild(field("Rows", textarea(tableToText(block.data, editLang), function (value) {
                change(function () { textToTable(block.data, editLang, value); });
            })));
        } else if (block.type === "question") {
            renderQuestionFields(block);
        } else if (block.type === "button") {
            els.props.appendChild(field("Buttons", textarea(buttonsToText(block.data.buttons), function (value) {
                change(function () { block.data.buttons = textToButtons(value, block.data.buttons); });
            })));
        } else if (block.type === "comparison") {
            els.props.appendChild(field("Cards", textarea(comparisonToText(block.data.items), function (value) {
                change(function () { block.data.items = textToComparison(value, block.data.items); });
            })));
        } else if (block.type === "reference-list") {
            els.props.appendChild(field("References", textarea(localizedListToText(block.data.items), function (value) {
                change(function () { block.data.items = textToLocalizedList(value, block.data.items); });
            })));
        } else if (block.type === "spacer") {
            els.props.appendChild(field("Size", inputNumber(block.data.size || 2, 0.5, 10, 0.5, function (value) {
                change(function () { block.data.size = value; });
            })));
        } else {
            els.props.appendChild(field("Text", textarea(local(block.data.text), function (value) {
                change(function () { block.data.text = block.data.text || { ar: "", en: "" }; block.data.text[editLang] = value; });
            })));
        }

        var row = document.createElement("div");
        row.className = "property-actions";
        row.appendChild(action(t("لأعلى", "Up"), function () { moveBlock(slide, block, -1); }));
        row.appendChild(action(t("لأسفل", "Down"), function () { moveBlock(slide, block, 1); }));
        row.appendChild(action(t("تكرار", "Duplicate"), function () { duplicateBlock(slide, block); }));
        row.appendChild(action(t("حذف", "Delete"), function () { deleteBlock(slide, block); }, "danger-button"));
        els.props.appendChild(row);
    }

    function renderQuestionFields(block) {
        block.data.question = block.data.question || { ar: "", en: "" };
        block.data.choices = block.data.choices || [{ ar: "", en: "" }, { ar: "", en: "" }];
        block.data.explanation = block.data.explanation || { ar: "", en: "" };
        els.props.appendChild(field("Question", textarea(local(block.data.question), function (value) {
            change(function () { block.data.question[editLang] = value; });
        })));
        els.props.appendChild(field("Choices", textarea(localizedListToText(block.data.choices), function (value) {
            change(function () { block.data.choices = textToLocalizedList(value, block.data.choices); });
        })));
        els.props.appendChild(field("Correct choice", inputNumber((Number(block.data.correctIndex) || 0) + 1, 1, Math.max(1, (block.data.choices || []).length), 1, function (value) {
            change(function () { block.data.correctIndex = Math.max(0, Math.round(value) - 1); });
        })));
        els.props.appendChild(field("Explanation", textarea(local(block.data.explanation), function (value) {
            change(function () { block.data.explanation[editLang] = value; });
        })));
    }

    function renderComponentConfigFields(block) {
        var componentId = block.data.componentId || "";
        var config = block.data.config = block.data.config || {};

        config.resultText = config.resultText || { ar: "", en: "" };
        config.freezeText = config.freezeText || { ar: "", en: "" };
        els.props.appendChild(field("Result overlay", textarea(local(config.resultText), function (value) {
            change(function () { config.resultText[editLang] = value; });
        })));
        els.props.appendChild(field("Freeze overlay", textarea(local(config.freezeText), function (value) {
            change(function () { config.freezeText[editLang] = value; });
        })));
        els.props.appendChild(field("Source image", inputText(config.sourceImage || "Assets/motorcycle-source.png", function (value) {
            change(function () { config.sourceImage = value.trim(); });
        })));
        els.props.appendChild(field("Listener image", inputText(config.listenerImage || "Assets/custom-listener.png", function (value) {
            change(function () { config.listenerImage = value.trim(); });
        })));

        if (componentId === "opening-sound") {
            els.props.appendChild(field("Choices", textarea(localizedListToText(config.choices), function (value) {
                change(function () { config.choices = textToLocalizedList(value, config.choices); });
            })));
            els.props.appendChild(field("Correct choice", inputNumber(Number(config.correctIndex || 0) + 1, 1, 12, 1, function (value) {
                change(function () { config.correctIndex = Math.max(0, Math.round(value) - 1); });
            })));
        }

        if (componentId === "concept-quiz") {
            els.props.appendChild(field("Quiz questions", textarea(quizQuestionsToText(config.questions), function (value) {
                change(function () { config.questions = textToQuizQuestions(value, config.questions); });
            })));
        }

        if (componentId.indexOf("doppler-") === 0 || componentId.indexOf("lab-") === 0 || componentId === "opening-sound") {
            renderConfigSelect(config, "mode", "Mode", ["", "stationary", "approach", "recede", "sideways", "circular", "lab-auto-pass"], config.mode || "");
            renderConfigNumber(config, "speed", "Speed multiplier", config.speed || 1, 0.1, 4, 0.1);
            renderConfigNumber(config, "direction", "Direction", config.direction || 1, -1, 1, 1);
            renderConfigNumber(config, "radius", "Orbit radius", config.radius || 0.28, 0.1, 0.45, 0.01);
            renderConfigCheck(config, "showWaves", "Show waves", config.showWaves !== false);
            renderConfigCheck(config, "showGraph", "Show graph", config.showGraph !== false);
            renderConfigCheck(config, "startPaused", "Start paused", !!config.startPaused);
        }

        if (componentId === "police-radar" || componentId === "sports-radar") {
            renderConfigNumber(config, "speed", "Speed m/s", config.speed || 25, 0, 80, 1);
            renderConfigNumber(config, "direction", "Direction", config.direction || -1, -1, 1, 1);
            renderConfigNumber(config, "limit", "Limit km/h", config.limit || 80, 30, 160, 1);
            renderConfigCheck(config, "startPaused", "Start paused", !!config.startPaused);
        }

        if (componentId === "medical-doppler") {
            renderConfigNumber(config, "speed", "Flow speed", config.speed || 0.7, 0.05, 2, 0.05);
            renderConfigNumber(config, "angle", "Probe angle", config.angle || 45, 0, 90, 1);
            renderConfigNumber(config, "direction", "Direction", config.direction || 1, -1, 1, 1);
            renderConfigCheck(config, "startPaused", "Start paused", !!config.startPaused);
        }

        if (componentId === "weather-radar") {
            renderConfigNumber(config, "speed", "Wind speed", config.speed || 28, -80, 80, 1);
            renderConfigNumber(config, "angle", "Beam angle", config.angle || 30, 0, 180, 1);
        }

        if (componentId === "light-doppler" || componentId === "astronomy") {
            renderConfigNumber(config, "beta", "Initial shift", config.beta || 0.22, -0.8, 0.8, 0.01);
        }

        els.props.appendChild(field("Config JSON", textarea(JSON.stringify(config, null, 2), function (value) {
            try {
                var parsed = JSON.parse(value || "{}");
                change(function () { block.data.config = parsed; });
            } catch (error) {
                els.saveState.textContent = "Invalid config JSON.";
                els.saveState.classList.add("error");
            }
        })));
    }

    function renderConfigNumber(config, key, label, fallback, min, max, step, transform) {
        var value = config[key] === undefined || config[key] === null ? fallback : config[key];
        els.props.appendChild(field(label, inputNumber(value, min, max, step, function (next) {
            change(function () {
                config[key] = transform ? transform(next) : next;
            });
        })));
    }

    function renderConfigSelect(config, key, label, options, fallback) {
        els.props.appendChild(field(label, select(options, config[key] || fallback, function (value) {
            change(function () {
                if (value) config[key] = value; else delete config[key];
            });
        })));
    }

    function renderConfigCheck(config, key, label, fallback) {
        els.props.appendChild(checkField(label, fallback, function (checked) {
            change(function () { config[key] = checked; });
        }));
    }

    function field(label, control) {
        var wrapper = document.createElement("label");
        wrapper.className = "property-field";
        wrapper.appendChild(document.createElement("span")).textContent = label;
        wrapper.appendChild(control);
        return wrapper;
    }

    function checkField(label, value, onChange) {
        var wrapper = document.createElement("label");
        wrapper.className = "property-check";
        var input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!value;
        input.addEventListener("change", function () { onChange(input.checked); });
        wrapper.appendChild(input);
        wrapper.appendChild(document.createTextNode(" " + label));
        return wrapper;
    }

    function inputText(value, onChange) {
        var input = document.createElement("input");
        input.type = "text";
        input.value = value || "";
        input.addEventListener("change", function () { onChange(input.value); });
        return input;
    }

    function inputNumber(value, min, max, step, onChange) {
        var input = document.createElement("input");
        input.type = "number";
        input.value = value === undefined || value === null ? "" : value;
        if (min !== undefined) input.min = min;
        if (max !== undefined) input.max = max;
        if (step !== undefined) input.step = step;
        input.addEventListener("change", function () { onChange(Number(input.value)); });
        return input;
    }

    function textarea(value, onChange) {
        var input = document.createElement("textarea");
        input.value = value || "";
        input.rows = 5;
        input.addEventListener("change", function () { onChange(input.value); });
        return input;
    }

    function select(options, value, onChange) {
        var input = document.createElement("select");
        options.forEach(function (optionValue) {
            var option = document.createElement("option");
            option.value = optionValue;
            option.textContent = String(optionValue).replace(/-/g, " ");
            input.appendChild(option);
        });
        input.value = value || options[0] || "";
        input.addEventListener("change", function () { onChange(input.value); });
        return input;
    }

    function action(label, handler, className) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = className || "ghost-button";
        btn.textContent = label;
        btn.addEventListener("click", handler);
        return btn;
    }

    function change(mutator) {
        pushHistory();
        mutator();
        markDirty();
        renderAll();
    }

    function local(value) {
        value = value || {};
        return value[editLang] || "";
    }

    function splitPiped(value) {
        return (value || "").split("|").map(function (part) { return part.trim(); });
    }

    function localizedListToText(items) {
        return (items || []).map(function (item) { return local(item); }).join("\n");
    }

    function textToLocalizedList(value, existingItems) {
        var oldItems = existingItems || [];
        return (value || "").split(/\r?\n/).filter(function (line) {
            return line.trim().length > 0;
        }).map(function (line, index) {
            var existing = oldItems[index] || { ar: "", en: "" };
            existing[editLang] = line.trim();
            return existing;
        });
    }

    function buttonsToText(buttons) {
        return (buttons || []).map(function (item) {
            return local(item.label) + " | " + (item.action || "");
        }).join("\n");
    }

    function textToButtons(value, existingButtons) {
        var oldButtons = existingButtons || [];
        return (value || "").split(/\r?\n/).filter(function (line) {
            return line.trim().length > 0;
        }).map(function (line, index) {
            var parts = splitPiped(line);
            var existing = oldButtons[index] || { label: { ar: "", en: "" }, action: "" };
            existing.label = existing.label || { ar: "", en: "" };
            existing.label[editLang] = parts[0] || "";
            existing.action = parts.slice(1).join(" | ").trim();
            return existing;
        });
    }

    function comparisonToText(items) {
        return (items || []).map(function (item) {
            return local(item.title) + " | " + local(item.text);
        }).join("\n");
    }

    function textToComparison(value, existingItems) {
        var oldItems = existingItems || [];
        return (value || "").split(/\r?\n/).filter(function (line) {
            return line.trim().length > 0;
        }).map(function (line, index) {
            var parts = splitPiped(line);
            var existing = oldItems[index] || { title: { ar: "", en: "" }, text: { ar: "", en: "" } };
            existing.title = existing.title || { ar: "", en: "" };
            existing.text = existing.text || { ar: "", en: "" };
            existing.title[editLang] = parts[0] || "";
            existing.text[editLang] = parts.slice(1).join(" | ").trim();
            return existing;
        });
    }

    function quizQuestionsToText(questions) {
        return (questions || []).map(function (question) {
            var normalized = PresentationComponents.normalizeQuestion(question, editLang, 0);
            var correctIndex = Math.max(0, normalized.choices.findIndex(function (choice) {
                return choice.id === normalized.correctChoiceId;
            }));
            var row = [local(normalized.text), String(correctIndex + 1), local(normalized.explanation)];
            normalized.choices.forEach(function (choice) {
                row.push(local(choice.text));
            });
            return row.join(" | ");
        }).join("\n");
    }

    function textToQuizQuestions(value, existingQuestions) {
        var oldQuestions = existingQuestions || [];
        return (value || "").split(/\r?\n/).filter(function (line) {
            return line.trim().length > 0;
        }).map(function (line, index) {
            var parts = splitPiped(line);
            var existing = oldQuestions[index] || { id: PresentationStorage.newId("question"), text: { ar: "", en: "" }, choices: [], correctChoiceId: "a", explanation: { ar: "", en: "" } };
            var normalized = PresentationComponents.normalizeQuestion(existing, editLang, index);
            existing.id = existing.id || normalized.id;
            existing.text = existing.text || normalized.text || { ar: "", en: "" };
            existing.explanation = existing.explanation || { ar: "", en: "" };
            existing.text[editLang] = parts[0] || "";
            existing.explanation[editLang] = parts[2] || "";
            existing.choices = parts.slice(3).filter(function (choice) {
                return choice.length > 0;
            }).map(function (choice, choiceIndex) {
                var oldChoice = (normalized.choices && normalized.choices[choiceIndex]) || { id: String.fromCharCode(97 + choiceIndex), text: { ar: "", en: "" } };
                oldChoice.text = oldChoice.text || { ar: "", en: "" };
                oldChoice.text[editLang] = choice;
                return oldChoice;
            });
            existing.correctChoiceId = (existing.choices[Math.max(0, Number(parts[1] || 1) - 1)] || existing.choices[0] || { id: "a" }).id;
            delete existing.q;
            delete existing.prompt;
            delete existing.correct;
            delete existing.correctIndex;
            delete existing.answer;
            return existing;
        });
    }

    function addSlide() {
        change(function () {
            var slide = {
                id: PresentationStorage.newId("slide"),
                order: presentation.slides.length + 1,
                sectionId: presentation.sections[0] ? presentation.sections[0].id : "",
                internalTitle: els.templateSelect.value.replace(/-/g, " "),
                template: els.templateSelect.value,
                hidden: false,
                transition: "fade",
                background: {},
                blocks: [newBlock("heading")],
                notes: { ar: "", en: "" },
                editorMetadata: {}
            };
            presentation.slides.push(slide);
            selectedSlideId = slide.id;
            selectedBlockId = null;
        });
    }

    function duplicateSlide(slide) {
        change(function () {
            var copy = clone(slide);
            copy.id = PresentationStorage.newId("slide");
            copy.internalTitle = (copy.internalTitle || "Slide") + " Copy";
            presentation.slides.splice(presentation.slides.indexOf(slide) + 1, 0, copy);
            selectedSlideId = copy.id;
            selectedBlockId = null;
        });
    }

    function pasteSlide() {
        change(function () {
            var copy = clone(copiedSlide);
            copy.id = PresentationStorage.newId("slide");
            copy.internalTitle = (copy.internalTitle || "Slide") + " Copy";
            presentation.slides.push(copy);
            selectedSlideId = copy.id;
            selectedBlockId = null;
        });
    }

    function deleteSlide(slide) {
        if (presentation.slides.length <= 1 || !confirm(t("حذف الشريحة؟", "Delete slide?"))) {
            return;
        }
        change(function () {
            var index = presentation.slides.indexOf(slide);
            presentation.slides.splice(index, 1);
            selectedSlideId = presentation.slides[Math.max(0, index - 1)].id;
            selectedBlockId = null;
        });
    }

    function reorderSlide(draggedId, targetId) {
        if (!draggedId || draggedId === targetId) return;
        change(function () {
            var from = presentation.slides.findIndex(function (slide) { return slide.id === draggedId; });
            var to = presentation.slides.findIndex(function (slide) { return slide.id === targetId; });
            var item = presentation.slides.splice(from, 1)[0];
            presentation.slides.splice(to, 0, item);
        });
    }

    function newBlock(type) {
        var block = { id: PresentationStorage.newId("block"), type: type, width: "full", align: "start", emphasis: "", data: {} };
        normalizeBlockData(block);
        return block;
    }

    function normalizeBlockData(block) {
        block.data = block.data || {};
        if (block.type === "heading" || block.type === "text" || block.type === "callout") {
            block.data.text = block.data.text || { ar: "نص جديد", en: "New text" };
        }
        if (block.type === "bullet-list") {
            block.data.items = block.data.items || [{ ar: "نقطة جديدة", en: "New point" }];
        }
        if (block.type === "image") {
            block.data.src = block.data.src || "";
            block.data.fit = block.data.fit || "contain";
            block.data.alt = block.data.alt || { ar: "صورة", en: "Image" };
        }
        if (block.type === "video" || block.type === "audio-control") {
            block.data.src = block.data.src || "";
        }
        if (block.type === "interactive") {
            block.data.componentId = block.data.componentId || "wave-basics";
            block.data.config = block.data.config || {};
        }
        if (block.type === "question") {
            block.data.question = block.data.question || { ar: "سؤال جديد", en: "New question" };
            block.data.choices = block.data.choices || [{ ar: "اختيار أول", en: "First choice" }, { ar: "اختيار ثان", en: "Second choice" }];
            block.data.correctIndex = block.data.correctIndex || 0;
        }
        if (block.type === "table") {
            block.data.headers = block.data.headers || { ar: ["عمود 1", "عمود 2"], en: ["Column 1", "Column 2"] };
            block.data.rows = block.data.rows || [{ ar: ["قيمة", "قيمة"], en: ["Value", "Value"] }];
        }
        if (block.type === "button") {
            block.data.buttons = block.data.buttons || [{ label: { ar: "زر", en: "Button" }, action: "" }];
        }
        if (block.type === "comparison") {
            block.data.items = block.data.items || [{ title: { ar: "عنصر", en: "Item" }, text: { ar: "وصف", en: "Description" } }];
        }
        if (block.type === "reference-list") {
            block.data.items = block.data.items || [];
        }
        if (block.type === "spacer") {
            block.data.size = block.data.size || 2;
        }
    }

    function addBlock(type) {
        var slide = currentSlide();
        if (!slide) return;
        change(function () {
            var block = newBlock(type);
            slide.blocks.push(block);
            selectedBlockId = block.id;
        });
    }

    function duplicateBlock(slide, block) {
        change(function () {
            var copy = clone(block);
            copy.id = PresentationStorage.newId("block");
            slide.blocks.splice(slide.blocks.indexOf(block) + 1, 0, copy);
            selectedBlockId = copy.id;
        });
    }

    function deleteBlock(slide, block) {
        change(function () {
            slide.blocks.splice(slide.blocks.indexOf(block), 1);
            selectedBlockId = null;
        });
    }

    function moveBlock(slide, block, delta) {
        change(function () {
            var index = slide.blocks.indexOf(block);
            var next = Math.max(0, Math.min(slide.blocks.length - 1, index + delta));
            slide.blocks.splice(index, 1);
            slide.blocks.splice(next, 0, block);
        });
    }

    function renderMedia() {
        els.mediaLibrary.innerHTML = "";
        (presentation.media || []).forEach(function (media) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "media-item";
            btn.textContent = media.originalName || media.fileName;
            if ((media.contentType || "").indexOf("image/") === 0) {
                var img = document.createElement("img");
                img.src = media.url;
                img.alt = "";
                btn.prepend(img);
            }
            btn.addEventListener("click", function () {
                var block = currentBlock();
                if (block && (block.type === "image" || block.type === "video" || block.type === "audio-control")) {
                    change(function () { block.data.src = media.url; });
                }
            });
            els.mediaLibrary.appendChild(btn);
        });
    }

    function loadBackups() {
        PresentationStorage.backups(presentation.id).then(function (backups) {
            els.backups.innerHTML = "";
            (backups || []).forEach(function (backup) {
                var id = backup.Id || backup.id;
                els.backups.appendChild(action(id, function () {
                    if (!confirm(t("استعادة النسخة؟", "Restore backup?"))) return;
                    PresentationStorage.restoreBackup(presentation.id, id).then(function (data) {
                        presentation = data;
                        selectedSlideId = presentation.slides[0].id;
                        selectedBlockId = null;
                        markDirty();
                        renderAll();
                    });
                }));
            });
        });
    }

    function tableToText(data, language) {
        var rows = data.rows || [];
        return rows.map(function (row) {
            return (row[language] || []).join(" | ");
        }).join("\n");
    }

    function textToTable(data, language, value) {
        var oldRows = data.rows || [];
        data.rows = value.split(/\r?\n/).filter(Boolean).map(function (line, index) {
            var row = oldRows[index] || { ar: [], en: [] };
            row[language] = line.split("|").map(function (cell) { return cell.trim(); });
            return row;
        });
    }

    function updateWarnings() {
        var missing = 0;
        presentation.slides.forEach(function (slide) {
            (slide.blocks || []).forEach(function (block) {
                var text = block.data && block.data.text;
                if (text && text.ar && !text.en) missing++;
            });
        });
        els.translationWarning.textContent = missing ? t("ترجمات إنجليزية ناقصة: " + missing, "Missing English translations: " + missing) : "";
    }

    function showError(prefixAr, prefixEn, error) {
        var message = (error && error.message) || t("حدث خطأ غير متوقع.", "An unexpected error occurred.");
        var correlationId = error && error.correlationId;
        els.saveState.textContent = t(prefixAr, prefixEn) + " " + message +
            (correlationId ? "\n" + t("رمز التتبع: ", "Tracking code: ") + correlationId : "");
        els.saveState.classList.add("error");
        if (window.console && console.error) {
            console.error("Presentation editor operation failed", {
                message: message,
                status: error && error.status,
                code: error && error.code,
                correlationId: correlationId,
                payload: error && error.payload
            });
        }
    }

    function saveDraft(options) {
        options = options || {};
        if (saveInFlight) {
            saveQueued = true;
            return saveInFlight.then(function () {
                if (!saveQueued) {
                    return presentation;
                }
                saveQueued = false;
                return saveDraft(options);
            });
        }

        els.saveState.classList.remove("error");
        els.saveState.textContent = options.auto ? t("جارٍ الحفظ التلقائي...", "Autosaving...") : t("جارٍ حفظ المسودة...", "Saving draft...");
        saveInFlight = PresentationStorage.saveDraft(presentation).then(function (data) {
            presentation = data;
            dirty = false;
            clearRecovery();
            els.saveState.textContent = options.auto ? t("تم الحفظ التلقائي", "Autosaved") : t("تم حفظ المسودة", "Draft saved");
            renderAll();
            return presentation;
        }).catch(function (error) {
            showError(options.auto ? "تعذر الحفظ التلقائي." : "تعذر حفظ المسودة.", options.auto ? "Autosave failed." : "Failed to save draft.", error);
            throw error;
        }).finally(function () {
            saveInFlight = null;
        });

        return saveInFlight;
    }

    function publish() {
        saveDraft().then(function () {
            return PresentationStorage.publish(presentation.id).then(function (data) {
                presentation = data;
                dirty = false;
                clearRecovery();
                els.saveState.textContent = t("تم النشر", "Published");
                loadBackups();
                renderAll();
            }).catch(function (error) {
                showError("تعذر النشر.", "Failed to publish.", error);
            });
        }).catch(function () { });
    }

    function undo() {
        if (!undoStack.length) return;
        redoStack.push(clone(presentation));
        presentation = undoStack.pop();
        selectedSlideId = (currentSlide() && currentSlide().id) || presentation.slides[0].id;
        selectedBlockId = null;
        markDirty();
        renderAll();
    }

    function redo() {
        if (!redoStack.length) return;
        undoStack.push(clone(presentation));
        presentation = redoStack.pop();
        selectedSlideId = presentation.slides[0].id;
        selectedBlockId = null;
        markDirty();
        renderAll();
    }

    els.addSlide.addEventListener("click", addSlide);
    els.save.addEventListener("click", function () { saveDraft().catch(function () { }); });
    els.publish.addEventListener("click", publish);
    els.previewSlide.addEventListener("click", function () {
        var index = presentation.slides.indexOf(currentSlide()) + 1;
        window.open("Presenter.aspx?id=" + encodeURIComponent(presentation.id) + "&version=draft&start=" + index, "_blank");
    });
    els.previewDeck.addEventListener("click", function () {
        window.open("Presenter.aspx?id=" + encodeURIComponent(presentation.id) + "&version=draft", "_blank");
    });
    els.startFromSlide.addEventListener("click", function () {
        var index = presentation.slides.indexOf(currentSlide()) + 1;
        window.open("Presenter.aspx?id=" + encodeURIComponent(presentation.id) + "&start=" + index, "_blank");
    });
    els.undo.addEventListener("click", undo);
    els.redo.addEventListener("click", redo);
    els.refreshBackups.addEventListener("click", loadBackups);
    setInterval(function () {
        if (dirty && !saveInFlight) {
            saveDraft({ auto: true }).catch(function () { });
        }
    }, 30000);
    window.PresentationEditorDebug = {
        saveDraft: saveDraft,
        autosave: function () { return saveDraft({ auto: true }); },
        publish: publish,
        getPresentation: function () { return presentation; }
    };
    if (els.cleanupMedia) {
        els.cleanupMedia.addEventListener("click", function () {
            if (!confirm(t("حذف الوسائط غير المستخدمة؟", "Delete unused media?"))) return;
            PresentationStorage.cleanupMedia(presentation.id).then(function (data) {
                presentation.media = data.media || data.Media || [];
                els.saveState.textContent = t("تم تنظيف الوسائط", "Media cleaned");
                renderAll();
            }).catch(function (error) {
                els.saveState.textContent = error.message;
                els.saveState.classList.add("error");
            });
        });
    }
    els.ar.addEventListener("click", function () { editLang = "ar"; els.ar.classList.add("active"); els.en.classList.remove("active"); renderAll(); });
    els.en.addEventListener("click", function () { editLang = "en"; els.en.classList.add("active"); els.ar.classList.remove("active"); renderAll(); });
    document.querySelectorAll("[data-add-block]").forEach(function (btn) {
        btn.addEventListener("click", function () { addBlock(btn.getAttribute("data-add-block")); });
    });
    els.mediaInput.addEventListener("change", function () {
        if (!els.mediaInput.files.length) return;
        PresentationStorage.upload(presentation.id, els.mediaInput.files[0]).then(function (media) {
            presentation.media = presentation.media || [];
            presentation.media.push(media);
            els.mediaInput.value = "";
            markDirty();
            renderAll();
        }).catch(function (error) {
            els.saveState.textContent = error.message;
            els.mediaInput.value = "";
        });
    });
    els.importInput.addEventListener("change", function () {
        if (!els.importInput.files.length) return;
        PresentationStorage.importZip(els.importInput.files[0], presentation.id).then(function (data) {
            presentation = data;
            selectedSlideId = presentation.slides[0].id;
            selectedBlockId = null;
            els.importInput.value = "";
            renderAll();
        }).catch(function (error) {
            els.saveState.textContent = error.message;
            els.importInput.value = "";
        });
    });

    window.addEventListener("beforeunload", function (event) {
        if (dirty) {
            event.preventDefault();
            event.returnValue = "";
        }
    });

    updateHistoryButtons();
    load();
})();
