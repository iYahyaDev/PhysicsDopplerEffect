namespace DopplerLab.Models
{
    public class PhysicsResult
    {
        public double EmittedFrequency { get; set; }
        public double ObservedFrequency { get; set; }
        public double DopplerFactor { get; set; }
        public double Distance { get; set; }
        public double SourceSpeed { get; set; }
        public double ObserverSpeed { get; set; }
        public double SourceRadialTowardObserver { get; set; }
        public double ObserverClosingTowardSource { get; set; }
        public double RelativeRadialClosingSpeed { get; set; }
        public double SoundSpeed { get; set; }
        public double Wavelength { get; set; }
        public string State { get; set; }
        public bool IsValid { get; set; }
        public string Warning { get; set; }
    }
}
