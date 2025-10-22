# Activity Feature Implementation Plan

## Overview

Add an annual activity view showing completed todos in a 4×3 grid of months (Mon-Fri only), with AI-powered weekly summaries and day-level detail popups.

## Current Implementation Status ✅

### Completed UI Components

- ✅ **Activity.tsx** - Full year view with 12 months in 4×3 grid
- ✅ **ActivityWeekDetail.tsx** - Week drill-down showing completed todos
- ✅ **TopBar.tsx** - Year navigation and Calendar/Activity toggle
- ✅ **Activity styles** - Responsive month grid with consistent 5-week layout
- ✅ **Mock data generation** - For UI development and testing

### Layout Design

- **12 months** displayed in 4 columns × 3 rows
- **Mon-Fri only** - no weekends shown
- **5 weeks per month** - padded for visual consistency
- **Responsive sizing** - fills screen without scrolling (like Calendar)
- **Color intensity** - 5 levels showing todo completion density

## Data Structure

### Firebase Schema

**Collection: `activity`**

```typescript
interface ActivityWeek {
  id: string; // auto-generated Firestore ID
  userId: string; // for security rules
  year: number; // 2025
  week: number; // 1-52 (sequential week number, Week 1 = first Mon-Fri in January)
  dailyCounts: number[]; // [Mon, Tue, Wed, Thu, Fri] - defaults to [0,0,0,0,0]
  completedTodos: Array<{
    // NEW: Store todo details for day popup
    date: string; // ISO date (YYYY-MM-DD)
    text: string;
    url?: string;
  }>;
  aiSummary?: string; // NEW: AI-generated
  aiPersonalSummary?: string;
  updatedAt: Timestamp;
}
```

**Note on Week Numbering:**

- Week numbers are sequential 1-52 throughout the year
- Week 1 = first Monday-Friday in January
- Week 2 = second Monday-Friday, etc.
- This is NOT ISO week numbering (which can start/end in different years)
- Week numbers align with the calendar year boundary

**Profile changes:**

```typescript
currentView?: "calendar" | "activity"  // defaults to "calendar"
```

### Security Rules

```
match /activity/{activityId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow write: if request.auth != null && request.resource.data.userId == request.auth.uid;
}
```

## New Features to Implement

### 1. Day Click Popup ⏳

**User Interaction:**

- Click any day cell → show dropdown/popup with completed todos for that day
- Display todo text with checkmarks
- If todo has URL, show as clickable link
- Click outside or ESC key to close

**UI Component:**

```typescript
// ActivityDayPopup.tsx
interface ActivityDayPopupProps {
  date: Date;
  todos: Array<{ text: string; url?: string }>;
  position: { x: number; y: number };
  onClose: () => void;
}
```

**Implementation:**

- Use absolute positioning relative to clicked cell
- Animated dropdown (slide down + fade in)
- Close on outside click (useClickOutside hook)
- Show "No todos completed" if empty

### 2. AI Weekly Summaries 🤖

**Backend: Firebase Cloud Function**

```typescript
// functions/src/generateWeeklySummaries.ts
// Scheduled function runs every weekend (Saturday or Sunday)
export const generateWeeklySummaries = functions.pubsub
  .schedule("0 2 * * 6") // Cron: 2am every Saturday (or use 0 for Sunday)
  .timeZone("UTC")
  .onRun(async (context) => {
    // For each user with completed todos last week:
    // 1. Query activity collection for previous week
    // 2. Get completedTodos array
    // 3. Create OpenAI Batch API request file
    // 4. Submit batch job and wait for completion
    // 5. Update activityWeek documents with aiSummary and aiPersonalSummary
  });
```

**OpenAI Batch API Integration:**

- **Cost Savings**: 50% discount on inputs/outputs vs. synchronous API
- **Async Processing**: Batch jobs complete within 24 hours
- **Format**: Submit JSONL file with all user requests, retrieve results from output file
- **Pricing**: ~$0.075 per 1M input tokens, $0.300 per 1M output tokens (GPT-4o-mini)

**AI Prompt Template:**

```
Given these completed todos from Week {week}, {year}:
{list of completed todos with dates}

Generate two summaries as JSON:
1. A formal summary (aiSummary): Abstract people/customers and focus on types of tasks completed. Use for activity heatmap view. Keep to 2-3 sentences.
2. A personal summary (aiPersonalSummary): Cheer the user on with encouraging, personalized insights about their accomplishments. Keep to 2-3 sentences.

Return format: {"formalSummary": "...", "personalSummary": "..."}
```

**Implementation Details:**

