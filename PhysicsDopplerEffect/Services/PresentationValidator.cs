using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using DopplerLab.Models;

namespace DopplerLab.Services
{
    public static class PresentationValidator
    {
        private static readonly Regex SafeIdRegex = new Regex("^[a-z0-9][a-z0-9-]{1,60}$", RegexOptions.Compiled);
        private static readonly HashSet<string> BlockTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "heading", "text", "bullet-list", "image", "callout", "comparison", "question",
            "audio-control", "video", "button", "table", "reference-list", "spacer", "interactive"
        };

        private static readonly HashSet<string> Templates = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "title", "title-with-text", "interactive-question", "full-screen-simulation",
            "summary", "applications-overview", "conclusion", "section-divider",
            "title-with-image", "image-with-explanation", "two-column-comparison",
            "three-card-layout", "interactive-simulation", "references"
        };

        private static readonly HashSet<string> ComponentIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "cover", "opening-sound", "wave-basics", "waveform-pitch", "pitch-loudness",
            "doppler-stationary", "doppler-approach", "doppler-recede", "prediction",
            "lab-overview", "lab-stationary-near", "lab-auto-pass", "lab-speed-compare",
            "lab-sideways-circular", "lab-sideways", "lab-circular", "lab-challenge",
            "opening-demo-sequence", "radial-velocity-lab", "radar-calculation",
            "police-radar", "sports-radar",
            "medical-doppler", "medical-comparison", "light-doppler", "astronomy",
            "optical-lab", "optical-spectrum", "optical-graphs", "optical-calculation", "optical-challenge",
            "weather-radar", "concept-quiz"
        };

        public static bool IsSafeId(string value)
        {
            return !string.IsNullOrEmpty(value) && SafeIdRegex.IsMatch(value);
        }

        public static List<string> Validate(PresentationDefinition presentation)
        {
            List<string> errors = new List<string>();

            if (presentation == null)
            {
                errors.Add("Presentation is empty.");
                return errors;
            }

            if (presentation.SchemaVersion != 1)
            {
                errors.Add("Unsupported presentation schema version.");
            }

            if (!IsSafeId(presentation.Id))
            {
                errors.Add("Presentation id is invalid.");
            }

            if (presentation.Title == null || string.IsNullOrWhiteSpace(Fallback(presentation.Title)))
            {
                errors.Add("Presentation title is required.");
            }
            else
            {
                ValidateLocalizedText(presentation.Title, "presentation title", true, errors);
            }

            if (presentation.Theme == null)
            {
                errors.Add("Presentation theme is required.");
            }

            HashSet<string> sectionIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (presentation.Sections != null)
            {
                foreach (PresentationSection section in presentation.Sections)
                {
                    if (!IsSafeId(section.Id))
                    {
                        errors.Add("Section id is invalid.");
                    }
                    else if (!sectionIds.Add(section.Id))
                    {
                        errors.Add("Duplicate section id: " + section.Id);
                    }

                    ValidateLocalizedText(section.Title, "section " + section.Id + " title", true, errors);
                }
            }

            HashSet<string> slideIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (presentation.Slides == null || presentation.Slides.Count == 0)
            {
                errors.Add("At least one slide is required.");
            }
            else
            {
                foreach (SlideDefinition slide in presentation.Slides)
                {
                    if (!IsSafeId(slide.Id))
                    {
                        errors.Add("Slide id is invalid.");
                    }
                    else if (!slideIds.Add(slide.Id))
                    {
                        errors.Add("Duplicate slide id: " + slide.Id);
                    }

                    if (!string.IsNullOrEmpty(slide.SectionId) && !sectionIds.Contains(slide.SectionId))
                    {
                        errors.Add("Slide " + slide.Id + " references an unknown section.");
                    }

                    if (string.IsNullOrEmpty(slide.Template) || !Templates.Contains(slide.Template))
                    {
                        errors.Add("Unknown slide template on slide " + slide.Id + ".");
                    }

                    if (slide.Blocks == null)
                    {
                        continue;
                    }

                    ValidateLocalizedText(slide.Notes, "slide " + slide.Id + " notes", false, errors);

                    HashSet<string> blockIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    foreach (SlideBlockDefinition block in slide.Blocks)
                    {
                        if (!IsSafeId(block.Id))
                        {
                            errors.Add("Block id is invalid on slide " + slide.Id + ".");
                        }
                        else if (!blockIds.Add(block.Id))
                        {
                            errors.Add("Duplicate block id on slide " + slide.Id + ": " + block.Id);
                        }

                        if (string.IsNullOrEmpty(block.Type) || !BlockTypes.Contains(block.Type))
                        {
                            errors.Add("Unknown block type on slide " + slide.Id + ".");
                        }

                        if (IsInteractive(block) && !ComponentIds.Contains(GetString(block.Data, "componentId")))
                        {
                            errors.Add("Unknown interactive component on slide " + slide.Id + ".");
                        }

                        if (IsInteractive(block) && string.Equals(GetString(block.Data, "componentId"), "concept-quiz", StringComparison.OrdinalIgnoreCase))
                        {
                            ValidateConceptQuiz(block.Data, slide.Id, errors);
                        }

                        if (ContainsUnsafeMarkup(block.Data))
                        {
                            errors.Add("Unsafe script-like markup found on slide " + slide.Id + ".");
                        }

                        if (ContainsCorruptedAudienceText(block.Data))
                        {
                            errors.Add("Corrupted audience text found on slide " + slide.Id + ".");
                        }

                        if (ContainsEmptyRequiredArabic(block.Data))
                        {
                            errors.Add("Missing Arabic text found on slide " + slide.Id + ".");
                        }
                    }
                }
            }

            return errors;
        }

        public static List<PresentationValidationError> ToValidationErrors(IEnumerable<string> messages)
        {
            List<PresentationValidationError> errors = new List<PresentationValidationError>();
            if (messages == null)
            {
                return errors;
            }

            foreach (string message in messages)
            {
                errors.Add(new PresentationValidationError
                {
                    Path = InferPath(message),
                    Message = message
                });
            }

            return errors;
        }

        public static string Fallback(LocalizedText text)
        {
            if (text == null)
            {
                return string.Empty;
            }

            return !string.IsNullOrWhiteSpace(text.Ar) ? text.Ar : (text.En ?? string.Empty);
        }

        private static bool IsInteractive(SlideBlockDefinition block)
        {
            return block != null && string.Equals(block.Type, "interactive", StringComparison.OrdinalIgnoreCase);
        }

        private static string GetString(Dictionary<string, object> data, string key)
        {
            if (data == null || !data.ContainsKey(key) || data[key] == null)
            {
                return string.Empty;
            }

            return Convert.ToString(data[key]);
        }

        private static void ValidateConceptQuiz(Dictionary<string, object> data, string slideId, List<string> errors)
        {
            Dictionary<string, object> config = GetDictionary(data, "config");
            object[] questions = GetArray(config, "questions");
            if (questions == null || questions.Length == 0)
            {
                errors.Add("Concept quiz on slide " + slideId + " must contain at least one question.");
                return;
            }

            for (int i = 0; i < questions.Length; i += 1)
            {
                Dictionary<string, object> question = questions[i] as Dictionary<string, object>;
                if (question == null)
                {
                    errors.Add("Concept quiz question " + (i + 1) + " on slide " + slideId + " is invalid.");
                    continue;
                }

                object text = FirstPresent(question, "text", "prompt", "q", "question", "title", "content");
                if (string.IsNullOrWhiteSpace(LocalizedFallback(text)))
                {
                    errors.Add("Concept quiz question " + (i + 1) + " on slide " + slideId + " is missing question text.");
                }

                object[] choices = GetArray(question, "choices");
                if (choices == null || choices.Length < 2)
                {
                    errors.Add("Concept quiz question " + (i + 1) + " on slide " + slideId + " must contain at least two choices.");
                    continue;
                }

                HashSet<string> choiceIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                for (int choiceIndex = 0; choiceIndex < choices.Length; choiceIndex += 1)
                {
                    Dictionary<string, object> choiceDictionary = choices[choiceIndex] as Dictionary<string, object>;
                    string choiceId = choiceDictionary != null && choiceDictionary.ContainsKey("id")
                        ? Convert.ToString(choiceDictionary["id"])
                        : ((char)('a' + choiceIndex)).ToString();
                    choiceIds.Add(choiceId);
                    object choiceText = choiceDictionary != null && choiceDictionary.ContainsKey("text") ? choiceDictionary["text"] : choices[choiceIndex];
                    if (string.IsNullOrWhiteSpace(LocalizedFallback(choiceText)))
                    {
                        errors.Add("Concept quiz question " + (i + 1) + " on slide " + slideId + " has an empty choice.");
                    }
                }

                string correctChoiceId = GetCorrectChoiceId(question, choices);
                if (string.IsNullOrWhiteSpace(correctChoiceId) || !choiceIds.Contains(correctChoiceId))
                {
                    errors.Add("Concept quiz question " + (i + 1) + " on slide " + slideId + " references an invalid correct choice.");
                }
            }
        }

        private static Dictionary<string, object> GetDictionary(Dictionary<string, object> data, string key)
        {
            if (data == null || !data.ContainsKey(key))
            {
                return null;
            }

            return data[key] as Dictionary<string, object>;
        }

        private static object[] GetArray(Dictionary<string, object> data, string key)
        {
            if (data == null || !data.ContainsKey(key))
            {
                return null;
            }

            object[] array = data[key] as object[];
            if (array != null)
            {
                return array;
            }

            System.Collections.ArrayList arrayList = data[key] as System.Collections.ArrayList;
            return arrayList != null ? arrayList.ToArray() : null;
        }

        private static object FirstPresent(Dictionary<string, object> data, params string[] keys)
        {
            foreach (string key in keys)
            {
                if (data.ContainsKey(key) && data[key] != null)
                {
                    return data[key];
                }
            }

            return null;
        }

        private static string LocalizedFallback(object value)
        {
            if (value == null)
            {
                return string.Empty;
            }

            string text = value as string;
            if (text != null)
            {
                return text;
            }

            Dictionary<string, object> dictionary = value as Dictionary<string, object>;
            if (dictionary != null)
            {
                string ar = dictionary.ContainsKey("ar") ? Convert.ToString(dictionary["ar"]) : (dictionary.ContainsKey("Ar") ? Convert.ToString(dictionary["Ar"]) : string.Empty);
                string en = dictionary.ContainsKey("en") ? Convert.ToString(dictionary["en"]) : (dictionary.ContainsKey("En") ? Convert.ToString(dictionary["En"]) : string.Empty);
                if (!string.IsNullOrWhiteSpace(ar))
                {
                    return ar;
                }

                if (!string.IsNullOrWhiteSpace(en))
                {
                    return en;
                }

                if (dictionary.ContainsKey("text"))
                {
                    return LocalizedFallback(dictionary["text"]);
                }
            }

            return string.Empty;
        }

        private static string GetCorrectChoiceId(Dictionary<string, object> question, object[] choices)
        {
            if (question.ContainsKey("correctChoiceId"))
            {
                return Convert.ToString(question["correctChoiceId"]);
            }

            int index = -1;
            foreach (string key in new[] { "correct", "correctIndex", "answer" })
            {
                if (question.ContainsKey(key) && int.TryParse(Convert.ToString(question[key]), out index) && index >= 0 && index < choices.Length)
                {
                    Dictionary<string, object> choiceDictionary = choices[index] as Dictionary<string, object>;
                    return choiceDictionary != null && choiceDictionary.ContainsKey("id")
                        ? Convert.ToString(choiceDictionary["id"])
                        : ((char)('a' + index)).ToString();
                }
            }

            return string.Empty;
        }

        private static bool ContainsUnsafeMarkup(object value)
        {
            if (value == null)
            {
                return false;
            }

            string s = value as string;
            if (s != null)
            {
                string lower = s.ToLowerInvariant();
                return lower.Contains("<script") || lower.Contains("javascript:") || lower.Contains(" onerror=") || lower.Contains(" onload=");
            }

            Dictionary<string, object> dictionary = value as Dictionary<string, object>;
            if (dictionary != null)
            {
                foreach (object child in dictionary.Values)
                {
                    if (ContainsUnsafeMarkup(child))
                    {
                        return true;
                    }
                }
            }

            object[] array = value as object[];
            if (array != null)
            {
                foreach (object child in array)
                {
                    if (ContainsUnsafeMarkup(child))
                    {
                        return true;
                    }
                }
            }

            return false;
        }

        private static void ValidateLocalizedText(LocalizedText text, string label, bool requireArabic, List<string> errors)
        {
            if (text == null)
            {
                if (requireArabic)
                {
                    errors.Add("Missing Arabic text in " + label + ".");
                }
                return;
            }

            if (requireArabic && string.IsNullOrWhiteSpace(text.Ar))
            {
                errors.Add("Missing Arabic text in " + label + ".");
            }

            if (IsCorruptedText(text.Ar) || IsCorruptedText(text.En))
            {
                errors.Add("Corrupted audience text in " + label + ".");
            }
        }

        private static bool ContainsCorruptedAudienceText(object value)
        {
            if (value == null)
            {
                return false;
            }

            string s = value as string;
            if (s != null)
            {
                return IsCorruptedText(s);
            }

            Dictionary<string, object> dictionary = value as Dictionary<string, object>;
            if (dictionary != null)
            {
                foreach (object child in dictionary.Values)
                {
                    if (ContainsCorruptedAudienceText(child))
                    {
                        return true;
                    }
                }
            }

            object[] array = value as object[];
            if (array != null)
            {
                foreach (object child in array)
                {
                    if (ContainsCorruptedAudienceText(child))
                    {
                        return true;
                    }
                }
            }

            return false;
        }

        private static bool ContainsEmptyRequiredArabic(object value)
        {
            Dictionary<string, object> dictionary = value as Dictionary<string, object>;
            if (dictionary == null)
            {
                return false;
            }

            if (dictionary.ContainsKey("ar") && string.IsNullOrWhiteSpace(Convert.ToString(dictionary["ar"])))
            {
                return true;
            }

            if (dictionary.ContainsKey("Ar") && string.IsNullOrWhiteSpace(Convert.ToString(dictionary["Ar"])))
            {
                return true;
            }

            foreach (object child in dictionary.Values)
            {
                if (ContainsEmptyRequiredArabic(child))
                {
                    return true;
                }

                object[] array = child as object[];
                if (array != null)
                {
                    foreach (object item in array)
                    {
                        if (ContainsEmptyRequiredArabic(item))
                        {
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        private static bool IsCorruptedText(string value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return false;
            }

            return value.Contains("???") ||
                value.Contains("\uFFFD") ||
                value.Contains("ï¿½") ||
                value.Contains("�") ||
                Regex.IsMatch(value, "\\{\\{[^}]+\\}\\}");
        }

        private static string InferPath(string message)
        {
            if (string.IsNullOrEmpty(message))
            {
                return "Presentation";
            }

            Match slideMatch = Regex.Match(message, "slide ([a-z0-9-]+)", RegexOptions.IgnoreCase);
            if (slideMatch.Success)
            {
                return "Slides[" + slideMatch.Groups[1].Value + "]";
            }

            if (message.IndexOf("section", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "Sections";
            }

            if (message.IndexOf("block", StringComparison.OrdinalIgnoreCase) >= 0 ||
                message.IndexOf("component", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "Slides[].Blocks";
            }

            return "Presentation";
        }
    }

    public class PresentationValidationException : InvalidOperationException
    {
        public PresentationValidationException(IEnumerable<string> messages)
            : base("The presentation contains invalid data.")
        {
            Errors = PresentationValidator.ToValidationErrors(messages);
        }

        public List<PresentationValidationError> Errors { get; private set; }
    }
}
