import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PageMetadata } from '../models';

@Component({
  selector: 'app-customer-order',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './customer-order.component.html', 
})
export class CustomerOrderComponent implements OnInit {
  metadata?: PageMetadata;
  selectedTab = 0;
  formData: { [key: string]: any } = {};
  detailRows: any[] = [];
  errors: { [key: string]: string } = {};

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get<PageMetadata>('metadata/customer-order.page.json').subscribe((meta) => {
      this.metadata = meta;
      this.initializeFormData();
    });
  }

  private initializeFormData(): void {
    if (!this.metadata) return;
    
    // Initialize form data with default values
    this.metadata.tabs.forEach(tab => {
      if (tab.form) {
        tab.form.fields.forEach(field => {
          this.formData[field.key] = field.default || '';
        });
      }
    });
  }

  onSelectChange(): void {
    console.log('Tab selection changed');
  }

  onSubmit(): void {
    this.validateForm();
    
    if (Object.keys(this.errors).length === 0) {
      const submitData = {
        masterData: this.formData,
        detailData: this.detailRows
      };
      
      console.log('Submit form data:', submitData);
      alert('Dữ liệu gửi đi: ' + JSON.stringify(submitData, null, 2));
    } else {
      console.warn('Form có lỗi:', this.errors);
    }
  }

  private validateForm(): void {
    this.errors = {};
    const currentTab = this.metadata?.tabs[this.selectedTab];
    
    if (currentTab?.form) {
      currentTab.form.fields.forEach(field => {
        if (field.required && !this.formData[field.key]) {
          this.errors[field.key] = `${field.label} là bắt buộc`;
        }
      });
    }
  }

  getFieldError(fieldKey: string): string | null {
    return this.errors[fieldKey] || null;
  }

  // Detail table methods
  addDetailRow(): void {
    const currentTab = this.metadata?.tabs[this.selectedTab];
    if (currentTab?.detail) {
      const newRow: any = {};
      currentTab.detail.fields.forEach(field => {
        newRow[field.key] = field.default || '';
      });
      this.detailRows.push(newRow);
    }
  }

  removeDetailRow(index: number): void {
    this.detailRows.splice(index, 1);
    this.calculateDetailTotals();
  }

  onDetailFieldChange(rowIndex: number, fieldKey: string, value: any): void {
    this.detailRows[rowIndex][fieldKey] = value;
    this.calculateDetailTotals();
    
    // Auto-calculate line total if quantity and price are available
    if (fieldKey === 'quantity' || fieldKey === 'price') {
      const row = this.detailRows[rowIndex];
      if (row.quantity && row.price) {
        row.total = row.quantity * row.price;
      }
    }
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  private calculateDetailTotals(): void {
    // Trigger recalculation of summary totals
    // This method can be extended based on your business logic
  }

  // Column width helper
  getColumnWidth(fieldType: string): string {
    const widthMap: { [key: string]: string } = {
      'text': '200px',
      'number': '120px',
      'select': '150px',
      'date': '130px'
    };
    return widthMap[fieldType] || '120px';
  }

  // Summary calculation methods
  shouldShowSummary(): boolean {
    return this.detailRows.length > 0 && this.selectedTab === 1; // Show for order tab
  }

  calculateSubtotal(): number {
    return this.detailRows.reduce((sum, row) => {
      const quantity = parseFloat(row.quantity) || 0;
      const price = parseFloat(row.price) || 0;
      return sum + (quantity * price);
    }, 0);
  }

  calculateTax(): number {
    const subtotal = this.calculateSubtotal();
    const taxRate = 0.1; // 10% VAT
    return subtotal * taxRate;
  }

  calculateDiscount(): number {
    // Implement discount calculation logic
    return 0;
  }

  calculateTotal(): number {
    return this.calculateSubtotal() + this.calculateTax() - this.calculateDiscount();
  }

  // Formatting helpers
  formatValue(value: any, fieldType: string): string {
    if (!value) return '';
    
    switch (fieldType) {
      case 'number':
        return this.formatNumber(value);
      case 'date':
        return this.formatDate(value);
      default:
        return value.toString();
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value);
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN');
  }
}