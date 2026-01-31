/**
 * Test Credentials Display Component
 * Shows available mock accounts for testing
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MOCK_ACCOUNTS } from '../../../core/models/mock-accounts';
import { ROLES, UserRole } from '../../../core/models/role.model';

@Component({
  selector: 'app-test-credentials',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="credentials-container">
      <div class="credentials-header">
        <h3>🧪 Test Credentials</h3>
        <p class="subtitle">Click any account to copy email</p>
      </div>

      <div class="credentials-by-role">
        <!-- Admin Accounts -->
        <div class="role-section">
          <div class="role-title" [style.backgroundColor]="getRoleColor('admin')">
            👨‍💼 Administrator
          </div>
          <div class="accounts-list">
            <div *ngFor="let account of getAccountsByRole('admin')" 
                 class="account-card"
                 (click)="copyToClipboard(account.email)">
              <div class="account-header">
                <span class="email">{{ account.email }}</span>
                <span class="copy-icon">📋</span>
              </div>
              <div class="password">Password: <strong>{{ account.password }}</strong></div>
              <div class="description">{{ account.description }}</div>
            </div>
          </div>
        </div>

        <!-- Stock Manager Accounts -->
        <div class="role-section">
          <div class="role-title" [style.backgroundColor]="getRoleColor('gestionnaire_de_stock')">
            📦 Stock Manager
          </div>
          <div class="accounts-list">
            <div *ngFor="let account of getAccountsByRole('gestionnaire_de_stock')" 
                 class="account-card"
                 (click)="copyToClipboard(account.email)">
              <div class="account-header">
                <span class="email">{{ account.email }}</span>
                <span class="copy-icon">📋</span>
              </div>
              <div class="password">Password: <strong>{{ account.password }}</strong></div>
              <div class="description">{{ account.description }}</div>
            </div>
          </div>
        </div>

        <!-- Operator Accounts -->
        <div class="role-section">
          <div class="role-title" [style.backgroundColor]="getRoleColor('operateur')">
            🔧 Operator
          </div>
          <div class="accounts-list">
            <div *ngFor="let account of getAccountsByRole('operateur')" 
                 class="account-card"
                 (click)="copyToClipboard(account.email)">
              <div class="account-header">
                <span class="email">{{ account.email }}</span>
                <span class="copy-icon">📋</span>
              </div>
              <div class="password">Password: <strong>{{ account.password }}</strong></div>
              <div class="description">{{ account.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="credentials-note">
        <p>💡 <strong>Tip:</strong> Click on any email to copy it to clipboard</p>
      </div>
    </div>
  `,
  styles: [`
    .credentials-container {
      background: #f9f9f9;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
    }

    .credentials-header {
      margin-bottom: 20px;
      text-align: center;

      h3 {
        margin: 0 0 8px 0;
        color: #333;
        font-size: 18px;
      }

      .subtitle {
        margin: 0;
        color: #999;
        font-size: 12px;
      }
    }

    .credentials-by-role {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .role-section {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .role-title {
      color: white;
      padding: 12px 16px;
      font-weight: 600;
      font-size: 14px;
    }

    .accounts-list {
      padding: 12px;
    }

    .account-card {
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #efefef;
        border-color: #2196f3;
        box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
      }

      &:last-child {
        margin-bottom: 0;
      }

      .account-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .email {
          font-weight: 500;
          color: #333;
          font-size: 13px;
          font-family: monospace;
        }

        .copy-icon {
          font-size: 14px;
          opacity: 0;
          transition: opacity 0.2s;
        }
      }

      &:hover .copy-icon {
        opacity: 1;
      }

      .password {
        font-size: 12px;
        color: #666;
        margin-bottom: 6px;

        strong {
          font-family: monospace;
          color: #333;
        }
      }

      .description {
        font-size: 11px;
        color: #999;
        font-style: italic;
      }
    }

    .credentials-note {
      text-align: center;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;

      p {
        margin: 0;
      }
    }
  `]
})
export class TestCredentialsComponent {
  mockAccounts = MOCK_ACCOUNTS;
  roles = ROLES;

  getAccountsByRole(role: UserRole) {
    return this.mockAccounts.filter((account: any) => account.role === role);
  }

  getRoleColor(role: UserRole): string {
    return ROLES[role]?.color || '#757575';
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Show visual feedback
      const notification = document.createElement('div');
      notification.textContent = `✓ Copied: ${text}`;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 12px 16px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 9999;
        animation: fadeInOut 2s;
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
    });
  }
}
