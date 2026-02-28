#!/bin/bash

BASE_URL="http://127.0.0.1:8000"

echo "1. Signing up..."
curl -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@mailinator.com",
    "password": "Password123",
    "first_name": "Test",
    "last_name": "User"
  }'

echo -e "\n\n2. Logging in..."
# 2. Log in and save the access token
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@mailinator.com",
    "password": "Password123"
  }')

echo "$LOGIN_RESPONSE"

# Extract the access token (adjust if your JSON structure is different)
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo -e "\n\nToken: $TOKEN"

echo -e "\n\n3. Getting current user profile..."
curl -X GET "$BASE_URL/users/me" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n4. Updating user profile..."
curl -X PATCH "$BASE_URL/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Updated", "last_name": "Name"}'

echo -e "\n\n5. Creating a gift card..."
# 3. Create a gift card
curl -X POST "$BASE_URL/giftcards/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "brand": "Starbucks",
    "category": "food",
    "original_balance": 25.00,
    "card_number": "1234567890123456",
    "pin": "1234"
  }'

echo -e "\n\n6. Getting user's gift card collection..."
curl -X GET "$BASE_URL/users/me/collection" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n7. Getting all gift cards..."
# 4. Get all gift cards
curl -X GET "$BASE_URL/giftcards/" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n8. Logging a transaction of \$5.00..."
# 6. Log a transaction
curl -X POST "$BASE_URL/giftcards/1/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount_spent": 5.00
  }'

echo -e "\n\n9. Getting all transactions for gift card id 1..."
# 7. Get transactions for gift card
curl -X GET "$BASE_URL/giftcards/1/transactions" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n10. Getting expiring cards within 7 days..."
# 8. Get expiring cards
curl -X GET "$BASE_URL/giftcards/expiring/soon?days=7" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n11. Getting summary stats..."
# 9. Get summary stats
curl -X GET "$BASE_URL/giftcards/summary" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n12. Deleting gift card id 1..."
# 10. Delete gift card
curl -X DELETE "$BASE_URL/giftcards/1" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\nDone!"
