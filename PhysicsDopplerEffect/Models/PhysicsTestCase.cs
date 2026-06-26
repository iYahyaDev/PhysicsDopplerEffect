namespace DopplerLab.Models
{
    public class PhysicsTestCase
    {
        public int Id { get; set; }
        public string NameAr { get; set; }
        public string NameEn { get; set; }
        public Vector2D SourcePosition { get; set; }
        public Vector2D ObserverPosition { get; set; }
        public Vector2D SourceVelocity { get; set; }
        public Vector2D ObserverVelocity { get; set; }
        public double EmittedFrequency { get; set; }
        public double SoundSpeed { get; set; }
        public double ExpectedFrequency { get; set; }
        public double Tolerance { get; set; }
        public bool ExpectWarning { get; set; }
        public string NotesAr { get; set; }
        public string NotesEn { get; set; }
    }
}