- Use Firebase Admin SDK to query all users with activity
- Create batch request file (JSONL format) with one request per user/week
- Submit to OpenAI Batch API using `openai.batches.create()`
- Poll batch status or use webhook for completion notification
- Parse batch output file and update Firestore documents:
  - Store formal summary in `activityWeek.aiSummary`
  - Store personal summary in `activityWeek.aiPersonalSummary`
- Add `aiSummaryGeneratedAt` timestamp
- Handle errors gracefully (log + continue for individual failures)
- Retry failed batches with exponential backoff

**Monday Morning Dialog:**

- **Trigger**: When user focuses app on a Monday morning
- **Content**: Show `aiPersonalSummary` from previous week in a dialog
- **Purpose**: Motivational start to the week with personalized encouragement
- **UI**: Non-blocking dialog with "Got it" or similar close action
- **State**: Track if user has seen this week's summary (don't show twice)

### 3. TAB to Toggle AI Summary View 🔄

**User Interaction:**

- In Activity view, press TAB key
- Each month flips to show AI summaries instead of heatmap
- Month shows title + list of weekly summaries
- Press TAB again to flip back to heatmap

**UI State:**

```typescript
const [showAISummaries, setShowAISummaries] = useState(false);

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      setShowAISummaries((prev) => !prev);
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, []);
```

**Month Display (AI Mode):**

```
January
──────────────
Week 1: You focused on feature development, completing
        several backend improvements and API updates.

Week 2: Documentation and testing were your priorities,
        with thorough QA coverage across modules.

Week 3: [No activity this week]

Week 4: Sprint planning and architecture discussions
        dominated, setting foundation for Q2.

Week 5: Code reviews and team collaboration, helping
        others while maintaining your own velocity.
```

**Layout:**

- Same 4×3 grid of months
- Each month shows title + scrollable list of weekly summaries
- Empty weeks show "[No activity this week]"
- Smooth CSS transition between views
- TAB hint shown in UI

## Implementation Steps

### Phase 1: Day Click Popup (Next) ⏳

1. Create `ActivityDayPopup.tsx` component
2. Add click handler to day cells in `Activity.tsx`
3. Query `completedTodos` from activity week document
4. Position popup relative to clicked cell
5. Handle keyboard (ESC) and outside clicks
6. Add animations (slide + fade)

### Phase 2: Backend Data Collection

1. Update `ActivityWeek` interface with `completedTodos` array
2. Modify activity tracking to store todo details
3. In `toggleTodoComplete`, add todo to week's `completedTodos`
4. Limit array size (e.g., max 100 todos per week)

### Phase 3: AI Summary Generation (OpenAI Batch API)

1. Set up OpenAI API client in Firebase Functions
2. Create scheduled function for weekend processing (Saturday 2am)
3. Query all users' activity data for previous week
4. Create JSONL batch request file with all user prompts
5. Submit batch job to OpenAI Batch API
6. Poll batch status or handle webhook callback
7. Parse batch output file and extract formal + personal summaries
8. Update activity documents with `aiSummary` and `aiPersonalSummary`
9. Add error handling, logging, and retry logic
10. Store batch job metadata for debugging

### Phase 4: TAB Toggle View

1. Add keyboard event listener in `Activity.tsx`
2. Create alternate view component for AI summaries
3. Animate transition between heatmap/summary views
4. Style summary text (typography, spacing)
5. Add visual indicator for TAB toggle

### Phase 5: Monday Morning Dialog

