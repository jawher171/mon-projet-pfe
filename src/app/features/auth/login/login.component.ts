/**
 * Login Component
 * Handles user authentication.
 * Collects email and password credentials and authenticates with the auth service.
 */

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  /** User email input */
  email = signal('');
  
  /** User password input */
  password = signal('');
  
  /** Show/hide password toggle state */
  showPassword = signal(false);
  
  /** Loading state during login */
  isLoading = signal(false);
  
  /** Error message display */
  errorMessage = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Handle login form submission
   * Validates input, authenticates user, and navigates to dashboard on success
   */
  async onSubmit() {
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const success = await this.authService.login(this.email(), this.password());
      
      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage.set('Invalid email or password');
      }
    } catch (error) {
      this.errorMessage.set('An error occurred. Please try again.');
    } finally {
  /**
   * Toggle password visibility in input field
   */
      this.isLoading.set(false);
    }
  }

  togglePasswordVisibility() {
  /**
   * Handle email input changes
   * @param event Input change event
   */
    this.showPassword.update(show => !show);
  }

  onEmailChange(event: Event) {
  /**
   * Handle password input changes
   * @param event Input change event
   */
    const input = event.target as HTMLInputElement;
    this.email.set(input.value);
  }

  onPasswordChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.password.set(input.value);
  }
}
