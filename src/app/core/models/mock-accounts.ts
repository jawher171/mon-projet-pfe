/**
 * Mock User Accounts - Diagram: Utilisateur (nom, prenom, email)
 * Test credentials for sujet PFE (admin, gestionnaire_de_stock, operateur)
 */
import type { User } from './user.model';
import type { UserRole } from './role.model';

export interface MockAccount {
  email: string;
  password: string;
  description: string;
  role: UserRole;
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  { email: 'admin@inventaire.ma', password: 'admin123', description: 'Admin', role: 'admin' },
  { email: 'stock@inventaire.ma', password: 'stock123', description: 'Gestionnaire', role: 'gestionnaire_de_stock' },
  { email: 'operator@inventaire.ma', password: 'operator123', description: 'Opérateur', role: 'operateur' },
];

export function getMockUserByRole(role: UserRole): Pick<User, 'nom' | 'prenom' | 'role' | 'status'> {
  const prenoms: Record<string, string> = { admin: 'Ahmed', gestionnaire_de_stock: 'Fatima', operateur: 'Mohammed' };
  const noms: Record<string, string> = { admin: 'Ben Ali', gestionnaire_de_stock: 'Zahra', operateur: 'Salah' };
  return { prenom: prenoms[role] ?? '', nom: noms[role] ?? '', role, status: 'active' };
}

export function getMockAccount(email: string): MockAccount | undefined {
  return MOCK_ACCOUNTS.find(a => a.email === email);
}
