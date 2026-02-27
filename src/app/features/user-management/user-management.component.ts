import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../core/models/user.model';
import { UserRole } from '../../core/models/role.model';
import { UserService } from '../../core/services/user.service';
import { USE_BACKEND } from '../../app.config';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  /** Show add custom role modal (UI only - backend supports admin, gestionnaire_de_stock, operateur) */
  showAddRoleModal = signal(false);
  newCustomRoleName = signal('');
  customRoles = signal<{ value: string; label: string }[]>([]);

  /** Form model for create/edit */
  formData = {
    prenom: '',
    nom: '',
    email: '',
    password: '',
    role: 'operateur' as UserRole,
    status: 'active' as 'active' | 'inactive'
  };

  baseRoles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'gestionnaire_de_stock', label: 'Stock Manager' },
    { value: 'operateur', label: 'Operator' }
  ];

  roles = computed(() => [
    ...this.baseRoles,
    ...this.customRoles()
  ]);

  private isBaseRole(role: string): boolean {
    return this.baseRoles.some(r => r.value === role);
  }

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

  async saveUser() {
    if (!this.formData.prenom?.trim() || !this.formData.nom?.trim() || !this.formData.email?.trim()) {
      this.errorMessage.set('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (!this.isEditing() && !this.formData.password?.trim()) {
      this.errorMessage.set('Le mot de passe est obligatoire pour un nouvel utilisateur.');
      return;
    }

    if (this.backendMode && !this.isBaseRole(this.formData.role)) {
      this.errorMessage.set('En mode backend, seuls les rôles admin, gestionnaire_de_stock et operateur sont autorisés.');
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

  async deleteUser(user: User) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${user.prenom} ${user.nom} ?`)) return;
    try {
      await this.userService.deleteUser(String(user.id));
    } catch (e) {
      this.errorMessage.set(e instanceof Error ? e.message : 'Impossible de supprimer.');
    }
  }

  async toggleStatus(user: User) {
    try {
      await this.userService.toggleStatus(String(user.id), user.status);
    } catch (e) {
      this.errorMessage.set(e instanceof Error ? e.message : 'Impossible de changer le statut.');
    }
  }

  getRoleLabel(role: string): string {
    return this.userService.getRoleLabel(role as UserRole);
  }

  openAddRoleModal(): void {
    if (this.backendMode) {
      this.errorMessage.set('Rôles personnalisés désactivés en mode backend pour rester aligné avec l\'API.');
      return;
    }
    this.newCustomRoleName.set('');
    this.showAddRoleModal.set(true);
  }

  closeAddRoleModal(): void {
    this.showAddRoleModal.set(false);
    this.newCustomRoleName.set('');
  }

  saveCustomRole(): void {
    if (this.backendMode) return;

    const roleName = this.newCustomRoleName().trim();
    if (!roleName) return;

    const exists = this.roles().some(r => r.label.toLowerCase() === roleName.toLowerCase());
    if (exists) {
      this.errorMessage.set('Ce rôle existe déjà.');
      return;
    }

    const roleValue = `custom_${roleName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    this.customRoles.update(roles => [...roles, { value: roleValue, label: roleName }]);
    this.closeAddRoleModal();
  }
}
