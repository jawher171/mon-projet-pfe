import { Component, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  /** Current authenticated user */
  currentUser = computed(() => this.authService.currentUser());

  /** Flag for edit mode */
  isEditing = false;
  /** Form model for profile editing */
  editForm = {
    prenom: '',
    nom: '',
    email: '',
    newPassword: ''
  };
  /** Saving in progress */
  saving = signal(false);
  /** Error message */
  errorMessage = signal('');

  constructor(
    private authService: AuthService,
    private userService: UserService
  ) {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) this.initializeForm();
    });
    this.initializeForm();
  }

  /** Initialize edit form from current user */
  private initializeForm() {
    const user = this.authService.currentUser();
    if (user) {
      this.editForm = {
        prenom: user.prenom ?? '',
        nom: user.nom ?? '',
        email: user.email ?? '',
        newPassword: ''
      };
    }
  }

  /** Toggle edit mode and reset form if canceled */
  toggleEdit() {
    this.isEditing = !this.isEditing;
    this.errorMessage.set('');
    if (!this.isEditing) {
      this.initializeForm();
    }
  }

  /** Persist profile changes to API and update stored user */
  private readonly ALLOWED_DOMAIN = '@pgh.com';
  private readonly MIN_PASSWORD_LENGTH = 6;
  private readonly NAME_PATTERN = /^[A-Za-zÀ-ÿ\s\-']+$/;

  async saveChanges() {
    const user = this.currentUser();
    if (!user) return;

    if (!this.editForm.prenom?.trim() || !this.editForm.nom?.trim() || !this.editForm.email?.trim()) {
      this.errorMessage.set('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!this.NAME_PATTERN.test(this.editForm.prenom.trim())) {
      this.errorMessage.set('Le prénom ne doit contenir que des lettres (pas de chiffres).');
      return;
    }
    if (!this.NAME_PATTERN.test(this.editForm.nom.trim())) {
      this.errorMessage.set('Le nom ne doit contenir que des lettres (pas de chiffres).');
      return;
    }

    const email = this.editForm.email.trim().toLowerCase();
    if (!email.endsWith(this.ALLOWED_DOMAIN)) {
      this.errorMessage.set(`Seules les adresses ${this.ALLOWED_DOMAIN} sont autorisées.`);
      return;
    }
    const localPart = email.slice(0, email.lastIndexOf('@'));
    if (localPart.length < 2) {
      this.errorMessage.set('L\'identifiant avant @ est trop court.');
      return;
    }

    if (this.editForm.newPassword && this.editForm.newPassword.length < this.MIN_PASSWORD_LENGTH) {
      this.errorMessage.set(`Le mot de passe doit contenir au moins ${this.MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    try {
      const updates: { prenom: string; nom: string; email: string; password?: string } = {
        prenom: this.editForm.prenom.trim(),
        nom: this.editForm.nom.trim(),
        email: this.editForm.email.trim()
      };
      if (this.editForm.newPassword?.trim()) {
        updates.password = this.editForm.newPassword;
      }
      const updated = await this.userService.updateProfile(updates);
      if (updated) {
        this.authService.updateCurrentUser({
          prenom: updated.prenom,
          nom: updated.nom,
          email: updated.email
        });
        this.isEditing = false;
        this.editForm.newPassword = '';
      }
    } catch (e) {
      this.errorMessage.set(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      this.saving.set(false);
    }
  }

  /** Human-readable label for the current user's role */
  getRoleDisplay(): string {
    const user = this.currentUser();
    if (!user) return 'Unknown';

    const roleMap: Record<string, string> = {
      'admin': 'Administrateur',
      'gestionnaire_de_stock': 'gestionnaire de stock',
      'operateur': 'Opérateur'
    };

    return roleMap[user.role] || user.role;
  }
}
