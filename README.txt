# TriMergeIQ Backend API (v2) – Integration Guide

## Base URL (Local)
http://localhost:3002/v2

---

## General Setup
- Use POST requests (except /test)
- Use raw JSON body
- Pagination: page + limit

---

## 1. Health Check
GET /test

Response:
{
  "message": "v2 routes working"
}

---

## 2. Create Conversation
POST /new_conversation

{
  "title": "Test Chat",
  "profile": "grace_001",
  "project": "TriMergeIQ"
}

---

## 3. Send Message
POST /new_message

{
  "conversation": 1,
  "text": "Hello"
}

---

## 4. Get Messages
POST /messages

{
  "conversation": 1,
  "page": 1,
  "limit": 25
}

---

## 5. Get Conversations

POST /conversations

### Without project
{
  "profile": "grace_001"
}

### With project
{
  "profile": "grace_001",
  "project": "TriMergeIQ"
}

---

## Project Filtering Logic

- No project → returns only project = null
- With project → returns only matching project

---

## Important Notes

- Server runs on http://localhost:3002
- Use only /v2 endpoints
- Older routes are not used
