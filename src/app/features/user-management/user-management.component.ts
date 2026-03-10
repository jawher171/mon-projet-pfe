import { Component, OnInit, signal, computed, inject, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../core/models/user.model';
import { UserRole } from '../../core/models/role.model';
import { UserService } from '../../core/services/user.service';
import { RolesService } from '../../core/services/roles.service';
import { USE_BACKEND } from '../../app.config';

@Pipe({ name: 'filterUsers', standalone: true })
export class FilterUsersPipe implements PipeTransform {
  transform(users: User[], status: string): number {
    return users.filter(u => u.status === status).length;
  }
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterUsersPipe],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  readonly backendMode = USE_BACKEND;

  /** Search input value for filtering the user list */
  searchTerm = signal('');

  /** Controls visibility of the create/edit form */
  showForm = signal(false);
  /** Indicates whether the form is in edit mode */
  isEditing = signal(false);
  /** ID of user being edited */
  editingUserId = signal<string | null>(null);
  /** Saving in progress */
  saving = signal(false);
  /** Error message */
  errorMessage = signal('');

  // Delete confirmation modal
  showDeleteModal = signal(false);
  userToDelete = signal<User | null>(null);
  deleting = signal(false);

  // Toggle status confirmation modal
  showToggleModal = signal(false);
  userToToggle = signal<User | null>(null);
  toggling = signal(false);

  private rolesService = inject(RolesService);

  /** Form model for create/edit */
  formData = {
    prenom: '',
    nom: '',
    email: '',
    password: '',
    role: 'operateur' as UserRole,
    status: 'active' as 'active' | 'inactive'
  };

  /** Roles list derived from RolesService signal */
  roles = computed(() => {
    const rolesMap = this.rolesService.roles();
    return Object.entries(rolesMap).map(([key, r]) => ({
      value: key,
      label: (r as { label?: string }).label ?? r.nom
    }));
  });

  get users() {
    return this.userService.users();
  }

  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.userService.users().filter(u =>
      u.nom.toLowerCase().includes(term) ||
      u.prenom.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    void this.userService.fetchUsers();
  }

  openForm(user?: User) {
    this.errorMessage.set('');
    if (user) {
      this.isEditing.set(true);
      this.editingUserId.set(String(user.id));
      this.formData = {
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        password: '',
        role: user.role,
        status: user.status
      };
    } else {
      this.isEditing.set(false);
      this.editingUserId.set(null);
      this.resetForm();
    }
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.resetForm();
    this.errorMessage.set('');
  }

  resetForm() {
    this.formData = {
      prenom: '',
      nom: '',
      email: '',
      password: '',
      role: 'operateur',
      status: 'active'
    };
  }

  private readonly ALLOWED_DOMAIN = '@pgh.com';
  private readonly MIN_PASSWORD_LENGTH = 6;
  private readonly NAME_PATTERN = /^[A-Za-zÀ-ÿ\s\-']+$/;

  validateName(value: string, fieldLabel: string): string {
    if (!value) return `${fieldLabel} est obligatoire.`;
    if (!this.NAME_PATTERN.test(value))
      return `${fieldLabel} ne doit contenir que des lettres (pas de chiffres).`;
    return '';
  }

  validateEmail(email: string): string {
    if (!email) return 'L\'adresse e-mail est obligatoire.';
    if (!email.includes('@')) return 'Format d\'adresse e-mail invalide.';
    if (!email.toLowerCase().endsWith(this.ALLOWED_DOMAIN))
      return `Seules les adresses ${this.ALLOWED_DOMAIN} sont autorisées.`;
    const localPart = email.slice(0, email.lastIndexOf('@'));
    if (localPart.length < 2) return 'L\'identifiant avant @ est trop court.';
    return '';
  }

  validatePassword(password: string, isRequired: boolean): string {
    if (isRequired && !password) return 'Le mot de passe est obligatoire.';
    if (password && password.length < this.MIN_PASSWORD_LENGTH)
      return `Le mot de passe doit contenir au moins ${this.MIN_PASSWORD_LENGTH} caractères.`;
    return '';
  }

  async saveUser() {
    const prenomErr = this.validateName(this.formData.prenom?.trim(), 'Le prénom');
    if (prenomErr) { this.errorMessage.set(prenomErr); return; }

    const nomErr = this.validateName(this.formData.nom?.trim(), 'Le nom');
    if (nomErr) { this.errorMessage.set(nomErr); return; }

    const emailErr = this.validateEmail(this.formData.email?.trim());
    if (emailErr) {
      this.errorMessage.set(emailErr);
      return;
    }

    const pwRequired = !this.isEditing();
    const pwErr = this.validatePassword(this.formData.password, pwRequired);
    if (pwErr) {
      this.errorMessage.set(pwErr);
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    try {
      if (this.isEditing()) {
        const id = this.editingUserId();
        if (!id) return;
        const updates: Parameters<UserService['updateUser']>[1] = {
          prenom: this.formData.prenom.trim(),
          nom: this.formData.nom.trim(),
          email: this.formData.email.trim(),
          role: this.formData.role,
          status: this.formData.status
        };
        if (this.formData.password?.trim()) updates.password = this.formData.password;
        await this.userService.updateUser(id, updates);
      } else {
        await this.userService.createUser({
          prenom: this.formData.prenom.trim(),
          nom: this.formData.nom.trim(),
          email: this.formData.email.trim(),
          password: this.formData.password,
          role: this.formData.role,
          status: this.formData.status
        });
      }
      this.closeForm();
    } catch (e) {
      this.errorMessage.set(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      this.saving.set(false);
    }
  }

  deleteUser(user: User) {
    this.userToDelete.set(user);
    this.showDeleteModal.set(true);
  }

  cancelDelete() {
    this.showDeleteModal.set(false);
    this.userToDelete.set(null);
  }

  async confirmDelete() {
    const user = this.userToDelete();
    if (!user) return;
    this.deleting.set(true);
    try {
      await this.userService.deleteUser(String(user.id));
    } catch (e) {
      this.errorMessage.set(e instanceof Error ? e.message : 'Impossible de supprimer.');
    } finally {
      this.deleting.set(false);
      this.cancelDelete();
    }
  }

  toggleStatus(user: User) {
    this.userToToggle.set(user);
    this.showToggleModal.set(true);
  }

  cancelToggle() {
    this.showToggleModal.set(false);
    this.userToToggle.set(null);
  }

  async confirmToggle() {
    const user = this.userToToggle();
    if (!user) return;
    this.toggling.set(true);
    try {
      await this.userService.toggleStatus(String(user.id), user.status);
    } catch (e) {
      this.errorMessage.set(e instanceof Error ? e.message : 'Impossible de changer le statut.');
    } finally {
      this.toggling.set(false);
      this.cancelToggle();
    }
  }

  getRoleLabel(role: string): string {
    return this.userService.getRoleLabel(role as UserRole);
  }

  getRoleIcon(role: string): string {
    const icons: Record<string, string> = {
      admin: 'admin_panel_settings',
      gestionnaire_de_stock: 'inventory',
      operateur: 'engineering'
    };
    return icons[role] ?? 'person';
  }
}
