using System;

namespace DopplerLab.Models
{
    public class Vector2D
    {
        public Vector2D()
        {
        }

        public Vector2D(double x, double y)
        {
            X = x;
            Y = y;
        }

        public double X { get; set; }
        public double Y { get; set; }

        public static Vector2D Add(Vector2D a, Vector2D b)
        {
            return new Vector2D(a.X + b.X, a.Y + b.Y);
        }

        public static Vector2D Subtract(Vector2D a, Vector2D b)
        {
            return new Vector2D(a.X - b.X, a.Y - b.Y);
        }

        public static Vector2D Multiply(Vector2D a, double scalar)
        {
            return new Vector2D(a.X * scalar, a.Y * scalar);
        }

        public static double Dot(Vector2D a, Vector2D b)
        {
            return a.X * b.X + a.Y * b.Y;
        }

        public static double Magnitude(Vector2D a)
        {
            return Math.Sqrt(a.X * a.X + a.Y * a.Y);
        }

        public static Vector2D Normalize(Vector2D a)
        {
            double magnitude = Magnitude(a);
            if (magnitude < 1e-9)
            {
                return new Vector2D(1, 0);
            }

            return new Vector2D(a.X / magnitude, a.Y / magnitude);
        }
    }
}