1. Create `MondayMotivationDialog.tsx` component
2. Detect when user focuses app on Monday morning
3. Query previous week's `aiPersonalSummary` from Firestore
4. Show dialog with personalized encouragement
5. Track dialog view state (don't show twice per week)
6. Store view state in user profile or local storage
7. Add animations (fade in + scale)

### Phase 6: Manual Generation Script ✅

**Status:** Implemented as `generateWeekSummary` Cloud Function (callable)

**Current Implementation:**
- ✅ Callable function accessible via Firebase Admin
- ✅ Accepts `userId`, `week`, and `year` parameters
- ✅ Uses synchronous OpenAI API for immediate results
- ✅ Generates both formal and personal summaries
- ✅ Updates activity document with results
- ✅ Validation (checks for completed todos)
- ✅ Error handling and logging
- ✅ **Enhanced prompt with rich contextual data:**
  - ✅ Time-to-completion tracking (createdAt → completedAt duration)
  - ✅ Batch creation detection (creation time gaps analysis)
  - ✅ Movement tracking (moveCount for rescheduling patterns)
  - ✅ Time boxing context (completedWithTimeBox flag)
  - ✅ Temporal context (timezone-aware, local time of day analysis)
  - ✅ Tag pills extraction (data-tag attributes parsed from HTML)

**Enhanced Data Structure (Implemented):**
```typescript
interface CompletedTodo {
  date: string                    // ISO date
  text: string                    // description
  createdAt: string              // ISO timestamp
  completedAt: string            // ISO timestamp
  moveCount: number              // times rescheduled
  completedWithTimeBox: boolean  // focused session flag
  hasUrl: boolean                // external link
  tags: string[]                 // extracted tag pills (without # prefix)
}

// Plus context metadata:
{
  timezone: string  // e.g., "America/Los_Angeles"
  weekStart: string
  weekEnd: string
}
```

**AI Prompt Enhancements:**
The AI now receives enriched context to generate more insightful summaries:
- **Quick wins vs. procrastination**: Identifies todos completed quickly vs. those left for weeks
- **Planning vs. crisis mode**: Detects when user creates many todos rapidly (planning) vs. scattered (ad-hoc)
- **Priority patterns**: High moveCount indicates evolving priorities or uncertainty
- **Focus patterns**: Recognizes time-boxed execution vs. ad-hoc completions
- **Work rhythm**: Analyzes early morning, late night, or consistent 9-5 patterns
- **Thematic grouping**: Uses tags to identify focus areas (feature work, bugs, urgent tasks, etc.)

### Phase 7: Integration & Polish

1. Update activity tracking hook
2. Add analytics events (batch submission, dialog views)
3. Loading states for AI summaries
4. Error states (failed generation, batch timeouts)
5. Accessibility (keyboard nav, ARIA labels)
6. Monitor batch API costs and adjust frequency if needed

## Files to Create/Modify

**New Files:**

- `apps/web/src/ActivityDayPopup.tsx` - Day detail popup
- `apps/web/src/ActivityAISummaryView.tsx` - AI summary display
- `apps/web/src/MondayMotivationDialog.tsx` - Monday morning personal summary dialog
- `functions/src/generateWeeklySummaries.ts` - Scheduled batch processing function
- `functions/src/scripts/generateWeekSummary.ts` - Manual generation script for specific user/week
- `functions/src/lib/openai-batch.ts` - OpenAI Batch API integration
- `functions/src/lib/openai-sync.ts` - OpenAI synchronous API (for manual script)
- `functions/src/lib/batch-utils.ts` - JSONL file creation and parsing utilities

**Modified Files:**

- `apps/web/src/Activity.tsx` - Add popup + TAB toggle
- `apps/web/src/App.tsx` - Add Monday dialog trigger logic
- `apps/web/src/firebase/types/activity.ts` - Add completedTodos, aiSummary, aiPersonalSummary
- `apps/web/src/hooks/useActivityTracking.ts` - Store todo details
- `apps/web/src/index.css` - Popup + summary view + dialog styles
- `functions/package.json` - Add script: `generate-summary` for manual execution

## Technical Notes

**Day Popup Positioning:**

- Calculate position based on cell bounding rect
- Account for viewport edges (flip if near edge)
- Use portal for z-index layering

**AI Summary Caching:**

- Summaries are immutable once generated
- No need to regenerate unless data changes
- Store generation timestamp

**Performance:**

- Lazy load popup content on click
- Debounce rapid clicks
- Virtual scrolling for long summary lists

**OpenAI Batch API Processing:**

- **Batch File Format**: JSONL (one JSON object per line, each with custom_id + request body)
- **Submission**: Upload batch file, submit job, receive batch ID
- **Completion Time**: 24 hours maximum (typically faster)
- **Polling**: Check batch status every 5-10 minutes or use webhooks
- **Output**: Download results file (JSONL) with custom_id matching for user/week mapping
- **Error Handling**: Individual request failures don't block entire batch
- **Cost Tracking**: Track token usage per batch for budgeting

**Rate Limiting:**

- Max 1 batch submission per week (Saturday 2am)
- Skip users/weeks that already have summaries
- Exponential backoff on batch API errors
- Implement per-tier rate limits based on OpenAI usage tiers

## Benefits

1. **Day Detail**: Quick access to what you accomplished without drilling down
2. **AI Insights**: Patterns and themes you might not notice yourself
3. **Dual View**: Toggle between granular data and narrative summaries
4. **Weekend Processing**: Summaries ready when you start your week via batch processing
5. **Minimal UX**: TAB toggle keeps UI clean and uncluttered
6. **Cost Efficiency**: 50% savings using OpenAI Batch API vs. synchronous calls
7. **Monday Motivation**: Personalized encouragement dialog to start the week strong
8. **Formal + Personal**: Two summary types for different contexts (activity view vs. motivation)
9. **Manual Generation**: On-demand script for testing, backfilling, or regenerating specific weeks
