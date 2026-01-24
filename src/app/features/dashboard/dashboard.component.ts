import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface StatCard {
  title: string;
  value: number | string;
  change: number;
  icon: string;
  color: string;
  trend: 'up' | 'down';
}

interface RecentActivity {
  id: string;
  type: 'order' | 'stock' | 'alert';
  message: string;
  timestamp: Date;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats = signal<StatCard[]>([
    {
      title: 'Total Products',
      value: 1247,
      change: 12.5,
      icon: 'inventory_2',
      color: '#2196F3',
      trend: 'up'
    },
    {
      title: 'Low Stock Items',
      value: 23,
      change: -8.2,
      icon: 'warning',
      color: '#FF9800',
      trend: 'down'
    },
    {
      title: 'Total Orders',
      value: 856,
      change: 15.3,
      icon: 'shopping_cart',
      color: '#4CAF50',
      trend: 'up'
    },
    {
      title: 'Revenue',
      value: '$125,430',
      change: 8.7,
      icon: 'attach_money',
      color: '#9C27B0',
      trend: 'up'
    }
  ]);

  recentActivities = signal<RecentActivity[]>([
    {
      id: '1',
      type: 'order',
      message: 'New purchase order #PO-2024-001 created',
      timestamp: new Date(Date.now() - 5 * 60000),
      icon: 'add_shopping_cart',
      color: '#4CAF50'
    },
    {
      id: '2',
      type: 'stock',
      message: 'Stock updated for Laptop Dell XPS 15',
      timestamp: new Date(Date.now() - 15 * 60000),
      icon: 'inventory',
      color: '#2196F3'
    },
    {
      id: '3',
      type: 'alert',
      message: 'Low stock alert: Wireless Mouse below minimum',
      timestamp: new Date(Date.now() - 30 * 60000),
      icon: 'warning',
      color: '#FF9800'
    },
    {
      id: '4',
      type: 'order',
      message: 'Order #SO-2024-045 completed',
      timestamp: new Date(Date.now() - 45 * 60000),
      icon: 'check_circle',
      color: '#4CAF50'
    },
    {
      id: '5',
      type: 'stock',
      message: 'New product added: Office Chair Pro',
      timestamp: new Date(Date.now() - 60 * 60000),
      icon: 'add_box',
      color: '#9C27B0'
    }
  ]);

  topProducts = signal([
    { name: 'Laptop Dell XPS 15', sales: 145, revenue: '$217,485', trend: 'up' },
    { name: 'Office Chair Ergonomic', sales: 98, revenue: '$29,390', trend: 'up' },
    { name: 'Wireless Mouse Logitech', sales: 234, revenue: '$18,717', trend: 'down' },
    { name: 'Monitor Samsung 27"', sales: 67, revenue: '$26,800', trend: 'up' },
    { name: 'Keyboard Mechanical', sales: 156, revenue: '$15,600', trend: 'up' }
  ]);

  constructor() {}

  ngOnInit(): void {}

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
