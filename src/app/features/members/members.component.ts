import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthorizationService } from '../../core/services/auth-authorization.service';
import { User } from '../../core/models/user.model';
import { UserRole, ROLES } from '../../core/models/role.model';

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

  formData = signal({
    email: '',
    firstName: '',
    lastName: '',
    role: 'operateur' as UserRole,
    phone: '',
    department: ''
  });

  get members() {
    return this.authorizationService.getMembers();
  }

  get stats() {
    return this.authorizationService.getMemberStats();
  }

  constructor(private authorizationService: AuthorizationService) {}

  ngOnInit(): void {
    // Component initialization
  }

  getRoleLabel(role: UserRole): string {
    return this.authorizationService.getRoleLabel(role);
  }

  getRoleColor(role: UserRole): string {
    return this.authorizationService.getRoleColor(role);
  }

  getRoleIcon(role: UserRole): string {
    return this.authorizationService.getRoleIcon(role);
  }

  openAddMemberDialog(): void {
    this.dialogMode.set('add');
    this.formData.set({
      email: '',
      firstName: '',
      lastName: '',
      role: 'operateur',
      phone: '',
      department: ''
    });
    this.showDialog.set(true);
  }

  editMember(member: User): void {
    this.dialogMode.set('edit');
    this.selectedMember.set(member);
    this.formData.set({
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      role: member.role,
      phone: member.phone || '',
      department: member.department || ''
    });
    this.showDialog.set(true);
  }

  openRoleDialog(member: User): void {
    const newRole: UserRole = member.role === 'admin' 
      ? 'gestionnaire_de_stock' 
      : member.role === 'gestionnaire_de_stock' 
      ? 'operateur' 
      : 'admin';
    
    this.authorizationService.changeRole(member.id, newRole);
  }

  toggleStatus(member: User): void {
    this.authorizationService.toggleMemberStatus(member.id);
  }

  deleteMember(member: User): void {
    if (confirm(`Are you sure you want to delete ${member.firstName} ${member.lastName}?`)) {
      this.authorizationService.deleteMember(member.id);
    }
  }

  saveMember(): void {
    const data = this.formData();
    
    if (this.dialogMode() === 'add') {
      this.authorizationService.addMember({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        phone: data.phone,
        department: data.department,
        status: 'active'
      });
    } else if (this.selectedMember()) {
      this.authorizationService.updateMember(this.selectedMember()!.id, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        phone: data.phone,
        department: data.department
      });
    }

    this.closeDialog();
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.selectedMember.set(null);
  }
}
