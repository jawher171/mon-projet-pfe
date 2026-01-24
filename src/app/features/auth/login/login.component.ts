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
  email = signal('');
  password = signal('');
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

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
      this.isLoading.set(false);
    }
  }

  togglePasswordVisibility() {
    this.showPassword.update(show => !show);
  }

  onEmailChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.email.set(input.value);
  }

  onPasswordChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.password.set(input.value);
  }
}
