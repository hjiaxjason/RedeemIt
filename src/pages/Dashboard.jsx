import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CardTile from '../components/CardTile'
import './Dashboard.css'

const fakeCards = [
  { id: '1', retailer_name: 'Starbucks', balance: 25.00, original_balance: 50.00, expiration_date: '2025-03-01', category: 'food' },
  { id: '2', retailer_name: 'Amazon', balance: 50.00, original_balance: 50.00, expiration_date: '2025-12-01', category: 'electronics' },
  { id: '3', retailer_name: 'Hollister', balance: 15.00, original_balance: 75.00, expiration_date: '2025-02-28', category: 'clothing' },
  { id: '4', retailer_name: 'Target', balance: 100.00, original_balance: 100.00, expiration_date: '2026-01-01', category: 'other' },
  { id: '5', retailer_name: 'Apple', balance: 200.00, original_balance: 200.00, expiration_date: '2026-06-01', category: 'electronics' },
]

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

export default function Dashboard() {
  const [cards] = useState(fakeCards)
  const [activeIndex, setActiveIndex] = useState(0)
  const [sortBy, setSortBy] = useState('expiring')
  const [filterCategory, setFilterCategory] = useState('all')
  const [pendingCategory, setPendingCategory] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [flyCard, setFlyCard] = useState(null)
  const filterRef = useRef(null)
  const activeCardRef = useRef(null)
  const navigate = useNavigate()

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

  const totalBalance = cards.reduce((sum, c) => sum + c.balance, 0)
  const safeIndex = Math.min(activeIndex, filteredCards.length - 1)
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
      retailer_name: card.retailer_name,
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
              <div className="fly-card-retailer">{flyCard.retailer_name}</div>
              <div className="fly-card-balance">${parseFloat(flyCard.balance).toFixed(2)}</div>
              <div className="fly-card-exp">Exp: {flyCard.expiration_date}</div>
            </div>
            <div className="fly-card-back" style={{ background: flyCard.color }} />
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <div className="logo">RedeemIt</div>
        <button className="add-btn" onClick={() => navigate('/add')}>+ Add Card</button>      </div>

      <div className="total-section">
        <p className="total-label">Total Balance</p>
        <h1 className="total-amount">${totalBalance.toFixed(2)}</h1>
        <p className="card-count">{cards.length} gift cards</p>
      </div>

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
                    onExpand={(c) => handleExpand(c, getBrandColor(c.retailer_name))}
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
    </div>
  )
}