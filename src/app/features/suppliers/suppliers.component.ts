import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1 class="page-title">Suppliers</h1>
      <p>Supplier management interface will be displayed here</p>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .page-title {
      font-size: 2rem;
      font-weight: 700;
      color: #1a237e;
      margin: 0 0 1rem 0;
    }
  `]
})
export class SuppliersComponent {}
