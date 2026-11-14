# Arc Marumo Portfolio Clone

A complete local build and serving environment for the [Arc Marumo](https://www.arcmarumo.com) portfolio website clone.

## Available Routes & Pages
Every route is fully supported with both direct browser loading and Next.js client-side App Router RSC streaming:

- **`/`**: Home (3D VHS carousel with interactive retro CRT monitor)
- **`/profile`**: About Arc Marumo, awards, engagements, history, and contact links
- **`/news-watch`**: News Watch archive and recognitions
- **`/work/remyshoots`**: RemyShoots project detail
- **`/work/depthfirst`**: DepthFirst project detail
- **`/work/makereign-academy`**: MakeReign Academy project detail
- **`/work/refresh`**: Refresh project detail
- **`/work/scza`**: SCZA project detail
- **`/work/rumor`**: Rumor project detail
- **`/work/pollen`**: Pollen project detail

## Getting Started

### 1. Build
To compile/bundle the production distribution into `dist/`:
```bash
npm run build
```

### 2. Run
To start the local development/production server:
```bash
npm start
# or
npm run dev
```
The application will be accessible at [http://localhost:3000](http://localhost:3000).

### 3. Run Automated Tests
```bash
npm test
```
