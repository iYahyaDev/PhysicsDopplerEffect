using System.Collections.Generic;

namespace DopplerLab.Models
{
    public class QuizQuestion
    {
        public int Id { get; set; }
        public string Topic { get; set; }
        public string Difficulty { get; set; }
        public string TextAr { get; set; }
        public string TextEn { get; set; }
        public List<string> ChoicesAr { get; set; }
        public List<string> ChoicesEn { get; set; }
        public int CorrectIndex { get; set; }
        public string ExplanationAr { get; set; }
        public string ExplanationEn { get; set; }
    }
}
