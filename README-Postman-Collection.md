# EquiTaskly Production API - Postman Collection

## 📦 Files Included

1. **`EquiTaskly-Production-API.postman_collection.json`** - Complete API collection
2. **`EquiTaskly-Production.postman_environment.json`** - Environment variables
3. **`README-Postman-Collection.md`** - This documentation

## 🚀 Quick Setup

### Step 1: Import into Postman
1. Open Postman
2. Click **Import** button
3. Drag and drop both JSON files or click **Upload Files**
4. Select both files:
   - `EquiTaskly-Production-API.postman_collection.json`
   - `EquiTaskly-Production.postman_environment.json`

### Step 2: Set Environment
1. In Postman, select **"EquiTaskly Production Environment"** from the environment dropdown
2. The `baseUrl` is pre-configured for production: `https://equitaskly-api.vercel.app`
3. For local development, enable `localUrl` instead: `http://localhost:4000`

### Step 3: Start Testing
1. Run **"User Login"** request first to get authentication token
2. Token will be automatically saved to environment variables
3. All subsequent requests will use the token automatically

## 📋 Collection Structure

### 🔐 Authentication
- **Health Check** - Verify API server status
- **User Signup** - Create new user accounts  
- **User Login** - Authenticate and get JWT token
- **Get User Profile** - Retrieve user information

### 📝 Task Management
- **Create Task (snake_case)** - Backend format task creation
- **Create Task (camelCase)** - Frontend format with field transformation
- **Get Tasks for Group** - Retrieve group-specific tasks
- **Get All Tasks** - Retrieve user's tasks across groups
- **Update Task** - Modify existing tasks (PATCH)
- **Complete Task** - Mark tasks as completed
- **Delete Task** - Remove tasks permanently

### 🧪 Field Transformation Tests
- **Priority Format Tests** - Test all priority variations (Low/Medium/High, low/medium/high)
- **camelCase → snake_case** - Verify field transformation works

### 📊 Load Tests
- **Create Multiple Tasks** - Performance testing with random data

## ✅ Verified Working Features

All endpoints in this collection have been **verified working** for production deployment:

- ✅ **Authentication Flow** - JWT tokens, login/signup
- ✅ **Task CRUD Operations** - Create, Read, Update, Delete
- ✅ **Field Transformation** - camelCase ↔ snake_case compatibility
- ✅ **Priority Validation** - All case formats accepted
- ✅ **Group-based Task Management** - Group-specific operations
- ✅ **Error Handling** - Proper error responses
- ✅ **CORS Headers** - Cross-origin request support

## 🔧 Environment Variables

| Variable | Description | Auto-populated |
|----------|-------------|----------------|
| `baseUrl` | Production API URL (https://equitaskly-api.vercel.app) | Manual |
| `localUrl` | Local development URL (http://localhost:4000) | Manual |
| `authToken` | JWT authentication token | ✅ Yes |
| `userId` | Current user ID | ✅ Yes |
| `userEmail` | Current user email | ✅ Yes |
| `taskId1` | First test task ID | ✅ Yes |
| `taskId2` | Second test task ID | ✅ Yes |
| `groupId` | Test group ID | Manual |

## 🎯 Test Automation

The collection includes automated tests that verify:
- Response status codes
- Response structure validation
- Field transformation verification
- Authentication token handling
- Error response validation

## 📱 Production Deployment

The collection is pre-configured for production:

1. **Production URL Already Set:**
   ```
   baseUrl = https://equitaskly-api.vercel.app
   ```

2. **Test Production Endpoints:**
   - Run the entire collection against production
   - Verify all tests pass
   - Check response times are acceptable

3. **Monitor Key Endpoints:**
   - `/api/health` - Server health
   - `/api/auth/login` - Authentication
   - `/api/tasks` - Core functionality

## 🛡️ Security Notes

- JWT tokens are automatically handled
- All requests include proper authorization headers
- CORS is configured for cross-origin requests
- No sensitive data is logged in tests

## 🎉 Ready for Production

This collection represents the **complete working API** that resolves the "add task not working" issue. All endpoints have been tested and verified for production deployment.

### Core Functionality Verified:
- ✅ User authentication and JWT management
- ✅ Task creation with both field formats
- ✅ Task retrieval and filtering
- ✅ Task updates and completion
- ✅ Field transformation between frontend/backend
- ✅ Priority validation for all formats
- ✅ Group-based task management

**Status: 🚀 PRODUCTION READY**