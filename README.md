# NeuroAuth: Usage-Focused Flow Guide

## Overview

NeuroAuth is a seed-based, client-side cryptographic identity system. The core of the system is a single secret: the **seed phrase**. All cryptographic operations and authentication derive from this seed, which is never shared with the backend.

---

## Core Principle

- **Seed phrase** is generated once at signup.
- From the seed, the client derives:
  - A login hash (for authentication)
  - An AES encryption key (to protect the private key)
  - A PGP key pair (to encrypt/decrypt user data)
- **Security:** The seed phrase and unencrypted private key never leave the client.

---

## Signup Flow

### High-Level Signup API (Recommended)

**`signUp(seedPhrase)`**

- **When:** When the user submits the registration form.
- **What it does:** Complete signup flow that orchestrates all cryptographic operations and automatically sends registration data to the backend API.
- **Returns:** Backend registration response.
- **Note:** This is the recommended function for signup as it handles both cryptographic operations and API communication.

### Signup Step-by-Step Flow (For Understanding)

1. **`generateSeedPhrase()`**
   - **When:** At signup, before anything else.
   - **Why:** Creates the user's master secret. All future authentication and encryption depend on this.
   - **Action:** Generates a 16-word seed phrase from the word list (300 words available in `data/Seeds.js`). Show the generated seed phrase to the user for safekeeping.

2. **`deriveSeedsHash(seedPhrase)`**
   - **When:** At signup.
   - **Why:** Backend should never receive the seed phrase. Instead, a hash is sent.
   - **Action:** Hash the seed phrase (SHA-256) and send the hash to the backend as the login identifier.

3. **`deriveEncryptionKey(seedPhrase)`**
   - **When:** At signup (with a new random salt).
   - **Why:** To encrypt the private PGP key before storage.
   - **Action:** Use PBKDF2 to derive a secure AES-256 key from the seed phrase and a random salt. The salt is stored on the backend.

4. **`generateKeyPair()`**
   - **When:** Only at signup.
   - **Why:** Each user needs a unique asymmetric key pair for data encryption/decryption.
   - **Action:** Generate a PGP key pair (RSA 2048-bit).

5. **`encryptPrivateKey(privateKey, encryptionKey)`**
   - **When:** Immediately after key generation.
   - **Why:** The private key must never be stored in plaintext.
   - **Action:** Encrypt the private key with AES-GCM. Send the encrypted key, IV, and tag to the backend.

6. **`performSignup(seedPhrase)`**
   - **When:** When orchestrating signup operations (used internally by `signUp`).
   - **What it does:** Orchestrates all the above steps, stores the AES key locally, and prepares data for backend submission.

7. **`register({ loginHash, publicKey, encryptedPrivateKey, ... })`**
   - **When:** Called automatically by `signUp()` after cryptographic operations.
   - **What it does:** Sends registration data to the backend API endpoint (`/api/auth/register/`).
   - **Backend receives:** Login hash, public key, encrypted private key (with IV and tag), and encryption salt.

---

## Login Flow

### High-Level Login API (Recommended)

**`signIn(seedPhrase)`**

- **When:** When the user submits the login form.
- **What it does:** Complete login flow that derives the login hash, authenticates with the backend, and restores the cryptographic session.
- **Returns:** Login response with success status and user crypto data.
- **Note:** This is the recommended function for login as it handles both authentication and session restoration.

### Login Step-by-Step Flow (For Understanding)

1. **`deriveSeedsHash(seedPhrase)`**
   - **When:** At login.
   - **Why:** The same seed phrase always produces the same login hash, used for authentication.
   - **Action:** Hash the seed phrase (SHA-256) to generate the login identifier.

2. **`login({ passPhrase })`**
   - **When:** Called automatically by `signIn()` after deriving the login hash.
   - **What it does:** Sends the login hash to the backend API endpoint (`/auth/login/`) for authentication.
   - **Backend receives:** The pass phrase hash (login identifier).
   - **Backend returns:** Access token and encrypted cryptographic data (public key, encrypted private key, IV, tag, salt).

3. **`handleSuccessfulLogin(loginResponse, seedPhrase)`**
   - **When:** After backend confirms authentication (called automatically by `signIn()`).
   - **Action:** Store access token, receive encrypted crypto data, re-derive AES key using stored salt, and store the AES key locally.

