(function () {
    "use strict";

    var apiUrl = "Handlers/PresentationApi.ashx";
    var uploadUrl = "Handlers/PresentationUpload.ashx";

    function query(params) {
        var parts = [];
        Object.keys(params || {}).forEach(function (key) {
            if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
                parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
            }
        });
        return parts.length ? "?" + parts.join("&") : "";
    }

    function parsePayload(text) {
        if (!text) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            return null;
        }
    }

    function requestError(response, text, payload) {
        payload = payload || {};
        var message = payload.Error || payload.error || text || response.statusText || "Request failed";
        var error = new Error(message);
        error.status = response.status;
        error.code = payload.Code || payload.code || "";
        error.correlationId = payload.CorrelationId || payload.correlationId || "";
        error.payload = payload;
        error.responseText = text;
        console.error("Presentation API request failed", {
            status: error.status,
            code: error.code,
            correlationId: error.correlationId,
            message: error.message,
            payload: payload || null,
            responseText: text || ""
        });
        return error;
    }

    function handle(response) {
        return response.text().then(function (text) {
            var payload = parsePayload(text);
            if (!response.ok || !payload || (!payload.Ok && !payload.ok)) {
                throw requestError(response, text, payload);
            }

            return payload.Data || payload.data;
        });
    }

    function get(action, params) {
        params = params || {};
        params.action = action;
        return fetch(apiUrl + query(params), {
            credentials: "same-origin",
            headers: { "Accept": "application/json" }
        }).then(handle);
    }

    function post(action, params, body) {
        params = params || {};
        params.action = action;
        var json = body === undefined ? "{}" : stringifyJsonSafe(body);
        return fetch(apiUrl + query(params), {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: json
        }).then(handle);
    }

    function postRaw(action, params, raw) {
        params = params || {};
        params.action = action;
        return fetch(apiUrl + query(params), {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: raw
        }).then(handle);
    }

    function upload(id, file) {
        var form = new FormData();
        form.append("file", file);
        return fetch(uploadUrl + query({ id: id }), {
            method: "POST",
            credentials: "same-origin",
            body: form
        }).then(handle);
    }

    function importZip(file, id) {
        var form = new FormData();
        form.append("file", file);
        return fetch(apiUrl + query({ action: "import", id: id || "" }), {
            method: "POST",
            credentials: "same-origin",
            body: form
        }).then(handle);
    }

    function normalizeText(text) {
        text = text || {};
        return {
            ar: text.ar || text.Ar || "",
            en: text.en || text.En || ""
        };
    }

    function normalizePresentation(presentation) {
        if (!presentation) {
            return null;
        }

        var result = {
            schemaVersion: presentation.schemaVersion || presentation.SchemaVersion || 1,
            id: presentation.id || presentation.Id,
            title: normalizeText(presentation.title || presentation.Title),
            theme: presentation.theme || presentation.Theme || {},
            sections: presentation.sections || presentation.Sections || [],
            slides: presentation.slides || presentation.Slides || [],
            media: presentation.media || presentation.Media || [],
            updatedUtc: presentation.updatedUtc || presentation.UpdatedUtc,
            publishedUtc: presentation.publishedUtc || presentation.PublishedUtc
        };

        result.sections = result.sections.map(function (section) {
            return {
                id: section.id || section.Id,
                order: section.order || section.Order || 0,
                title: normalizeText(section.title || section.Title),
                accent: section.accent || section.Accent || result.theme.Accent || result.theme.accent
            };
        }).sort(function (a, b) { return a.order - b.order; });

        result.slides = result.slides.map(function (slide) {
            var blocks = slide.blocks || slide.Blocks || [];
            return {
                id: slide.id || slide.Id,
                order: slide.order || slide.Order || 0,
                sectionId: slide.sectionId || slide.SectionId || "",
                internalTitle: slide.internalTitle || slide.InternalTitle || "",
                template: slide.template || slide.Template || "title-with-text",
                hidden: !!(slide.hidden || slide.Hidden),
                transition: slide.transition || slide.Transition || "fade",
                background: slide.background || slide.Background || {},
                blocks: blocks.map(normalizeBlock),
                notes: normalizeText(slide.notes || slide.Notes),
                editorMetadata: slide.editorMetadata || slide.EditorMetadata || {}
            };
        }).sort(function (a, b) { return a.order - b.order; });

        result.media = result.media.map(function (media) {
            return {
                id: media.id || media.Id,
                fileName: media.fileName || media.FileName,
                originalName: media.originalName || media.OriginalName,
                contentType: media.contentType || media.ContentType,
                size: media.size || media.Size || 0,
                createdUtc: media.createdUtc || media.CreatedUtc,
                url: media.url || media.Url
            };
        });

        return result;
    }

    function normalizeBlock(block) {
        return {
            id: block.id || block.Id,
            type: block.type || block.Type || "text",
            width: block.width || block.Width || "full",
            align: block.align || block.Align || "start",
            emphasis: block.emphasis || block.Emphasis || "",
            data: block.data || block.Data || {}
        };
    }

    function toServerPresentation(presentation) {
        return {
            SchemaVersion: presentation.schemaVersion || 1,
            Id: presentation.id,
            Title: { Ar: presentation.title.ar || "", En: presentation.title.en || "" },
            Theme: presentation.theme,
            Sections: presentation.sections.map(function (section) {
                return {
                    Id: section.id,
                    Order: section.order,
                    Title: { Ar: section.title.ar || "", En: section.title.en || "" },
                    Accent: section.accent || ""
                };
            }),
            Slides: presentation.slides.map(function (slide, index) {
                return {
                    Id: slide.id,
                    Order: index + 1,
                    SectionId: slide.sectionId || "",
                    InternalTitle: slide.internalTitle || "",
                    Template: slide.template || "title-with-text",
                    Hidden: !!slide.hidden,
                    Transition: slide.transition || "fade",
                    Background: slide.background || {},
                    Blocks: slide.blocks.map(function (block) {
                        return {
                            Id: block.id,
                            Type: block.type,
                            Width: block.width || "full",
                            Align: block.align || "start",
                            Emphasis: block.emphasis || "",
                            Data: block.data || {}
                        };
                    }),
                    Notes: { Ar: (slide.notes && slide.notes.ar) || "", En: (slide.notes && slide.notes.en) || "" },
                    EditorMetadata: slide.editorMetadata || {}
                };
            }),
            Media: (presentation.media || []).map(function (media) {
                return {
                    Id: media.id,
                    FileName: media.fileName,
                    OriginalName: media.originalName,
                    ContentType: media.contentType,
                    Size: media.size || 0,
                    CreatedUtc: media.createdUtc,
                    Url: media.url
                };
            }),
            UpdatedUtc: presentation.updatedUtc,
            PublishedUtc: presentation.publishedUtc
        };
    }

    function stringifyJsonSafe(value) {
        assertJsonSafe(value, "$", []);
        try {
            return JSON.stringify(value);
        } catch (error) {
            var wrapped = new Error("Presentation data could not be serialized: " + error.message);
            wrapped.code = "CLIENT_SERIALIZATION_FAILED";
            throw wrapped;
        }
    }

    function assertJsonSafe(value, path, ancestors) {
        if (value === null || value === undefined) {
            return;
        }

        if (typeof value === "number" && !isFinite(value)) {
            throw new Error("Presentation contains an invalid number at " + path + ".");
        }

        if (typeof value === "function") {
            throw new Error("Presentation contains a function at " + path + ".");
        }

        if (typeof Node !== "undefined" && value instanceof Node) {
            throw new Error("Presentation contains a DOM object at " + path + ".");
        }

        if (typeof CanvasRenderingContext2D !== "undefined" && value instanceof CanvasRenderingContext2D) {
            throw new Error("Presentation contains a canvas context at " + path + ".");
        }

        if (typeof value !== "object") {
            return;
        }

        if (ancestors.indexOf(value) >= 0) {
            throw new Error("Presentation contains a circular reference at " + path + ".");
        }

        ancestors.push(value);
        if (Array.isArray(value)) {
            value.forEach(function (item, index) {
                assertJsonSafe(item, path + "[" + index + "]", ancestors);
            });
        } else {
            Object.keys(value).forEach(function (key) {
                assertJsonSafe(value[key], path + "." + key, ancestors);
            });
        }
        ancestors.pop();
    }

    function extractPresentation(data) {
        if (data && (data.Presentation || data.presentation)) {
            return data.Presentation || data.presentation;
        }

        return data;
    }

    function newId(prefix) {
        return (prefix || "item") + "-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 10000).toString(36);
    }

    window.PresentationStorage = {
        list: function () { return get("list").then(function (items) { return items || []; }); },
        get: function (id, version) { return get("get", { id: id, version: version || "published" }).then(normalizePresentation); },
        backups: function (id) { return get("backups", { id: id }); },
        create: function (id, titleAr, titleEn) { return post("create", {}, { id: id, titleAr: titleAr, titleEn: titleEn }).then(normalizePresentation); },
        saveDraft: function (presentation) { return postRaw("saveDraft", {}, stringifyJsonSafe(toServerPresentation(presentation))).then(function (data) { return normalizePresentation(extractPresentation(data)); }); },
        publish: function (id) { return post("publish", { id: id }, {}).then(normalizePresentation); },
        duplicate: function (id) { return post("duplicate", { id: id }, {}).then(normalizePresentation); },
        deletePresentation: function (id) { return post("delete", { id: id }, {}); },
        cleanupMedia: function (id) { return post("cleanupMedia", { id: id }, {}); },
        restoreBackup: function (id, backupId) { return post("restoreBackup", { id: id, backupId: backupId }, {}).then(normalizePresentation); },
        upload: upload,
        importZip: importZip,
        exportUrl: function (id) { return apiUrl + query({ action: "export", id: id }); },
        normalizePresentation: normalizePresentation,
        toServerPresentation: toServerPresentation,
        newId: newId
    };
})();
