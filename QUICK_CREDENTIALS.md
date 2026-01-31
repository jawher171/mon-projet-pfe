# 🧪 MOCK ACCOUNTS - Quick Reference

## Copy & Paste Ready

### Admin Access
```
Email:    admin@inventaire.ma
Password: admin123
```

### Stock Manager Access  
```
Email:    stock@inventaire.ma
Password: stock123
```

### Operator Access
```
Email:    operator@inventaire.ma
Password: operator123
```

---

## All Available Accounts

| # | Email | Password | Role |
|---|-------|----------|------|
| 1 | admin@inventaire.ma | admin123 | 👨‍💼 Admin |
| 2 | admin2@inventaire.ma | admin123 | 👨‍💼 Admin |
| 3 | stock@inventaire.ma | stock123 | 📦 Stock Manager |
| 4 | stock2@inventaire.ma | stock123 | 📦 Stock Manager |
| 5 | operator@inventaire.ma | operator123 | 🔧 Operator |
| 6 | operator2@inventaire.ma | operator123 | 🔧 Operator |

---

## 🚀 Quick Test

1. Open: http://localhost:4200/auth/login
2. Use any account from above
3. Click "Login"
4. Explore the app!

---

## Role-Based Access

```
Route               Admin   Stock Mgr   Operator
─────────────────────────────────────────────────
/dashboard          ✅       ✅         ❌
/products           ✅       ✅         ✅
/movements          ✅       ✅         ❌
/alerts             ✅       ✅         ❌
/sites              ✅       ✅         ❌
/scanner            ✅       ❌         ✅
/members (admin)    ✅       ❌         ❌
```

---

## ✨ What's New

✅ All passwords are now validated against mock accounts  
✅ Credentials display on login page (click to copy)  
✅ 6 test accounts (2 per role)  
✅ Same passwords for same role (easy to remember)  
✅ Visual feedback when copying emails  
✅ Zero compilation errors  

---

## 🎯 For Each Role

### 👨‍💼 Admin
- Full system access
- Manage team members  
- Assign roles
- Access /members panel

### 📦 Stock Manager  
- Inventory management
- Movement management
- Alert management
- Cannot access /scanner or /members

### 🔧 Operator
- Barcode scanning
- Entry/exit recording
- Limited access
- Cannot access /movements or /alerts

---

## 📝 Notes

- Passwords must match EXACTLY
- Invalid credentials show error
- All credentials visible on login page
- This is development/testing only

---

**Happy testing!** 🎉

---

## 📄 Full Credentials File

See [LOGIN_CREDENTIALS.md](LOGIN_CREDENTIALS.md) for the complete list.