4. **`decryptPrivateKey(...)`**
   - **When:** After login, whenever the private key is needed (e.g., for decrypting user data).
   - **Why:** Decrypts the private key in memory for use; never stores it in plaintext.

---

## Normal Application Usage (After Login)

- **`encryptAnyData(data)`**
  - **When:** Before storing user data on the backend.
  - **Why:** Ensures all user data is encrypted before leaving the client.
  - **How:** Uses the stored public key to produce PGP-encrypted data.

- **`decryptAnyData(encryptedData)`**
  - **When:** When fetching encrypted data from the backend.
  - **How:** Decrypts the private key using AES, then decrypts user data using PGP.

---

## Logout Flow

- **`logoutUser()`**
  - **When:** When the user logs out.
  - **Why:** Removes all sensitive material from the browser.
  - **Action:** Clears access token, encrypted crypto metadata, and AES encryption key.

---

## Security Guarantees

- The seed phrase and private key are never sent to the backend.
- The private key is always encrypted at rest.
- Decryption happens only on the client, after successful login.

---

## API Integration

NeuroAuth includes backend API integration functions that communicate with the identity server:

- **`register({ loginHash, publicKey, encryptedPrivateKey, ... })`** - Sends registration data to `/api/auth/register/`
- **`login({ passPhrase })`** - Authenticates with `/auth/login/` using the login hash

The backend API URL is configured in `config/constants.js` as `IDENTITY_SERVER_URL`.

---

## Configuration

- **Identity Server URL**: Configured in `config/constants.js`
  - Default: `https://api.prod.auth.neuronus.net/api`
  - Used by login and registration API functions

- **Seed Words**: Available in `data/Seeds.js`
  - Contains 300 words used for seed phrase generation
  - Each seed phrase consists of 16 randomly selected words from this list

---

## Summary Table

| Function                          | When Used                | Purpose/Action                                                                 |
|-----------------------------------|--------------------------|--------------------------------------------------------------------------------|
| **High-Level API Functions**      |                          |                                                                                |
| `signUp(seedPhrase)`              | Signup                   | Complete signup flow with backend API integration (recommended)                |
| `signIn(seedPhrase)`              | Login                    | Complete login flow with backend API integration (recommended)                 |
| **Core Cryptographic Functions**  |                          |                                                                                |
| `generateSeedPhrase()`            | Signup                   | Create master secret (seed phrase from 300-word list)                          |
| `deriveSeedsHash(seedPhrase)`     | Signup/Login             | Derive login hash for backend authentication                                   |
| `deriveEncryptionKey(seedPhrase)` | Signup/Login             | Derive AES key for private key encryption/decryption                           |
| `generateKeyPair()`               | Signup                   | Generate PGP key pair (RSA 2048-bit)                                           |
| `encryptPrivateKey()`             | Signup                   | Encrypt private key before backend storage                                     |
| `performSignup()`                 | Signup                   | Orchestrate signup cryptographic operations                                    |
| `handleSuccessfulLogin()`         | Login                    | Restore session, re-derive keys, prepare for decryption                        |
| `decryptPrivateKey()`             | After login              | Decrypt private key in memory for use                                          |
| **Data Encryption Functions**     |                          |                                                                                |
| `encryptAnyData()`                | After login              | Encrypt user data before sending to backend                                    |
| `decryptAnyData()`                | After login              | Decrypt user data fetched from backend                                         |
| **Session Management**            |                          |                                                                                |
| `logoutUser()`                    | Logout                   | Clear all sensitive data from client                                           |
| **API Functions**                 |                          |                                                                                |
| `register({ ... })`               | Signup (internal)        | Send registration data to backend API                                          |
| `login({ passPhrase })`           | Login (internal)         | Authenticate with backend API                                                  |

---

## Project Structure

```text
neruoauth/
├── index.js              # Main cryptographic operations and high-level API
├── api/
│   ├── login.js          # Login API function
│   └── register.js       # Registration API function
├── config/
│   └── constants.js      # Configuration (identity server URL)
└── data/
    └── Seeds.js          # Seed words list (300 words)
```

---

For more details, see the code in [`index.js`](index.js).
