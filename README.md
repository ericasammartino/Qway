# Qway

Static landing page for Qway.

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static file server:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Assets

The stylesheet expects these font files at the repository root:

- `HV-Fitzgerald-Regular.otf`
- `HV-Fitzgerald-Italic.otf`
- `HV-Fitzgerald-Bold.otf`
- `HV-Fitzgerald-Bold-Italic.otf`

Until those files are added, browsers will fall back to the generic serif font declared in `styles.css`.
