/* global getToken, clearToken, login, signup, getCards, getCard */

// DOM Elements
let cardsList;
let loginForm;
let signupForm;
let logoutBtn;
let errorMessage;
let successMessage;
let loadingSpinner;
let cardDetail;

// Card detail state
let currentDetailCard = null;
let cardNumberRevealed = false;
let pinRevealed = false;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize DOM references
  cardsList = document.getElementById('cards-list');
  loginForm = document.getElementById('login-form');
  signupForm = document.getElementById('signup-form');
  logoutBtn = document.getElementById('logout-btn');
  errorMessage = document.getElementById('error-message');
  successMessage = document.getElementById('success-message');
  loadingSpinner = document.getElementById('loading-spinner');
  cardDetail = document.getElementById('card-detail');

  // Set up event listeners
  setupEventListeners();

  // Check if user is logged in
  try {
    const token = await getToken();
    if (token) {
      await loadAndRenderCards();
    } else {
      showLoginForm();
    }
  } catch (error) {
    showError(error.message);
    showLoginForm();
  }
});

function setupEventListeners() {
  // Login form submit
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('login-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // Signup form submit
  document.getElementById('signup-btn').addEventListener('click', handleSignup);
  document.getElementById('signup-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSignup();
  });

  // Toggle between login and signup
  document.getElementById('show-signup').addEventListener('click', () => {
    hideError();
    hideSuccess();
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
  });

  document.getElementById('show-login').addEventListener('click', () => {
    hideError();
    hideSuccess();
    signupForm.classList.remove('active');
    loginForm.classList.add('active');
  });

  // Logout
  logoutBtn.addEventListener('click', handleLogout);

  // Card detail view
  document.getElementById('back-btn').addEventListener('click', goBackToList);
  document.getElementById('toggle-card-number').addEventListener('click', () => toggleField('card-number'));
  document.getElementById('toggle-pin').addEventListener('click', () => toggleField('pin'));
  document.getElementById('copy-card-number').addEventListener('click', () => copyToClipboard(currentDetailCard?.card_number, 'card-number'));
  document.getElementById('copy-pin').addEventListener('click', () => copyToClipboard(currentDetailCard?.pin, 'pin'));
  document.getElementById('use-card-detail-btn').addEventListener('click', handleUseCardFromDetail);
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showError('Please enter email and password.');
    return;
  }

  hideError();
  hideSuccess();
  showLoading();

  try {
    await login(email, password);
    hideLoading();
    loginForm.classList.remove('active');
    await loadAndRenderCards();
  } catch (error) {
    hideLoading();
    showError(error.message);
  }
}

async function handleSignup() {
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!email || !password) {
    showError('Please enter email and password.');
    return;
  }

  if (password.length < 6) {
    showError('Password must be at least 6 characters.');
    return;
  }

  hideError();
  hideSuccess();
  showLoading();

  try {
    await signup(email, password);
    hideLoading();
    showSuccess('Account created! Please log in.');
    signupForm.classList.remove('active');
    loginForm.classList.add('active');
    // Clear signup form
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
  } catch (error) {
    hideLoading();
    showError(error.message);
  }
}

async function handleLogout() {
  await clearToken();
  cardsList.innerHTML = '';
  logoutBtn.classList.add('hidden');
  showLoginForm();
}

async function loadAndRenderCards() {
  showLoading();
  hideError();

  try {
    const cards = await getCards();
    hideLoading();
    renderCards(cards);
    logoutBtn.classList.remove('hidden');
  } catch (error) {
    hideLoading();
    if (error.message.includes('Session expired') || error.message.includes('Not authenticated')) {
      showLoginForm();
    }
    showError(error.message);
  }
}

function renderCards(cards) {
  cardsList.innerHTML = '';

  if (!cards || cards.length === 0) {
    cardsList.innerHTML = '<div class="empty-state">No gift cards yet. Add some from the web app!</div>';
    return;
  }

  cards.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.style.cursor = 'pointer';

    const logoUrl = card.logo_url || `https://logo.clearbit.com/${card.brand.toLowerCase().replace(/\s+/g, '')}.com`;
    const balance = card.balance != null ? card.balance.toFixed(2) : '0.00';

    cardEl.innerHTML = `
      <div class="card-header">
        <img class="card-logo" src="${logoUrl}" onerror="this.style.display='none'" />
        <span class="card-brand">${escapeHtml(card.brand)}</span>
      </div>
      <div class="card-balance">Balance: $${balance}</div>
      <div class="card-expiry">Expires: ${formatDate(card.expiration_date)}</div>
    `;

    cardsList.appendChild(cardEl);

    // Make entire card clickable to show detail
    cardEl.addEventListener('click', () => showCardDetail(card.id));
  });
}

