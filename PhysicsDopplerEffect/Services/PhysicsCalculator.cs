using System;
using System.Collections.Generic;
using DopplerLab.Models;

namespace DopplerLab.Services
{
    public static class PhysicsCalculator
    {
        public static double SoundSpeedFromTemperature(double temperatureCelsius)
        {
            return 331.3 + 0.606 * temperatureCelsius;
        }

        public static PhysicsResult Calculate(
            Vector2D sourcePosition,
            Vector2D observerPosition,
            Vector2D sourceVelocity,
            Vector2D observerVelocity,
            double soundSpeed,
            double emittedFrequency)
        {
            double safeSoundSpeed = Clamp(soundSpeed, 300, 360);
            double safeFrequency = Clamp(emittedFrequency, 1, 20000);
            Vector2D separation = Vector2D.Subtract(observerPosition, sourcePosition);
            double distance = Math.Max(Vector2D.Magnitude(separation), 0.5);
            Vector2D n = Vector2D.Normalize(separation);
            double sourceRadial = Vector2D.Dot(sourceVelocity, n);
            double observerDot = Vector2D.Dot(observerVelocity, n);
            double observerClosing = -observerDot;
            double denominator = safeSoundSpeed - sourceRadial;
            string warning = string.Empty;
            bool valid = true;

            double minimumDenominator = safeSoundSpeed * 0.08;
            if (denominator <= minimumDenominator)
            {
                warning = "The source radial speed is too close to the sound speed, so the ordinary acoustic Doppler formula is singular. The displayed value was clamped.";
                denominator = minimumDenominator;
                valid = false;
            }

            double numerator = safeSoundSpeed - observerDot;
            if (numerator <= 0)
            {
                warning = "The observer speed creates an invalid numerator for this classroom model. The displayed value was clamped.";
                numerator = safeSoundSpeed * 0.02;
                valid = false;
            }

            double factor = numerator / denominator;
            if (double.IsNaN(factor) || double.IsInfinity(factor) || factor <= 0)
            {
                factor = 0.01;
                warning = "The requested motion produced an invalid frequency. The displayed value was clamped.";
                valid = false;
            }

            double observed = safeFrequency * factor;
            double sourceSpeed = Vector2D.Magnitude(sourceVelocity);
            double observerSpeed = Vector2D.Magnitude(observerVelocity);

            return new PhysicsResult
            {
                EmittedFrequency = safeFrequency,
                ObservedFrequency = observed,
                DopplerFactor = factor,
                Distance = distance,
                SourceSpeed = sourceSpeed,
                ObserverSpeed = observerSpeed,
                SourceRadialTowardObserver = sourceRadial,
                ObserverClosingTowardSource = observerClosing,
                RelativeRadialClosingSpeed = sourceRadial + observerClosing,
                SoundSpeed = safeSoundSpeed,
                Wavelength = safeSoundSpeed / safeFrequency,
                State = Classify(sourceRadial + observerClosing, sourceSpeed, observerSpeed),
                IsValid = valid,
                Warning = warning
            };
        }

