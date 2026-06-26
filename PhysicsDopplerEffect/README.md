# Doppler Lab

Doppler Lab is an offline ASP.NET Web Forms educational website for presenting and exploring the Doppler effect in a classroom physics lesson. It uses C# for page setup, configuration, localization, quiz data, presentation storage, and reference physics checks, while the real-time simulation, audio, charts, pointer interaction, and animation run in client-side JavaScript.

## Technologies

- C# and ASP.NET Web Forms
- .NET Framework 4.7.2, compatible with .NET Framework 4.8
- `.aspx` pages with `.aspx.cs` code-behind
- HTML5, CSS3, vanilla JavaScript
- HTML Canvas for simulation, charts, and diagrams
- Web Audio API for generated tone and motorcycle-engine audio
- Local SVG and supplied transparent PNG assets

No ASP.NET Core, MVC, Razor Pages, Blazor, React, Angular, Vue, Node.js, TypeScript, CDN libraries, online fonts, external images, or prerecorded audio are used.

## Visual Studio 2022 Setup

1. Open `DopplerLab.sln` from the repository root.
2. Ensure the target framework is .NET Framework 4.7.2 or retarget to .NET Framework 4.8 if needed.
3. Run with IIS Express.
4. Start at `Default.aspx` or directly open `Lab.aspx`.

The older `PhysicsDopplerEffect.sln` is the original Web Site shell. The production project requested by this build is `DopplerLab.sln` with `PhysicsDopplerEffect\DopplerLab.csproj`.

## Folder Structure

- `Default.aspx`: entry dashboard.
- `Lab.aspx`: main motorcycle/listener simulation.
- `Applications.aspx`: police radar, medical ultrasound, astronomy, and weather radar modules.
- `Compare.aspx`: sound versus light comparison.
- `Quiz.aspx`: local quiz using C# question data.
- `Presentations.aspx`: presentation manager for creating, editing, duplicating, exporting, importing, and presenting decks.
- `PresentationEditor.aspx`: visual editor for slides, blocks, media, draft saving, publishing, backups, and preview.
- `Presenter.aspx`: clean 16:9 full-screen presentation player.
- `PhysicsValidation.aspx`: C# and JavaScript reference physics tests.
- `Models`: settings, vector, quiz, and validation models.
- `Services`: localization, quiz repository, physics calculator, presentation repository, export/import, validation, and JSON boot payloads.
- `Scripts`: simulation engine, audio, renderer, charts, UI, application modules, quiz, presentation runtime/editor/components, validation, and localization.
- `Content`: main CSS plus presentation runtime/editor CSS.
- `Assets`: original offline SVG illustrations plus supplied transparent motorcycle and listener sprites.

## Physics Assumptions

The main lab models classical acoustics in stationary homogeneous air with no wind. Source and observer velocities are relative to the air. Normal mode is subsonic and does not simulate shock waves, Mach cones, or sonic booms.

The sound speed is computed from dry-air temperature by:

```text
c = 331.3 + 0.606 T
```

where `T` is in degrees Celsius. A manual sound-speed override is clamped from 300 to 360 m/s.

## Core Acoustic Equation

The lab uses the vector Doppler formula:

```text
fObserved = fEmit * (c - dot(vo, n)) / (c - dot(vs, n))
```

where `n` is the unit vector from source to observer. If the source moves toward the observer, `dot(vs, n)` is positive and the denominator becomes smaller. If the observer moves toward the source, `dot(vo, n)` is negative and the numerator becomes larger.

Only the radial component matters for the first-order pitch shift. Total speed by itself is not enough. Pure tangential motion at an instant produces approximately no first-order Doppler shift.

## Distance, Loudness, and Frequency

Distance affects received amplitude and loudness, not pitch. The lab approximates sound pressure amplitude as proportional to `1/r`, with safe gain limits. Intensity is approximately proportional to `1/r^2`.

The controls separate:

