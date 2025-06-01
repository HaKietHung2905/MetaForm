
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PageMetadata } from '../models';

@Component({
  selector: 'app-grid-master',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './grid-master.component.html',
  styleUrls: ['./grid-master.component.css']
})
export class GridMaster implements OnInit {
  metadata?: PageMetadata;
  selectedTab = 0;
  labelData: {[key: string]: any} = {};
  detailRows: any[] = [];
  filteredDetailRows: any[] = [];
  errors: { [key: string]: string } = {};
  
  // Store detail fields for easy access
  detailFields: any[] = [];
  
  // Filter-related properties
  columnFilters: { [key: string]: string } = {};
  filterMode: 'all' | 'any' = 'all'; // 'all' = AND logic, 'any' = OR logic

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get<PageMetadata>('metadata/grid-master.page.json').subscribe({
      next: (meta) => {
        this.metadata = meta;
        this.initializeFormData();
        this.loadInitialDetailData();
      },
      error: (error) => {
        console.error('Error loading grid metadata:', error);
      }
    });
  }
 
  private initializeFormData(): void {
    if (!this.metadata) return;
    
    console.log('Metadata tabs:', this.metadata.tabs);
    
    // Find the tab that has detail configuration (this is where your grid data comes from)
    this.metadata.tabs.forEach(tab => {
      if (tab.detail && tab.detail.fields) {
        // Load labels from detail fields (these are your table columns)
        tab.detail.fields.forEach(field => {
          this.labelData[field.key] = field.label || field.key;
        });
        
        // Store detail fields for easy access
        this.detailFields = tab.detail.fields;
        
        console.log('Loaded detail field labels:', this.labelData);
        console.log('Detail fields:', this.detailFields);
      }
      
      // You can still load form labels if needed for other purposes
      if (tab.form && tab.form.fields) {
        tab.form.fields.forEach(field => {
          // Use a different object or prefix to avoid conflicts
          // this.formLabels[field.key] = field.label || field.key;
        });
      }
    });
  }
  
  loadInitialDetailData(): void {
    // Check if metadata has initial data from the detail configuration
    const currentTab = this.metadata?.tabs.find(tab => tab.detail);
    
    if (currentTab?.detail && (currentTab.detail as any).initialData) {
      // Load the initial data from metadata JSON file
      this.detailRows = [...(currentTab.detail as any).initialData];
      console.log('Loaded initial detail data from metadata:', this.detailRows);
      
      // Verify that labels are loaded correctly
      if (this.detailFields.length > 0) {
        console.log('First field label:', this.detailFields[0].label);
        console.log('Labels mapping:', this.labelData);
      }
    } else {
      // No initial data in metadata, start with empty array
      this.detailRows = [];
      console.log('No initial data found in metadata, starting with empty detail rows');
    }
    
    // Apply filters
    this.applyFilters();
  }

  // Helper method to get field label
  getFieldLabel(fieldKey: string): string {
    return this.labelData[fieldKey] || fieldKey;
  }

  // Helper method to get all detail fields
  getDetailFields(): any[] {
    return this.detailFields;
  }

  onSelectChange(): void {
    console.log('Tab selection changed to:', this.selectedTab);
    this.applyFilters();
  }

  

  private validateForm(): void {
    this.errors = {};
    const currentTab = this.metadata?.tabs[this.selectedTab];
    
    if (currentTab?.form) {
      currentTab.form.fields.forEach(field => {
        if (field.required) {
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
        if (field.type === 'number') {
          newRow[field.key] = field.default || 0;
        } else if (field.type === 'select') {
          newRow[field.key] = field.default || '';
        } else {
          newRow[field.key] = field.default || '';
        }
      });
      
      // Set default status
      newRow.status = 'active';
      
      this.detailRows.push(newRow);
      
      this.applyFilters();
    }
  }

  removeDetailRow(index: number): void {
    const rowToRemove = this.filteredDetailRows[index];
    const actualIndex = this.detailRows.findIndex(row => row === rowToRemove);
    
    if (actualIndex > -1) {
      if (confirm(`Bạn có chắc chắn muốn xóa mặt hàng "${rowToRemove.item_name}"?`)) {
        this.detailRows.splice(actualIndex, 1);
      
        this.applyFilters();
      }
    }
  }

  onDetailFieldChange(rowIndex: number, fieldKey: string, value: any): void {
    const row = this.filteredDetailRows[rowIndex];
    if (!row) return;
    
    row[fieldKey] = value;
    
    // Auto-calculate total value
    if (fieldKey === 'quantity' || fieldKey === 'unit_price') {
      if (row.quantity !== null && row.quantity !== undefined && 
          row.unit_price !== null && row.unit_price !== undefined) {
        row.total_value = (parseFloat(row.quantity) || 0) * (parseFloat(row.unit_price) || 0);
      }
    }

    // Check stock levels and update status automatically
    if (fieldKey === 'quantity') {
      this.checkStockLevel(row);
    }

    // Update item code if item name changes (auto-generate)
    if (fieldKey === 'item_name' && !row.item_code) {
      row.item_code = this.generateItemCode(row.item_name, row.category);
    }
    
    // Re-apply filters if the changed field has a filter
    if (this.columnFilters[fieldKey]) {
      this.applyFilters();
    }
  }

  private generateItemCode(itemName: string, category: string): string {
    if (!itemName) return '';
    
    const categoryPrefixes: { [key: string]: string } = {
      'raw_material': 'NVL',
      'finished_product': 'TP',
      'semi_finished': 'BTP',
      'accessory': 'PK',
      'tool': 'CT',
      'consumable': 'VT'
    };
    
    const prefix = categoryPrefixes[category] || 'SP';
    const maxId = this.detailRows.reduce((max, row) => {
      if (row.item_code && row.item_code.startsWith(prefix)) {
        const num = parseInt(row.item_code.substring(prefix.length));
        return Math.max(max, isNaN(num) ? 0 : num);
      }
      return max;
    }, 0);
    
    return `${prefix}${String(maxId + 1).padStart(3, '0')}`;
  }

  private checkStockLevel(row: any): void {
    const quantity = parseFloat(row.quantity) || 0;
    const minStock = parseFloat(row.min_stock) || 0;
    
    if (quantity <= 0) {
      row.status = 'out_of_stock';
    } else if (minStock > 0 && quantity <= minStock) {
      row.status = 'expiring_soon'; // Using this for low stock warning
    } else if (row.status === 'out_of_stock' || row.status === 'expiring_soon') {
      row.status = 'active'; // Reset to active if stock is restored
    }
  }

  trackByIndex(index: number, item: any): any {
    return item.item_id || index;
  }

  // Filter methods (following the same pattern as customer-order component)
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
        
        const field = this.getCurrentDetailFields()?.find(f => f.key === fieldKey);
        
        if (field?.type === 'select') {
          return rowValue === filterValue;
        } else if (field?.type === 'number') {
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
          return rowValue.includes(filterValue);
        }
      });

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

  getColumnWidth(fieldType: string): string {
    const widthMap: { [key: string]: string } = {
      'text': '150px',
      'number': '100px',
      'select': '120px',
      'date': '120px'
    };
    return widthMap[fieldType] || '120px';
  }

  // Summary calculation methods
  shouldShowSummary(): boolean {
    return this.detailRows.length > 0 && this.selectedTab === 1;
  }

  calculateTotalValue(): number {
    return this.detailRows.reduce((sum, row) => {
      const quantity = parseFloat(row.quantity) || 0;
      const price = parseFloat(row.unit_price) || 0;
      return sum + (quantity * price);
    }, 0);
  }

  calculateTotalQuantity(): number {
    return this.detailRows.reduce((sum, row) => {
      return sum + (parseFloat(row.quantity) || 0);
    }, 0);
  }

  calculateFilteredValue(): number {
    return this.filteredDetailRows.reduce((sum, row) => {
      const quantity = parseFloat(row.quantity) || 0;
      const price = parseFloat(row.unit_price) || 0;
      return sum + (quantity * price);
    }, 0);
  }

  calculateFilteredQuantity(): number {
    return this.filteredDetailRows.reduce((sum, row) => {
      return sum + (parseFloat(row.quantity) || 0);
    }, 0);
  }

  calculateFilteredPercentage(): string {
    const total = this.calculateTotalValue();
    const filtered = this.calculateFilteredValue();
    if (total === 0) return '0';
    return ((filtered / total) * 100).toFixed(1);
  }

  // Inventory-specific methods
  getLowStockItems(): any[] {
    return this.detailRows.filter(row => {
      const quantity = parseFloat(row.quantity) || 0;
      const minStock = parseFloat(row.min_stock) || 0;
      return minStock > 0 && quantity <= minStock && quantity > 0;
    });
  }

  getExpiringItems(): any[] {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    return this.detailRows.filter(row => {
      if (!row.expiry_date) return false;
      const expiryDate = new Date(row.expiry_date);
      return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
    });
  }

  getItemsByCategory(): { [key: string]: any[] } {
    return this.detailRows.reduce((acc, row) => {
      const category = row.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(row);
      return acc;
    }, {});
  }

  // Formatting helpers (reusing from customer-order pattern)
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
        if (field.key === 'total_value' || field.key === 'unit_price') {
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

  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'active': 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800',
      'inactive': 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800',
      'out_of_stock': 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800',
      'expiring_soon': 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800',
      'cancelled': 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800'
    };
    return statusClasses[status] || 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
  }

  // Advanced inventory analytics methods
  getInventoryHealth(): { healthy: number; warning: number; critical: number } {
    let healthy = 0;
    let warning = 0;
    let critical = 0;

    this.detailRows.forEach(row => {
      const quantity = parseFloat(row.quantity) || 0;
      const minStock = parseFloat(row.min_stock) || 0;
      
      if (quantity <= 0) {
        critical++;
      } else if (minStock > 0 && quantity <= minStock) {
        warning++;
      } else {
        healthy++;
      }
    });

    return { healthy, warning, critical };
  }

  getTopValueItems(count: number = 5): any[] {
    return [...this.detailRows]
      .sort((a, b) => (b.total_value || 0) - (a.total_value || 0))
      .slice(0, count);
  }

  getCategoryValueBreakdown(): { [key: string]: number } {
    return this.detailRows.reduce((acc, row) => {
      const category = row.category || 'uncategorized';
      const value = parseFloat(row.total_value) || 0;
      acc[category] = (acc[category] || 0) + value;
      return acc;
    }, {} as { [key: string]: number });
  }

  getSupplierBreakdown(): { [key: string]: { count: number; value: number } } {
    return this.detailRows.reduce((acc, row) => {
      const supplier = row.supplier || 'Không xác định';
      const value = parseFloat(row.total_value) || 0;
      
      if (!acc[supplier]) {
        acc[supplier] = { count: 0, value: 0 };
      }
      
      acc[supplier].count++;
      acc[supplier].value += value;
      return acc;
    }, {} as { [key: string]: { count: number; value: number } });
  }

 

  

  // Bulk operations
  bulkUpdateStatus(newStatus: string, selectedRows?: any[]): void {
    const rowsToUpdate = selectedRows || this.filteredDetailRows;
    
    if (rowsToUpdate.length === 0) {
      alert('Không có dòng nào được chọn để cập nhật.');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn cập nhật trạng thái cho ${rowsToUpdate.length} mặt hàng?`)) {
      rowsToUpdate.forEach(row => {
        row.status = newStatus;
      });
     
      alert(`Đã cập nhật trạng thái cho ${rowsToUpdate.length} mặt hàng.`);
    }
  }

  bulkAdjustPrices(adjustmentType: 'percentage' | 'fixed', adjustmentValue: number, selectedRows?: any[]): void {
    const rowsToUpdate = selectedRows || this.filteredDetailRows;
    
    if (rowsToUpdate.length === 0) {
      alert('Không có dòng nào được chọn để điều chỉnh giá.');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn điều chỉnh giá cho ${rowsToUpdate.length} mặt hàng?`)) {
      rowsToUpdate.forEach(row => {
        const currentPrice = parseFloat(row.unit_price) || 0;
        
        if (adjustmentType === 'percentage') {
          row.unit_price = currentPrice * (1 + adjustmentValue / 100);
        } else {
          row.unit_price = currentPrice + adjustmentValue;
        }
        
        // Recalculate total value
        row.total_value = (parseFloat(row.quantity) || 0) * row.unit_price;
      });
    
      alert(`Đã điều chỉnh giá cho ${rowsToUpdate.length} mặt hàng.`);
    }
  }

  // Search and Quick Actions
  quickSearch(searchTerm: string): void {
    if (!searchTerm || !searchTerm.trim()) {
      this.clearAllFilters();
      return;
    }

    // Clear existing filters and apply global search
    this.columnFilters = {};
    
    // Search across multiple fields
    this.filteredDetailRows = this.detailRows.filter(row => {
      const searchValue = searchTerm.toLowerCase();
      return (
        (row.item_code || '').toLowerCase().includes(searchValue) ||
        (row.item_name || '').toLowerCase().includes(searchValue) ||
        (row.supplier || '').toLowerCase().includes(searchValue) ||
        (row.location_in_warehouse || '').toLowerCase().includes(searchValue)
      );
    });
  }

  // Validation helpers
  validateItemCode(itemCode: string): boolean {
    if (!itemCode) return false;
    
    // Check for duplicates
    const duplicate = this.detailRows.find(row => 
      row.item_code === itemCode && row !== this.getCurrentEditingRow()
    );
    
    return !duplicate;
  }

  validateWarehouseLocation(location: string): boolean {
    if (!location) return true; // Optional field
    
    // Check pattern A-01-02
    const pattern = /^[A-Z]-[0-9]{2}-[0-9]{2}$/;
    return pattern.test(location);
  }

  private getCurrentEditingRow(): any {
    // Helper method to get currently editing row (if any)
    // This would be used in more advanced editing scenarios
    return null;
  }

  

  
}