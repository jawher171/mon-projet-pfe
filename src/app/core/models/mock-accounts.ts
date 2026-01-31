/**
 * Mock User Accounts
 * Pre-configured test accounts for each role
 * Use these credentials for testing different role capabilities
 */

import { User } from '../models/user.model';
import { UserRole } from '../models/role.model';

export interface MockAccount {
  email: string;
  password: string;
  description: string;
  role: UserRole;
}

/** Pre-defined mock accounts for testing */
export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    email: 'admin@inventaire.ma',
    password: 'admin123',
    description: 'Full system access and user management',
    role: 'admin'
  },
  {
    email: 'admin2@inventaire.ma',
    password: 'admin123',
    description: 'Alternative admin account',
    role: 'admin'
  },
  {
    email: 'stock@inventaire.ma',
    password: 'stock123',
    description: 'Inventory and stock management',
    role: 'gestionnaire_de_stock'
  },
  {
    email: 'stock2@inventaire.ma',
    password: 'stock123',
    description: 'Secondary stock manager account',
    role: 'gestionnaire_de_stock'
  },
  {
    email: 'operator@inventaire.ma',
    password: 'operator123',
    description: 'Barcode scanning and basic operations',
    role: 'operateur'
  },
  {
    email: 'operator2@inventaire.ma',
    password: 'operator123',
    description: 'Secondary operator account',
    role: 'operateur'
  }
];

/** Get mock user data by role */
export function getMockUserByRole(role: UserRole): Omit<User, 'id' | 'createdAt'> {
  const firstNames: Record<UserRole, string> = {
    admin: 'Ahmed',
    gestionnaire_de_stock: 'Fatima',
    operateur: 'Mohammed'
  };

  const lastNames: Record<UserRole, string> = {
    admin: 'Ben Ali',
    gestionnaire_de_stock: 'Zahra',
    operateur: 'Salah'
  };

  const departments: Record<UserRole, string> = {
    admin: 'Management',
    gestionnaire_de_stock: 'Warehouse',
    operateur: 'Operations'
  };

  const phones: Record<UserRole, string> = {
    admin: '+212 661 123 456',
    gestionnaire_de_stock: '+212 661 234 567',
    operateur: '+212 661 345 678'
  };

  return {
    email: '',
    firstName: firstNames[role],
    lastName: lastNames[role],
    role: role,
    avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
    department: departments[role],
    phone: phones[role],
    status: 'active',
    lastLogin: new Date()
  };
}

/** Get mock account by email */
export function getMockAccount(email: string): MockAccount | undefined {
  return MOCK_ACCOUNTS.find(account => account.email === email);
}

/** Get all mock accounts by role */
export function getMockAccountsByRole(role: UserRole): MockAccount[] {
  return MOCK_ACCOUNTS.filter(account => account.role === role);
}
