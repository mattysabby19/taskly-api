# 🚀 Vercel Deployment Guide for EquiTaskly API

## 💰 Cost: **100% FREE** for your use case!

**Vercel Free Tier includes:**
- ✅ 100GB bandwidth/month
- ✅ 100 serverless function invocations/day (unlimited for development)
- ✅ Automatic HTTPS & Global CDN
- ✅ Custom domains
- ✅ GitHub integration with auto-deployments

---

## 🎯 Quick Deployment Steps

### 1. **Install Vercel CLI**
```bash
cd EquiTaskly-Api
npm install -g vercel
# OR use the dev dependency
npm install
```

### 2. **Login to Vercel**
```bash
vercel login
```

### 3. **Set Environment Variables**
**Option A: Using Vercel CLI**
```bash
vercel env add SUPABASE_URL
# Paste: https://ngdmlxqmtxqbmuhqdnok.supabase.co

vercel env add SUPABASE_SERVICE_KEY
# Paste your Supabase service key

vercel env add SUPABASE_ANON_KEY  
# Paste your Supabase anon key

vercel env add JWT_SECRET
# Paste: CastleGreenSilverLightningForest

vercel env add ENCRYPTION_KEY
# Paste: ElephantRainbowButterflyMountain

vercel env add NODE_ENV
# Paste: production
```

**Option B: Using Vercel Dashboard**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Create new project → Import from Git
3. Add environment variables in Settings → Environment Variables

### 4. **Deploy**
```bash
# Deploy to production
vercel --prod

# OR for development preview
vercel
```

---

## 📱 Update Mobile App Configuration

After deployment, update your mobile app's API configuration:

**File: `EquiTaskly-Mobile/utils/apiConfig.ts`**
```typescript
const getApiUrl = (): string => {
  // Production Vercel URL (update this after deployment)
  if (!__DEV__) {
    return 'https://your-api-name.vercel.app/api';
  }
  
  // Development configurations...
  // (rest of your existing code)
};
```

---

## 🔧 Local Development with Vercel

```bash
# Start local Vercel development server
npm run dev
# This runs: vercel dev

# Your API will be available at:
# http://localhost:3000/api/health
# http://localhost:3000/api/auth/signup
# http://localhost:3000/api/auth/login
```

---

## 🌐 Your API Endpoints After Deployment

Once deployed, your API will be available at:
```
https://your-project-name.vercel.app/api/health
https://your-project-name.vercel.app/api/auth/signup
https://your-project-name.vercel.app/api/auth/login
https://your-project-name.vercel.app/api/members/me
https://your-project-name.vercel.app/api/tasks
```

---

## 🧪 Testing Your Deployment

### 1. **Health Check**
```bash
curl https://your-project-name.vercel.app/api/health
```

### 2. **Test Signup**
```bash
curl -X POST https://your-project-name.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "name": "Test User"
  }'
```

### 3. **Test Mobile Connectivity**
```bash
curl https://your-project-name.vercel.app/api/test
```

---

## 📊 Monitoring & Logs

- **Real-time logs**: `vercel logs`
- **Function logs**: Available in Vercel dashboard
- **Performance**: Built-in analytics in Vercel dashboard

---

## 🔄 Continuous Deployment

**Option 1: GitHub Integration (Recommended)**
1. Push your code to GitHub
2. Import repository in Vercel dashboard
3. Automatic deployments on every push to main branch

**Option 2: Manual Deployments**
```bash
# Deploy manually
vercel --prod
```

---

## 🚨 Important Notes

1. **Database**: Your Supabase database will work perfectly with Vercel
2. **CORS**: Already configured for mobile app access
3. **Authentication**: JWT tokens will work seamlessly
4. **Rate Limiting**: Consider implementing for production
5. **Monitoring**: Set up error tracking (Sentry, etc.)

---

## 🎉 Success Indicators

After successful deployment:
- ✅ `https://your-api.vercel.app/api/health` returns 200
- ✅ Mobile app can connect to your new API URL  
- ✅ Signup/Login works from mobile app
- ✅ Tasks can be created and retrieved
- ✅ Real-time updates work properly

---

## 🆘 Troubleshooting

**Common Issues:**

1. **Environment Variables Not Set**
   ```bash
   vercel env ls  # List all env vars
   vercel env add VARIABLE_NAME  # Add missing vars
   ```

2. **CORS Issues**
   - Already handled in your current code
   - Mobile apps can access from any origin (*)

3. **Database Connection Issues**
   - Verify Supabase credentials in Vercel dashboard
   - Check Supabase project is active

4. **Function Timeout**
   - Default 30s should be enough for your use case
   - Can be increased in Vercel settings if needed

---

## 💡 Next Steps After Deployment

1. Update mobile app with production API URL
2. Test all functionality end-to-end
3. Set up custom domain (optional, but recommended)
4. Configure monitoring and error tracking
5. Set up backup/recovery procedures

Your API is production-ready and will scale automatically! 🎉