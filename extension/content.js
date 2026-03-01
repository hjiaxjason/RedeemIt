// ── Detection ───────────────────────────────────────────

function isCheckoutPage() {
  const urlKeywords = ['/checkout', '/payment', '/cart', '/basket', '/order']
  const urlMatch = urlKeywords.some(keyword => window.location.href.toLowerCase().includes(keyword))

  const fieldMatch = findField(['gift card', 'giftcard', 'card number', 'gc number', 'redeem', 'voucher', 'coupon']) !== null

  return urlMatch || fieldMatch
}

// ── Field Finding ───────────────────────────────────────

function findField(keywords) {
  const inputs = document.querySelectorAll('input')

  for (const input of inputs) {
    const haystack = [
      input.id,
      input.name,
      input.placeholder,
      input.getAttribute('aria-label') || ''
    ].join(' ').toLowerCase()

    for (const keyword of keywords) {
      if (haystack.includes(keyword)) return input
    }
  }

  return null
}

// ── Field Filling ───────────────────────────────────────

function fillField(input, value) {
  input.focus()
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

// ── Floating Button ─────────────────────────────────────

function injectFloatingButton() {
  if (document.getElementById('redeemit-btn')) return

  const button = document.createElement('div')
  button.id = 'redeemit-btn'
  button.innerText = '🎁 Use a gift card?'
  button.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    background: #2ecc71;
    color: white;
    padding: 12px 18px;
    border-radius: 50px;
    font-family: sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `

  button.addEventListener('click', () => {
    const card = {
      card_number: "1234567890123456",
      pin: "7890"
    }

    const numberField = findField(['gift card', 'giftcard', 'card number', 'gc number', 'redeem', 'voucher', 'coupon'])
    const pinField = findField(['pin', 'gift pin', 'card pin'])

    if (numberField) fillField(numberField, card.card_number)
    if (pinField) fillField(pinField, card.pin)

    button.innerText = '✓ Card applied!'
    button.style.background = '#27ae60'
  })

  document.body.appendChild(button)
}

// ── Message Listener (from popup) ───────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'fillCard') {
    const card = message.card
    const numberField = findField(['gift card', 'giftcard', 'card number', 'gc number', 'redeem', 'voucher', 'coupon'])
    const pinField = findField(['pin', 'gift pin', 'card pin'])

    if (numberField) fillField(numberField, card.card_number)
    if (pinField) fillField(pinField, card.pin)
  }
})

// ── Init ────────────────────────────────────────────────

if (isCheckoutPage()) {
  injectFloatingButton()
}