import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CardTile from '../components/CardTile'
import { logout, getCards, getSummary } from '../lib/api'
import './Dashboard.css'

const SORT_OPTIONS = [
  { label: 'Sort by: Expiring Soon', value: 'expiring' },
  { label: 'Sort by: Highest Balance', value: 'balance_desc' },
  { label: 'Sort by: Lowest Balance', value: 'balance_asc' },
]

const CATEGORIES = ['all', 'clothing', 'food', 'electronics', 'entertainment', 'other']

const BRAND_COLORS = {
  starbucks: '#00704A',
  amazon: '#FF9900',
  hollister: '#1B3A6B',
  target: '#CC0000',
  apple: '#1d1d1f',
  default: '#FF6B6B',
}

function getBrandColor(name) {
  return BRAND_COLORS[name?.toLowerCase().trim()] || BRAND_COLORS.default
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [cards, setCards] = useState([])
  const [summary, setSummary] = useState({ total_balance: 0, card_count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [sortBy, setSortBy] = useState('expiring')
  const [filterCategory, setFilterCategory] = useState(searchParams.get('category') || 'all')
  const [pendingCategory, setPendingCategory] = useState(searchParams.get('category') || 'all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [flyCard, setFlyCard] = useState(null)
  const filterRef = useRef(null)
  const activeCardRef = useRef(null)
  const navigate = useNavigate()

  // Fetch cards and summary on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const [cardsData, summaryData] = await Promise.all([
          getCards(),
          getSummary()
        ])
        if (cardsData.detail) {
          throw new Error(cardsData.detail)
        }
        setCards(cardsData)
        setSummary(summaryData)
      } catch (err) {
        setError(err.message || 'Failed to load cards')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Update URL when category filter changes
  useEffect(() => {
    if (filterCategory === 'all') {
      searchParams.delete('category')
    } else {
      searchParams.set('category', filterCategory)
    }
    setSearchParams(searchParams, { replace: true })
  }, [filterCategory, searchParams, setSearchParams])

  useEffect(() => {
    function handleClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredCards = useMemo(() => {
    let result = [...cards]
    if (filterCategory !== 'all') {
      result = result.filter(c => c.category === filterCategory)
    }
    if (sortBy === 'expiring') {
      result.sort((a, b) => new Date(a.expiration_date) - new Date(b.expiration_date))
    } else if (sortBy === 'balance_desc') {
      result.sort((a, b) => b.balance - a.balance)
    } else if (sortBy === 'balance_asc') {
      result.sort((a, b) => a.balance - b.balance)
    }
    return result
  }, [cards, sortBy, filterCategory])

  const safeIndex = Math.min(activeIndex, Math.max(filteredCards.length - 1, 0))
  const prev = () => setActiveIndex(i => (i - 1 + filteredCards.length) % filteredCards.length)
  const next = () => setActiveIndex(i => (i + 1) % filteredCards.length)

  function handleConfirm() {
    setFilterCategory(pendingCategory)
    setActiveIndex(0)
    setFilterOpen(false)
  }

  function handleExpand(card, color) {
    const rect = activeCardRef.current?.getBoundingClientRect()
    if (!rect) { navigate(`/card/${card.id}`); return }

    setFlyCard({
      id: card.id,
      color,
      brand: card.brand,
      balance: card.balance,
      expiration_date: card.expiration_date,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    })

    setTimeout(() => navigate(`/card/${card.id}`), 1100)
  }

  return (
    <div className="dashboard">

      {flyCard && (
        <div
          className="fly-card-scene"
          style={{
            '--start-top': `${flyCard.top}px`,
            '--start-left': `${flyCard.left}px`,
            '--start-width': `${flyCard.width}px`,
            '--start-height': `${flyCard.height}px`,
          }}
        >
          <div className="fly-card-inner">
            <div className="fly-card-front" style={{ background: flyCard.color }}>
              <div className="fly-card-retailer">{flyCard.brand}</div>
              <div className="fly-card-balance">${parseFloat(flyCard.balance).toFixed(2)}</div>
              <div className="fly-card-exp">Exp: {formatDate(flyCard.expiration_date)}</div>
            </div>
            <div className="fly-card-back" style={{ background: flyCard.color }} />
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <div className="logo">RedeemIt</div>
        <div className="header-actions">
          <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>
            Logout
          </button>
          <button className="add-btn" onClick={() => navigate('/add')}>+ Add Card</button>
        </div>
      </div>

      <div className="total-section">
        <p className="total-label">Total Balance</p>
        <h1 className="total-amount">${(summary.total_balance || 0).toFixed(2)}</h1>
        <p className="card-count">{summary.card_count || 0} gift cards</p>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your cards...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
      <div className="controls">
        <div className="filter-wrapper" ref={filterRef}>
          <button
            className={`filter-btn ${filterOpen ? 'open' : ''}`}
            onClick={() => { setFilterOpen(o => !o); setPendingCategory(filterCategory) }}
          >
            Filters {filterCategory !== 'all' ? `· ${filterCategory}` : ''} ▾
          </button>

          {filterOpen && (
            <div className="filter-dropdown">
              <p>Category</p>
              <div className="filter-options">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`filter-option ${pendingCategory === cat ? 'selected' : ''}`}
                    onClick={() => setPendingCategory(cat)}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
              <button className="filter-confirm" onClick={handleConfirm}>Confirm</button>
            </div>
          )}
        </div>

        <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {filteredCards.length === 0 ? (
        <div className="empty-state">No cards in this category</div>
      ) : (
        <div className="carousel">
          <button className="arrow" onClick={prev}>&#8592;</button>
          <div className="carousel-track">
            {filteredCards.map((card, i) => {
              const offset = i - safeIndex
              const isActive = offset === 0
              return (
                <div
                  key={card.id}
                  ref={isActive ? activeCardRef : null}
                  className={`carousel-item ${isActive ? 'active' : ''} ${Math.abs(offset) > 1 ? 'hidden' : ''}`}
                  style={{ '--offset': offset }}
                  onClick={() => !isActive && setActiveIndex(i)}
                >
                  <CardTile
                    card={card}
                    isActive={isActive}
                    onExpand={(c) => handleExpand(c, getBrandColor(c.brand))}
                  />
                </div>
              )
            })}
          </div>
          <button className="arrow" onClick={next}>&#8594;</button>
        </div>
      )}

      <div className="dots">
        {filteredCards.map((_, i) => (
          <span
            key={i}
            className={`dot ${i === safeIndex ? 'dot-active' : ''}`}
            onClick={() => setActiveIndex(i)}
          />
        ))}
      </div>
        </>
      )}
    </div>
  )
}