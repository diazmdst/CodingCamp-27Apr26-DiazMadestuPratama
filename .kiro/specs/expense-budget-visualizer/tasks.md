# Implementation Plan: Expense & Budget Visualizer

## Overview

The core application is already working. These tasks harden the existing implementation against the full spec: extracting reusable utility functions, closing accessibility gaps, adding error-resilience for the Chart.js CDN, and building a property-based + unit test suite in a standalone `test.html` file using fast-check (no build step required).

## Tasks

- [ ] 1. Extract utility functions from inline logic
  - [ ] 1.1 Extract `validateForm(fields)` from the submit handler
    - Create a standalone `validateForm(fields)` function that accepts an object with `name`, `amount`, `category`, `date` fields and returns `false` if any field is empty, whitespace-only, or `amount <= 0`
    - Replace the inline validation block in the `submit` event listener with a call to `validateForm()`
    - _Requirements: 1.3_

  - [ ] 1.2 Extract `formatAmount(n)` utility
    - Create a `formatAmount(n)` function that returns `"Rp " + Number(n).toLocaleString('id-ID')`
    - Replace all inline `Rp ${...toLocaleString(...)}` strings in `render()` and `balanceEl.innerText` assignments with calls to `formatAmount()`
    - _Requirements: 4.1, 4.2_

- [ ] 2. Add Chart.js CDN failure guard
  - [ ] 2.1 Guard `updateChart()` against missing `window.Chart`
    - At the top of `updateChart()`, check `if (typeof Chart === 'undefined')` and log a console error then return early if Chart.js is not loaded
    - _Requirements: 7.1_

- [ ] 3. Add accessible form labels
  - [ ] 3.1 Add `<label>` elements to all form inputs in `index.html`
    - Add visually-hidden `<label>` elements (using a `.sr-only` CSS class) for `#name`, `#amount`, `#category`, `#customCategory`, and `#date` inputs so screen readers can identify each field
    - Add the `.sr-only` rule to `css/style.css` (position absolute, 1px clip, overflow hidden)
    - _Requirements: 9.1, 9.3_

- [ ] 4. Checkpoint — verify core app still works
  - Ensure all existing functionality (add, delete, filter, sort, chart, persistence) works correctly after the refactors above. Ask the user if any questions arise.

- [ ] 5. Create test harness and unit tests
  - [ ] 5.1 Create `test.html` with fast-check loaded from CDN
    - Create `test.html` at the project root that loads `js/script.js` (or the extracted pure functions), loads fast-check from CDN (`https://cdn.jsdelivr.net/npm/fast-check/lib/bundle/fast-check.min.js`), and provides a minimal test runner using `console.assert` with pass/fail output rendered in a `<pre>` element
    - _Requirements: 1.2, 1.3, 3.2, 5.2, 6.2, 6.3, 8.1, 8.2_

  - [ ]* 5.2 Write unit tests for `validateForm()`
    - Test: all fields filled → returns `true`
    - Test: empty name → returns `false`
    - Test: whitespace-only name → returns `false`
    - Test: amount = 0 → returns `false`
    - Test: negative amount → returns `false`
    - Test: missing date → returns `false`
    - _Requirements: 1.3_

  - [ ]* 5.3 Write unit tests for `formatAmount()`
    - Test: `formatAmount(1500)` → contains `"Rp"` and `"1.500"` (id-ID locale)
    - Test: `formatAmount(0)` → `"Rp 0"`
    - _Requirements: 4.1_

  - [ ]* 5.4 Write unit tests for `getColor()`
    - Test: `getColor("Food")` returns the pinned green `#82C9A0`
    - Test: `getColor("Transport")` returns the pinned blue `#7EB8D4`
    - Test: `getColor("Fun")` returns the pinned orange `#F4A96A`
    - Test: calling `getColor("CustomCat")` twice returns the same value
    - _Requirements: 10.4, 10.5_

  - [ ]* 5.5 Write unit tests for `deleteTransaction()`
    - Test: deleting a transaction by id removes it from the list
    - Test: deleting a non-existent id leaves the list unchanged
    - _Requirements: 3.2, 3.3_

  - [ ]* 5.6 Write unit tests for month filter logic
    - Test: filter `"2024-03"` on a mixed list returns only March 2024 transactions
    - Test: clearing the filter returns all transactions
    - _Requirements: 5.2, 5.3_

  - [ ]* 5.7 Write unit tests for sort logic
    - Test: sort by `amount-desc` → first item has the highest amount
    - Test: sort by `category` → items are in alphabetical order
    - _Requirements: 6.2, 6.3_

