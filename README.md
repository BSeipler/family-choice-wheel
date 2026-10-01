# Family Choice Wheel

Friday movie night spinner. Data is stored in SQLite (local file by default, or Turso if you set `TURSO_DATABASE_URL`).

```bash
cd ~/Documents/family-choice-wheel
npm install
npm run dev
```

Open http://localhost:5173

1. **Family & Settings** — add people and colors, paste a free [TMDB API key](https://www.themoviedb.org/settings/api).
2. Each person searches for a **PG-13 or under** movie.
3. **Spin**. Next week, leftover movies stay; the winner picks a replacement.
4. October and December switch to Halloween / Christmas wheels automatically. Preview with `?season=halloween` or `?season=christmas`.

Movies picked in the last year cannot be nominated again. R / NC-17 / TV-MA cannot be added.
