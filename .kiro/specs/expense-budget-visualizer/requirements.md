# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to record, categorize, and visualize personal expenses. The app runs entirely in the browser using HTML, CSS, and Vanilla JavaScript, with all data persisted in the browser's Local Storage. It builds on an existing basic expense tracker by formalizing and expanding its capabilities: transaction management, category management, monthly filtering, sorting, and a Chart.js-powered pie chart visualization.

The app requires no backend, no build tools, and no test setup. It must work as a standalone web page in all modern browsers (Chrome, Firefox, Edge, Safari).

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense record consisting of a name, amount (in Rupiah), category, and date.
- **Transaction_List**: The ordered collection of all transactions stored in Local Storage.
- **Category**: A user-defined or default label used to group transactions (e.g., Food, Transport, Fun).
- **Category_List**: The persisted list of available categories stored in Local Storage.
- **Form**: The HTML input form used to create a new transaction.
- **Filter**: The month-based control that restricts which transactions are displayed.
- **Sorter**: The control that orders the displayed transaction list by a chosen criterion.
- **Chart**: The Chart.js pie chart that visualizes spending by category.
- **Balance_Display**: The UI element showing the total spending for the currently filtered view.
- **Local_Storage**: The browser's Web Storage API used for all client-side data persistence.

---

## Requirements

### Requirement 1: Transaction Entry

**User Story:** As a user, I want to add an expense transaction with a name, amount, category, and date, so that I can keep a record of my spending.

#### Acceptance Criteria

1. THE Form SHALL include input fields for item name (text), amount (number), category (select), and date (date picker).
2. WHEN the user submits the Form with all fields filled, THE App SHALL create a Transaction with a unique identifier, the provided name, amount, category, and date, and add it to the Transaction_List.
3. IF the user submits the Form with one or more empty fields, THEN THE App SHALL display an alert message and SHALL NOT create a Transaction.
4. WHEN a Transaction is successfully added, THE App SHALL reset the Form to its default empty state.
5. WHEN a Transaction is successfully added, THE App SHALL persist the updated Transaction_List to Local_Storage.

---

### Requirement 2: Custom Category Management

**User Story:** As a user, I want to create custom expense categories, so that I can organize my spending beyond the default options.

#### Acceptance Criteria

1. THE Category_List SHALL be initialized with the default categories: Food, Transport, and Fun.
2. THE Form SHALL include a "Add Custom" option in the category select element that, when selected, reveals a text input for entering a new category name.
3. WHEN the user selects the "Add Custom" option, THE Form SHALL display a text input field for the new category name and SHALL set focus to that input.
4. WHEN the user submits the Form with a custom category name, THE App SHALL add the new category to the Category_List if it does not already exist.
5. WHEN a new category is added to the Category_List, THE App SHALL persist the updated Category_List to Local_Storage.
6. WHEN a new category is added to the Category_List, THE App SHALL add the new category as a selectable option in the category select element for future transactions.
7. WHEN the App initializes, THE App SHALL load all categories from Local_Storage and populate the category select element with those categories.

---

### Requirement 3: Transaction Deletion

**User Story:** As a user, I want to delete a transaction, so that I can correct mistakes or remove outdated records.

#### Acceptance Criteria

1. THE App SHALL display a delete control for each Transaction in the rendered list.
2. WHEN the user activates the delete control for a Transaction, THE App SHALL remove that Transaction from the Transaction_List.
3. WHEN a Transaction is deleted, THE App SHALL persist the updated Transaction_List to Local_Storage.
4. WHEN a Transaction is deleted, THE App SHALL re-render the transaction list, Balance_Display, and Chart to reflect the removal.

---

### Requirement 4: Transaction List Display

**User Story:** As a user, I want to see a list of my recorded transactions, so that I can review my spending history.

#### Acceptance Criteria

1. THE App SHALL render each Transaction in the Transaction_List as a list item showing the item name, amount (formatted as "Rp {amount}"), category, and date.
2. THE App SHALL display the Balance_Display showing the sum of all amounts in the currently visible (filtered and sorted) transaction list, formatted as "Total: Rp {total}".
3. WHEN the Transaction_List is empty or no transactions match the active Filter, THE App SHALL render an empty list and SHALL display "Total: Rp 0" in the Balance_Display.

