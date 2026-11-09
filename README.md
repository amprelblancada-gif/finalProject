# Purrfect

Purrfect is a responsive, client-side cat discovery app built with React. Browse pictures from The Cat API, search and sort the current results, open a cat's details, and save favorites to your browser. The app works without an API key; a free key adds breed names and richer breed details when the API provides them.

## Features

- Live cat images from The Cat API with loading skeletons, retryable errors, and API pagination.
- Keyword search, breed-information and breed filters, and sorting by breed name or image ID.
- Cat detail pages at `/cats/:id` and a favorites page at `/favorites`.
- Favorites persisted in `localStorage`.
- Responsive layout and accessible labels, buttons, and focus states.

## API

- [The Cat API](https://thecatapi.com/)
- [Image search endpoint](https://docs.thecatapi.com/)

The public image-search endpoint works without a key. The API requires a key for breed metadata and higher request limits. Register for a free key at [thecatapi.com/signup](https://thecatapi.com/signup).

## Getting started

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
```

Copy `.env.example` to `.env` and add your API key if you have one:

```dotenv
VITE_CAT_API_KEY=your_cat_api_key
```

The key is optional for basic image browsing. Restart the dev server after changing `.env`.

```bash
npm run dev
```

Open the local URL printed by Vite. To validate the app or preview a production build:

```bash
npm run lint
npm run build
npm run preview
```

Do not commit `.env`; Vite exposes `VITE_` variables in the client bundle. Use a public, rate-limited key for this client-side demo, and never put private credentials in it.

## Team contributions

Update this section with your pair's names and actual contributions before submission.

| Team member | Contributions |
| --- | --- |
| `[Member 1]` | React components, Cat API integration, and search/filtering |
| `[Member 2]` | Styling, routes, favorites persistence, and documentation |

## GitHub collaboration

Work on feature branches and submit pull requests for review; do not commit directly to `main`. Use descriptive conventional commit messages such as `feat: add cat search` and `docs: explain Cat API setup`.
