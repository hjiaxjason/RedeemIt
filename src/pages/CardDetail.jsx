import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './CardDetail.css'

const fakeCards = [
  { id: '1', retailer_name: 'Starbucks', balance: 25.00, original_balance: 50.00, expiration_date: '2025-03-01', category: 'food', card_number: '1234567890123456', pin: '1234', transactions: [
    { id: 't1', amount_spent: 10.00, balance_after: 40.00, created_at: '2025-01-15' },
    { id: 't2', amount_spent: 15.00, balance_after: 25.00, created_at: '2025-02-01' },
  ]},
  { id: '2', retailer_name: 'Amazon', balance: 50.00, original_balance: 50.00, expiration_date: '2025-12-01', category: 'electronics', card_number: '9876543210987654', pin: '5678', transactions: [] },
  { id: '3', retailer_name: 'Hollister', balance: 15.00, original_balance: 75.00, expiration_date: '2025-02-28', category: 'clothing', card_number: '1111222233334444', pin: '9999', transactions: [
    { id: 't3', amount_spent: 60.00, balance_after: 15.00, created_at: '2025-01-10' },
  ]},
  { id: '4', retailer_name: 'Target', balance: 100.00, original_balance: 100.00, expiration_date: '2026-01-01', category: 'other', card_number: '5555666677778888', pin: '0000', transactions: [] },
  { id: '5', retailer_name: 'Apple', balance: 200.00, original_balance: 200.00, expiration_date: '2026-06-01', category: 'electronics', card_number: '9999000011112222', pin: '4321', transactions: [] },
]

const BRAND_COLORS = {
  starbucks: 'linear-gradient(135deg, #1a3a2a 0%, #0d2018 100%)',
  amazon: 'linear-gradient(135deg, #2a1f0a 0%, #1a1205 100%)',
  hollister: 'linear-gradient(135deg, #0a1628 0%, #050e1a 100%)',
  target: 'linear-gradient(135deg, #2a0a0a 0%, #1a0505 100%)',
  apple: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
  default: 'linear-gradient(135deg, #1a1a3a 0%, #0d0d2b 100%)',
}

function getBrandColor(name) {
  return BRAND_COLORS[name?.toLowerCase().trim()] || BRAND_COLORS.default
}

export default function CardDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const card = fakeCards.find(c => c.id === id)
  const [showPin, setShowPin] = useState(false)
  const [showNumber, setShowNumber] = useState(false)
  const [copied, setCopied] = useState(null)
  const [amount, setAmount] = useState('')
  const [logged, setLogged] = useState(false)

  if (!card) return <div className="detail-error">Card not found</div>

  const color = getBrandColor(card.retailer_name)
  const percentLeft = (card.balance / card.original_balance) * 100

  function copy(text, field) {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleSpend() {
    if (!amount) return
    setLogged(true)
    setTimeout(() => setLogged(false), 2000)
    setAmount('')
  }

  return (
    <div className="detail-page">
      <div className="detail-hero" style={{ background: color }}>
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="detail-hero-content">
          <div className="detail-hero-top">
            <span className="detail-retailer">{card.retailer_name}</span>
            <span className="detail-chip">◈</span>
          </div>
          <div className="detail-hero-balance">${parseFloat(card.balance).toFixed(2)}</div>
          <div className="detail-hero-sub">remaining of ${parseFloat(card.original_balance).toFixed(2)}</div>
          <div className="detail-progress-bar">
            <div className="detail-progress-fill" style={{ width: `${percentLeft}%` }} />
          </div>
          <div className="detail-hero-bottom">
            <span className="detail-category">{card.category}</span>
            <span>Expires {card.expiration_date}</span>
          </div>
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-section">
          <h3 className="section-title">Card Details</h3>

          <div className="detail-field">
            <span className="field-label">Card Number</span>
            <div className="field-row">
              <span className="field-value">
                {showNumber
                  ? card.card_number.match(/.{1,4}/g).join(' ')
                  : '•••• •••• •••• ' + card.card_number.slice(-4)}
              </span>
              <div className="field-btns">
                <button className="field-btn" onClick={() => setShowNumber(s => !s)}>
                  {showNumber ? 'Hide' : 'Show'}
                </button>
                <button className="field-btn" onClick={() => copy(card.card_number, 'number')}>
                  {copied === 'number' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="detail-field">
            <span className="field-label">PIN</span>
            <div className="field-row">
              <span className="field-value">{showPin ? card.pin : '••••'}</span>
              <div className="field-btns">
                <button className="field-btn" onClick={() => setShowPin(s => !s)}>
                  {showPin ? 'Hide' : 'Show'}
                </button>
                <button className="field-btn" onClick={() => copy(card.pin, 'pin')}>
                  {copied === 'pin' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="detail-field">
            <span className="field-label">Category</span>
            <span className="field-value">{card.category}</span>
          </div>
        </div>

        <div className="detail-section">
          <h3 className="section-title">Log a Spend</h3>
          <div className="spend-row">
            <input
              className="spend-input"
              type="number"
              placeholder="Amount spent ($)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <button className="spend-btn" onClick={handleSpend}>
              {logged ? '✓ Logged' : 'Log Spend'}
            </button>
          </div>
        </div>

        <div className="detail-section">
          <h3 className="section-title">Transaction History</h3>
          {card.transactions.length === 0 ? (
            <p className="no-transactions">No transactions yet</p>
          ) : (
            <div className="transactions-list">
              {card.transactions.map(t => (
                <div key={t.id} className="transaction-row">
                  <div>
                    <span className="transaction-amount">-${t.amount_spent.toFixed(2)}</span>
                    <span className="transaction-date">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="transaction-balance">${t.balance_after.toFixed(2)} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}