- [ ] 6. Write property-based tests
  - [ ] 6.1 Write property test for transaction persistence round-trip (Property 1)
    - Generate random valid transaction objects; assert that `JSON.parse(JSON.stringify(list))` contains a transaction with the same `name`, `amount`, `category`, and `date`
    - **Property 1: Transaction persistence round-trip**
    - **Validates: Requirements 1.2, 1.5, 8.1, 8.3**

  - [ ] 6.2 Write property test for empty/whitespace input rejection (Property 2)
    - Generate strings of whitespace and empty strings for each required field; assert `validateForm()` returns `false` and the transaction list length is unchanged
    - **Property 2: Empty/whitespace inputs are rejected**
    - **Validates: Requirements 1.3**

  - [ ] 6.3 Write property test for balance equals sum of filtered amounts (Property 3)
    - Generate random transaction arrays and random month strings; assert the computed total equals `filtered.reduce((s, t) => s + t.amount, 0)`
    - **Property 3: Balance equals sum of filtered amounts**
    - **Validates: Requirements 4.2, 5.4**

  - [ ] 6.4 Write property test for category color consistency (Property 4)
    - Generate random category name strings; assert `getColor(cat) === getColor(cat)` for any input, regardless of call order
    - **Property 4: Category color consistency**
    - **Validates: Requirements 10.4, 10.5**

  - [ ] 6.5 Write property test for category persistence round-trip (Property 5)
    - Generate random arrays of category name strings; assert `JSON.parse(JSON.stringify(cats))` deep-equals the original array
    - **Property 5: Category persistence round-trip**
    - **Validates: Requirements 2.4, 2.5, 8.2, 8.4**

  - [ ] 6.6 Write property test for sort by amount descending (Property 6)
    - Generate random transaction arrays; after sorting by `amount-desc`, assert every adjacent pair satisfies `a[i].amount >= a[i+1].amount`
    - **Property 6: Sort by amount is descending**
    - **Validates: Requirements 6.2**

  - [ ] 6.7 Write property test for sort by category ascending (Property 7)
    - Generate random transaction arrays; after sorting by `category`, assert every adjacent pair satisfies `a[i].category.localeCompare(a[i+1].category) <= 0`
    - **Property 7: Sort by category is alphabetically ascending**
    - **Validates: Requirements 6.3**

  - [ ] 6.8 Write property test for chart data matching filtered totals (Property 8)
    - Generate random transaction arrays and filter values; assert the chart data object equals the manually computed `{ [category]: sum }` for filtered transactions only
    - **Property 8: Chart data matches filtered category totals**
    - **Validates: Requirements 7.1, 7.2, 5.4**

  - [ ] 6.9 Write property test for deletion removing exactly one transaction (Property 9)
    - Generate a random non-empty transaction list and pick a random id from it; after deletion, assert list length decreased by exactly 1 and the id is absent
    - **Property 9: Deletion removes exactly one transaction**
    - **Validates: Requirements 3.2, 3.3**

  - [ ] 6.10 Write property test for month filter correctness (Property 10)
    - Generate random transaction arrays and random `YYYY-MM` strings; assert all results start with the filter string and no non-matching transaction appears
    - **Property 10: Month filter restricts to correct month**
    - **Validates: Requirements 5.2**

- [ ] 7. Final checkpoint — ensure all tests pass
  - Open `test.html` in a browser and verify all unit tests and property tests pass. Ask the user if any questions arise.

## Notes

- Sub-tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests (tasks 6.1–6.10) require extracting pure filter/sort logic into testable functions separate from DOM manipulation — do this as part of the test harness setup in task 5.1
- fast-check runs 100 iterations per property by default; this is sufficient for all properties here
- Each property test should include the tag comment: `// Feature: expense-budget-visualizer, Property {N}: {property_text}`
- The `test.html` file requires no build step and can be opened directly in any modern browser
