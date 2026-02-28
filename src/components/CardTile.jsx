import './CardTile.css'
import { useNavigate } from 'react-router-dom'

const BRAND_COLORS = {
  starbucks: { bg: 'linear-gradient(135deg, #1a3a2a 0%, #0d2018 100%)', text: '#fff', accent: '#4a9a6a' },
  amazon: { bg: 'linear-gradient(135deg, #2a1f0a 0%, #1a1205 100%)', text: '#fff', accent: '#c8860a' },
  hollister: { bg: 'linear-gradient(135deg, #0a1628 0%, #050e1a 100%)', text: '#fff', accent: '#2a4a7a' },
  target: { bg: 'linear-gradient(135deg, #2a0a0a 0%, #1a0505 100%)', text: '#fff', accent: '#aa2020' },
  apple: { bg: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)', text: '#fff', accent: '#444' },
  nike: { bg: 'linear-gradient(135deg, #111 0%, #000 100%)', text: '#fff', accent: '#333' },
  sephora: { bg: 'linear-gradient(135deg, #2a0a1a 0%, #1a0510 100%)', text: '#fff', accent: '#aa1a5a' },
  default: { bg: 'linear-gradient(135deg, #1a1a3a 0%, #0d0d2b 100%)', text: '#fff', accent: '#505081' },
}

function getBrandColors(name) {
  const key = name?.toLowerCase().trim()
  return BRAND_COLORS[key] || BRAND_COLORS.default
}

function isExpiringSoon(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) - new Date() < 7 * 24 * 60 * 60 * 1000
}

export default function CardTile({ card, isActive, onExpand }) {
  const colors = getBrandColors(card.retailer_name)
  const expiring = isExpiringSoon(card.expiration_date)
  const percentLeft = card.original_balance > 0
    ? (card.balance / card.original_balance) * 100
    : 100

  return (
    <div
      className={`card-tile ${isActive ? 'card-active' : ''} ${expiring ? 'card-expiring' : ''}`}
      style={{ background: colors.bg, '--text': colors.text, '--accent': colors.accent }}
      onClick={() => isActive && onExpand && onExpand(card)}
    >
      {expiring && <div className="expiry-badge">⚠ Expiring Soon</div>}

      <div className="card-top">
        <span className="card-retailer">{card.retailer_name}</span>
        <span className="card-chip">◈</span>
      </div>

      <div className="card-middle">
        <span className="card-balance">${parseFloat(card.balance).toFixed(2)}</span>
        <span className="card-balance-label">remaining</span>
      </div>

      <div className="card-bottom">
        <div className="card-progress-bar">
          <div className="card-progress-fill" style={{ width: `${percentLeft}%` }} />
        </div>
        <div className="card-meta">
          <span>of ${parseFloat(card.original_balance).toFixed(2)}</span>
          <span>Exp: {card.expiration_date}</span>
        </div>
      </div>
    </div>
  )
}