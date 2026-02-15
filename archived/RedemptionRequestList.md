# RedemptionRequestList Component Documentation

## Overview

`RedemptionRequestList` is a React component that displays pending reward redemption requests for parent approval. Parents can approve or reject individual requests or use batch operations to process multiple requests at once.

**Location:** `components/admin/RedemptionRequestList.tsx`

---

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `requests` | `any[]` | Yes | Array of redemption request objects with reward and user data |
| `locale` | `string` | Yes | Current locale (`"en"` or `"zh-CN"`) for i18n |
| `parentId` | `string` | Yes | ID of the parent user (for reference) |

---

## Features

### 1. Individual Approval with Date Picker
- Click "Approve" button on any request
- Modal opens with date picker (defaults to today)
- Cannot select future dates (max date = today)
- Click "Confirm" to approve with selected date

### 2. Batch Selection Mode
- Click "Select" to enter selection mode
- Check individual items or use "Select All"
- "Clear" button removes all selections
- Exit selection mode clears all selections

### 3. Batch Approval with Date Picker
- Select multiple requests
- Click "Approve All" in floating action bar
- Modal shows count and date picker
- All selected requests approved with same date

### 4. Individual/Batch Rejection
- Click "Reject" to open reason modal (optional)
- Batch reject applies same reason to all selected

---

## State Management

### Core State
```typescript
const [processingId, setProcessingId] = useState<string | null>(null);
const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
const [rejectReason, setRejectReason] = useState("");
```

### Approval Modal State
```typescript
const [showApproveModal, setShowApproveModal] = useState<string | null>(null);
const [approvalDate, setApprovalDate] = useState<string>("");
const [maxDate, setMaxDate] = useState<string>("");
```

### Batch Selection State
```typescript
const [selectionMode, setSelectionMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [showBatchApproveModal, setShowBatchApproveModal] = useState(false);
const [batchApprovalDate, setBatchApprovalDate] = useState<string>("");
const [showBatchRejectModal, setShowBatchRejectModal] = useState(false);
const [batchRejectReason, setBatchRejectReason] = useState("");
const [isBatchProcessing, setIsBatchProcessing] = useState(false);
```

---

## Key Functions

### `getLocalDateString()`
Returns today's date in `YYYY-MM-DD` format using local timezone.

```typescript
const getLocalDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
```

**Returns:** `string` - Date in `YYYY-MM-DD` format

---

### `handleApprove(requestId: string)`
Opens the approval modal for a specific request.

```typescript
const handleApprove = (requestId: string) => {
  setApprovalDate(getLocalDateString());
  setShowApproveModal(requestId);
};
```

**Parameters:**
- `requestId`: The ID of the redemption request to approve

**Side Effects:**
- Resets `approvalDate` to today
- Opens approval modal

---

### `confirmApprove()`
Executes the approval with the selected date.

```typescript
const confirmApprove = async () => {
  // ...
  const dateToUse = approvalDate
    ? new Date(approvalDate + "T23:59:59").toISOString()
    : new Date().toISOString();

  await supabase.from("redemptions").update({
    status: "approved",
    reviewed_at: dateToUse,
  }).eq("id", showApproveModal);
  // ...
};
```

**Database Update:**
- Sets `status` to `"approved"`
- Sets `reviewed_at` to selected date (end of day in ISO format)

**Side Effects:**
- Closes modal
- Refreshes page via `router.refresh()`
- Shows error alert on failure

---

### `handleBatchApprove()`
Opens the batch approval modal.

```typescript
const handleBatchApprove = () => {
  if (selectedIds.size === 0) return;
  setBatchApprovalDate(getLocalDateString());
  setShowBatchApproveModal(true);
};
```

**Side Effects:**
- Resets `batchApprovalDate` to today
- Opens batch approval modal

---

### `confirmBatchApprove()`
Executes batch approval for all selected requests.

```typescript
const confirmBatchApprove = async () => {
  const ids = Array.from(selectedIds);
  const dateToUse = batchApprovalDate
    ? new Date(batchApprovalDate + "T23:59:59").toISOString()
    : new Date().toISOString();

  await supabase.from("redemptions").update({
    status: "approved",
    reviewed_at: dateToUse,
  }).in("id", ids);
  // ...
};
```

**Database Update:**
- Updates all selected redemptions in single query
- Sets `status` to `"approved"`
- Sets `reviewed_at` to selected date

**Side Effects:**
- Closes modal
- Exits selection mode
- Refreshes page

---

### `handleReject()`
Rejects a single request with optional reason.

```typescript
const handleReject = async () => {
  await supabase.from("redemptions").update({
    status: "rejected",
    parent_response: rejectReason.trim() || null,
    reviewed_at: new Date().toISOString(),
  }).eq("id", showRejectModal);
  // ...
};
```

**Database Update:**
- Sets `status` to `"rejected"`
- Sets `parent_response` to rejection reason (if provided)
- Sets `reviewed_at` to current timestamp

---

### `handleBatchReject()`
Rejects all selected requests with optional reason.