---

### Requirement 5: Monthly Filtering

**User Story:** As a user, I want to filter transactions by month, so that I can review my spending for a specific time period.

#### Acceptance Criteria

1. THE App SHALL provide a month input control that allows the user to select a year and month.
2. WHEN the user selects a month using the Filter, THE App SHALL display only the Transactions whose date falls within that month and year.
3. WHEN the user clears the Filter, THE App SHALL display all Transactions regardless of date.
4. WHEN the Filter value changes, THE App SHALL update the Balance_Display and Chart to reflect only the filtered Transactions.

---

### Requirement 6: Transaction Sorting

**User Story:** As a user, I want to sort my transactions by amount or category, so that I can quickly find and compare expenses.

#### Acceptance Criteria

1. THE App SHALL provide a sort select control with options: no sort (default), sort by amount (descending), and sort by category (alphabetical ascending).
2. WHEN the user selects "Amount" in the Sorter, THE App SHALL display the filtered Transactions ordered from highest to lowest amount.
3. WHEN the user selects "Category" in the Sorter, THE App SHALL display the filtered Transactions ordered alphabetically by category name.
4. WHEN the user selects the default (no sort) option, THE App SHALL display the filtered Transactions in the order they were added.

---

### Requirement 7: Spending Visualization

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going at a glance.

#### Acceptance Criteria

1. THE App SHALL render a Chart.js pie chart that displays the total spending per category for the currently filtered Transaction set.
2. WHEN the Transaction_List or Filter changes, THE App SHALL update the Chart to reflect the current filtered category totals.
3. WHEN the filtered Transaction set is empty, THE App SHALL render an empty Chart with no segments.
4. THE Chart SHALL display each category as a distinct labeled segment proportional to its share of total filtered spending.

---

### Requirement 8: Data Persistence

**User Story:** As a user, I want my transactions and categories to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. THE App SHALL persist all Transactions to Local_Storage whenever a Transaction is added or deleted.
2. THE App SHALL persist the Category_List to Local_Storage whenever a new category is added.
3. WHEN the App initializes, THE App SHALL load the Transaction_List from Local_Storage and render all stored Transactions.
4. WHEN the App initializes, THE App SHALL load the Category_List from Local_Storage and populate the category select element.
5. IF Local_Storage contains no saved Transaction_List, THEN THE App SHALL initialize with an empty Transaction_List.
6. IF Local_Storage contains no saved Category_List, THEN THE App SHALL initialize the Category_List with the default categories: Food, Transport, and Fun.

---

### Requirement 9: Responsive and Accessible UI

**User Story:** As a user, I want the app to be easy to read and use on any modern browser, so that I can track expenses without friction.

#### Acceptance Criteria

1. THE App SHALL render correctly in Chrome, Firefox, Edge, and Safari without requiring any installation or build step.
2. THE App SHALL apply a clean, minimal visual layout with a centered container, readable typography, and clear visual hierarchy.
3. THE App SHALL display all interactive controls (form inputs, buttons, sort, filter) with sufficient size and spacing for comfortable use.
4. WHILE the transaction list contains more items than the visible area allows, THE App SHALL make the list scrollable without expanding the page layout.

---

### Requirement 10: Colorful Visual Theme

**User Story:** As a user, I want the app to use a pleasant, colorful design, so that it feels engaging and easy to navigate without being visually overwhelming.

#### Acceptance Criteria

1. THE App SHALL use a cohesive color palette with soft, medium-saturation colors (e.g., muted blues, greens, purples, oranges) — avoiding neon, fluorescent, or extremely saturated hues.
2. THE App SHALL apply distinct accent colors to interactive elements such as the submit button, delete controls, and category badges to create visual differentiation.
3. THE App SHALL use a light, colored background (e.g., a soft gradient or pastel tone) rather than plain white or grey, to give the app a warm and inviting feel.
4. THE App SHALL style each transaction list item with a subtle colored left border or background tint based on its category, so categories are visually distinguishable at a glance.
5. THE Chart SHALL use a consistent set of soft, distinct colors for each category segment, matching the color scheme used in the transaction list.
6. THE App SHALL maintain sufficient contrast between text and background colors to ensure readability across all UI elements.