- Doppler pitch
- Distance-based loudness
- Stereo panning

This lets a presenter demonstrate that moving closer can make sound louder without making pitch higher unless radial motion is present.

## Wavefront Visualization

A 700 Hz source emits too many crests per second to draw individually. The lab draws a representative subset and labels the stride. Physical frequency and wavelength calculations still use the true emitted frequency.

Each drawn wavefront stores:

- emission origin
- emission time
- representative stride

It then expands from the historical emission origin by:

```text
radius = c * (currentTime - emissionTime)
```

Wavefronts are never visually attached to the moving motorcycle after emission.

## Other Doppler Formulas

Police radar uses reflected electromagnetic waves, not the air-sound source formula. For low road speeds:

```text
deltaF ≈ 2 * fTransmit * vRadial / cLight
```

The factor of 2 appears because the wave shifts once when the moving car receives it and again when it reflects back.

Medical Doppler ultrasound uses sound in tissue:

```text
deltaF = 2 * f0 * vBlood * cos(theta) / cTissue
cTissue ≈ 1540 m/s
```

The factor of 2 comes from reflection, and the angle factor explains weak readings near 90 degrees.

Astronomical Doppler shift uses relativistic light, not the acoustic formula:

```text
fObserved / fEmitted = sqrt((1 - beta) / (1 + beta))
lambdaObserved / lambdaEmitted = sqrt((1 + beta) / (1 - beta))
```

for a receding source with `beta = v / cLight`.

## Browser Audio

Browsers block autoplay. Press `Start Audio` before sound begins. The app creates oscillator nodes once per listening voice and smoothly schedules frequency and gain changes. It does not restart oscillators every frame and does not use prerecorded motorcycle audio.

## Presentation Workflow

- Open `Presentations.aspx` to manage decks.
- Open `PresentationEditor.aspx?id=doppler-main` to edit the default deck.
- Open `Presenter.aspx?id=doppler-main` to run the published presentation.
- Use fullscreen presenter mode for readable values.
- The advanced lab remains available at `Lab.aspx`.

## Testing

Open `PhysicsValidation.aspx` to compare server-side C# reference calculations with the JavaScript physics engine. The tests cover stationary motion, approaching and receding source motion, observer motion, tangential motion, distance-only changes, opposite listeners, and near-sonic invalid denominator clamping.

For browser checks:

1. Open `Lab.aspx`.
2. Drag the motorcycle toward Listener A: observed pitch should rise.
3. Drag it away: observed pitch should fall.
4. Move tangentially: total speed can be high while the Doppler factor stays near 1.
5. Run Automatic Linear Pass: the graph and pitch change continuously through closest approach.
6. Run Automatic Circular Motion with the listener at the center: distance stays nearly constant and radial velocity stays near zero while total speed is nonzero.
7. Enable Listener B and compare two listener frequency cards.
8. Press Freeze and Analyze to verify substituted equation values.

## Known Model Limitations

- No wind or turbulent medium.
- No shock waves or sonic booms.
- No absorption, reflection from buildings, or echo modeling.
- Amplitude uses a simple safe `1/r` approximation.
- Retarded-time source sampling is bounded by a short motion history for responsiveness.
- Spectral colors in astronomy are illustrative when wavelengths leave the visible range.

## Four-Person Presentation Division

### Student 1

- Introduction to waves, frequency, wavelength, and pitch.
- Story of the passing motorcycle.
- Audience prediction.

### Student 2

- Main simulation.
- Wavefront compression and expansion.
- Radial versus tangential velocity.
- Equation and freeze analysis.

### Student 3

- Police radar.
- Medical Doppler ultrasound.
- Numerical examples.

### Student 4

- Astronomy redshift/blueshift.
- Sound versus light comparison.
- Final challenge, quiz, and conclusion.

The responsibilities are balanced so each student has a conceptual explanation, an interactive component, and a short conclusion.
