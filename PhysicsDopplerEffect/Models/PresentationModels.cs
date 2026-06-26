using System;
using System.Collections.Generic;

namespace DopplerLab.Models
{
    public class LocalizedText
    {
        public string Ar { get; set; }
        public string En { get; set; }
    }

    public class PresentationTheme
    {
        public string Id { get; set; }
        public string Background { get; set; }
        public string Surface { get; set; }
        public string Accent { get; set; }
        public string Accent2 { get; set; }
        public string Text { get; set; }
    }

    public class PresentationSection
    {
        public string Id { get; set; }
        public int Order { get; set; }
        public LocalizedText Title { get; set; }
        public string Accent { get; set; }
    }

    public class SlideBlockDefinition
    {
        public string Id { get; set; }
        public string Type { get; set; }
        public string Width { get; set; }
        public string Align { get; set; }
        public string Emphasis { get; set; }
        public Dictionary<string, object> Data { get; set; }
    }

    public class SlideDefinition
    {
        public string Id { get; set; }
        public int Order { get; set; }
        public string SectionId { get; set; }
        public string InternalTitle { get; set; }
        public string Template { get; set; }
        public bool Hidden { get; set; }
        public string Transition { get; set; }
        public Dictionary<string, object> Background { get; set; }
        public List<SlideBlockDefinition> Blocks { get; set; }
        public LocalizedText Notes { get; set; }
        public Dictionary<string, object> EditorMetadata { get; set; }
    }

    public class PresentationMedia
    {
        public string Id { get; set; }
        public string FileName { get; set; }
        public string OriginalName { get; set; }
        public string ContentType { get; set; }
        public long Size { get; set; }
        public DateTime CreatedUtc { get; set; }
        public string Url { get; set; }
    }

    public class PresentationBackup
    {
        public string Id { get; set; }
        public DateTime CreatedUtc { get; set; }
        public string FileName { get; set; }
    }

    public class PresentationDefinition
    {
        public int SchemaVersion { get; set; }
        public string Id { get; set; }
        public LocalizedText Title { get; set; }
        public PresentationTheme Theme { get; set; }
        public List<PresentationSection> Sections { get; set; }
        public List<SlideDefinition> Slides { get; set; }
        public List<PresentationMedia> Media { get; set; }
        public DateTime UpdatedUtc { get; set; }
        public DateTime? PublishedUtc { get; set; }
    }

    public class PresentationIndexItem
    {
        public string Id { get; set; }
        public LocalizedText Title { get; set; }
        public DateTime UpdatedUtc { get; set; }
        public DateTime? PublishedUtc { get; set; }
        public int SlideCount { get; set; }
    }

    public class PresentationSaveResult
    {
        public string PresentationId { get; set; }
        public DateTime SavedAtUtc { get; set; }
        public int Version { get; set; }
        public PresentationDefinition Presentation { get; set; }
    }

    public class PresentationValidationError
    {
        public string Path { get; set; }
        public string Message { get; set; }
    }

    public class PresentationApiResponse
    {
        public bool Ok { get; set; }
        public string Error { get; set; }
        public string Code { get; set; }
        public string CorrelationId { get; set; }
        public object Data { get; set; }
    }
}
