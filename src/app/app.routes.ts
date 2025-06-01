import { Routes } from '@angular/router';
import { CustomerOrderComponent } from './customer-order/customer-order.component';
import { DynamicFormComponent } from './dynamic-form/dynamic-form.component';
import { GridMaster } from './grid-master/grid-master.component';

export const routes: Routes = [
    { path: 'dynamic-page', component: CustomerOrderComponent },
    { path: 'dynamic-form', component: DynamicFormComponent },
    { path: 'grid-master', component: GridMaster },
    { path: '**', redirectTo: '' },
];

