# Ethanol Blend Calculator (Explorer ST)

A small, phone-friendly calculator that tells you how much E85 and Premium (E10) to add to hit a target ethanol blend (E30 or E50) in a Ford Explorer ST.

Latest Deployment available here: https://xaviervilla.github.io/ethanol_calc/

Click Share and “Add to Home Screen” to save the site as a web app on your phone. 

## How it works

1. Set your **Fuel Level** (%) and **Current Blend** (%) using the drums.
2. Pick a **Target Blend** (E30 or E50) with the toggle in the top-right.
3. Adjust the **E85 Ethanol %** if your E85 isn't 85%.
4. Read the **Result**: E85 to Add, Pump Gas to Add, and the resulting mix.

The drums spin with a flick — higher numbers are up. Tap a value to jump to it, or use the arrow keys.

## It remembers your settings

Everything you enter is saved automatically in your browser (localStorage). Your fuel level, current blend, target, and E85 percentage carry over between visits, refreshes, and phone reboots. No account or login needed.

## Assumptions

- **Vehicle:** Ford Explorer ST (fixed 20.2 gallon tank)
- **Pump gas ethanol content:** 10% (assumed, not adjustable)
- **Targets:** E30 or E50 only
- **Units:** gallons (no liters)
- All inputs are whole numbers

## Run it locally

No build step. Just open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8080
```

Then visit http://localhost:8080.

## Hosting on GitHub Pages

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that deploys the site automatically. To enable it:

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Source** and select **GitHub Actions**.
3. Push to `main` (or run the workflow manually) — the site will be published.

## Credits

Calculation logic ported from the TunePlus ethanol mix tool. DSEG7 font © keshikan, SIL Open Font License 1.1.
