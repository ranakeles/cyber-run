# Cyber Run (Siber Koşu)

A touchscreen kiosk game that teaches children to recognise phishing emails.
Built for Turkish Technology.

The character runs through the streets of Istanbul, dodges obstacles and collects
floating question tokens. Each token opens an email: **is it SAFE or SUSPICIOUS?**
A correct call earns points, a wrong one costs a life.

The game itself is in Turkish — it is played by Turkish-speaking children.

## Running the game

**On a Mac:** double-click `OYUNU BASLAT.command`.

Opening `index.html` directly does **not** work. The game reads image pixels
(background removal, sprite measurement, scrolling road texture) and browsers
block that over `file://`. The launcher starts a small local server
(`sunucu.py`) to get around it.

## Building the kiosk version

```bash
python3 paketle.py ~/Desktop/siber-kosu
```

This inlines every image, the CSS and the JS into a single HTML file
(`~/Desktop/SIBER KOSU (tek dosya).html`). That file runs by double-clicking it —
no server, no Python, works on Windows too. It has to be rebuilt whenever the
game changes.

## Layout

| File | Purpose |
|---|---|
| `index.html` | Screen skeleton (start, game, question, end) |
| `style.css` | All styling |
| `script.js` | Game engine: perspective rendering, obstacles, questions, lives and score |
| `assets/` | Every image |
| `sunucu.py` | Local game server (disables caching) |
| `paketle.py` | Builds the single-file distribution |

## Notes

- The stage is locked to a 9:16 portrait ratio, designed for the kiosk screen.
- Artwork is AI-generated and **nothing is drawn in code** — the code only
  places, scales and animates the supplied images.
- Source comments are written in Turkish, matching the team working on it.
