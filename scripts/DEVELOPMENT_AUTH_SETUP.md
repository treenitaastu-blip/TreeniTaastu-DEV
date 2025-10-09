# 🔐 Development Authentication Setup

## 🎯 **The Problem**
Your existing users in the development database don't have passwords set up for local development. The authentication system is connected to Supabase Auth, but the passwords aren't accessible for local testing.

## 🛠️ **Solution: Create a Development User**

### **Option 1: Create New Test Account (Recommended)**

1. **Go to**: http://localhost:8081
2. **Click**: "Registreeri" (Sign Up) or "Loo konto" (Create Account)
3. **Enter**:
   - Email: `dev@treenitaastu.com` (or your email)
   - Password: `devpassword123` (or any password)
4. **Complete** the signup process
5. **Login** with your new credentials

### **Option 2: Use Supabase Dashboard**

1. **Go to**: [Supabase Dashboard](https://supabase.com/dashboard)
2. **Navigate to**: Authentication > Users
3. **Click**: "Add user"
4. **Create user**:
   - Email: `dev@treenitaastu.com`
   - Password: `devpassword123`
   - Confirm password
5. **Save** the user
6. **Login** at http://localhost:8081

### **Option 3: Reset Existing User Password**

1. **Go to**: http://localhost:8081
2. **Click**: "Logi sisse" (Login)
3. **Click**: "Unustasid parooli?" (Forgot password)
4. **Enter**: `kraavi.henri@gmail.com` (or any existing email)
5. **Check email** for reset link
6. **Set new password**
7. **Login** with new credentials

## 🎯 **Quick Development Setup**

### **Step 1: Create Test Account**
```bash
# Go to your app
http://localhost:8081

# Click "Registreeri" (Sign Up)
# Use: dev@treenitaastu.com
# Password: devpassword123
```

### **Step 2: Test Admin Features**
If you need admin access:
1. **Create account** first
2. **Contact me** to set admin role in database
3. **Or use Supabase Dashboard** to change user role

## 🔧 **Development Authentication Flow**

### **What Happens:**
1. **Signup** → Creates user in Supabase Auth
2. **Login** → Authenticates with Supabase
3. **Session** → Maintains login state
4. **Database** → User data is linked to auth

### **Why Existing Users Don't Work:**
- **Production passwords** aren't accessible locally
- **Auth tokens** are tied to production environment
- **Local development** needs fresh authentication

## 🚀 **Recommended Development Flow**

### **For Testing:**
1. **Create new account** with your email
2. **Use simple password** like `dev123`
3. **Test all features** as regular user
4. **Request admin access** if needed

### **For Admin Testing:**
1. **Create account** first
2. **I'll set admin role** in database
3. **Access admin dashboard** and features

## 🎯 **Next Steps**

1. **Go to**: http://localhost:8081
2. **Click**: "Registreeri" (Sign Up)
3. **Create account** with your email
4. **Start developing** and testing!

**This is the standard development approach - create fresh accounts for local testing! 🚀**
