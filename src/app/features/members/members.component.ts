import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../core/models/user.model';
import { UserRole } from '../../core/models/role.model';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './members.component.html',
  styleUrls: ['./members.component.scss']
})
export class MembersComponent implements OnInit {
  defaultAvatar = 'https://i.pravatar.cc/150?img=0';
  showDialog = signal(false);
  dialogMode = signal<'add' | 'edit'>('add');
  selectedMember = signal<User | null>(null);
  saving = signal(false);
  errorMessage = signal('');

  formData = {
    email: '',
    prenom: '',
    nom: '',
    password: '',
    role: 'operateur' as UserRole
  };

  private userService = inject(UserService);
  members = this.userService.users;
  stats = this.userService.stats;

  ngOnInit(): void {
    void this.userService.fetchUsers();
  }

  getRoleLabel(role: UserRole): string {
    return this.userService.getRoleLabel(role);
  }

  getRoleColor(role: UserRole): string {
    return this.userService.getRoleColor(role);
  }

  getRoleIcon(role: UserRole): string {
    return this.userService.getRoleIcon(role);
  }

  trackByMemberId(_index: number, member: User): string | number {
    return member.id;
  }

  openAddMemberDialog(): void {
    this.dialogMode.set('add');
    this.errorMessage.set('');
    this.formData = {
      email: '',
      prenom: '',
      nom: '',
      password: '',
      role: 'operateur'
    };
    this.showDialog.set(true);
  }

  editMember(member: User): void {
    this.dialogMode.set('edit');
    this.errorMessage.set('');
    this.selectedMember.set(member);
    this.formData = {
      email: member.email,
      prenom: member.prenom,
      nom: member.nom,
      password: '',
      role: member.role
    };
    this.showDialog.set(true);
  }

  async openRoleDialog(member: User): Promise<void> {
    const newRole: UserRole = member.role === 'admin'
      ? 'gestionnaire_de_stock'
      : member.role === 'gestionnaire_de_stock'
        ? 'operateur'
        : 'admin';
    try {
      await this.userService.changeRole(String(member.id), newRole);
    } catch {
      this.errorMessage.set('Impossible de changer le rôle.');
    }
  }

  async toggleStatus(member: User): Promise<void> {
    try {
      await this.userService.toggleStatus(String(member.id), member.status);
    } catch {
      this.errorMessage.set('Impossible de changer le statut.');
    }
  }

  async deleteMember(member: User): Promise<void> {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${member.prenom} ${member.nom} ?`)) return;
    try {
      await this.userService.deleteUser(String(member.id));
    } catch (e) {
      this.errorMessage.set(e instanceof Error ? e.message : 'Impossible de supprimer.');
    }
  }

  private readonly ALLOWED_DOMAIN = '@pgh.com';
  private readonly MIN_PASSWORD_LENGTH = 6;
  private readonly NAME_PATTERN = /^[A-Za-zÀ-ÿ\s\-']+$/;

  async saveMember(): Promise<void> {
    const data = this.formData;
    if (!data.prenom?.trim()) {
      this.errorMessage.set('Le prénom est obligatoire.');
      return;
    }
    if (!this.NAME_PATTERN.test(data.prenom.trim())) {
      this.errorMessage.set('Le prénom ne doit contenir que des lettres (pas de chiffres).');
      return;
    }
    if (!data.nom?.trim()) {
      this.errorMessage.set('Le nom est obligatoire.');
      return;
    }
    if (!this.NAME_PATTERN.test(data.nom.trim())) {
      this.errorMessage.set('Le nom ne doit contenir que des lettres (pas de chiffres).');
      return;
    }
    if (!data.email?.trim()) {
      this.errorMessage.set('L\'adresse e-mail est obligatoire.');
      return;
    }

    const email = data.email.trim().toLowerCase();
    if (!email.endsWith(this.ALLOWED_DOMAIN)) {
      this.errorMessage.set(`Seules les adresses ${this.ALLOWED_DOMAIN} sont autorisées.`);
      return;
    }
    const localPart = email.slice(0, email.lastIndexOf('@'));
    if (localPart.length < 2) {
      this.errorMessage.set('L\'identifiant avant @ est trop court.');
      return;
    }

    if (this.dialogMode() === 'add' && !data.password?.trim()) {
      this.errorMessage.set('Le mot de passe est obligatoire pour un nouvel utilisateur.');
      return;
    }
    if (data.password && data.password.length < this.MIN_PASSWORD_LENGTH) {
      this.errorMessage.set(`Le mot de passe doit contenir au moins ${this.MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    try {
      if (this.dialogMode() === 'add') {
        await this.userService.createUser({
          email: data.email.trim(),
          nom: data.nom.trim(),
          prenom: data.prenom.trim(),
          password: data.password,
          role: data.role,
          status: 'active'
        });
      } else if (this.selectedMember()) {
        const updates: Parameters<UserService['updateUser']>[1] = {
          email: data.email.trim(),
          nom: data.nom.trim(),
          prenom: data.prenom.trim(),
          role: data.role
        };
        if (data.password?.trim()) updates.password = data.password;
        await this.userService.updateUser(String(this.selectedMember()!.id), updates);
      }
      this.closeDialog();
    } catch (e) {
      this.errorMessage.set(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      this.saving.set(false);
    }
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.selectedMember.set(null);
    this.errorMessage.set('');
  }
}
