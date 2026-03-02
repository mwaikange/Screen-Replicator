# ReferredBy Mobile App - Complete API Documentation for Replit Developer

**Version:** 3.0.0  
**Last Updated:** January 26, 2026  
**Base URL:** `https://appv2.referredby.com.na`

---

## 📱 IMPORTANT NOTICE FOR MOBILE DEVELOPERS

This documentation covers **EVERY** API endpoint, page flow, button action, and process required to build the complete ReferredBy mobile app. Nothing has been omitted.

### Core Principles:
1. **Backend handles ALL business logic** - No calculations in mobile app
2. **Mobile app is UI only** - Fetch data, display it, capture input, submit to API
3. **Session management via HTTP-only cookies** - Set automatically by API
4. **Use Supabase ANON key only** - NEVER use service role key in mobile app
5. **All rating, progression, and interest calculations happen server-side**

---

## 📑 TABLE OF CONTENTS

1. [Authentication & Authorization](#1-authentication--authorization)
2. [Registration Process (Complete Flow)](#2-registration-process-complete-flow)
3. [Forgot Password (PIN Reset)](#3-forgot-password-pin-reset)
4. [Profile Page API](#4-profile-page-api)
5. [Update Documents Process](#5-update-documents-process)
6. [Nano Loan Application Flow](#6-nano-loan-application-flow)
7. [Term Loan Application Flow](#7-term-loan-application-flow)
8. [Statement & Payment History](#8-statement--payment-history)
9. [Credit Score History](#9-credit-score-history)
10. [Common Utilities & Status Codes](#10-common-utilities--status-codes)
11. [Error Handling](#11-error-handling)
12. [Testing Checklist](#12-testing-checklist)

---

## 1. AUTHENTICATION & AUTHORIZATION

### 1.1 Login Flow

**Page:** Login Screen  
**API Endpoint:** `POST /api/auth/login`

**User Input:**
- Email address (text input)
- PIN (4-6 digits, numeric keypad)

**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "pin": "1234"
}
\`\`\`

**Success Response (200):**
\`\`\`json
{
  "success": true
}
\`\`\`
- Session cookie is set automatically (HTTP-only)
- Redirect to `/profile` page

**Error Responses:**
- `401 Unauthorized`: Invalid email or PIN
\`\`\`json
{
  "error": "Invalid email or PIN"
}
\`\`\`

**UI Requirements:**
- Show error message if login fails
- Disable button while loading
- "Forgot Password?" link navigates to forgot password flow

---

## 2. REGISTRATION PROCESS (COMPLETE FLOW)

### 2.1 Step 1: Signup Page (Referral Code Entry)

**Page:** Signup Screen  
**API Endpoint:** `POST /api/referrals/validate`

**User Input:**
- Referral code (text input, required)

**Request:**
\`\`\`json
{
  "code": "REFER123"
}
\`\`\`

**Success Response (200):**
\`\`\`json
{
  "valid": true,
  "lending_society_id": "uuid-here",
  "lending_society_name": "Kayla Industries",
  "partner_id": "uuid-here",
  "staff_code": "STAFF001",
  "referral_owner_id": "uuid-here"
}
\`\`\`
- Store ALL these values in local state/storage
- Proceed to Personal Info page

**Error Response (400):**
\`\`\`json
{
  "valid": false,
  "error": "Invalid or expired referral code"
}
\`\`\`

---

### 2.2 Step 2: Personal Info Page

**Page:** Personal Info Entry Screen  
**API Endpoint:** `POST /api/auth/check-uniqueness`

**User Input:**
- Full Names (first name, text input)
- Surname (last name, text input)
- ID Number (national ID, 11 digits)
- Mobile Number (text input, format: 0XXXXXXXXX or +264XXXXXXXXX)
- Gender (dropdown: Male/Female)
- Region (dropdown)
- Town (text input)
- Street Name (text input)
- Physical Address (text input)
- Email (text input)

**Before proceeding, validate uniqueness:**

**Request:**
\`\`\`json
{
  "id_number": "12345678901",
  "mobile": "+264812345678",
  "email": "user@example.com"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "id_number_exists": false,
  "mobile_exists": false,
  "email_exists": false
}
\`\`\`
- If ALL are `false`, proceed to Employer Info
- If ANY are `true`, show error: "This {field} is already registered"

---

### 2.3 Step 3: Employer Info Page

**Page:** Employer Info Entry Screen  
**No API call yet - just capture data**

**User Input:**
- Employer Name (text input)
- Occupation (text input)
- Office Number (text input)
- Employee Code (text input)
- Next of Kin Name (text input)
- Next of Kin Surname (text input)
- Next of Kin Relationship (text input)
- Next of Kin Mobile (text input)
- PO Box (text input)
- Source of Funds (dropdown)
- Source of Income (dropdown)

Store all data locally and proceed to OTP verification.

---

### 2.4 Step 4: Send OTP

**API Endpoint:** `POST /api/auth/send-otp`

**Request:**
\`\`\`json
{
  "mobile": "+264812345678",
  "type": "registration"
}
\`\`\`

**Success Response (200):**
\`\`\`json
{
  "success": true,
  "message": "OTP sent successfully"
}
\`\`\`
- OTP is sent via SMS
- Navigate to OTP Verification screen

---

### 2.5 Step 5: Verify OTP

**Page:** OTP Verification Screen  
**API Endpoint:** `POST /api/auth/verify-otp`

**User Input:**
- OTP code (6 digits, numeric input)

**Request:**
\`\`\`json
{
  "mobile": "+264812345678",
  "otp": "123456",
  "type": "registration"
}
\`\`\`

**Success Response (200):**
\`\`\`json
{
  "success": true
}
\`\`\`
- Proceed to PIN Setup

**Error Response (400):**
\`\`\`json
{
  "error": "Invalid or expired OTP"
}
\`\`\`

---

### 2.6 Step 6: PIN Setup & Account Creation

**Page:** PIN Setup Screen  
**User Input:**
- PIN (4-6 digits, numeric input)
- Confirm PIN (4-6 digits, must match)

**After PIN confirmation, call signup API:**

**API Endpoint:** `POST /api/auth/signup`

**Request:**
\`\`\`json
{
  "referral": {
    "code": "REFER123",
    "lending_society_id": "uuid",
    "staff_code": "STAFF001",
    "partner_id": "uuid",
    "referral_owner_id": "uuid"
  },
  "personal": {
    "full_names": "John",
    "surname": "Doe",
    "id_number": "12345678901",
    "mobile": "+264812345678",
    "gender": "Male",
    "region": "Erongo",
    "town": "Walvis Bay",
    "street_name": "Main Street",
    "physical_address": "123 Main St",
    "email": "john@example.com"
  },
  "employer": {
    "employer_name": "ABC Company",
    "occupation": "Engineer",
    "office_number": "+264611234567",
    "employee_code": "EMP001",
    "nok_name": "Jane",
    "nok_surname": "Doe",
    "nok_relationship": "Spouse",
    "nok_mobile": "+264812345679",
    "po_box": "PO Box 123",
    "source_funds": "Employment Salary",
    "source_income": "Employment Salary"
  },
  "pin": "1234"
}
\`\`\`

**Success Response (200):**
\`\`\`json
{
  "success": true,
  "user_id": "uuid-here",
  "auth_user_id": "uuid-here"
}
\`\`\`
- Store `user_id` in sessionStorage
- Proceed to Upload Selfie page

**Error Responses:**
- `422 Unprocessable Entity`: Email/ID/Mobile already exists
- `500 Internal Server Error`: Account creation failed

---

### 2.7 Step 7: Upload Selfie (KYC)

**Page:** Upload Selfie Screen  
**API Endpoint:** `POST /api/upload/selfie`

**Request:** `multipart/form-data`
- `file`: Image file (JPG/PNG, max 10MB)
- `userId`: User UUID from step 2.6

**Success Response (200):**
\`\`\`json
{
  "url": "https://blob.vercel-storage.com/selfies/uuid-timestamp.jpg"
}
\`\`\`
- Proceed to Upload Documents page

**Validation:**
- Max file size: 10MB
- Allowed types: JPG, PNG
- Show error if validation fails

---

### 2.8 Step 8: Upload Documents (National ID & Payslip)

**Page:** Upload Documents Screen  
**API Endpoint:** `POST /api/upload/documents`

**Request:** `multipart/form-data`
- `userId`: User UUID
- `national_id`: Image/PDF file (max 10MB)
- `payslip`: Image/PDF file (max 10MB)

**Success Response (200):**
\`\`\`json
{
  "national_id_url": "https://blob.vercel-storage.com/documents/...",
  "payslip_url": "https://blob.vercel-storage.com/documents/..."
}
\`\`\`

**After successful upload, update user_documents:**

**API Endpoint:** `PATCH /api/users/{user_id}/documents`

**Request:**
\`\`\`json
{
  "national_id_url": "https://...",
  "payslip_url": "https://..."
}
\`\`\`

**Success Response (200):**
\`\`\`json
{
  "success": true
}
\`\`\`
- Redirect to Login page
- Show success message: "Registration complete! Please log in."

---

## 3. FORGOT PASSWORD (PIN RESET)

### 3.1 Step 1: Enter Mobile Number

**Page:** Forgot Password Screen  
**API Endpoint:** `POST /api/auth/send-otp`

**User Input:**
- Mobile number (text input)

**Request:**
\`\`\`json
{
  "mobile": "+264812345678",
  "type": "password_reset"
}
\`\`\`

**Success Response (200):**
\`\`\`json
{
  "success": true,
  "message": "OTP sent successfully"
}
\`\`\`
- Proceed to OTP verification step

---

### 3.2 Step 2: Verify OTP

**API Endpoint:** `POST /api/auth/verify-otp`

**Request:**
\`\`\`json
{
  "mobile": "+264812345678",
  "otp": "123456",
  "type": "password_reset"
}
\`\`\`

**Success Response (200):**
\`\`\`json
{
  "success": true
}
\`\`\`
- Proceed to PIN reset step

---

### 3.3 Step 3: Reset PIN

**Page:** Reset PIN Screen  
**API Endpoint:** `POST /api/auth/reset-password`

**User Input:**
- New PIN (4-6 digits)
- Confirm new PIN (must match)

**Request:**
\`\`\`json
{
  "mobile": "+264812345678",
  "newPin": "5678"
}
\`\`\`

**Success Response (200):**
\`\`\`json
{
  "success": true
}
\`\`\`
- Redirect to Login page
- Show message: "PIN reset successful. Please log in."

---

## 4. PROFILE PAGE API

### 4.1 Get Complete User Profile

**Page:** Profile/Dashboard Screen  
**API Endpoint:** `GET /api/users/me`

**Authentication:** Required (session cookie or Bearer token)

**Request Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`
(If using token-based auth instead of cookies)

**Success Response (200):**
\`\`\`json
{
  "success": true,
  "user": {
    "id": "uuid",
    "uid": "RB1015",
    "account_name": "DOBSON ANDRE",
    "client_id": "8503029996",
    "membership_status": "AP2",
    
    // Rating (display as stars: 0-10 scale)
    "borrower_rating": 1.5,
    "rating_label": "POOR",
    "credit_score": 15,
    "lifetime_points": 15,
    "lifetime_penalties": 0,
    
    // Loan limits (pre-formatted strings)
    "nano_loan_limit": 2000.00,
    "term_loan_limit": 500.00,
    "nano_installment": "MAX | NAD 2000.00",
    "term_installment": "MAX | NAD 500.00",
    "account_level": "NL5 / TL0",
    
    // Society & partner info
    "lending_society_name": "Kayla Industries",
    "referring_partner_name": "nastya peno",
    
    // Document status (for green/grey boxes)
    "documents": {
      "national_id": true,  // Green if true, grey if false
      "payslip": true,
      "kyc": true
    },
    
    // Document deadline
    "document_deadline": "2026-06-11T00:00:00.000Z",
    "is_doc_update_needed": false,  // Enable UPDATE DOCUMENTS button
    
    // Loan access control (button enable/disable)
    "loan_access": {
      "nano": true,
      "term": true,
      "term_max_months": 12,
      "term_min_months": 1
    },
    "nano_loan_enabled": true,   // Controls REQUEST NANO LOAN button
    "term_loan_enabled": true,   // Controls APPLY FOR TERM LOAN button
    
    // Progression data (for display only)
    "nano_progression": {
      "current_level": 5,
      "max_level": 8,
      "next_graduation_cycles": 3,
      "eligible_for_graduation": false
    },
    "term_progression": {
      "current_level": 0,
      "max_level": 8,
      "next_graduation_cycles": null,
      "eligible_for_graduation": false
    },
    
    // Graduation status
    "is_graduated": false,
    "graduation_eligible": false
  }
}
\`\`\`

### 4.2 Profile Page UI Requirements

**Header Section:**
- Account Name (large, bold)
- Client ID (below name)
- Account UID (small, grey)

**Credit Rating Display:**
- Show `borrower_rating` as filled stars (0-10 scale)
- Example: 1.5 rating = 1 full star + 1 half star
- Display rating label: POOR/FAIR/GOOD/EXCELLENT

**Loan Limits:**
- Nano Installment: Display `nano_installment` as-is
- Term Installment: Display `term_installment` as-is
- Account Level: Display `account_level` as-is

**Document Status Boxes (3 boxes):**
- **ID**: Green background (#22C55E) if `documents.national_id === true`, grey (#D1D5DB) if false
- **Proof of Income**: Green if `documents.payslip === true`, grey if false
- **KYC**: Green if `documents.kyc === true`, grey if false

**Document Deadline:**
- Format `document_deadline` as "DD Month YYYY" (e.g., "11 June 2026")
- Display: "Documents need to update on: {formatted_date}"

**Buttons:**

1. **UPDATE DOCUMENTS Button:**
   - Enabled (dark color) if `is_doc_update_needed === true`
   - Disabled (grey) if `false`
   - OnClick: Navigate to Update Documents flow

2. **REQUEST NANO LOAN Button:**
   - Check TWO conditions:
     - `membership_status` in ["AP2", "AA", "AP"] (isApproved)
     - `nano_loan_enabled === true`
   - Enabled ONLY if BOTH are true
   - Disabled otherwise
   - OnClick: Navigate to Nano Loan Interest Confirmation

3. **APPLY FOR TERM LOAN Button:**
   - Check TWO conditions:
     - `membership_status` in ["AP2", "AA", "AP"] (isApproved)
     - `term_loan_enabled === true`
   - Enabled ONLY if BOTH are true
   - Disabled otherwise
   - OnClick: Navigate to Term Loan Interest Confirmation

4. **STATEMENT Button:**
   - Always enabled
   - OnClick: Navigate to Active Statement page

5. **CREDIT SCORE HISTORY Button:**
   - Always enabled
   - OnClick: Navigate to Credit Score History page

---

## 5. UPDATE DOCUMENTS PROCESS

### 5.1 Update Documents Page

**Page:** Update Documents Screen  
**Trigger:** User clicks "UPDATE DOCUMENTS" button from profile

**API Endpoint:** `POST /api/users/{user_id}/documents/upload`

**User Action:**
- Select document type (dropdown: National ID, Payslip, Declaration, Selfie)
- Select file (image/PDF)
- Upload

**Request:** `multipart/form-data`
- `file`: Image/PDF file (max 5MB)
- `document_type`: One of "national_id", "payslip", "declaration", "selfie"

**Success Response (200):**
\`\`\`json
{
  "success": true,
  "url": "https://blob.vercel-storage.com/...",
  "document_type": "national_id"
}
\`\`\`

**Upload Requirements:**
- Can upload one document at a time
- Max file size: 5MB
- Allowed types: JPG, PNG, PDF
- After upload, show success message and update UI

---

## 6. NANO LOAN APPLICATION FLOW

### 6.1 Step 1: Interest Confirmation Page

**Page:** Interest Confirmation Screen  
**API Endpoint:** `GET /api/mobile/interest-confirmation?type=nano`

**Success Response (200):**
\`\`\`json
{
  // Header information (teal box)
  "referring_partner": "nastya peno",
  "lender": "Destiny Group Pty LTD",
  "lending_society": "Kayla Industries",
  "borrower": "DOBSON ANDRE",
  
  // Active interest mode
  "active_interest_mode": "PIR + SIR",
  
  // Loan type
  "loan_type": "nano",
  
  // Portfolio Interest Rate (PIR) - BASE RATE for nano loans
  "pir_percent": 28.00,
  
  // Subsidized Interest Rate (SIR) - OPTIONAL
  "sir_enabled": true,
  "sir_percent": 3.25,
  "sir_policy": "after_pir",
  
  // IIR is NOT shown for nano loans
  "iir_enabled": false,
  
  // Fees
  "fees": {
    "processing": 32,
    "late_fee": 5
  },
  
  // Progression levels (show nano levels ONLY)
  "progression_levels": {
    "nano": {
      "L1": 2000,
      "L2": 4200,
      "L3": 8700
    },
    "term": {
      "L1": 13000,
      "L2": 15000,
      "L3": 20000
    }
  },
  
  // User's applicable rate (yellow box)
  "user_star_rating": 1.5,
  "user_tier_label": "Fair (0-3)",
  "rate_basis": "PIR+SIR",
  "user_effective_rate": 24.75,  // FINAL RATE (large, bold display)
  
  // Button control
  "has_active_loan": false,
  "is_loan_type_enabled": true,
  "can_proceed": true
}
\`\`\`

### 6.2 Interest Confirmation UI (Nano Loans)

**Header Box (Teal Background):**
- Referring Partner: {referring_partner}
- Lender: {lender}
- Lending Society: {lending_society}
- Borrower: {borrower}

**Interest Rate Sections:**

1. **Portfolio Interest Rate (PIR)** - Show this section
   - Title: "Portfolio Interest Rate (PIR)"
   - Display: "Base Rate: {pir_percent}%"
   - Example: "Base Rate: 28.00%"

2. **Subsidized Interest Rate (SIR)** - Show ONLY if `sir_enabled === true`
   - Title: "Subsidized Interest Rate (SIR)"
   - Display: "Subsidy Enabled: {sir_percent}%"
   - Display: "Policy: Applies After PIR" (if sir_policy === "after_pir")
   - Green background box

3. **DO NOT SHOW Individual Interest Rate (IIR) for nano loans**

**Fees Section:**
- Processing Fee: N$ {fees.processing}
- Late Fee (Accumulating Arrears): {fees.late_fee}%

**Loan Limits Section (Nano Progression Levels):**
- Level 1: N$ {progression_levels.nano.L1}
- Level 2: N$ {progression_levels.nano.L2}
- Level 3: N$ {progression_levels.nano.L3}

**Your Applicable Rate Box (Yellow Background):**
- Your Rating: {user_star_rating} stars
- Your Tier: {user_tier_label}
- Interest Basis: {rate_basis}
- **Your Final Interest Rate: {user_effective_rate}%** (large, bold, prominent)

**PROCEED Button:**
- Enabled (dark blue) if `can_proceed === true`
- Disabled (grey) if `can_proceed === false`
- If `has_active_loan === true`, show error:
  > "You have an active loan. Please settle it before applying for a new one."
- OnClick: Navigate to Loan Request page

---

### 6.3 Step 2: Loan Request Page (Nano)

**Page:** Loan Request Screen  
**API Endpoint:** `GET /api/mobile/loan-request?type=nano`

**Success Response (200):**
\`\`\`json
{
  "user": {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "mobile": "+264812345678",
    "email": "john@example.com",
    // ... other user fields
  },
  "lending_society": {
    "id": "uuid",
    "name": "Kayla Industries",
    // ... other society fields
  },
  "portfolio_holder": {
    "id": "uuid",
    "name": "Destiny Group Pty LTD",
    // ... other holder fields
  },
  "referring_partner": "nastya peno",
  
  // Current level & limits
  "current_level": 1,      // Extracted from latest loan_id (NL1, NL2, etc.)
  "min_amount": 300,
  "max_amount": 2000,      // From progression_levels.nano.L1
  
  // Interest rate
  "interest_rate": 24.75,  // Final effective rate
  "rate_basis": "PIR+SIR",
  
  // Fees
  "processing_fee": 32,
  "late_fee": 5,
  
  // Progression levels
  "progression_levels": {
    "L1": 2000,
    "L2": 4200,
    "L3": 8700
  }
}
\`\`\`

### 6.4 Loan Request UI (Nano)

**Account Level & Loan Max:**
- Display: "Account Level: NL{current_level}"
- Display: "LOAN MAX: N$ {max_amount}"

**Loan Amount Slider:**
- Minimum: {min_amount}
- Maximum: {max_amount}
- Step: 100
- Default: {min_amount}

**Calculation Display (Auto-calculated as user moves slider):**
- Principal: N$ {selected_amount}
- Interest ({interest_rate}%): N$ {principal * (interest_rate / 100)}
- Processing Fee: N$ {processing_fee}
- **Total Repayable: N$ {principal + interest + processing_fee}**

**Due Dates Display (Informational, no calculation needed):**
- "Loan Period: 62 days"
- "Due Date: {today + 62 days}"
- "Outstanding Date: {today + 93 days}"
- "Block Date: {today + 124 days}"

**CONFIRM LOAN AMOUNT Button:**
- Always enabled
- OnClick: Proceed to OTP Signature page

---

### 6.5 Step 3: OTP Signature Page (Nano)

**Page:** OTP Signature Screen  
**Send OTP:** `POST /api/auth/send-otp`

**Request:**
\`\`\`json
{
  "mobile": "+264812345678",
  "type": "loan_signature"
}
\`\`\`

**Verify OTP:** `POST /api/auth/verify-otp`

**Request:**
\`\`\`json
{
  "mobile": "+264812345678",
  "otp": "123456",
  "type": "loan_signature"
}
\`\`\`

**Success Response (200):**
\`\`\`json
{
  "success": true
}
\`\`\`
- Proceed to loan submission

---

### 6.6 Step 4: Submit Nano Loan Application

**API Endpoint:** `POST /api/mobile/loan-request`

**Request:**
\`\`\`json
{
  "loan_amount": 2000,
  "interest_rate": 24.75,
  "processing_fee": 32,
  "lending_society_id": "uuid",
  "rate_basis": "PIR+SIR",
  "loan_type": "nano",
  "otp_verification": {
    "otp_id": "uuid-from-verify-otp-response"
  }
}
\`\`\`

**Success Response (200):**
\`\`\`json
{
  "success": true,
  "loan_id": "NL12345678",
  "message": "Loan application submitted successfully"
}
\`\`\`
- Show success screen
- Button: "View Statement" → Navigate to Active Statement page
- Button: "Back to Profile" → Navigate to Profile page

**Error Responses:**
- `400 Bad Request`: User has active loan
\`\`\`json
{
  "error": "You have an active loan. Please pay off your current loan before applying for a new one."
}
\`\`\`
- `403 Forbidden`: Loan type disabled
\`\`\`json
{
  "error": "Nano loans are currently not available for your lending society.",
  "loan_access_disabled": true
}
\`\`\`

---

## 7. TERM LOAN APPLICATION FLOW

### 7.1 Step 1: Interest Confirmation Page (Term)

**Page:** Interest Confirmation Screen  
**API Endpoint:** `GET /api/mobile/interest-confirmation?type=term`

**Success Response (200):**
\`\`\`json
{
  // Header information (same as nano)
  "referring_partner": "nastya peno",
  "lender": "Destiny Group Pty LTD",
  "lending_society": "Kayla Industries",
  "borrower": "DOBSON ANDRE",
  
  // Active interest mode
  "active_interest_mode": "IIR (Rating-Based)",
  
  // Loan type
  "loan_type": "term",
  
  // Term Loan Base Rate + IIR (Individual Interest Rate)
  "iir_enabled": true,
  "iir_base": 11.99,  // User's actual tier rate
  "iir_rates": {
    "fair": 27.00,      // 0-3 stars
    "good": 18.00,      // 4-6 stars
    "excellent": 12.45  // 7-10 stars
  },
  
  // PIR and SIR are NOT shown for term loans
  "pir_percent": 0,
  "sir_enabled": false,
  
  // Fees (same as nano)
  "fees": {
    "processing": 32,
    "late_fee": 5
  },
  
  // Progression levels (show term levels ONLY)
  "progression_levels": {
    "nano": {
      "L1": 2000,
      "L2": 4200,
      "L3": 8700
    },
    "term": {
      "L1": 13000,
      "L2": 15000,
      "L3": 20000
    }
  },
  
  // User's applicable rate
  "user_star_rating": 5,
  "user_tier_label": "Good (4-6)",
  "rate_basis": "IIR",
  "user_effective_rate": 18.00,  // Based on tier
  
  // Button control
  "has_active_loan": false,
  "is_loan_type_enabled": true,
  "can_proceed": true
}
\`\`\`

### 7.2 Interest Confirmation UI (Term Loans)

**Header Box:** Same as nano

**Interest Rate Sections:**

1. **Term Loan Base Rate** - Show this instead of PIR
   - Title: "Term Loan Base Rate"
   - Display: "Base Rate: {user_effective_rate}%" (user's actual tier rate)
   - Example: "Base Rate: 18.00%"

2. **Individual Interest Rate (IIR)** - Show rating tiers
   - Title: "Individual Interest Rate (IIR)"
   - Display three tiers:
     - "0-3 Stars (Fair): {iir_rates.fair}%"
     - "4-6 Stars (Good): {iir_rates.good}%"
     - "7-10 Stars (Excellent): {iir_rates.excellent}%"

3. **DO NOT SHOW PIR or SIR for term loans**

**Fees Section:** Same as nano

**Loan Limits Section (Term Progression Levels):**
- Level 1: N$ {progression_levels.term.L1}
- Level 2: N$ {progression_levels.term.L2}
- Level 3: N$ {progression_levels.term.L3}

**Your Applicable Rate Box:** Same as nano but shows IIR basis

**PROCEED Button:** Same logic as nano

---

### 7.3 Step 2: Term Loan Options Page

**Page:** Term Loan Options Screen  
**No API call - just capture input**

**User Input:**
- Loan Term (dropdown): 1-12 months
- First Deduction Date (date picker)

**Validation:**
- First deduction date must be at least 15 days from today
- Loan term must be within `loan_access.term_min_months` to `loan_access.term_max_months`

**CONTINUE Button:**
- OnClick: Navigate to Bank Details page

---

### 7.4 Step 3: Bank Details Page

**Page:** Bank Details Entry Screen  
**No API call - just capture input**

**User Input:**
- Bank Name (dropdown)
- Branch Name (text input)
- Branch Code (text input)
- Account Number (text input)
- Account Type (dropdown: Savings/Cheque)

**CONTINUE Button:**
- OnClick: Navigate to Net Disposable Income page

---

### 7.5 Step 4: Net Disposable Income Page

**Page:** Net Disposable Income Entry Screen  
**No API call - just capture input**

**User Input:**
- Monthly Salary (numeric input)
- Other Deductions (numeric input)

**Auto-calculation (client-side):**
- Net Disposable Income = Monthly Salary - Other Deductions
- Display: "Your NDI: N$ {ndi}"

**CONTINUE Button:**
- OnClick: Navigate to Document Upload page

---

### 7.6 Step 5: Term Loan Document Upload

**Page:** Term Loan Documents Upload Screen  
**API Endpoint:** `POST /api/term-loan/upload-documents`

**User Input:**
- Debit Consent (file upload)
- Latest Payslip (file upload)
- Bank Statement (file upload)

**Request:** `multipart/form-data`
- `debit_consent`: PDF file (max 10MB)
- `payslip`: PDF/Image file (max 10MB)
- `bank_statement`: PDF file (max 10MB)

**Success Response (200):**
\`\`\`json
{
  "success": true,
  "debit_consent_url": "https://...",
  "payslip_url": "https://...",
  "bank_statement_url": "https://..."
}
\`\`\`
- Proceed to Loan Request page

---

### 7.7 Step 6: Loan Request Page (Term)

**Page:** Term Loan Request Screen  
**API Endpoint:** `GET /api/mobile/loan-request?type=term`

**Success Response:** Same structure as nano, but with term-specific values

**UI Differences:**
- Display: "Account Level: TL{current_level}"
- Max amount from `progression_levels.term.L{current_level}`
- Show installment calculation: "Monthly Installment: N$ {total_repayable / loan_period_months}"

**Date Calculations (Show to user):**
- First Deduction Date: {user_selected_date}
- Final Deduction Date: {first_deduction_date + (loan_period_months - 1) months}
- Due Date: {final_deduction_date} (SAME as final deduction date)
- Outstanding Date: {due_date + 31 days}
- Block Date: {outstanding_date + 31 days}

**CONFIRM LOAN AMOUNT Button:**
- OnClick: Proceed to OTP Signature (same as nano)

---

### 7.8 Step 7: Submit Term Loan Application

**API Endpoint:** `POST /api/mobile/loan-request`

**Request:**
\`\`\`json
{
  "loan_amount": 13000,
  "interest_rate": 18.00,
  "processing_fee": 32,
  "lending_society_id": "uuid",
  "rate_basis": "IIR",
  "loan_type": "term",
  "loan_period_months": 6,
  "installment_amount": 2172,
  "first_deduction_date": "2026-03-15",
  "final_deduction_date": "2026-08-15",
  "due_date": "2026-08-15",
  "outstanding_date": "2026-09-15",
  "block_date": "2026-10-16",
  "otp_verification": {
    "otp_id": "uuid"
  }
}
\`\`\`

**Success Response:** Same as nano

---

## 8. STATEMENT & PAYMENT HISTORY

### 8.1 Active Statement Page

**Page:** Active Statement Screen  
**Data Source:** Direct Supabase queries (no dedicated API endpoint)

**Query Logic:**
1. Get authenticated user
2. Fetch ALL nano loans for user: `SELECT * FROM nano_loans WHERE user_id = {user_id}`
3. Fetch ALL term loans for user: `SELECT * FROM term_loans WHERE user_id = {user_id}`
4. Combine both arrays and sort by `created_at DESC`
5. Select the FIRST loan (most recent)

**Display Data:**
\`\`\`javascript
{
  "loan_id": "NL12345678",
  "status": "DU",  // Use getLoanStatusLabel() to get display text
  "loan_amount": 2000,
  "interest_rate": 24.75,
  "interest_amount": 495,
  "processing_fee_amount": 32,
  "total_repayable": 2527,
  "due_date": "2026-03-15",
  "outstanding_date": "2026-04-15",
  "block_date": "2026-05-16",
  "loan_type": "nano",  // or "term"
  "created_at": "2026-01-15T10:00:00Z"
}
\`\`\`

**Also fetch Portfolio Holder banking info:**
1. Get lending society from user
2. Get portfolio_holder_id from society
3. Query `portfolio_holders` table for banking details

\`\`\`javascript
{
  "account_name": "Destiny Group Pty LTD",
  "bank_name": "Bank Windhoek",
  "account_number": "1234567890",
  "account_type": "Cheque",
  "branch_name": "Main Branch",
  "branch_code": "483872"
}
\`\`\`

### 8.2 Active Statement UI

**Loan Details Card:**
- Loan ID: {loan_id}
- Status: {getLoanStatusLabel(status)} with color badge
- Loan Amount: N$ {loan_amount}
- Interest ({interest_rate}%): N$ {interest_amount}
- Processing Fee: N$ {processing_fee_amount}
- **Total Repayable: N$ {total_repayable}** (bold, large)
- Due Date: {formatted_date}

**Payment Information Card:**
- Account Name: {account_name}
- Bank: {bank_name}
- Account Number: {account_number}
- Branch: {branch_name} ({branch_code})
- Account Type: {account_type}

**Buttons:**
- "PAYMENT RECORD" → Navigate to Payment Record page
- "BACK TO PROFILE" → Navigate to Profile page

---

### 8.3 Payment Record Page

**Page:** Payment Record Screen  
**Data Source:** Direct Supabase queries

**Query Logic:**
1. Get user's nano and term loans
2. Get loan UUIDs (id field, not loan_id)
3. Query activity_history: `SELECT * FROM activity_history WHERE entity_id IN ({loan_uuids}) ORDER BY created_at DESC`

**Activity Types to Display:**
- **disbursement**: Show "Loan Disbursed" with total_repayable as balance
- **payment**: Extract amount from note field, show "Payment Received: N$ {amount}"
- **status_change** / **status_update**: Show status change with label

**UI Display:**
Each activity row:
- Date: {formatted_created_at}
- Loan ID: {loan_id}
- Activity: {parsed activity description}
- Amount: N$ {extracted_amount} (if applicable)
- Status badge (if status change)

---

## 9. CREDIT SCORE HISTORY

### 9.1 Credit Score History Page

**Page:** Credit Score History Screen  
**Data Source:** Direct Supabase queries

**Query Logic:**
1. Get authenticated user
2. Fetch user_ratings: `SELECT * FROM user_ratings WHERE user_id = {user_id}`
3. Fetch rating_events: `SELECT * FROM rating_events WHERE user_id = {user_id} ORDER BY created_at DESC`

**Rating Breakdown:**
\`\`\`javascript
{
  "rating": 1.5,  // 0-10 scale
  "score": 15,    // Raw points (0-100)
  "rating_before_due": 5,   // Early payment points
  "rating_on_due": 10,      // On-time payment points
  "rating_past_due": 0,     // Late payment penalties
  "rating_referral": 0      // Referral bonus points
}
\`\`\`

**Rating Events:**
\`\`\`javascript
[
  {
    "id": "uuid",
    "type": "settled_early",
    "event_category": "before_due",
    "points": 5,
    "loan_id": "NL52886717",
    "note": "Early settlement bonus",
    "created_at": "2025-12-30T10:00:00Z"
  },
  {
    "id": "uuid",
    "type": "settled",
    "event_category": "on_due",
    "points": 10,
    "loan_id": "NL95726406",
    "note": "On-time payment",
    "created_at": "2026-01-24T15:30:00Z"
  }
]
\`\`\`

### 9.2 Credit Score History UI

**Current Rating Card (Teal Background):**
- Display: "{rating}/10" with stars (large)
- Score: {score} points

**Score Breakdown:**
- Early Payments: +{rating_before_due} pts (green)
- On-Time Payments: +{rating_on_due} pts (blue)
- Late Penalties: {rating_past_due} pts (red, if any)
- Referral Bonus: +{rating_referral} pts (purple, if any)

**Total Score:** {score}/100

**Rating History (Timeline):**
Each event row:
- Icon based on type (arrow up/down)
- Event type: {type}
- Points: +{points} or -{points}
- Loan ID: {loan_id}
- Date: {formatted_date}

---

## 10. COMMON UTILITIES & STATUS CODES

### 10.1 Membership Status Codes

\`\`\`javascript
const MEMBERSHIP_STATUS = {
  "AA": { label: "Awaiting LS Approval", color: "green" },
  "AP": { label: "Awaiting Community Approval", color: "green" },
  "AP2": { label: "Approved by LS Partner", color: "green" },
  "DE": { label: "Declined", color: "red" },
  "BL": { label: "Blocked", color: "red" },
  "TA": { label: "Total Applications", color: "red" },
  "NR": { label: "No Record", color: "grey" }
}
\`\`\`

### 10.2 Loan Status Codes

\`\`\`javascript
const LOAN_STATUS = {
  "PU": { label: "Paid Up", color: "green" },
  "DU": { label: "Due", color: "green" },
  "AD": { label: "Awaiting Disbursements", color: "blue" },
  "AA": { label: "Awaiting Approval", color: "yellow" },
  "OT": { label: "Outstanding", color: "orange" },
  "NR": { label: "No Record", color: "grey" },
  "BL": { label: "Blocked", color: "red" },
  "DE": { label: "Decline", color: "red" }
}
\`\`\`

### 10.3 Phone Number Formatting

All mobile numbers must be formatted before sending to API:
- Input: "0812345678" or "812345678"
- Format to: "+264812345678"

\`\`\`javascript
function formatPhoneNumber(phone) {
  // Remove spaces and special characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Add +264 if missing
  if (cleaned.startsWith('0')) {
    return `+264${cleaned.substring(1)}`
  } else if (!cleaned.startsWith('264')) {
    return `+264${cleaned}`
  } else {
    return `+${cleaned}`
  }
}
\`\`\`

### 10.4 Date Formatting

- API returns dates in ISO format: "2026-01-24T10:00:00Z"
- Display format: "24 January 2026" or "24 Jan 2026"
- Use Windhoek timezone: "Africa/Windhoek" (GMT+2)

### 10.5 Currency Formatting

- All amounts in Namibian Dollars (NAD)
- Format: "N$ 2,527.00" (comma separators, 2 decimal places)

---

## 11. ERROR HANDLING

### 11.1 Common HTTP Status Codes

**200 OK**: Request successful  
**201 Created**: Resource created successfully  
**400 Bad Request**: Invalid input data  
**401 Unauthorized**: Not authenticated (redirect to login)  
**403 Forbidden**: Authenticated but not authorized (e.g., loan type disabled)  
**404 Not Found**: Resource not found  
**406 Not Acceptable**: RLS policy blocking query  
**409 Conflict**: Resource conflict (e.g., active loan exists)  
**422 Unprocessable Entity**: Validation failed  
**500 Internal Server Error**: Server error

### 11.2 Error Response Format

\`\`\`json
{
  "error": "Error message here",
  "details": "Optional detailed error info"
}
\`\`\`

### 11.3 Error Handling Best Practices

1. **Always check response status** before parsing JSON
2. **Show user-friendly error messages** - Don't expose technical details
3. **Handle network errors** - Show "Connection error" message
4. **Retry failed requests** - Especially for transient errors (500, 503)
5. **Validate input before submission** - Reduce API errors
6. **Log errors for debugging** - Console.log error details

---

## 12. TESTING CHECKLIST

### 12.1 Authentication Flow
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials shows error
- [ ] Forgot password flow sends OTP
- [ ] OTP verification works correctly
- [ ] PIN reset updates password
- [ ] Session persists across app restarts

### 12.2 Registration Flow
- [ ] Referral code validation works
- [ ] Duplicate ID/mobile/email detection works
- [ ] OTP is sent and verified correctly
- [ ] Account creation succeeds
- [ ] Selfie upload works
- [ ] Document upload works (national ID + payslip)
- [ ] User can login after registration

### 12.3 Profile Page
- [ ] Profile data loads correctly
- [ ] Credit rating displays as stars
- [ ] Document status boxes show correct colors
- [ ] Nano loan button enabled/disabled correctly
- [ ] Term loan button enabled/disabled correctly
- [ ] Update documents button state correct

### 12.4 Nano Loan Flow
- [ ] Interest confirmation loads with PIR + SIR
- [ ] IIR is NOT shown for nano loans
- [ ] Proceed button enabled/disabled correctly
- [ ] Loan request page shows correct limits
- [ ] Slider works and calculations update
- [ ] OTP signature flow works
- [ ] Loan submission succeeds
- [ ] Error shown if active loan exists

### 12.5 Term Loan Flow
- [ ] Interest confirmation loads with IIR only
- [ ] PIR/SIR are NOT shown for term loans
- [ ] Term loan options page works
- [ ] Bank details capture works
- [ ] NDI calculation works
- [ ] Document upload (3 files) works
- [ ] Loan request page shows correct limits
- [ ] Installment calculation correct
- [ ] Date calculations correct
- [ ] Loan submission succeeds

### 12.6 Statement & History
- [ ] Active statement shows latest loan
- [ ] Portfolio holder banking info displays
- [ ] Payment record shows all activities
- [ ] Activity types display correctly
- [ ] Dates format correctly

### 12.7 Credit Score History
- [ ] Rating displays as stars
- [ ] Score breakdown shows correctly
- [ ] Rating events list displays
- [ ] Points calculation matches backend

---

## 13. FINAL NOTES

### 13.1 What Mobile App MUST NOT Do

- ❌ Calculate interest rates (backend does this)
- ❌ Calculate credit ratings (backend does this)
- ❌ Determine loan eligibility (backend does this)
- ❌ Calculate progression levels (backend does this)
- ❌ Modify database directly (use APIs only)
- ❌ Use Supabase Service Role Key (ANON key only)
- ❌ Store sensitive data locally (use secure storage for tokens only)

### 13.2 What Mobile App MUST Do

- ✅ Fetch data from APIs
- ✅ Display data exactly as returned by backend
- ✅ Capture user input and validate before submission
- ✅ Handle errors gracefully
- ✅ Format dates, currency, and phone numbers for display
- ✅ Manage authentication state (login/logout)
- ✅ Store user session securely

### 13.3 Backend vs Frontend Responsibilities

**Backend (API):**
- All business logic
- Interest rate calculations
- Credit rating calculations
- Loan eligibility checks
- Progression level determination
- Data validation and storage
- Authentication and authorization

**Frontend (Mobile App):**
- UI/UX implementation
- User input capture
- Data display/formatting
- Navigation between screens
- Client-side validation (UX only, not security)
- Local state management

---

## 14. SUPPORT & RESOURCES

**API Base URL:** `https://appv2.referredby.com.na`

**Environment Variables Needed:**
- `NEXT_PUBLIC_SUPABASE_URL` (for Supabase client)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (for Supabase client)

**Supabase Configuration:**
- Project URL: See environment variables
- ANON Key: See environment variables
- NEVER use Service Role Key in mobile app

**Common Debugging Tips:**
1. Check browser console for `[v0]` debug logs
2. Verify authentication token is being sent
3. Check network tab for API responses
4. Verify Supabase RLS policies allow access
5. Check if loan_access flags are correct

**Contact:**
- For API issues: Check backend logs
- For business logic questions: Refer to V1 alignment documents
- For mobile implementation: This documentation

---

**END OF DOCUMENTATION**

This documentation is complete and covers every endpoint, flow, button, and process in the ReferredBy mobile app. Nothing has been omitted.
