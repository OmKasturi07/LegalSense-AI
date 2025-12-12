import { User } from '../types';

const USERS_KEY = 'legalsense_users';
const CURRENT_USER_KEY = 'legalsense_current_user';

interface StoredUser extends User {
  password: string; // In a real app, this would be hashed. For this demo, we store as is (simulated).
}

export const authService = {
  // Get currently logged in user
  getCurrentUser: (): User | null => {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  },

  // Login
  login: async (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const users: StoredUser[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
          const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
          
          if (user) {
            const { password, ...safeUser } = user;
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
            resolve(safeUser);
          } else {
            reject(new Error("Invalid email or password"));
          }
        } catch (e) {
          reject(new Error("Login failed"));
        }
      }, 800); // Simulate network delay
    });
  },

  // Signup
  signup: async (name: string, email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const users: StoredUser[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
          
          if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            reject(new Error("Email already exists"));
            return;
          }

          const newUser: StoredUser = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            name,
            email,
            password
          };

          users.push(newUser);
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
          
          const { password: _, ...safeUser } = newUser;
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
          
          resolve(safeUser);
        } catch (e) {
          reject(new Error("Signup failed"));
        }
      }, 1000); // Simulate network delay
    });
  },

  // Logout
  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};