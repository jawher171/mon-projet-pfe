import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    firstName: '',
    lastName: '',
    email: ''
  };

  constructor(private authService: AuthService) {
    this.initializeForm();
  }

  /** Initialize edit form from current user */
  private initializeForm() {
    const user = this.currentUser();
    if (user) {
      this.editForm = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      };
    }
  }

  /** Toggle edit mode and reset form if canceled */
  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.initializeForm();
    }
  }

  /** Persist profile changes (mock) */
  saveChanges() {
    // In a real app, you would update the user on the server
    console.log('Saving changes:', this.editForm);
    this.isEditing = false;
  }

  /** Human-readable label for the current user's role */
  getRoleDisplay(): string {
    const user = this.currentUser();
    if (!user) return 'Unknown';
    
    const roleMap: Record<string, string> = {
      'admin': 'Administrator',
      'gestionnaire_de_stock': 'Stock Manager',
      'operateur': 'Operator'
    };
    
    return roleMap[user.role] || user.role;
  }
}
