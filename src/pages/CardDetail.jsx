import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCard, getTransactions, logSpend, deleteCard } from '../lib/api'
import './CardDetail.css'

const BRAND_COLORS = {
  starbucks: '#00704A',
  amazon: '#FF9900',
  hollister: '#1B3A6B',
  target: '#CC0000',
  apple: '#1d1d1f',
  default: 'linear-gradient(135deg, #1e3a5f, #2c5282)',
}

function getBrandColor(name) {
  return BRAND_COLORS[name?.toLowerCase().trim()] || BRAND_COLORS.default
}

export default function CardDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // Card and transactions state
  const [card, setCard] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // UI state
  const [showPin, setShowPin] = useState(false)
  const [showNumber, setShowNumber] = useState(false)
  const [copied, setCopied] = useState(null)
  const [amount, setAmount] = useState('')
  const [spendLoading, setSpendLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  // Toast state
  const [toast, setToast] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Fetch card data
  useEffect(() => {
    async function fetchCard() {
      setLoading(true)
      setError(null)
      try {
        const data = await getCard(id)
        if (data.detail) {
          setError(data.detail)
        } else {
          setCard(data)
        }
      } catch {
        setError('Failed to load card')
      } finally {
        setLoading(false)
      }
    }
    fetchCard()
  }, [id])

  // Fetch transactions
  useEffect(() => {
    async function fetchTransactions() {
      try {
        const data = await getTransactions(id)
        if (Array.isArray(data)) {
          setTransactions(data)
        }
      } catch (err) {
        console.error('Failed to load transactions:', err)
      }
    }
    if (id) fetchTransactions()
  }, [id])

  // Handle spend logging
  async function handleSpend() {
    if (!amount || parseFloat(amount) <= 0) return
    setSpendLoading(true)
    try {
      const result = await logSpend(id, parseFloat(amount))
      if (result.detail) {
        showToast(result.detail, 'error')
      } else {
        showToast('Spend logged successfully!')
        // Refresh card and transactions
        const [updatedCard, updatedTransactions] = await Promise.all([
          getCard(id),
          getTransactions(id)
        ])
        if (!updatedCard.detail) setCard(updatedCard)
        if (Array.isArray(updatedTransactions)) setTransactions(updatedTransactions)
        setAmount('')
      }
    } catch {
      showToast('Failed to log spend', 'error')
    } finally {
      setSpendLoading(false)
    }
  }

  // Handle card deletion
  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const result = await deleteCard(id)
      if (result.detail && result.detail !== 'Gift card deleted') {
        showToast(result.detail, 'error')
        setShowDeleteModal(false)
      } else {
        showToast('Card deleted successfully!')
        setTimeout(() => navigate('/'), 500)
      }
    } catch {
      showToast('Failed to delete card', 'error')
      setShowDeleteModal(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-loading">Loading card...</div>
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="detail-page">
        <div className="detail-error">
          <p>{error || 'Card not found'}</p>
          <button className="back-link" onClick={() => navigate('/')}>← Back to Dashboard</button>
        </div>
      </div>
    )
  }

  const color = getBrandColor(card.retailer_name)
  const percentLeft = (card.balance / card.original_balance) * 100

  function copy(text, field) {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="detail-page">

      {/* hero card at top */}
      <div className="detail-hero" style={{ background: color }}>
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="detail-hero-content">
          <div className="detail-hero-top">
            <span className="detail-retailer">{card.retailer_name}</span>
            <span className="detail-chip">💳</span>
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

      {/* card info */}
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
                  {copied === 'number' ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="detail-field">
            <span className="field-label">PIN</span>
            <div className="field-row">
              <span className="field-value">
                {showPin ? card.pin : '••••'}
              </span>
              <div className="field-btns">
                <button className="field-btn" onClick={() => setShowPin(s => !s)}>
                  {showPin ? 'Hide' : 'Show'}
                </button>
                <button className="field-btn" onClick={() => copy(card.pin, 'pin')}>
                  {copied === 'pin' ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* log a spend */}
        <div className="detail-section">
          <h3 className="section-title">Log a Spend</h3>
          <div className="spend-row">
            <input
              className="spend-input"
              type="number"
              placeholder="Amount spent ($)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={spendLoading}
            />
            <button 
              className="spend-btn" 
              style={{ background: color }} 
              onClick={handleSpend}
              disabled={spendLoading || !amount}
            >
              {spendLoading ? 'Logging...' : 'Log Spend'}
            </button>
          </div>
        </div>

        {/* transaction history */}
        <div className="detail-section">
          <h3 className="section-title">Transaction History</h3>
          {transactions.length === 0 ? (
            <p className="no-transactions">No transactions yet</p>
          ) : (
            <div className="transactions-list">
              {transactions.map(t => (
                <div key={t.id} className="transaction-row">
                  <div>
                    <span className="transaction-amount">-${parseFloat(t.amount_spent).toFixed(2)}</span>
                    <span className="transaction-date">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="transaction-balance">${parseFloat(t.balance_after).toFixed(2)} left</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* delete card */}
        <div className="detail-section danger-section">
          <button 
            className="delete-btn" 
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Card
          </button>
        </div>

      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleteLoading && setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Delete Card</h3>
            <p>Are you sure you want to delete this {card.retailer_name} card? This action cannot be undone.</p>
            <div className="modal-buttons">
              <button 
                className="modal-btn cancel-btn" 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                className="modal-btn confirm-btn" 
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}