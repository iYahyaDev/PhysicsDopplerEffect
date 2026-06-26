using System.Collections.Generic;

namespace DopplerLab.Services
{
    public static class LocalizationData
    {
        public static Dictionary<string, Dictionary<string, string>> GetAll()
        {
            return new Dictionary<string, Dictionary<string, string>>
            {
                {
                    "ar",
                    new Dictionary<string, string>
                    {
                        {"navHome", "الرئيسية"},
                        {"navLab", "المختبر"},
                        {"navApplications", "تطبيقات"},
                        {"navCompare", "الصوت والضوء"},
                        {"navQuiz", "اختبار"},
                        {"navPresenter", "العرض"},
                        {"navValidation", "اختبار الفيزياء"},
                        {"languageName", "English"},
                        {"start", "تشغيل"},
                        {"pause", "إيقاف مؤقت"},
                        {"reset", "إعادة ضبط"},
                        {"startAudio", "بدء الصوت"},
                        {"stopAudio", "إيقاف الصوت"},
                        {"freeze", "تجميد وتحليل"},
                        {"continue", "متابعة"},
                        {"reveal", "إظهار الإجابة"},
                        {"approaching", "يقترب"},
                        {"receding", "يبتعد"},
                        {"tangential", "مماسي"},
                        {"stationary", "ساكن"},
                        {"listenerA", "المستمع أ"},
                        {"listenerB", "المستمع ب"},
                        {"warningNearSonic", "اقتربت السرعة الشعاعية من سرعة الصوت، لذلك تصبح المعادلة العادية غير مستقرة."}
                    }
                },
                {
                    "en",
                    new Dictionary<string, string>
                    {
                        {"navHome", "Home"},
                        {"navLab", "Lab"},
                        {"navApplications", "Applications"},
                        {"navCompare", "Sound and Light"},
                        {"navQuiz", "Quiz"},
                        {"navPresenter", "Presenter"},
                        {"navValidation", "Physics Tests"},
                        {"languageName", "العربية"},
                        {"start", "Start"},
                        {"pause", "Pause"},
                        {"reset", "Reset"},
                        {"startAudio", "Start Audio"},
                        {"stopAudio", "Stop Audio"},
                        {"freeze", "Freeze and Analyze"},
                        {"continue", "Continue"},
                        {"reveal", "Reveal answer"},
                        {"approaching", "Approaching"},
                        {"receding", "Receding"},
                        {"tangential", "Tangential"},
                        {"stationary", "Stationary"},
                        {"listenerA", "Listener A"},
                        {"listenerB", "Listener B"},
                        {"warningNearSonic", "The radial source speed is close to the speed of sound, so the ordinary formula becomes unstable."}
                    }
                }
            };
        }
    }
}
