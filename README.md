# Angular Dynamic Form Generator

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.13.

## Project Overview

This project aims to build a dynamic form generator in Angular that creates forms based on JSON metadata, minimizing hard-coded logic and UI.

## Features

* **Dynamic Form Creation:**  Generates forms based on JSON metadata defining fields, input types, validation rules, and layout.
* **Supported Input Types:** Supports a variety of input types including text, number, email, password, dropdown, multi-select, checkbox, radio, date picker, time picker, file upload, textarea, and potentially more complex components like autocomplete and cascading dropdowns.
* **Dynamic Validation:**  Applies validation rules from the metadata, providing clear error messages.
* **Data Handling:** Collects and submits form data in JSON format, integrating with backend APIs.
* **UI Customization:**  Supports styling and layout customization using Tailwind CSS and allows for custom templates for individual input types.
* **Performance:** Designed for fast loading and handling a large number of fields without impacting user experience.

## Analysis of Requirements

**Goal:** Build a system that allows dynamic form creation based on metadata without hard-coding UI or logic.

**Functional Requirements:**

* **Supported Input Types:** The dynamic form generator should support a wide range of input types, catering to diverse data entry needs. Each input type should offer specific customization options as detailed below:

    * **Text:**  Single-line text input.
    * **Number:** Numeric input.
    * **Email:** Email input with built-in validation.
    * **Password:** Password input with masking. 
    * **Textarea:** Multi-line text input.
    * **Select (Dropdown):** Single selection from a list of options. 
    * **Multi-Select:** Multiple selections from a list of options. 
    * **Radio Buttons:** Single selection from a group of options.
    * **Checkboxes:** Multiple selections from a group of options.
    * **Date Picker:** Date selection. 
    * **Time Picker:** Time selection. 
    * **File Upload:** File selection and upload.
    * **Slider (Range Input):**  Selection within a range. 
    * **Toggle Switch:**  On/off switch.
    * **Color Picker:** Color selection. 
* **Supported Input Types:** This dynamic form generator leverages metadata defined in JSON format to create forms, eliminating the need for hard-coding form structure in your application's code.  This approach provides significant advantages in terms of flexibility, maintainability, and scalability.

* **Dynamic Validation:** Apply validation rules from metadata and display user-friendly error messages.
* **UI Customization:**  Customize layout, styling (using Tailwind CSS), and individual input templates.

## Struct
```bash
export interface FieldValidator {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  minDate?: string;
  maxDate?: string;
  minSelected?: number;  // For multi-select
  maxSelected?: number; // For multi-select
  class?: string
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface Field {
  key: string;
  label: string;
  type: string; // can use enum
  default?: any; // Use a consistent name for default value
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

export interface FormMetadata {
  title?: string;
  class?: string
  fields: Field[];
}
```
To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
