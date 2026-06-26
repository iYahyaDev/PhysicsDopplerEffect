using System.Collections.Generic;
using System.Web.Script.Serialization;
using DopplerLab.Models;

namespace DopplerLab.Services
{
    public static class PageBoot
    {
        public static string ForPage(string page)
        {
            return Serialize(new
            {
                page = page,
                generatedUtc = System.DateTime.UtcNow.ToString("o"),
                settings = SimulationSettings.CreateDefault(),
                localization = LocalizationData.GetAll(),
                validationCases = PhysicsCalculator.GetValidationCases()
            });
        }

        public static string ForQuiz()
        {
            return Serialize(new
            {
                page = "quiz",
                generatedUtc = System.DateTime.UtcNow.ToString("o"),
                settings = SimulationSettings.CreateDefault(),
                localization = LocalizationData.GetAll(),
                quiz = QuizRepository.GetQuestions()
            });
        }

        public static string ForValidation()
        {
            List<object> cases = new List<object>();
            foreach (PhysicsTestCase testCase in PhysicsCalculator.GetValidationCases())
            {
                PhysicsResult result = PhysicsCalculator.Calculate(
                    testCase.SourcePosition,
                    testCase.ObserverPosition,
                    testCase.SourceVelocity,
                    testCase.ObserverVelocity,
                    testCase.SoundSpeed,
                    testCase.EmittedFrequency);

                cases.Add(new
                {
                    testCase = testCase,
                    serverResult = result,
                    error = System.Math.Abs(result.ObservedFrequency - testCase.ExpectedFrequency),
                    passed = System.Math.Abs(result.ObservedFrequency - testCase.ExpectedFrequency) <= testCase.Tolerance &&
                             (!testCase.ExpectWarning || !string.IsNullOrEmpty(result.Warning))
                });
            }

            return Serialize(new
            {
                page = "validation",
                generatedUtc = System.DateTime.UtcNow.ToString("o"),
                settings = SimulationSettings.CreateDefault(),
                localization = LocalizationData.GetAll(),
                validationCases = cases
            });
        }

        private static string Serialize(object payload)
        {
            JavaScriptSerializer serializer = PresentationRepository.CreateSerializer();
            return serializer.Serialize(payload)
                .Replace("</", "<\\/")
                .Replace("\u2028", "\\u2028")
                .Replace("\u2029", "\\u2029");
        }
    }
}
