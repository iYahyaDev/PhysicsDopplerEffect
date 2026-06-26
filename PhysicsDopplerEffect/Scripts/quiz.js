(function (global, document) {
    "use strict";

    function byId(id) {
        return document.getElementById(id);
    }

    function lang() {
        return global.DopplerLocale ? global.DopplerLocale.getLanguage() : "ar";
    }

    function text(question, arKey, enKey) {
        return lang() === "en" ? (question[enKey] || question[enKey.charAt(0).toLowerCase() + enKey.slice(1)]) : (question[arKey] || question[arKey.charAt(0).toLowerCase() + arKey.slice(1)]);
    }

    function prop(question, key) {
        return question[key] !== undefined ? question[key] : question[key.charAt(0).toLowerCase() + key.slice(1)];
    }

    function storageGet(key, fallback) {
        try {
            var raw = global.localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (ex) {
            return fallback;
        }
    }

    function storageSet(key, value) {
        try {
            global.localStorage.setItem(key, JSON.stringify(value));
        } catch (ex) {
            return false;
        }
        return true;
    }

    function shuffle(array) {
        var copy = array.slice(0);
        for (var i = copy.length - 1; i > 0; i -= 1) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = copy[i];
            copy[i] = copy[j];
            copy[j] = tmp;
        }
        return copy;
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (!byId("quizQuestion")) {
            return;
        }
        var questions = (global.DopplerBoot && global.DopplerBoot.quiz) || [];
        var order = storageGet("doppler.quizOrder", questions.map(function (_, index) { return index; }));
        if (!Array.isArray(order) || order.length !== questions.length) {
            order = questions.map(function (_, index) { return index; });
        }
        var state = storageGet("doppler.quizState", { index: 0, answers: {}, revealed: {} });
        if (!state.answers) {
            state.answers = {};
        }
        if (!state.revealed) {
            state.revealed = {};
        }

        function currentQuestion() {
            return questions[order[state.index]];
        }

        function save() {
            storageSet("doppler.quizOrder", order);
            storageSet("doppler.quizState", state);
        }

        function score() {
            var total = 0;
            Object.keys(state.answers).forEach(function (questionId) {
                var question = questions.find(function (q) { return String(prop(q, "Id")) === String(questionId); });
                if (question && state.answers[questionId] === prop(question, "CorrectIndex")) {
                    total += 1;
                }
            });
            return total;
        }

        function render() {
            var question = currentQuestion();
            if (!question) {
                byId("quizQuestion").textContent = lang() === "en" ? "No questions found." : "لا توجد أسئلة.";
                return;
            }
            var id = prop(question, "Id");
            var selected = state.answers[id];
            var revealed = !!state.revealed[id];
            byId("quizPosition").textContent = (state.index + 1) + " / " + questions.length;
            byId("quizTopic").textContent = prop(question, "Topic");
            byId("quizDifficulty").textContent = prop(question, "Difficulty");
            byId("quizQuestion").textContent = text(question, "TextAr", "TextEn");
            var choices = text(question, "ChoicesAr", "ChoicesEn") || [];
            byId("quizChoices").innerHTML = choices.map(function (choice, index) {
                var classes = [];
                if (selected === index) {
                    classes.push("selected");
                }
                if (revealed && index === prop(question, "CorrectIndex")) {
                    classes.push("correct");
                }
                if (revealed && selected === index && selected !== prop(question, "CorrectIndex")) {
                    classes.push("incorrect");
                }
                return "<button type=\"button\" class=\"" + classes.join(" ") + "\" data-index=\"" + index + "\">" + choice + "</button>";
            }).join("");
            Array.prototype.forEach.call(byId("quizChoices").querySelectorAll("button"), function (button) {
                button.addEventListener("click", function () {
                    var index = Number(button.getAttribute("data-index"));
                    state.answers[id] = index;
                    if (!byId("presenterQuizMode").checked) {
                        state.revealed[id] = true;
                    }
                    save();
                    render();
                });
            });
            byId("quizExplanation").textContent = revealed ? text(question, "ExplanationAr", "ExplanationEn") : "";
            byId("quizScore").textContent = score() + " / " + questions.length;
            byId("quizScoreDetail").textContent = lang() === "en" ? "Answered: " + Object.keys(state.answers).length + " questions. Stored locally." : "تمت الإجابة عن " + Object.keys(state.answers).length + " أسئلة. التخزين محلي.";
        }

        byId("previousQuestionBtn").addEventListener("click", function () {
            state.index = Math.max(0, state.index - 1);
            save();
            render();
        });
        byId("nextQuestionBtn").addEventListener("click", function () {
            state.index = Math.min(questions.length - 1, state.index + 1);
            save();
            render();
        });
        byId("revealQuizBtn").addEventListener("click", function () {
            var question = currentQuestion();
            state.revealed[prop(question, "Id")] = true;
            save();
            render();
        });
        byId("restartQuizBtn").addEventListener("click", function () {
            state = { index: 0, answers: {}, revealed: {} };
            save();
            render();
        });
        byId("shuffleQuizBtn").addEventListener("click", function () {
            order = shuffle(questions.map(function (_, index) { return index; }));
            state.index = 0;
            save();
            render();
        });
        byId("presenterQuizMode").addEventListener("change", render);
        global.addEventListener("doppler:languagechange", render);
        render();
    });
}(window, document));
