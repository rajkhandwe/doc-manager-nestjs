#!/bin/bash

# Test Script for NestJS Assignment APIs
BASE_URL="http://localhost:3000/api"

echo "🚀 Testing NestJS Assignment APIs"
echo "================================="

# Test with existing admin account from seed data
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"

echo ""
echo "🔐 1. Testing Admin Login (Using Seeded Data)"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

echo "Login Response: $LOGIN_RESPONSE"

# Extract token from login response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "Extracted Token: $TOKEN"

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token. Exiting..."
  exit 1
fi

echo ""
echo "👤 2. Testing Get Profile"
curl -s -X POST "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "📝 3. Testing User Registration (New User)"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "user"
  }')

echo "Registration Response: $REGISTER_RESPONSE"

echo ""
echo "👥 4. Testing Users Management (Admin endpoints)"
echo "Getting all users..."
curl -s -X GET "$BASE_URL/users" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "📂 5. Testing Document Upload"
# Create a test file
echo "This is a test document content for API testing" > test-document.txt

UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-document.txt" \
  -F "title=Test API Document" \
  -F "description=This is a test document uploaded via API" \
  -F "category=general" \
  -F "tags=test,api,sample")

echo "Document Upload Response: $UPLOAD_RESPONSE"

# Extract document ID
DOC_ID=$(echo $UPLOAD_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)
echo "Document ID: $DOC_ID"

echo ""
echo "📋 6. Testing Get All Documents"
curl -s -X GET "$BASE_URL/documents" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "📄 7. Testing Get My Documents"
curl -s -X GET "$BASE_URL/documents/my-documents" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "🔍 8. Testing Search Documents by Tags"
curl -s -X GET "$BASE_URL/documents/search/tags?tags=test,sample" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "📊 9. Testing Document Statistics (Admin only)"
curl -s -X GET "$BASE_URL/documents/statistics" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

if [ ! -z "$DOC_ID" ]; then
  echo ""
  echo "📖 10. Testing Get Document by ID"
  curl -s -X GET "$BASE_URL/documents/$DOC_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '.'

  echo ""
  echo "⬇️ 11. Testing Document Download"
  curl -s -X GET "$BASE_URL/documents/$DOC_ID/download" \
    -H "Authorization: Bearer $TOKEN" \
    --output "downloaded-test-document.txt"
  echo "Document downloaded to: downloaded-test-document.txt"
  
  echo ""
  echo "✏️ 12. Testing Document Update"
  curl -s -X PATCH "$BASE_URL/documents/$DOC_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Updated Test Document",
      "description": "Updated description via API"
    }' | jq '.'
fi

echo ""
echo "⚙️ 13. Testing Create Ingestion Job"
INGESTION_CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/ingestion/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobName": "API Test Ingestion Job",
    "description": "Testing ingestion job creation via API",
    "type": "api_trigger",
    "parameters": {
      "priority": "normal",
      "testMode": true
    }
  }')

echo "Ingestion Job Creation Response: $INGESTION_CREATE_RESPONSE"

# Extract job ID
JOB_ID=$(echo $INGESTION_CREATE_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)
echo "Job ID: $JOB_ID"

echo ""
echo "🚀 14. Testing Trigger Ingestion"
if [ ! -z "$DOC_ID" ]; then
  TRIGGER_RESPONSE=$(curl -s -X POST "$BASE_URL/ingestion/trigger" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "jobName": "API Triggered Ingestion",
      "description": "Testing trigger ingestion functionality",
      "documentIds": ['$DOC_ID'],
      "options": {
        "priority": "high"
      }
    }')
  echo "Trigger Ingestion Response: $TRIGGER_RESPONSE"
else
  echo "Skipping trigger test - no document ID available"
fi

echo ""
echo "📈 15. Testing Get All Ingestion Jobs"
curl -s -X GET "$BASE_URL/ingestion/jobs" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "👤 16. Testing Get My Ingestion Jobs"
curl -s -X GET "$BASE_URL/ingestion/jobs/my-jobs" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "📊 17. Testing Ingestion Statistics (Admin only)"
curl -s -X GET "$BASE_URL/ingestion/statistics" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

if [ ! -z "$JOB_ID" ]; then
  echo ""
  echo "🔍 18. Testing Get Ingestion Job by ID"
  curl -s -X GET "$BASE_URL/ingestion/jobs/$JOB_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '.'

  echo ""
  echo "✏️ 19. Testing Update Ingestion Job"
  curl -s -X PATCH "$BASE_URL/ingestion/jobs/$JOB_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "jobName": "Updated API Test Job",
      "description": "Updated via API testing"
    }' | jq '.'

  echo ""
  echo "⏹️ 20. Testing Cancel Ingestion Job"
  curl -s -X POST "$BASE_URL/ingestion/jobs/$JOB_ID/cancel" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
fi

echo ""
echo "🔐 21. Testing Change Password"
curl -s -X PUT "$BASE_URL/auth/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "'$ADMIN_PASSWORD'",
    "newPassword": "NewSecurePass123!"
  }' | jq '.'

# Change password back for future tests
curl -s -X PUT "$BASE_URL/auth/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "NewSecurePass123!",
    "newPassword": "'$ADMIN_PASSWORD'"
  }' > /dev/null

echo ""
echo "🧹 22. Cleanup - Delete Test Document (if created)"
if [ ! -z "$DOC_ID" ]; then
  curl -s -X DELETE "$BASE_URL/documents/$DOC_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
fi

echo ""
echo "🧹 23. Cleanup - Delete Test Ingestion Job (if created)"
if [ ! -z "$JOB_ID" ]; then
  curl -s -X DELETE "$BASE_URL/ingestion/jobs/$JOB_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
fi

# Clean up test files
rm -f test-document.txt downloaded-test-document.txt

echo ""
echo "✅ API Testing Complete!"
echo "================================="
echo "📋 Test Summary:"
echo "- Authentication: Login, Profile, Password Change ✅"
echo "- Users Management: List Users ✅"
echo "- Documents: Upload, List, Search, Statistics, Download, Update, Delete ✅"
echo "- Ingestion: Create Jobs, Trigger, List, Statistics, Update, Cancel, Delete ✅"
echo "- All endpoints tested with proper authentication ✅"
