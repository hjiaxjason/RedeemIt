/* eslint-disable no-unused-vars */
const API_BASE = "https://redeemit.onrender.com";

/**
 * Save access token to Chrome storage
 * @param {string} token - The access token to save
 * @returns {Promise<void>}
 */
function saveToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ access_token: token }, resolve);
  });
}

/**
 * Get access token from Chrome storage
 * @returns {Promise<string|null>} - The stored token or null
 */
function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['access_token'], (result) => {
      resolve(result.access_token || null);
    });
  });
}

/**
 * Clear access token from Chrome storage
 * @returns {Promise<void>}
 */
function clearToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove('access_token', resolve);
  });
}

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - User object on success
 * @throws {Error} - On login failure
 */
async function login(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Login failed. Please check your credentials.');
  }

  await saveToken(data.access_token);
  return data.user;
}

/**
 * Sign up with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - Response object
 * @throws {Error} - On signup failure
 */
async function signup(email, password) {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Signup failed. Please try again.');
  }

  return data;
}

/**
 * Get all gift cards for the current user
 * @returns {Promise<Array>} - Array of gift card objects
 * @throws {Error} - On API failure or 401 unauthorized
 */
async function getCards() {
  const token = await getToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}/giftcards/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    await clearToken();
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to fetch gift cards.');
  }

  return data;
}

/**
 * Get a single gift card by ID (includes card_number and pin)
 * @param {number} id - Gift card ID
 * @returns {Promise<Object>} - Full gift card object with card_number and pin
 * @throws {Error} - On API failure or 401 unauthorized
 */
async function getCard(id) {
  const token = await getToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}/giftcards/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    await clearToken();
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to fetch gift card details.');
  }

  return data;
}