```typescript
const handleBatchReject = async () => {
  const ids = Array.from(selectedIds);
  await supabase.from("redemptions").update({
    status: "rejected",
    parent_response: batchRejectReason.trim() || null,
    reviewed_at: new Date().toISOString(),
  }).in("id", ids);
  // ...
};
```

---

### Selection Helpers

| Function | Description |
|----------|-------------|
| `toggleSelection(id)` | Toggle selection of a single request |
| `selectAll()` | Select all requests |
| `clearSelection()` | Clear all selections |
| `exitSelectionMode()` | Exit selection mode and clear selections |

---

## UI Components

### Empty State
Displayed when `requests.length === 0`:
- Checkmark emoji
- "No pending requests" message
- Subtitle about new requests

### Request Card
Each request displays:
- Child avatar and name
- Request timestamp
- Reward icon, name, and category
- Stars cost
- Child's note (if any)
- Approve/Reject buttons (hidden in selection mode)
- Checkbox (shown in selection mode)

### Floating Action Bar
Appears when `selectedIds.size > 0`:
- Selected count
- "Approve All" button
- "Reject All" button
- "Clear" button

### Modals

#### Individual Approve Modal
- Title: "Confirm Approval"
- Date picker with max=today
- Cancel/Approve buttons

#### Individual Reject Modal
- Title: "Reject Reason"
- Textarea for optional reason
- Cancel/Reject buttons

#### Batch Approve Modal
- Title: "Approve All"
- Selected count subtitle
- Date picker with max=today
- Cancel/Approve buttons

#### Batch Reject Modal
- Title: "Reject All"
- Selected count subtitle
- Textarea for optional reason
- Cancel/Reject buttons

---

## i18n Keys Used

| Key | EN | ZH-CN |
|-----|-----|-------|
| `admin.approve` | Approve | 批准 |
| `admin.reject` | Reject | 拒绝 |
| `admin.processing` | Processing... | 处理中... |
| `admin.approvalDate` | Approval Date | 批准日期 |
| `admin.confirmApproval` | Confirm Approval | 确认批准 |
| `admin.selectMode` | Select | 选择 |
| `admin.exitSelectMode` | Exit Select | 退出选择 |
| `admin.selectAll` | Select All | 全选 |
| `admin.clearSelection` | Clear | 清除 |
| `admin.batchApprove` | Approve All | 全部批准 |
| `admin.batchReject` | Reject All | 全部拒绝 |
| `admin.batchRejectReason` | Rejection reason... | 拒绝原因... |
| `admin.batchProcessing` | Processing... | 处理中... |
| `admin.noRequests` | No pending requests | 暂无待审批请求 |
| `admin.rejectReason` | Reject Reason | 拒绝原因 |
| `common.cancel` | Cancel | 取消 |

---

## Database Schema

### `redemptions` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `family_id` | `uuid` | Family reference |
| `child_id` | `uuid` | Child who requested |
| `reward_id` | `uuid` | Reward being redeemed |
| `stars_spent` | `integer` | Cost in stars |
| `status` | `enum` | `pending`, `approved`, `rejected`, `fulfilled` |
| `child_note` | `text` | Optional note from child |
| `parent_response` | `text` | Parent's rejection reason |
| `created_at` | `timestamp` | Request creation time |
| `reviewed_at` | `timestamp` | When parent reviewed (custom date) |
| `fulfilled_at` | `timestamp` | When reward was given |

---

## Testing

Test file: `__tests__/components/admin/RedemptionRequestList.test.tsx`

### Test Coverage (64 tests)

**Empty State (2 tests)**
- Shows empty state when no requests
- Shows message about redemption requests

**Request Display (15 tests)**
- Renders all redemption requests
- Displays reward names in EN/ZH
- Displays icons, stars, notes
- Shows deduction warning

**Approve Redemption (9 tests)**
- Opens approve modal on click
- Displays date picker in modal
- Date input has max attribute
- Calls update with correct data
- Sends reviewed_at in request
- Shows processing state
- Disables buttons while processing
- Shows alert on error
- Closes modal on cancel

**Reject Redemption (8 tests)**
- Opens modal, closes on cancel
- Clears reason on close
- Allows optional reason
- Calls update with correct data
- Shows alert on error

**Batch Selection Mode (9 tests)**
- Toggle selection mode
- Shows/hides checkboxes
- Individual selection
- Select all / clear
- Floating action bar

**Batch Approve (8 tests)**
- Opens modal with date picker
- Date input has max attribute
- Confirms with reviewed_at
- Shows selected count
- Modal cancel

**Batch Reject (7 tests)**
- Opens modal
- Shows count
- Optional reason
- Calls update
- Modal cancel

---

## Usage Example

```tsx
import RedemptionRequestList from "@/components/admin/RedemptionRequestList";

// In a Server Component
const { data: requests } = await supabase
  .from("redemptions")
  .select(`
    *,
    users:child_id (*),
    rewards:reward_id (*)
  `)
  .eq("family_id", user.family_id)
  .eq("status", "pending")
  .order("created_at", { ascending: false });

// Render
<RedemptionRequestList
  requests={requests || []}
  locale={locale}
  parentId={user.id}
/>
```

---

**Last Updated:** 2026-01-27
