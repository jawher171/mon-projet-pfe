import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent {
  /** In-memory list of users displayed in the table */
  users = signal<User[]>([
    {
      id: 'user_001',
      email: 'admin@inventaire.ma',
      firstName: 'Ahmed',
      lastName: 'Admin',
      role: 'admin',
      avatar: 'https://i.pravatar.cc/150?img=1',
      department: 'Management',
      phone: '+212 661 123 456',
      status: 'active',
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date()
    },
    {
      id: 'user_002',
      email: 'stock@inventaire.ma',
      firstName: 'Fatima',
      lastName: 'Zahra',
      role: 'gestionnaire_de_stock',
      avatar: 'https://i.pravatar.cc/150?img=2',
      department: 'Warehouse',
      phone: '+212 661 234 567',
      status: 'active',
      createdAt: new Date('2024-02-01'),
      lastLogin: new Date('2026-01-30')
    },
    {
      id: 'user_003',
      email: 'operator@inventaire.ma',
      firstName: 'Mohammed',
      lastName: 'Salah',
      role: 'operateur',
      avatar: 'https://i.pravatar.cc/150?img=3',
      department: 'Warehouse',
      phone: '+212 661 345 678',
      status: 'active',
      createdAt: new Date('2024-03-01'),
      lastLogin: new Date('2026-01-29')
    },
    {
      id: 'user_004',
      email: 'stock2@inventaire.ma',
      firstName: 'Youssef',
      lastName: 'Amrani',
      role: 'gestionnaire_de_stock',
      avatar: 'https://i.pravatar.cc/150?img=4',
      department: 'Warehouse',
      phone: '+212 661 456 789',
      status: 'active',
      createdAt: new Date('2024-04-01'),
      lastLogin: new Date('2026-01-28')
    },
    {
      id: 'user_005',
      email: 'operator2@inventaire.ma',
      firstName: 'Leila',
      lastName: 'Khaldi',
      role: 'operateur',
      avatar: 'https://i.pravatar.cc/150?img=5',
      department: 'Warehouse',
      phone: '+212 661 567 890',
      status: 'inactive',
      createdAt: new Date('2024-05-01')
    }
  ]);

  /** Controls visibility of the create/edit form */
  showForm = signal(false);
  /** Indicates whether the form is in edit mode */
  isEditing = signal(false);
  /** Search input value for filtering the user list */
  searchTerm = signal('');
  
  /** Show add custom role modal */
  showAddRoleModal = signal(false);
  
  /** New custom role input */
  newCustomRoleName = signal('');
  
  /** Custom roles added by users */
  customRoles = signal<{ value: string; label: string }[]>([]);

  /** Filtered list of users based on search input */
  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.users().filter(u => 
      u.firstName.toLowerCase().includes(term) ||
      u.lastName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  /** Form model for create/edit */
  formData = {
    firstName: '',
    lastName: '',
    email: '',
    role: 'operateur' as any,
    status: 'active' as 'active' | 'inactive'
  };

  /** Available role options for the selector */
  baseRoles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'gestionnaire_de_stock', label: 'Stock Manager' },
    { value: 'operateur', label: 'Operator' }
  ];
  
  /** Computed roles including custom roles */
  roles = computed(() => [
    ...this.baseRoles,
    ...this.customRoles()
  ]);

  /** Open the form for create or edit */
  openForm(user?: User) {
    if (user) {
      this.isEditing.set(true);
      this.formData = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status
      };
    } else {
      this.isEditing.set(false);
      this.resetForm();
    }
    this.showForm.set(true);
  }

  /** Close the form and reset values */
  closeForm() {
    this.showForm.set(false);
    this.resetForm();
  }

  /** Reset form model to defaults */
  resetForm() {
    this.formData = {
      firstName: '',
      lastName: '',
      email: '',
      role: 'operateur',
      status: 'active'
    };
  }

  /** Create a new user or persist edits */
  saveUser() {
    if (!this.formData.firstName || !this.formData.lastName || !this.formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    if (this.isEditing()) {
      const userIndex = this.users().findIndex(u => 
        u.firstName === this.formData.firstName && 
        u.email === this.formData.email
      );
      if (userIndex !== -1) {
        this.users.update(users => {
          const updated = [...users];
          updated[userIndex] = {
            ...updated[userIndex],
            firstName: this.formData.firstName,
            lastName: this.formData.lastName,
            email: this.formData.email,
            role: this.formData.role,
            status: this.formData.status
          };
          return updated;
        });
      }
    } else {
      const newUser: User = {
        id: String(this.users().length + 1),
        firstName: this.formData.firstName,
        lastName: this.formData.lastName,
        email: this.formData.email,
        role: this.formData.role,
        status: this.formData.status,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      this.users.update(users => [...users, newUser]);
    }

    this.closeForm();
  }

  /** Remove a user after confirmation */
  deleteUser(user: User) {
    if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      this.users.update(users => users.filter(u => u.id !== user.id));
    }
  }

  /** Toggle user active/inactive status */
  toggleStatus(user: User) {
    user.status = user.status === 'active' ? 'inactive' : 'active';
  }

  /** Resolve a role label from its value */
  getRoleLabel(role: string): string {
    const allRoles = this.roles();
    return allRoles.find(r => r.value === role)?.label || role;
  }
  
  /** Open add custom role modal */
  openAddRoleModal(): void {
    this.newCustomRoleName.set('');
    this.showAddRoleModal.set(true);
  }
  
  /** Close add custom role modal */
  closeAddRoleModal(): void {
    this.showAddRoleModal.set(false);
    this.newCustomRoleName.set('');
  }
  
  /** Save custom role */
  saveCustomRole(): void {
    const roleName = this.newCustomRoleName().trim();
    if (!roleName) return;
    
    const roleValue = `custom_${roleName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    this.customRoles.update(roles => [
      ...roles,
      { value: roleValue, label: roleName }
    ]);
    this.closeAddRoleModal();
  }
}
