namespace DopplerLab.Models
{
    public class SimulationSettings
    {
        public double WorldWidthMeters { get; set; }
        public double WorldHeightMeters { get; set; }
        public double TemperatureCelsius { get; set; }
        public double SpeedOfSound { get; set; }
        public double SourceFrequency { get; set; }
        public double SourceSpeed { get; set; }
        public double ObserverSpeed { get; set; }
        public double MaxSourceSpeed { get; set; }
        public double MaxObserverSpeed { get; set; }
        public double SourceRadiusMeters { get; set; }
        public double ListenerRadiusMeters { get; set; }
        public int MaxWavefronts { get; set; }
        public int ChartWindowSeconds { get; set; }
        public string DefaultLanguage { get; set; }

        public static SimulationSettings CreateDefault()
        {
            double temperature = 20;
            return new SimulationSettings
            {
                WorldWidthMeters = 200,
                WorldHeightMeters = 112.5,
                TemperatureCelsius = temperature,
                SpeedOfSound = 331.3 + 0.606 * temperature,
                SourceFrequency = 180,
                SourceSpeed = 25,
                ObserverSpeed = 0,
                MaxSourceSpeed = 60,
                MaxObserverSpeed = 15,
                SourceRadiusMeters = 4,
                ListenerRadiusMeters = 3,
                MaxWavefronts = 120,
                ChartWindowSeconds = 18,
                DefaultLanguage = "ar"
            };
        }
    }
}
