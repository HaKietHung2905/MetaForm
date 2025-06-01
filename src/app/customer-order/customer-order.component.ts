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
  filteredDetailRows: any[] = [];
  errors: { [key: string]: string } = {};
  
  // Filter-related properties
  columnFilters: { [key: string]: string } = {};
  filterMode: 'all' | 'any' = 'all'; // 'all' = AND logic, 'any' = OR logic

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get<PageMetadata>('metadata/customer-order.page.json').subscribe((meta) => {
      this.metadata = meta;
      this.initializeFormData();
      this.loadInitialDetailData();
    });
  }

  private initializeFormData(): void {
    if (!this.metadata) return;
    console.log('Metadata', this)
    // Initialize form data with default values
    this.metadata.tabs.forEach(tab => {
      if (tab.form) {
        tab.form.fields.forEach(field => {
          this.formData[field.key] = field.default || '';
        });
      }
      
    });
   
  }

  loadInitialDetailData(): void {
    const orderTab = this.metadata?.tabs.find(tab => tab.title === 'Đơn hàng');
    
    if (orderTab?.detail && (orderTab.detail as any).initialData) {
      // Load the initial data from metadata JSON file
      this.detailRows = [...(orderTab.detail as any).initialData];
      console.log('Loaded initial detail data from metadata:', this.detailRows);
    } else {
      // No initial data in metadata, start with empty array
      this.detailRows = [];
      console.log('No initial data found in metadata, starting with empty detail rows');
    }
    
    // Initialize filtered rows
    //this.applyFilters();
  }
  
  onSelectChange(): void {
    console.log('Tab selection changed to:', this.selectedTab);
    // Re-apply filters when tab changes
    this.applyFilters();
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
      
      // Get the highest item_id and increment
      const maxId = this.detailRows.reduce((max, row) => 
        Math.max(max, row.item_id || 0), 0);
      newRow.item_id = maxId + 1;
      
      currentTab.detail.fields.forEach(field => {
        newRow[field.key] = field.default || '';
      });
      
      this.detailRows.push(newRow);
      this.applyFilters();
    }
  }

  removeDetailRow(index: number): void {
    // Find the actual row in detailRows based on the filtered index
    const rowToRemove = this.filteredDetailRows[index];
    const actualIndex = this.detailRows.findIndex(row => row === rowToRemove);
    
    if (actualIndex > -1) {
      this.detailRows.splice(actualIndex, 1);
      this.applyFilters();
      this.calculateDetailTotals();
    }
  }

  onDetailFieldChange(rowIndex: number, fieldKey: string, value: any): void {
    // Get the actual row from filtered results
    const row = this.filteredDetailRows[rowIndex];
    if (!row) return;
    
    row[fieldKey] = value;
    this.calculateDetailTotals();
    
    // Auto-calculate line total if quantity and price are available
    if (fieldKey === 'quantity' || fieldKey === 'price') {
      if (row.quantity && row.price) {
        row.total = row.quantity * row.price;
      }
    }
    
    // Re-apply filters if the changed field has a filter
    if (this.columnFilters[fieldKey]) {
      this.applyFilters();
    }
  }

  trackByIndex(index: number, item: any): any {
    return item.item_id || index;
  }

  private calculateDetailTotals(): void {
    // Trigger recalculation of summary totals
    // This method can be extended based on your business logic
  }

  // Filter methods
  onFilterChange(fieldKey: string, value: string): void {
    if (value && value.trim()) {
      this.columnFilters[fieldKey] = value.trim();
    } else {
      delete this.columnFilters[fieldKey];
    }
    this.applyFilters();
  }

  applyFilters(): void {
    if (!this.detailRows || this.detailRows.length === 0) {
      this.filteredDetailRows = [];
      return;
    }

    const activeFilters = Object.keys(this.columnFilters).filter(key => 
      this.columnFilters[key] && this.columnFilters[key].trim()
    );

    if (activeFilters.length === 0) {
      this.filteredDetailRows = [...this.detailRows];
      return;
    }

    this.filteredDetailRows = this.detailRows.filter(row => {
        const matches = activeFilters.map(fieldKey => {
        const filterValue = this.columnFilters[fieldKey].toLowerCase();
        const rowValue = (row[fieldKey] || '').toString().toLowerCase();
        console.log("Field data", filterValue)
        // Different filter logic based on field type
        const field = this.getCurrentDetailFields()?.find(f => f.key === fieldKey);
        
        if (field?.type === 'select') {
          return rowValue === filterValue;
        } else if (field?.type === 'number') {
          // For numbers, support exact match or range (e.g., ">100", "<50", "100-200")
          if (filterValue.startsWith('>')) {
            const num = parseFloat(filterValue.substring(1));
            return !isNaN(num) && parseFloat(rowValue) > num;
          } else if (filterValue.startsWith('<')) {
            const num = parseFloat(filterValue.substring(1));
            return !isNaN(num) && parseFloat(rowValue) < num;
          } else if (filterValue.includes('-')) {
            const [min, max] = filterValue.split('-').map(v => parseFloat(v.trim()));
            const value = parseFloat(rowValue);
            return !isNaN(min) && !isNaN(max) && !isNaN(value) && value >= min && value <= max;
          } else {
            return rowValue.includes(filterValue);
          }
        } else {
          // Text fields - partial match
          return rowValue.includes(filterValue);
        }
      });

      // Apply AND/OR logic based on filterMode
      return this.filterMode === 'all' ? 
        matches.every(match => match) : 
        matches.some(match => match);
    });
  }

  clearFilter(fieldKey: string): void {
    delete this.columnFilters[fieldKey];
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.columnFilters = {};
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return Object.keys(this.columnFilters).some(key => 
      this.columnFilters[key] && this.columnFilters[key].trim()
    );
  }

  getActiveFilterCount(): number {
    return Object.keys(this.columnFilters).filter(key => 
      this.columnFilters[key] && this.columnFilters[key].trim()
    ).length;
  }

  toggleFilterMode(): void {
    this.filterMode = this.filterMode === 'all' ? 'any' : 'all';
    this.applyFilters();
  }

  

  private getCurrentDetailFields(): any[] {
    const currentTab = this.metadata?.tabs[this.selectedTab];
    return currentTab?.detail?.fields || [];
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

  calculateTotalQuantity(): number {
    return this.detailRows.reduce((sum, row) => {
      return sum + (parseFloat(row.quantity) || 0);
    }, 0);
  }

  // Filtered calculations
  calculateFilteredSubtotal(): number {
    return this.filteredDetailRows.reduce((sum, row) => {
      const quantity = parseFloat(row.quantity) || 0;
      const price = parseFloat(row.price) || 0;
      return sum + (quantity * price);
    }, 0);
  }

  calculateFilteredQuantity(): number {
    return this.filteredDetailRows.reduce((sum, row) => {
      return sum + (parseFloat(row.quantity) || 0);
    }, 0);
  }

  calculateFilteredPercentage(): string {
    const total = this.calculateSubtotal();
    const filtered = this.calculateFilteredSubtotal();
    if (total === 0) return '0';
    return ((filtered / total) * 100).toFixed(1);
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

  formatFieldValue(row: any, field: any): string {
    const value = row[field.key];
    if (value === null || value === undefined || value === '') return '';
    
    switch (field.type) {
      case 'number':
        if (field.key === 'total' || field.key === 'price') {
          return this.formatCurrency(parseFloat(value));
        }
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

  getOptionLabel(fieldKey: string, value: string): string {
    const field = this.getCurrentDetailFields().find(f => f.key === fieldKey);
    if (!field || !field.options) return value;
    
    const option = field.options.find((opt: any) => opt.value === value);
    return option ? option.label : value;
  }
}