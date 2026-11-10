import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import './App.css'

const API_URL = 'https://api.thecatapi.com/v1'
const API_KEY = import.meta.env.VITE_CAT_API_KEY
const API_PAGE_SIZE = 10
const FAVORITES_KEY = 'purrfect-favorites'
const FAVORITES_PAGE_SIZE = 9
const CAT_ID_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
const CAT_SPOTLIGHTS = [
  'A little pause for your day.',
  'A new favorite waiting to happen.',
  'A small dose of cozy for your screen.',
  'One more reason to smile today.',
  'A charming find for your collection.',
  'A fresh face to brighten your scroll.',
  'A lovely little moment to save.',
  'A reminder that cats make everything better.',
]

function getCatSpotlight(id) {
  const index = [...id].reduce((total, character) => total + character.charCodeAt(0), 0)
  return CAT_SPOTLIGHTS[index % CAT_SPOTLIGHTS.length]
}

function PawIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 40 40"
    >
      <ellipse cx="9.5" cy="14" rx="4" ry="5.5" transform="rotate(-24 9.5 14)" />
      <ellipse cx="18.2" cy="9.5" rx="4" ry="5.5" transform="rotate(-8 18.2 9.5)" />
      <ellipse cx="27.3" cy="11.5" rx="4" ry="5.5" transform="rotate(13 27.3 11.5)" />
      <ellipse cx="34" cy="18" rx="4" ry="5.5" transform="rotate(28 34 18)" />
      <path d="M21.5 18.5c-4.9 0-13.2 8.1-13.2 13.2 0 3.2 2.7 4.8 6.1 3.8 2.3-.7 4.1-1.6 7.1-1.6s4.8.9 7.1 1.6c3.4 1 6.1-.6 6.1-3.8 0-5.1-8.3-13.2-13.2-13.2Z" />
    </svg>
  )
}

function HeartIcon({ filled = false }) {
  return (
    <svg
      aria-hidden="true"
      className="heart-icon"
      fill={filled ? 'currentColor' : 'none'}
      viewBox="0 0 24 24"
    >
      <path
        d="M20.8 8.8c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4.2 4.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

function readFavorites() {
  try {
    const saved = window.localStorage.getItem(FAVORITES_KEY)
    if (!saved) return { favorites: [], error: '' }

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) {
      throw new Error('Saved favorites were not a list.')
    }

    return {
      favorites: parsed.filter((cat) => cat && typeof cat.id === 'string' && cat.url),
      error: '',
    }
  } catch (error) {
    console.error('Could not read saved favorites:', error)
    return {
      favorites: [],
      error: 'Your saved favorites could not be loaded. Check your browser storage settings.',
    }
  }
}

function useFavorites() {
  const [saved, setSaved] = useState(readFavorites)
  const { favorites, error: storageError } = saved
  const favoritesRef = useRef(favorites)

  function toggleFavorite(cat) {
    const current = favoritesRef.current
    const next = current.some((favorite) => favorite.id === cat.id)
      ? current.filter((favorite) => favorite.id !== cat.id)
      : [cat, ...current]

    favoritesRef.current = next
    setSaved({ favorites: next, error: '' })
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
    } catch (error) {
      console.error('Could not save favorites:', error)
      setSaved({
        favorites: next,
        error: 'Your browser could not save favorites. Check your storage settings.',
      })
    }
  }

  function isFavorite(id) {
    return favorites.some((favorite) => favorite.id === id)
  }

  return { favorites, isFavorite, storageError, toggleFavorite }
}

async function fetchCatPage(page, signal) {
  const query = new URLSearchParams({
    limit: String(API_PAGE_SIZE),
    page: String(page),
    order: 'DESC',
  })
  if (API_KEY) query.set('has_breeds', 'true')
  const headers = API_KEY ? { 'x-api-key': API_KEY } : undefined
  const response = await fetch(`${API_URL}/images/search?${query}`, { headers, signal })

  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? 'The Cat API rejected the request. Check your API key in the .env file.'
        : `The Cat API returned an error (${response.status}). Please try again.`,
    )
  }

  const data = await response.json()
  if (!Array.isArray(data)) {
    throw new Error('The Cat API returned an unexpected response. Please try again.')
  }

  return data.filter((cat) => cat && typeof cat.id === 'string' && cat.url)
}

