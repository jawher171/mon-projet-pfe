# 🧪 Mock Test Accounts

## Complete List of Test Credentials

All mock accounts are pre-configured for testing different roles and features.

---

## 👨‍💼 ADMINISTRATOR ACCOUNTS

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@inventaire.ma | admin123 | Admin | Full system access and user management |
| admin2@inventaire.ma | admin123 | Admin | Alternative admin account |

**Features Available:**
- ✅ Access all routes
- ✅ Manage team members
- ✅ Assign roles
- ✅ View members panel
- ✅ Full inventory control
- ✅ Create/edit/delete members

---

## 📦 STOCK MANAGER ACCOUNTS

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| stock@inventaire.ma | stock123 | Gestionnaire de Stock | Inventory and stock management |
| stock2@inventaire.ma | stock123 | Gestionnaire de Stock | Secondary stock manager account |

**Features Available:**
- ✅ View dashboard
- ✅ Manage movements
- ✅ Manage alerts
- ✅ View reports
- ✅ View products
- ✅ View sites
- ❌ Cannot access /members
- ❌ Cannot access /scanner

---

## 🔧 OPERATOR ACCOUNTS

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| operator@inventaire.ma | operator123 | Operateur | Barcode scanning and basic operations |
| operator2@inventaire.ma | operator123 | Operateur | Secondary operator account |

**Features Available:**
- ✅ View products
- ✅ View sites
- ✅ Scan barcodes
- ✅ Record entry/exit
- ❌ Cannot access /dashboard
- ❌ Cannot access /movements
- ❌ Cannot access /alerts
- ❌ Cannot access /members

---

## 🚀 Quick Copy & Paste

### Admin
```
Email:    admin@inventaire.ma
Password: admin123
```

### Stock Manager
```
Email:    stock@inventaire.ma
Password: stock123
```

### Operator
```
Email:    operator@inventaire.ma
Password: operator123
```

---

## 🧪 Testing Scenarios

### Scenario 1: Test Admin Full Access
```
1. Login with: admin@inventaire.ma / admin123
2. Navigate to: /members
3. Expected: See all team members + management options
4. Try: Add new member, change roles, delete member
```

### Scenario 2: Test Stock Manager Access Control
```
1. Login with: stock@inventaire.ma / stock123
2. Navigate to: /movements
3. Expected: Access Allowed ✓
4. Navigate to: /scanner
5. Expected: Access Denied ❌ (redirected to /)
```

### Scenario 3: Test Operator Restrictions
```
1. Login with: operator@inventaire.ma / operator123
2. Navigate to: /scanner
3. Expected: Access Allowed ✓
4. Navigate to: /movements
5. Expected: Access Denied ❌ (redirected to /)
6. Navigate to: /members
7. Expected: Access Denied ❌ (admin only)
```

### Scenario 4: Test Multiple Admin Accounts
```
1. Login with: admin@inventaire.ma / admin123
2. Go to: /members
3. Login with: admin2@inventaire.ma / admin123
4. Expected: Both accounts have full admin access
```

---

## 📋 Test Credentials Display

When you visit the login page, all test credentials are displayed in a convenient dashboard:

```
🧪 Test Credentials
├─ Administrator Accounts (2)
│  ├─ admin@inventaire.ma
│  └─ admin2@inventaire.ma
├─ Stock Manager Accounts (2)
│  ├─ stock@inventaire.ma
│  └─ stock2@inventaire.ma
└─ Operator Accounts (2)
   ├─ operator@inventaire.ma
   └─ operator2@inventaire.ma
```

**Click on any email to copy it to clipboard!**

---

## 🔐 Security Notes

⚠️ **Current Status:** These are mock accounts for development and testing only.

✅ **Features:**
- All passwords are the same for each role (for easy testing)
- No real authentication against a database
- LocalStorage token storage
- Mock JWT tokens

⚠️ **For Production:**
- Remove mock accounts or disable demo mode
- Implement real authentication
- Use password hashing
- Implement proper token generation
- Use secure HTTP only cookies for tokens

---

## 🎯 How Credentials Work

### Login Flow
```
1. User enters email and password
2. System checks against MOCK_ACCOUNTS list
3. If email & password match:
   ✓ Get user data for that role
   ✓ Create mock user object
   ✓ Generate mock JWT token
   ✓ Store in localStorage
   ✓ Redirect to /dashboard
4. If no match:
   ✗ Show error: "Invalid email or password"
```

### Credential Validation
```
Password must EXACTLY match:
- admin@inventaire.ma ← needs → admin123
- stock@inventaire.ma ← needs → stock123
- operator@inventaire.ma ← needs → operator123

❌ admin@inventaire.ma with password "anything" = FAIL
✓ admin@inventaire.ma with password "admin123" = SUCCESS
```

---

## 📂 Related Files

- **mock-accounts.ts** - Contains all mock account definitions
- **auth.service.ts** - Validates credentials against mock accounts
- **test-credentials.component.ts** - Displays credentials on login page
- **login.component.html** - Login form with credentials display

---

## 💡 Tips for Testing

1. **Copy Email Easily**
   - Click on any email in the credentials display
   - It automatically copies to your clipboard

2. **Test Different Roles**
   - Use different accounts to test role-based features
   - Each role has different access levels

3. **Try Invalid Credentials**
   - Login with admin@inventaire.ma and wrong password
   - Should show: "Invalid email or password"

4. **View Current User**
   - After login, check the top-right corner
   - Shows current user role and avatar

5. **Quick Access**
   - Credentials are shown on every login page
   - No need to remember passwords
   - Just copy and paste

---

## 🔄 Switching Accounts

```
1. Click Logout (top-right)
2. Go back to Login
3. Use different credentials
4. You now have a different role!
```

---

## ❓ Frequently Asked Questions

**Q: Can I create custom mock accounts?**
A: Yes! Edit `src/app/core/models/mock-accounts.ts` and add new accounts to the MOCK_ACCOUNTS array.

**Q: Do I need to use these exact passwords?**
A: Yes, the password must match exactly. But you can change them in `mock-accounts.ts`.

**Q: What if I forget a password?**
A: Check the login page - all credentials are displayed there!

**Q: Can I use any email?**
A: No, only emails in the MOCK_ACCOUNTS list will work.

**Q: Will these accounts work in production?**
A: No, these are development-only mock accounts. Replace with real authentication for production.

---

## 🎉 You're Ready!

Start testing with any of the provided mock accounts. All credentials are displayed on the login page for convenience.

**Happy testing!** 🚀
