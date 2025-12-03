# Gmail Label Issue

## Problem
The sync isn't finding emails because Gmail nested labels have full paths.

## Your Gmail Labels (from screenshot):
```
Job Search/
  JH - Apps/
    JH25 - Recruiter Screen
```

## What the code searches for:
```
'JH25 - Recruiter Screen'
```

## What Gmail actually has:
```
'Job Search/JH - Apps/JH25 - Recruiter Screen'
```

## Solution Options:

### Option 1: Update your Gmail labels (Recommended)
Create labels directly at root level without nesting:
- `JH25 - Applied`
- `JH25 - Recruiter Screen`
- `JH25 - Hiring Manager`
- etc.

### Option 2: Update the code to match your label structure
Change the label map to include full paths:
```typescript
const GMAIL_LABEL_STATUS_MAP: Record<string, string> = {
  'Job Search/JH - Apps/JH25 - Applied': 'applied',
  'Job Search/JH - Apps/JH25 - Recruiter Screen': 'recruiter_screen',
  // etc.
}
```

### Option 3: Make code match any label ending with the pattern
Update the matching logic to check if label ends with the expected name.

## Quick Fix:
In Gmail, move/rename your labels to be at root level (not nested).
