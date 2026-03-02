import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadCardImage, addCard } from '../lib/api'
import './AddCard.css'

export default function AddCard() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    brand: '',
    card_number: '',
    pin: '',
    original_balance: '',
    expiration_date: '',
    category: ''
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanDone, setScanDone] = useState(false)
  const [uploadMode, setUploadMode] = useState(null) // 'device' or 'phone'
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    processImage(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    processImage(file)
  }

  async function processImage(file) {
    setImagePreview(URL.createObjectURL(file))
    setScanning(true)
    setScanDone(false)
    setUploadMode('device')
    setError(null)

    try {
      const result = await uploadCardImage(file)
      
      if (result.detail) {
        // Backend returned an error
        setError(result.detail)
        setScanning(false)
        return
      }

      setScanning(false)
      setScanDone(true)
      // Map OCR response to form fields
      setForm(prev => ({
        ...prev,
        brand: result.brand || prev.brand,
        card_number: result.card_number || prev.card_number,
        pin: result.pin || prev.pin,
        original_balance: result.balance ? String(result.balance) : prev.original_balance,
        expiration_date: result.expiration_date || prev.expiration_date
      }))
    } catch {
      setScanning(false)
      setError('Failed to scan card. Please try again or enter details manually.')
    }
  }

  async function handleSubmit() {
    setError(null)

    // Validate required fields
    if (!form.brand.trim()) return setError('Store name is required.')
    if (!form.card_number.trim()) return setError('Card number is required.')
    if (!form.original_balance) return setError('Balance is required.')
    if (!form.expiration_date) return setError('Expiration date is required.')
    if (!form.category) return setError('Please select a category.')

    setSaving(true)
    
    try {
      const cardData = {
        brand: form.brand,
        card_number: form.card_number,
        pin: form.pin || null,
        original_balance: form.original_balance ? parseFloat(form.original_balance) : 0,
        expiration_date: form.expiration_date || null,
        category: form.category || null
      }
      
      const result = await addCard(cardData)
      
      if (result.detail) {
        setError(result.detail)
        setSaving(false)
        return
      }
      
      navigate('/')
    } catch {
      setError('Failed to save card. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="addcard-page">
      <div className="addcard-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <h1 className="addcard-title">Add a Gift Card</h1>
        <p className="addcard-sub">Scan or upload your card to get started</p>
      </div>

      <div className="addcard-body">

        {/* upload section */}
        <div className="addcard-section">
          <h3 className="section-title">Scan Your Card</h3>

          {/* upload option */}
          {!imagePreview && (
            <label
              className="upload-option"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <span className="upload-option-icon">📷</span>
              <span className="upload-option-title">Upload Card Image</span>
              <span className="upload-option-sub">Drag & drop or click to browse</span>
            </label>
          )}

          {/* image preview with scan animation */}
          {imagePreview && (
            <div className="upload-preview">
              {/* upload source badge */}
              {uploadMode && (
                <div className={`upload-source-badge ${uploadMode}`}>
                  {uploadMode === 'device' ? '🖥 From Device' : '📱 From Phone'}
                </div>
              )}
              <img src={imagePreview} alt="card" />
              {scanning && (
                <div className="scan-overlay">
                  <div className="scan-line" />
                  <p className="scan-label">Scanning...</p>
                </div>
              )}
              {scanDone && <div className="scan-done">✓ Scan complete</div>}
              <button
                className="retake-btn"
                onClick={() => { setImagePreview(null); setScanDone(false); setUploadMode(null) }}
              >
                Retake
              </button>
            </div>
          )}
        </div>

        {/* form fields */}
        <div className="addcard-section">
          <h3 className="section-title">Card Details</h3>

          <div className="form-group">
            <label>Store Name</label>
            <input
              placeholder="e.g. Starbucks"
              value={form.brand}
              onChange={e => setForm({ ...form, brand: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Card Number</label>
              <input
                placeholder="1234 5678 9012 3456"
                value={form.card_number}
                onChange={e => setForm({ ...form, card_number: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>PIN</label>
              <input
                placeholder="1234"
                value={form.pin}
                onChange={e => setForm({ ...form, pin: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Balance ($)</label>
              <input
                placeholder="25.00"
                type="number"
                value={form.original_balance}
                onChange={e => setForm({ ...form, original_balance: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Expiration Date</label>
              <input
                type="date"
                value={form.expiration_date}
                onChange={e => setForm({ ...form, expiration_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select a category</option>
              <option value="clothing">Clothing</option>
              <option value="food">Food</option>
              <option value="electronics">Electronics</option>
              <option value="entertainment">Entertainment</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="error-toast">
            {error}
          </div>
        )}

        <button className="submit-btn" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Save Card'}
        </button>

      </div>
    </div>
  )
}