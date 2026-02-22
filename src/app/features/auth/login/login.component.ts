/**
 * Login Component
 * Handles user authentication.
 * Collects email and password credentials and authenticates with the auth service.
 * Displays mock test accounts for development and testing.
 */

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { USE_BACKEND } from '../../../app.config';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  /** User email input (ngModel) */
  emailValue = '';
  
  /** User password input (ngModel) */
  passwordValue = '';
  
  /** Show/hide password toggle state */
  showPassword = signal(false);
  
  /** Loading state during login */
  isLoading = signal(false);
  
  /** Error message display */
  errorMessage = signal('');

  /** Show mock credentials hint when backend is disabled */
  useBackend = USE_BACKEND;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Handle login form submission
   * Validates input, authenticates user, and navigates to dashboard on success
   */
  async onSubmit() {
    const email = this.emailValue?.trim() ?? '';
    const password = this.passwordValue?.trim() ?? '';
    if (!email || !password) {
      this.errorMessage.set('Veuillez remplir tous les champs.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const success = await this.authService.login(email, password);
      
      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage.set('Invalid email or password. Check the credentials below.');
      }
    } catch (error) {
      this.errorMessage.set('An error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Toggle password visibility in input field
   */
  togglePasswordVisibility() {
    this.showPassword.update(show => !show);
  }

}