        public static List<PhysicsTestCase> GetValidationCases()
        {
            double c = 343;
            double f = 700;
            return new List<PhysicsTestCase>
            {
                new PhysicsTestCase
                {
                    Id = 1,
                    NameAr = "المصدر والمستمع ساكنان",
                    NameEn = "Both stationary",
                    SourcePosition = new Vector2D(0, 0),
                    ObserverPosition = new Vector2D(20, 0),
                    SourceVelocity = new Vector2D(0, 0),
                    ObserverVelocity = new Vector2D(0, 0),
                    EmittedFrequency = f,
                    SoundSpeed = c,
                    ExpectedFrequency = 700,
                    Tolerance = 0.01,
                    NotesAr = "لا توجد سرعة شعاعية، لذلك لا يتغير التردد.",
                    NotesEn = "No radial velocity, so frequency is unchanged."
                },
                new PhysicsTestCase
                {
                    Id = 2,
                    NameAr = "المصدر يقترب مباشرة بسرعة 25 م/ث",
                    NameEn = "Source approaches directly at 25 m/s",
                    SourcePosition = new Vector2D(0, 0),
                    ObserverPosition = new Vector2D(20, 0),
                    SourceVelocity = new Vector2D(25, 0),
                    ObserverVelocity = new Vector2D(0, 0),
                    EmittedFrequency = f,
                    SoundSpeed = c,
                    ExpectedFrequency = f * c / (c - 25),
                    Tolerance = 0.02,
                    NotesAr = "تصغر المقامات لأن المصدر يتحرك نحو المستمع.",
                    NotesEn = "The denominator shrinks because the source moves toward the observer."
                },
                new PhysicsTestCase
                {
                    Id = 3,
                    NameAr = "المصدر يبتعد مباشرة بسرعة 25 م/ث",
                    NameEn = "Source recedes directly at 25 m/s",
                    SourcePosition = new Vector2D(0, 0),
                    ObserverPosition = new Vector2D(20, 0),
                    SourceVelocity = new Vector2D(-25, 0),
                    ObserverVelocity = new Vector2D(0, 0),
                    EmittedFrequency = f,
                    SoundSpeed = c,
                    ExpectedFrequency = f * c / (c + 25),
                    Tolerance = 0.02,
                    NotesAr = "يكبر المقام عندما يبتعد المصدر.",
                    NotesEn = "The denominator grows when the source moves away."
                },
                new PhysicsTestCase
                {
                    Id = 4,
                    NameAr = "المستمع يقترب من مصدر ساكن بسرعة 10 م/ث",
                    NameEn = "Observer approaches stationary source at 10 m/s",
                    SourcePosition = new Vector2D(0, 0),
                    ObserverPosition = new Vector2D(20, 0),
                    SourceVelocity = new Vector2D(0, 0),
                    ObserverVelocity = new Vector2D(-10, 0),
                    EmittedFrequency = f,
                    SoundSpeed = c,
                    ExpectedFrequency = f * (c + 10) / c,
                    Tolerance = 0.02,
                    NotesAr = "حركة المستمع نحو المصدر تزيد البسط.",
                    NotesEn = "Observer motion toward the source increases the numerator."
                },
                new PhysicsTestCase
                {
                    Id = 5,
                    NameAr = "المستمع يبتعد بسرعة 10 م/ث",
                    NameEn = "Observer recedes at 10 m/s",
                    SourcePosition = new Vector2D(0, 0),
                    ObserverPosition = new Vector2D(20, 0),
                    SourceVelocity = new Vector2D(0, 0),
                    ObserverVelocity = new Vector2D(10, 0),
                    EmittedFrequency = f,
                    SoundSpeed = c,
                    ExpectedFrequency = f * (c - 10) / c,
                    Tolerance = 0.02,
                    NotesAr = "حركة المستمع بعيدا تخفض البسط.",
                    NotesEn = "Observer motion away lowers the numerator."
                },
                new PhysicsTestCase
                {
                    Id = 6,
                    NameAr = "حركة مماسية نقية للمصدر",
                    NameEn = "Pure tangential source motion",
                    SourcePosition = new Vector2D(0, 0),
                    ObserverPosition = new Vector2D(20, 0),
                    SourceVelocity = new Vector2D(0, 15),
                    ObserverVelocity = new Vector2D(0, 0),
                    EmittedFrequency = f,
                    SoundSpeed = c,
                    ExpectedFrequency = f,
                    Tolerance = 0.02,
                    NotesAr = "السرعة الكلية كبيرة، لكن المركبة الشعاعية صفر.",
                    NotesEn = "Total speed is large, but the radial component is zero."
                },
                new PhysicsTestCase
                {
                    Id = 7,
                    NameAr = "تغيير المسافة فقط",
                    NameEn = "Distance-only change",
                    SourcePosition = new Vector2D(0, 0),
                    ObserverPosition = new Vector2D(80, 0),
                    SourceVelocity = new Vector2D(0, 0),
                    ObserverVelocity = new Vector2D(0, 0),
                    EmittedFrequency = f,
                    SoundSpeed = c,
                    ExpectedFrequency = f,
                    Tolerance = 0.02,
                    NotesAr = "المسافة تغير الشدة لا النغمة في هذا النموذج.",
                    NotesEn = "Distance changes loudness, not pitch, in this model."
                },
                new PhysicsTestCase
                {
                    Id = 8,
                    NameAr = "مستمعان على جهتين متعاكستين",
                    NameEn = "Two opposite listeners",
                    SourcePosition = new Vector2D(0, 0),
                    ObserverPosition = new Vector2D(20, 0),
                    SourceVelocity = new Vector2D(25, 0),
                    ObserverVelocity = new Vector2D(0, 0),
                    EmittedFrequency = f,
                    SoundSpeed = c,
                    ExpectedFrequency = f * c / (c - 25),
                    Tolerance = 0.02,
                    NotesAr = "المستمع أمام المصدر يسمع ترددا أعلى؛ المستمع خلفه يسمع أقل في الاختبار المقابل داخل الصفحة.",
                    NotesEn = "The listener in front hears a higher frequency; the opposite listener is checked in the browser test."
                },
                new PhysicsTestCase
                {
                    Id = 9,
                    NameAr = "مقام قريب من الصفر عند سرعة قريبة من الصوت",
                    NameEn = "Invalid near-sonic denominator",
                    SourcePosition = new Vector2D(0, 0),
                    ObserverPosition = new Vector2D(20, 0),
                    SourceVelocity = new Vector2D(340, 0),
                    ObserverVelocity = new Vector2D(0, 0),
                    EmittedFrequency = f,
                    SoundSpeed = c,
                    ExpectedFrequency = f * c / (c * 0.08),
                    Tolerance = 0.05,
                    ExpectWarning = true,
                    NotesAr = "يجب ألا ينتج الاختبار لا نهاية أو قيمة غير رقمية.",
                    NotesEn = "The engine must not produce infinity or NaN."
                },
                new PhysicsTestCase
                {
                    Id = 10,
                    NameAr = "دائرة متمركزة عند زاوية 0 درجة",
                    NameEn = "Centered circle at 0 degrees",
                    SourcePosition = new Vector2D(30, 0),
                    ObserverPosition = new Vector2D(0, 0),
                    SourceVelocity = new Vector2D(0, 15),
                    ObserverVelocity = new Vector2D(0, 0),
                    EmittedFrequency = f,
                    SoundSpeed = c,
                    ExpectedFrequency = f,
                    Tolerance = 0.02,
                    NotesAr = "السرعة مماسية تماما، لذلك v_s·n يساوي صفرا تقريبا.",
                    NotesEn = "The velocity is exactly tangential, so v_s dot n is approximately zero."
                },
                new PhysicsTestCase
                {
                    Id = 11,
                    NameAr = "دائرة متمركزة عند زاوية 90 درجة",
                    NameEn = "Centered circle at 90 degrees",
                    SourcePosition = new Vector2D(0, 30),
                    ObserverPosition = new Vector2D(0, 0),
                    SourceVelocity = new Vector2D(-15, 0),
                    ObserverVelocity = new Vector2D(0, 0),
                    EmittedFrequency = f,
                    SoundSpeed = c,
                    ExpectedFrequency = f,
                    Tolerance = 0.02,
                    NotesAr = "تتغير جهة الحركة، لكن المركبة الشعاعية تبقى صفرا.",
                    NotesEn = "The direction changes, but the radial component stays zero."
                },
                new PhysicsTestCase
                {
                    Id = 12,
                    NameAr = "دائرة متمركزة عند زاوية 180 درجة",
                    NameEn = "Centered circle at 180 degrees",
                    SourcePosition = new Vector2D(-30, 0),
                    ObserverPosition = new Vector2D(0, 0),
                    SourceVelocity = new Vector2D(0, -15),
                    ObserverVelocity = new Vector2D(0, 0),
                    EmittedFrequency = f,
                    SoundSpeed = c,
                    ExpectedFrequency = f,
                    Tolerance = 0.02,
                    NotesAr = "السرعة الكلية غير صفرية بينما التردد يبقى مساويا للمنبعث.",
                    NotesEn = "Total speed is nonzero while frequency remains equal to emitted."
                },
                new PhysicsTestCase
                {
                    Id = 13,
                    NameAr = "دائرة متمركزة عند زاوية 270 درجة",
                    NameEn = "Centered circle at 270 degrees",
                    SourcePosition = new Vector2D(0, -30),
                    ObserverPosition = new Vector2D(0, 0),
                    SourceVelocity = new Vector2D(15, 0),
                    ObserverVelocity = new Vector2D(0, 0),
                    EmittedFrequency = f,
                    SoundSpeed = c,
                    ExpectedFrequency = f,
                    Tolerance = 0.02,
                    NotesAr = "هذه حالة إضافية للتأكد من أن الاختبار لا يعتمد على زاوية واحدة.",
                    NotesEn = "This extra case verifies that the test does not depend on one angle."
                }
            };
        }

        private static string Classify(double closingSpeed, double sourceSpeed, double observerSpeed)
        {
            if (sourceSpeed < 0.05 && observerSpeed < 0.05)
            {
                return "stationary";
            }

            if (Math.Abs(closingSpeed) < 0.25)
            {
                return "tangential";
            }

            return closingSpeed > 0 ? "approaching" : "receding";
        }

        private static double Clamp(double value, double min, double max)
        {
            if (value < min)
            {
                return min;
            }

            if (value > max)
            {
                return max;
            }

            return value;
        }
    }
}
