const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Example: User Registration
async function registerUser() {
  try {
    const response = await axios.post(`${API_BASE}/auth/register`, {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!'
    });
    
    console.log('Registration successful!');
    console.log('Token:', response.data.access_token);
    console.log('User:', response.data.user);
    
    return response.data.access_token;
  } catch (error) {
    console.error('Registration failed:', error.response?.data || error.message);
  }
}

// Example: User Login
async function loginUser() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'newuser@example.com',
      password: 'StrongPass123!'
    });
    
    console.log('Login successful!');
    console.log('Token:', response.data.access_token);
    
    return response.data.access_token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
  }
}

// Example: Get User Profile
async function getProfile(token) {
  try {
    const response = await axios.get(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Profile:', response.data);
  } catch (error) {
    console.error('Failed to get profile:', error.response?.data || error.message);
  }
}

// Example: Update Profile
async function updateProfile(token) {
  try {
    const response = await axios.put(`${API_BASE}/auth/profile`, {
      username: 'updateduser',
      bio: 'This is my updated bio',
      avatar: 'https://example.com/new-avatar.jpg'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Profile updated:', response.data);
  } catch (error) {
    console.error('Failed to update profile:', error.response?.data || error.message);
  }
}

// Example: Change Password
async function changePassword(token) {
  try {
    const response = await axios.put(`${API_BASE}/auth/change-password`, {
      currentPassword: 'StrongPass123!',
      newPassword: 'NewStrongPass123!',
      confirmPassword: 'NewStrongPass123!'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Password changed:', response.data);
  } catch (error) {
    console.error('Failed to change password:', error.response?.data || error.message);
  }
}

// Example: Password Reset Flow
async function passwordResetFlow() {
  // Step 1: Request password reset
  try {
    await axios.post(`${API_BASE}/auth/forgot-password`, {
      email: 'newuser@example.com'
    });
    
    console.log('Password reset email sent');
    
    // Step 2: Reset password (normally done via email link)
    // This would use the token from the email
    const response = await axios.post(`${API_BASE}/auth/reset-password`, {
      token: 'token-from-email',
      newPassword: 'AnotherNewPass123!',
      confirmPassword: 'AnotherNewPass123!'
    });
    
    console.log('Password reset:', response.data);
  } catch (error) {
    console.error('Password reset failed:', error.response?.data || error.message);
  }
}

// Example: Admin suspend user
async function suspendUser(adminToken, userId) {
  try {
    const response = await axios.post(`${API_BASE}/auth/admin/suspend-user`, {
      userId: userId,
      reason: 'Violation of community guidelines',
      duration: '7d'
    }, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    console.log('User suspended:', response.data);
  } catch (error) {
    console.error('Failed to suspend user:', error.response?.data || error.message);
  }
}

// Example: Admin update reputation
async function updateReputation(adminToken, userId) {
  try {
    const response = await axios.put(`${API_BASE}/auth/admin/reputation`, {
      userId: userId,
      action: 'increase',
      amount: 10,
      reason: 'Helpful contributions to the community'
    }, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    console.log('Reputation updated:', response.data);
  } catch (error) {
    console.error('Failed to update reputation:', error.response?.data || error.message);
  }
}

// Run examples
async function runExamples() {
  console.log('=== Authentication Examples ===\n');
  
  // Register a new user
  const token = await registerUser();
  
  if (token) {
    // Login with the new user
    await loginUser();
    
    // Get profile
    await getProfile(token);
    
    // Update profile
    await updateProfile(token);
    
    // Change password
    await changePassword(token);
    
    // Password reset flow
    await passwordResetFlow();
  }
  
  console.log('\n=== Examples completed ===');
}

// Run the examples
runExamples().catch(console.error);