function Header({ favoriteCount }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link aria-label="Purrfect home" className="brand" to="/">
          <span className="brand-mark"><PawIcon /></span>
          <span>purrfect<span className="brand-period">.</span></span>
        </Link>
        <nav aria-label="Main navigation" className="main-nav">
          <NavLink end to="/">Discover</NavLink>
          <NavLink className="favorites-link" to="/favorites">
            Favorites <span className="favorite-count">{favoriteCount}</span>
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

function CatCard({ cat, displayNumber, isFavorite, onToggleFavorite }) {
  const breed = cat.breeds?.[0]
  const spotlight = getCatSpotlight(cat.id)

  return (
    <article className="cat-card">
      <div className="cat-image-wrap">
        <Link
          aria-label={`View ${breed?.name || 'cat'} details`}
          className="cat-image-link"
          state={{ cat, displayNumber }}
          to={`/cats/${cat.id}`}
        >
          <img alt={breed ? `${breed.name} cat` : 'A cat'} loading="lazy" src={cat.url} />
        </Link>
        <button
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={isFavorite}
          className={`favorite-button${isFavorite ? ' is-favorite' : ''}`}
          onClick={() => onToggleFavorite(cat)}
          type="button"
        >
          <HeartIcon filled={isFavorite} />
        </button>
      </div>
      <div className="cat-card-copy">
        <div className="cat-title-row">
          <h3>{breed?.name || `Cat #${displayNumber}`}</h3>
          <span className="cat-id">#{displayNumber}</span>
        </div>
        <p>{breed?.origin || `${spotlight} Photo ID: ${cat.id}`}</p>
        <Link className="text-link" state={{ cat, displayNumber }} to={`/cats/${cat.id}`}>
          Meet this cat <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  )
}

function Pagination({ page, onPageChange, hasMore, pageCount }) {
  return (
    <nav aria-label="Cat results pages" className="pagination">
      <button
        className="pagination-button"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        <span aria-hidden="true">←</span> Previous
      </button>
      <span className="page-indicator">
        Page <strong>{page + 1}</strong>{pageCount ? ` of ${pageCount}` : ''}
      </span>
      <button
        className="pagination-button"
        disabled={!hasMore}
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        Next <span aria-hidden="true">→</span>
      </button>
    </nav>
  )
}

function CatCollection({
  cats,
  isFavorite,
  onToggleFavorite,
  emptyTitle,
  emptyMessage,
  remotePage = false,
  page = 0,
  onPageChange,
  hasMore = false,
}) {
  const [search, setSearch] = useState('')
  const [breedFilter, setBreedFilter] = useState('all')
  const [sortBy, setSortBy] = useState('id')
  const [localPage, setLocalPage] = useState(0)
  const isNumberSearch = /^\d+$/.test(search.trim())

  useEffect(() => {
    if (!remotePage || !/^\d+$/.test(search.trim())) return

    const requestedNumber = Number(search.trim())
    if (!Number.isSafeInteger(requestedNumber) || requestedNumber < 1) return

    const targetPage = Math.floor((requestedNumber - 1) / API_PAGE_SIZE)
    if (targetPage !== page) onPageChange(targetPage)
  }, [onPageChange, page, remotePage, search])

  const breeds = useMemo(
    () => [...new Set(cats.flatMap((cat) => cat.breeds?.map((breed) => breed.name) || []))].sort(),
    [cats],
  )
  const numberedCats = useMemo(() => {
    const orderedById = [...cats].sort((first, second) => CAT_ID_COLLATOR.compare(first.id, second.id))
    return orderedById.map((cat, index) => ({
      cat,
      number: (remotePage ? page * API_PAGE_SIZE : 0) + index + 1,
    }))
  }, [cats, page, remotePage])
  const orderedCats = useMemo(() => {
    const filtered = numberedCats.filter(({ cat }) => {
      const breed = cat.breeds?.[0]
      return (
        isNumberSearch ||
        breedFilter === 'all' ||
        (breedFilter === 'known' && Boolean(breed)) ||
        (breedFilter === 'unknown' && !breed) ||
        breed?.name === breedFilter
      )
    })

    return filtered.sort((first, second) => {
      if (sortBy === 'id') return CAT_ID_COLLATOR.compare(first.cat.id, second.cat.id)
      if (sortBy === 'id-desc') return CAT_ID_COLLATOR.compare(second.cat.id, first.cat.id)
      return (first.cat.breeds?.[0]?.name || first.cat.id).localeCompare(
        second.cat.breeds?.[0]?.name || second.cat.id,
      )
    })
  }, [breedFilter, isNumberSearch, numberedCats, sortBy])
  const filteredCats = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return orderedCats.filter(({ cat, number }) => {
      const breed = cat.breeds?.[0]
      if (isNumberSearch) return number === Number(normalizedSearch)

      const searchText = [
        breed?.name,
        breed?.origin,
        breed?.temperament,
        breed?.description,
      ].filter(Boolean).join(' ').toLowerCase()

      return !normalizedSearch || searchText.includes(normalizedSearch)
    })
  }, [isNumberSearch, orderedCats, search])

  const pageCount = Math.max(1, Math.ceil(filteredCats.length / FAVORITES_PAGE_SIZE))
  const selectedPage = remotePage ? page : Math.min(localPage, pageCount - 1)
  const visibleCats = remotePage
    ? filteredCats
    : filteredCats.slice(selectedPage * FAVORITES_PAGE_SIZE, (selectedPage + 1) * FAVORITES_PAGE_SIZE)

  return (
    <>
      <section aria-label="Find a cat" className="collection-tools" id="cat-collection-tools">
        <label className="search-field">
          <SearchIcon />
          <span className="visually-hidden">Search cats</span>
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by cat number, breed, or origin..."
            type="search"
            value={search}
          />
          {search && (
            <button aria-label="Clear search" className="clear-search" onClick={() => setSearch('')} type="button">
              ×
            </button>
          )}
        </label>
        <label className="select-field">
          <span>Breed</span>
          <select onChange={(event) => setBreedFilter(event.target.value)} value={breedFilter}>
            <option value="all">All cats</option>
            <option value="known">Breed info available</option>
            <option value="unknown">Breed info missing</option>
            {breeds.map((breed) => <option key={breed} value={breed}>{breed}</option>)}
          </select>
        </label>
        <label className="select-field sort-field">
          <span>Sort by</span>
          <select onChange={(event) => setSortBy(event.target.value)} value={sortBy}>
            <option value="id">Cat number (ascending)</option>
            <option value="id-desc">Cat number (descending)</option>
            <option value="breed">Name / breed</option>
          </select>
        </label>
      </section>

      {visibleCats.length > 0 ? (
        <div className="cat-grid">
          {visibleCats.map(({ cat, number }) => (
            <CatCard
              cat={cat}
              displayNumber={number}
              isFavorite={isFavorite(cat.id)}
              key={cat.id}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-paw"><PawIcon /></span>
          <h3>{emptyTitle}</h3>
          <p>{emptyMessage}</p>
        </div>
      )}

      {!isNumberSearch && (remotePage ? cats.length > 0 || page > 0 : filteredCats.length > 0) && (
        <Pagination
          hasMore={remotePage ? hasMore : selectedPage < pageCount - 1}
          onPageChange={remotePage ? onPageChange : setLocalPage}
          page={selectedPage}
          pageCount={remotePage ? undefined : pageCount}
        />
      )}
    </>
  )
}

function HomePage({ isFavorite, onToggleFavorite }) {
  const [cats, setCats] = useState([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCats() {
      setLoading(true)
      setError('')
      try {
        const results = await fetchCatPage(page, controller.signal)
        setCats(results)
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          console.error('Could not load cats:', loadError)
          setError(loadError.message || 'Something went wrong while loading cats.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadCats()
    return () => controller.abort()
  }, [page, retryCount])

  function changePage(nextPage) {
    setPage(nextPage)
    document.getElementById('cat-collection-tools')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <>
      <section className="hero-section">
        <div className="hero-content">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR DAILY DOSE OF CUTE</div>
          <h1>Good things<br />come with <span>whiskers.</span></h1>
          <p>Meet cats from around the world. Find a new favorite, learn a little, and let the purrs begin.</p>
          <a className="primary-button" href="#discover">
            Find your favorite <span aria-hidden="true">↓</span>
          </a>
          <div className="hero-note">
            <span className="hero-note-icon"><PawIcon /></span>
            <span>Fresh cats, fetched just for you.</span>
          </div>
        </div>
        <div aria-hidden="true" className="hero-art">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-sticker sticker-top">100% adorable</div>
          <div className="hero-photo">
            <img
              alt=""
              onError={(event) => { event.currentTarget.style.visibility = 'hidden' }}
              src={cats[0]?.url || 'https://cdn2.thecatapi.com/images/MTY3ODIyMQ.jpg'}
            />
          </div>
          <span className="hero-sparkle sparkle-one">✳</span>
          <span className="hero-sparkle sparkle-two">✦</span>
          <span className="hero-sparkle sparkle-three">✳</span>
          <div className="hero-sticker sticker-bottom"><PawIcon /> meet your new bestie</div>
        </div>
      </section>

      <main className="discover-section" id="discover">
        <div className="section-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-dot" /> THE CATWALK</div>
            <h2>Meet the <span>cuties.</span></h2>
            <p>A little scroll is good for the soul.</p>
          </div>
          <div className="live-badge"><span /> LIVE FROM THE CAT API</div>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <div><strong>We couldn’t fetch the cats.</strong><p>{error}</p></div>
            <button onClick={() => setRetryCount((count) => count + 1)} type="button">Try again</button>
          </div>
        )}

        {loading ? (
          <div aria-label="Loading cats" className="cat-grid loading-grid" role="status">
            {Array.from({ length: 6 }, (_, index) => (
              <div aria-hidden="true" className="skeleton-card" key={index}>
                <div className="skeleton-image" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            ))}
            <span className="visually-hidden">Finding some cats for you…</span>
          </div>
        ) : !error ? (
          <CatCollection
            cats={cats}
            emptyMessage="Try another search, change the filters, or explore a different page."
            emptyTitle="No cats found just yet."
            hasMore={cats.length === API_PAGE_SIZE}
            isFavorite={isFavorite}
            onPageChange={changePage}
            onToggleFavorite={onToggleFavorite}
            page={page}
            remotePage
          />
        ) : null}
        {!loading && !error && !API_KEY && (
          <p className="api-note">
            Want breed names and extra details? Add a free Cat API key to <code>.env</code>.
          </p>
        )}
      </main>
      <Footer />
    </>
  )
}

function FavoritesPage({ favorites, isFavorite, onToggleFavorite, storageError }) {
  return (
    <>
      <main className="inner-page">
        <div className="inner-page-heading">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR PERSONAL CAT CAFE</div>
          <h1>Your <span>favorites.</span></h1>
          <p>The cats you’ve saved, all in one cozy place.</p>
        </div>
        {storageError && <p className="storage-warning" role="alert">{storageError}</p>}
        <CatCollection
          cats={favorites}
          emptyMessage="Tap the little heart on any cat to keep them close."
          emptyTitle="No favorites (yet)."
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />
      </main>
      <Footer />
    </>
  )
}

function CatDetailsPage({ isFavorite, onToggleFavorite }) {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const initialCat = location.state?.cat?.id === id ? location.state.cat : null
  const displayNumber = initialCat ? location.state.displayNumber : null
  const [cat, setCat] = useState(initialCat)
  const [loading, setLoading] = useState(!initialCat)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (initialCat) return undefined

    const controller = new AbortController()
    async function loadCat() {
      setLoading(true)
      setError('')
      try {
        const headers = API_KEY ? { 'x-api-key': API_KEY } : undefined
        const response = await fetch(`${API_URL}/images/${encodeURIComponent(id)}`, {
          headers,
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'We could not find that cat. It may have wandered off.'
              : `The Cat API returned an error (${response.status}). Please try again.`,
          )
        }
        const result = await response.json()
        if (!result || typeof result.id !== 'string' || !result.url) {
          throw new Error('The Cat API returned an unexpected response. Please try again.')
        }
        setCat(result)
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          console.error('Could not load cat details:', loadError)
          setError(loadError.message || 'Something went wrong while loading this cat.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadCat()
    return () => controller.abort()
  }, [id, initialCat, retryCount])

  if (loading) {
    return <main className="detail-loading" role="status">Finding your cat…</main>
  }

  if (error || !cat) {
    return (
      <main className="detail-error">
        <div className="eyebrow"><span className="eyebrow-dot" /> CAT NOT FOUND</div>
        <h1>Oops, that cat is<br /><span>playing hide-and-seek.</span></h1>
        <p>{error || 'We could not find that cat.'}</p>
        {error && <button className="primary-button" onClick={() => setRetryCount((count) => count + 1)} type="button">Try again</button>}
        <button className="back-link" onClick={() => navigate('/')} type="button">← Back to discover</button>
      </main>
    )
  }

  const breed = cat.breeds?.[0]
  const favorite = isFavorite(cat.id)
  const spotlight = getCatSpotlight(cat.id)

  return (
    <>
      <main className="detail-page">
        <button className="back-link" onClick={() => navigate(-1)} type="button">← Back to cats</button>
        <div className="detail-layout">
          <div className="detail-image-wrap">
            <img alt={breed ? `${breed.name} cat` : 'A cat'} src={cat.url} />
            <span className="detail-image-label"><PawIcon /> A VERY GOOD CAT</span>
          </div>
          <section className="detail-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />{displayNumber ? ` CAT NO. ${displayNumber}` : ' CAT PROFILE'}
            </div>
            <h1>{breed?.name || `Cat #${displayNumber || cat.id}`}</h1>
            <p className="detail-lead">
              {breed?.description || `${spotlight} Save photo ${cat.id} to find this cat again whenever you need a smile.`}
            </p>
            <div className="detail-facts">
              {breed ? (
                <>
                  <div><span>ORIGIN</span><strong>{breed.origin || 'Not listed'}</strong></div>
                  <div><span>TEMPERAMENT</span><strong>{breed.temperament || 'Not listed'}</strong></div>
                </>
              ) : (
                <>
                  <div><span>PHOTO ID</span><strong>{cat.id}</strong></div>
                  <div><span>CAT NOTE</span><strong>{spotlight}</strong></div>
                </>
              )}
              {breed?.life_span && <div><span>LIFE SPAN</span><strong>{breed.life_span} years</strong></div>}
            </div>
            <button
              aria-pressed={favorite}
              className={`primary-button save-button${favorite ? ' saved' : ''}`}
              onClick={() => onToggleFavorite(cat)}
              type="button"
            >
              <HeartIcon filled={favorite} /> {favorite ? 'Saved to favorites' : 'Save this cutie'}
            </button>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <Link aria-label="Purrfect home" className="footer-brand" to="/"><PawIcon /> purrfect.</Link>
      <span>Made with love & a little bit of cat hair.</span>
      <a href="https://thecatapi.com/" rel="noreferrer" target="_blank">Powered by The Cat API ↗</a>
    </footer>
  )
}

function AppLayout() {
  const { favorites, isFavorite, storageError, toggleFavorite } = useFavorites()
  const location = useLocation()
  const [favoriteNotice, setFavoriteNotice] = useState('')
  const favoriteNoticeTimeout = useRef(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  useEffect(() => () => clearTimeout(favoriteNoticeTimeout.current), [])

  function handleToggleFavorite(cat) {
    const isAdding = !isFavorite(cat.id)
    toggleFavorite(cat)
    clearTimeout(favoriteNoticeTimeout.current)

    if (!isAdding) {
      setFavoriteNotice('')
      return
    }

    setFavoriteNotice('Added to your favorites')
    favoriteNoticeTimeout.current = setTimeout(() => setFavoriteNotice(''), 2500)
  }

  return (
    <div className="app-shell">
      <Header favoriteCount={favorites.length} />
      {favoriteNotice && <div className="favorite-toast" role="status">{favoriteNotice}</div>}
      {storageError && location.pathname !== '/favorites' && (
        <div className="storage-banner" role="alert">{storageError}</div>
      )}
      <Routes>
        <Route element={<HomePage isFavorite={isFavorite} onToggleFavorite={handleToggleFavorite} />} path="/" />
        <Route
          element={(
            <FavoritesPage
              favorites={favorites}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              storageError={storageError}
            />
          )}
          path="/favorites"
        />
        <Route element={<CatDetailsPage isFavorite={isFavorite} onToggleFavorite={handleToggleFavorite} />} path="/cats/:id" />
        <Route element={<main className="not-found"><h1>That page has <span>cat-astrophically</span> disappeared.</h1><Link className="primary-button" to="/">Back to discover</Link></main>} path="*" />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
