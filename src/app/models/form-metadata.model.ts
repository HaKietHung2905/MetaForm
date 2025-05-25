export interface PageMetadata {
  title: string;
  class?: string;
  tabs: TabMetadata[];
}

export interface TabMetadata {
  title: string;  
  class?: string;
  form?: FormMetadata;           
  detail?: FormMetadata; 
}

export interface FormMetadata {
  title?: string;
  class?: string;
  fields: Field[];
}

export interface FieldValidator {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  minDate?: string;
  maxDate?: string;
  minSelected?: number;
  maxSelected?: number;
  class?: string;
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface Field {
  key: string;
  label: string;
  type: string;
  default?: any;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  validators?: FieldValidator;
  options?: FieldOption[];
  rows?: number;
  cols?: number;
  multiple?: boolean;
  min?: number;
  max?: number;
  step?: number;
}