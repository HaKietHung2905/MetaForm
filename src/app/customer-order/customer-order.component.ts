import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PageMetadata } from '../models';

@Component({
  selector: 'app-customer-order',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './customer-order.component.html',
})
export class CustomerOrderComponent implements OnInit {
  metadata?: PageMetadata;
  selectedTab = 0;
  formData: { [key: string]: any } = {};

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get<PageMetadata>('metadata/customer-order.page.json').subscribe((meta) => {
      this.metadata = meta;
    });
  }
  onSelectChange(): void {
    alert(1123)
  }
  onSubmit() {
    console.log('Submit form data:', this.formData);
    alert('Dữ liệu gửi đi: ' + JSON.stringify(this.formData));
  }
}