async function showCardDetail(cardId) {
  showLoading();
  hideError();

  try {
    const cardDetails = await getCard(cardId);
    currentDetailCard = cardDetails;
    cardNumberRevealed = false;
    pinRevealed = false;

    // Populate detail view
    const logoUrl = cardDetails.logo_url || `https://logo.clearbit.com/${cardDetails.brand.toLowerCase().replace(/\s+/g, '')}.com`;
    document.getElementById('detail-logo').src = logoUrl;
    document.getElementById('detail-logo').style.display = '';
    document.getElementById('detail-brand').textContent = cardDetails.brand;
    document.getElementById('detail-balance').textContent = `$${cardDetails.balance != null ? cardDetails.balance.toFixed(2) : '0.00'}`;

    // Set masked values
    updateCardNumberDisplay();
    updatePinDisplay();

    // Reset toggle buttons
    document.getElementById('toggle-card-number').textContent = 'Show';
    document.getElementById('toggle-pin').textContent = 'Show';

    // Show detail view, hide list
    hideLoading();
    cardsList.style.display = 'none';
    cardDetail.classList.add('active');
  } catch (error) {
    hideLoading();
    if (error.message.includes('Session expired') || error.message.includes('Not authenticated')) {
      showLoginForm();
    }
    showError(error.message);
  }
}

function updateCardNumberDisplay() {
  const cardNumber = currentDetailCard?.card_number || '';
  const displayEl = document.getElementById('card-number-value');
  
  if (cardNumberRevealed) {
    // Format with spaces every 4 digits
    displayEl.textContent = cardNumber.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') || cardNumber;
  } else {
    // Show masked with last 4 digits
    const last4 = cardNumber.slice(-4);
    displayEl.textContent = '•••• •••• •••• ' + last4;
  }
}

function updatePinDisplay() {
  const pin = currentDetailCard?.pin || '';
  const displayEl = document.getElementById('pin-value');
  
  if (pinRevealed) {
    displayEl.textContent = pin;
  } else {
    displayEl.textContent = '••••';
  }
}

function toggleField(field) {
  if (field === 'card-number') {
    cardNumberRevealed = !cardNumberRevealed;
    updateCardNumberDisplay();
    document.getElementById('toggle-card-number').textContent = cardNumberRevealed ? 'Hide' : 'Show';
  } else if (field === 'pin') {
    pinRevealed = !pinRevealed;
    updatePinDisplay();
    document.getElementById('toggle-pin').textContent = pinRevealed ? 'Hide' : 'Show';
  }
}

function copyToClipboard(text, field) {
  if (!text) return;
  
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById(`copy-${field}`);
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 1500);
  }).catch(err => {
    showError('Failed to copy: ' + err.message);
  });
}

function goBackToList() {
  cardDetail.classList.remove('active');
  cardsList.style.display = '';
  currentDetailCard = null;
  cardNumberRevealed = false;
  pinRevealed = false;
}

async function handleUseCardFromDetail() {
  if (!currentDetailCard) return;
  
  const button = document.getElementById('use-card-detail-btn');
  button.disabled = true;
  button.textContent = 'Loading...';

  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'fillCard',
          card: {
            card_number: currentDetailCard.card_number,
            pin: currentDetailCard.pin
          }
        });
      }
    });

    window.close();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Use this card';
    
    if (error.message.includes('Session expired') || error.message.includes('Not authenticated')) {
      showLoginForm();
    }
    showError(error.message);
  }
}

function showLoginForm() {
  loginForm.classList.add('active');
  signupForm.classList.remove('active');
  logoutBtn.classList.add('hidden');
  cardsList.innerHTML = '';
  cardDetail.classList.remove('active');
  cardsList.style.display = '';
  currentDetailCard = null;
}

function showLoading() {
  loadingSpinner.classList.add('active');
}

function hideLoading() {
  loadingSpinner.classList.remove('active');
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('active');
}

function hideError() {
  errorMessage.textContent = '';
  errorMessage.classList.remove('active');
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.classList.add('active');
}

function hideSuccess() {
  successMessage.textContent = '';
  successMessage.classList.remove('active');
}

function formatDate(dateStr) {
  if (!dateStr) return 'No expiration';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}