import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserRole, ROLES } from '../../../core/models/role.model';

/**
 * Role badge component
 * Displays a styled badge for a given user role.
 */
@Component({
  selector: 'app-role-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-badge.component.html',
  styleUrls: ['./role-badge.component.scss']
})
export class RoleBadgeComponent {
  /** Role to display */
  @Input() role: UserRole = 'operateur';
  /** Badge size */
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  /** Whether to show the role icon */
  @Input() showIcon = true;

  /** Background color based on role */
  get color(): string {
    return ROLES[this.role]?.color || '#757575';
  }

  /** Text color for the badge */
  get textColor(): string {
    return '#ffffff';
  }

  /** Human-readable role label */
  get label(): string {
    return ROLES[this.role]?.label || this.role;
  }

  /** Role icon name */
  get icon(): string {
    return this.showIcon ? (ROLES[this.role]?.icon || 'person') : '';
  }
}
