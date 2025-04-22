/**
 * In-memory database for simulation mode
 * Used when MongoDB is not available to provide basic functionality
 */

class MemoryStore {
  constructor() {
    this.users = new Map();
    this.resetTokens = new Map();
    
    // Add a demo user
    this.users.set('demo@example.com', {
      _id: '1',
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@example.com',
      password: '$2a$10$X9oHxZYPWKQM5KVxzd2z7umA4HxHDx3YBnRBsHsIXWvrWCCLtEk3W', // "password"
      userType: 'visitor',
      avatar: '0',
      createdAt: new Date()
    });
    
    console.log('Memory store initialized with demo user: demo@example.com (password: "password")');
  }
  
  async findUserByEmail(email) {
    return this.users.get(email.toLowerCase());
  }
  
  async createUser(userData) {
    const userId = Date.now().toString();
    const newUser = {
      _id: userId,
      ...userData,
      createdAt: new Date()
    };
    
    this.users.set(userData.email.toLowerCase(), newUser);
    return newUser;
  }
  
  async updateUser(email, updates) {
    const user = this.users.get(email.toLowerCase());
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updates
    };
    
    this.users.set(email.toLowerCase(), updatedUser);
    return updatedUser;
  }
  
  async setResetToken(email, token, expiry) {
    this.resetTokens.set(token, {
      email: email.toLowerCase(),
      expiry
    });
  }
  
  async findUserByResetToken(token) {
    const tokenData = this.resetTokens.get(token);
    if (!tokenData) return null;
    
    // Check if token has expired
    if (tokenData.expiry < new Date()) {
      this.resetTokens.delete(token);
      return null;
    }
    
    return this.users.get(tokenData.email);
  }
  
  async removeResetToken(token) {
    this.resetTokens.delete(token);
  }
  
  // For debugging - get all users (DO NOT USE IN PRODUCTION)
  getAllUsers() {
    return Array.from(this.users.values());
  }
}

module.exports = new MemoryStore();
