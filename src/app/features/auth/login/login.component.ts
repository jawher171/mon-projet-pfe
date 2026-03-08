/**
 * Login Component
 * Handles user authentication.
 * Collects email and password credentials and authenticates with the auth service.
 * Displays mock test accounts for development and testing.
 */

import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { USE_BACKEND } from '../../../app.config';

const ALLOWED_DOMAINS = ['@pgh.com', '@inventaire.ma'];
const MIN_PASSWORD_LENGTH = 6;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  emailValue = '';
  passwordValue = '';

  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  formSubmitted = signal(false);

  useBackend = USE_BACKEND;

  emailError = computed(() => {
    if (!this.formSubmitted()) return '';
    const email = this.emailValue?.trim() ?? '';
    if (!email) return 'L\'adresse e-mail est obligatoire.';
    if (!email.includes('@')) return 'Format d\'adresse e-mail invalide.';
    const lower = email.toLowerCase();
    if (!ALLOWED_DOMAINS.some(domain => lower.endsWith(domain))) {
      return `Seules les adresses ${ALLOWED_DOMAINS.join(' ou ')} sont autorisées.`;
    }
    const localPart = email.slice(0, email.lastIndexOf('@'));
    if (localPart.length < 2) return 'L\'identifiant avant @ est trop court.';
    return '';
  });

  passwordError = computed(() => {
    if (!this.formSubmitted()) return '';
    const pw = this.passwordValue ?? '';
    if (!pw) return 'Le mot de passe est obligatoire.';
    if (pw.length < MIN_PASSWORD_LENGTH)
      return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
    return '';
  });

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSubmit() {
    this.formSubmitted.set(true);

    if (this.emailError() || this.passwordError()) {
      this.errorMessage.set('');
      return;
    }

    const email = this.emailValue.trim();
    const password = this.passwordValue.trim();

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const success = await this.authService.login(email, password);
      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage.set('E-mail ou mot de passe incorrect.');
      }
    } catch {
      this.errorMessage.set('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      this.isLoading.set(false);
    }
  }

  togglePasswordVisibility() {
    this.showPassword.update(show => !show);
  }
}
