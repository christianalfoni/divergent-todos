# Amplitude Dashboard Configuration Guide

This guide provides recommended Amplitude dashboard configurations for tracking user behavior, app adoption, and subscription metrics for Divergent Todos.

---

## 1. Key Metrics to Track

### User Acquisition & Growth
- **New Users** - Users with their first `sign_up` event
- **Daily/Weekly/Monthly Active Users (DAU/WAU/MAU)** - Unique users performing any event
- **User Retention** - % of users returning after signup
- **Platform Split** - Breakdown by `platform` user property (`desktop` vs `web`)

### User Engagement
- **Average Todos per User** - Count of `todo_created` events per user
- **Todo Completion Rate** - `todo_completed` / `todo_created` ratio
- **Feature Adoption** - Usage of timebox, view modes, themes, etc.
- **Session Duration** - Automatically tracked by Amplitude

### Subscription Metrics
- **Free Limit Reached** - Users hitting the free tier limit
- **Conversion Rate** - `purchase` / `begin_checkout` ratio
- **Revenue** - Sum of `value` property in `purchase` events
- **Churn** - Users with `subscription_canceled` events

---

## 2. Recommended Charts & Dashboards

### Dashboard 1: User Growth Overview

**Chart 1: New Users Over Time**
- Event: `sign_up`
- Chart Type: Line chart
- Group by: `method` property (Google vs Anonymous)
- Time: Last 30 days

**Chart 2: Active Users (DAU/WAU/MAU)**
- Event: Any Active Event
- Chart Type: Line chart with multiple series
- Show: DAU, WAU, MAU
- Time: Last 90 days

**Chart 3: User Retention Curve**
- Chart Type: Retention analysis
- Initial Event: `sign_up`
- Return Event: Any event
- Time Range: 30 days

**Chart 4: Platform Distribution**
- Chart Type: Pie chart
- Segment by: `platform` user property
- Time: Last 30 days

---

### Dashboard 2: Product Engagement

**Chart 1: Todo Activity Funnel**
- Chart Type: Funnel
- Steps:
  1. `todo_created`
  2. `todo_edited` (optional step)
  3. `todo_completed`
- Time: Last 30 days

**Chart 2: Feature Adoption**
- Chart Type: Bar chart
- Events to compare:
  - `timebox_opened`
  - `view_mode_changed`
  - `theme_changed`
  - `font_size_changed`
  - `weekend_toggled`
- Metric: Unique users
- Time: Last 30 days

**Chart 3: Power User Analysis**
- Chart Type: Distribution
- Event: `todo_created`
- Metric: Count per user
- Segments: 0-5, 6-10, 11-20, 21-50, 51+
- Time: Last 30 days

**Chart 4: Bulk Operations Usage**
- Chart Type: Line chart
- Events:
  - `todos_bulk_moved` (with `count` sum)
  - `day_todos_moved` (with `count` sum)
- Time: Last 30 days

---

### Dashboard 3: Onboarding & Conversion

**Chart 1: Onboarding Funnel**
- Chart Type: Funnel
- Steps:
  1. `onboarding_started`
  2. `onboarding_step_completed` (first step)
  3. `onboarding_step_completed` (subsequent steps)
  4. `onboarding_completed`
- Show drop-off at each step
- Time: Last 30 days

**Chart 2: Onboarding Completion Rate**
- Chart Type: Formula
- Formula: `onboarding_completed` / `onboarding_started` * 100
- Display as: Percentage
- Time: Last 30 days

**Chart 3: Skip Analysis**
- Event: `onboarding_skipped`
- Group by: `step` property
- Chart Type: Bar chart
- Shows: Which onboarding step users skip most often

**Chart 4: Time to First Todo**
- Chart Type: Time to Convert
- Initial Event: `sign_up`
- Conversion Event: `todo_created` (where `isOnboarding` is not true)
- Time Window: 7 days

---

### Dashboard 4: Subscription & Revenue

**Chart 1: Subscription Funnel**
- Chart Type: Funnel
- Steps:
  1. `free_limit_reached`
  2. `begin_checkout`
  3. `purchase`
- Shows conversion at each step
- Time: Last 30 days

**Chart 2: Free to Paid Conversion Rate**
- Chart Type: Formula
- Formula: `purchase` / `free_limit_reached` * 100
- Display as: Percentage
- Time: Last 30 days

**Chart 3: Revenue Over Time**
- Event: `purchase`
- Metric: Sum of `value` property
- Chart Type: Line chart
- Time: All time

**Chart 4: Subscription Health**
- Chart Type: Multi-line chart
- Events:
  - `purchase` (new subscriptions)
  - `subscription_canceled` (churn)
  - `subscription_resumed` (reactivations)
  - `subscription_payment_failed` (issues)
- Time: Last 90 days

**Chart 5: Average Todo Count at Limit**
- Event: `free_limit_reached`
- Metric: Average of `todo_count` property
- Chart Type: Single metric
- Shows: Average number of todos when users hit the limit

---

### Dashboard 5: Desktop App Performance

**Chart 1: Desktop vs Web Usage**
- Event: Any Active Event
- Segment by: `platform` user property
- Chart Type: Stacked bar chart (by week)
- Time: Last 90 days

**Chart 2: Desktop App Downloads**
- Event: `app_download_initiated`
- Chart Type: Line chart
- Time: Last 90 days

**Chart 3: Desktop App Opens**
- Event: `app_opened`
- Filter: `is_electron = true`
- Chart Type: Line chart
- Time: Last 30 days

**Chart 4: Desktop App Version Distribution**
- Chart Type: Bar chart
- Segment by: `appVersion` property
- Filter: `platform = "desktop"`
- Time: Last 7 days
- Purpose: Track version adoption after releases

---

## 3. User Segments to Create

### Segment 1: Anonymous Users
- **Definition**: Users where last `login` event has `method = "anonymous"`
- **Use**: Track behavior of trial users

### Segment 2: Authenticated Users
- **Definition**: Users who performed `account_linked` OR `login` with `method = "google"`
- **Use**: Track engaged, committed users

### Segment 3: Desktop Users
- **Definition**: User property `platform = "desktop"`
- **Use**: Desktop-specific analysis

### Segment 4: Power Users
- **Definition**: Performed `todo_created` >= 50 times in last 30 days
- **Use**: Identify highly engaged users for feedback/testimonials

### Segment 5: At-Risk Free Users
- **Definition**:
  - Performed `free_limit_reached`
  - Did NOT perform `begin_checkout` within 7 days
- **Use**: Re-engagement campaign targets

### Segment 6: Paying Customers
- **Definition**: Performed `purchase` event
- **Use**: Separate paid user behavior analysis

### Segment 7: Churned Subscribers
- **Definition**:
  - Performed `purchase`
  - Then performed `subscription_canceled`
  - No subsequent `subscription_resumed`
- **Use**: Win-back campaigns

---

## 4. Alerts to Set Up

### Critical Business Alerts

**Alert 1: Drop in Daily Active Users**
- Metric: Count of unique users (any event)
- Condition: Drops below 80% of 7-day average
- Notification: Email + Slack

**Alert 2: Subscription Conversion Drop**
- Metric: `purchase` / `begin_checkout` ratio
- Condition: Drops below 10%
- Notification: Email

**Alert 3: High Payment Failures**
- Event: `subscription_payment_failed`
- Condition: More than 5 events in 24 hours
- Notification: Email + Slack

**Alert 4: Onboarding Drop-off Spike**
- Metric: `onboarding_skipped` / `onboarding_started` ratio
- Condition: Exceeds 30%
- Notification: Email

**Alert 5: Desktop App Adoption**
- Event: `app_download_initiated`
- Condition: 10+ downloads in 1 day
- Notification: Slack (positive indicator)

---

## 5. Cohort Analysis

### Cohort 1: Sign-up Cohorts
- Group by: Week of first `sign_up` event
- Track: Retention, `todo_created` count, conversion to paid
- Compare: Anonymous vs Google sign-ups

### Cohort 2: Desktop vs Web Cohorts
- Group by: `platform` user property at signup
- Track: Engagement, feature usage, conversion
- Purpose: Understand platform differences

### Cohort 3: Onboarding Completers vs Skippers
- Group by: Whether user completed onboarding
- Track: Long-term engagement, conversion
- Purpose: Validate onboarding value

---

## 6. Custom Events & Metrics

### Custom Event 1: Core Action
- **Definition**: `todo_created` OR `todo_completed` OR `todo_edited`
- **Purpose**: Unified "active usage" metric

### Custom Event 2: Settings Changed
- **Definition**: `view_mode_changed` OR `theme_changed` OR `font_size_changed` OR `weekend_toggled`
- **Purpose**: Track customization behavior

### Custom Metric 1: Todos Per Session
- **Formula**: Count of `todo_created` / Session count
- **Purpose**: Engagement intensity

### Custom Metric 2: Completion Efficiency
- **Formula**: `todo_completed` / (`todo_completed` + `todo_uncompleted`)
- **Purpose**: User success rate

---

## 7. A/B Testing Opportunities

Based on tracked events, consider A/B tests for:

1. **Onboarding Flow**: Test different onboarding sequences
   - Track: `onboarding_completed`, time to first real todo

2. **Free Limit Value**: Test different free tier limits
   - Track: `free_limit_reached`, `begin_checkout` conversion

3. **Feature Discovery**: Test different feature prompts
   - Track: `timebox_opened`, `view_mode_changed`, etc.

4. **Subscription Pricing**: Test different price points
   - Track: `begin_checkout` → `purchase` conversion

---

## 8. Important Filters & Breakdowns

### Always Available Filters
- **Platform**: `platform` user property (desktop/web)
- **App Version**: `appVersion` property
- **Sign-in Method**: Last `login` event's `method` property
- **Subscription Status**: Has performed `purchase` (yes/no)

### Useful Breakdowns
- **Todo with URL**: `hasUrl` property on `todo_created` events
- **Onboarding Context**: `isOnboarding` property on todo events
- **View Mode**: Last `view_mode_changed` event's `mode` property
- **Theme**: Last `theme_changed` event's `theme` property

---

## 9. Quick Wins to Implement First

Start with these 5 charts to get immediate value:

1. **DAU/WAU/MAU Line Chart** - Overall growth trajectory
2. **Sign-up to First Todo Funnel** - Core activation metric
3. **Free Limit → Purchase Funnel** - Revenue driver
4. **7-Day Retention Curve** - Product stickiness
5. **Desktop vs Web Active Users** - Platform strategy validation

---

## 10. Data Quality Checks

Regularly verify:

- ✅ All events have proper property types (string, number, boolean)
- ✅ `platform` user property is set for all users
- ✅ `appVersion` is being tracked correctly
- ✅ Transaction IDs in `purchase` events are unique
- ✅ No PII (personally identifiable information) in event properties
- ✅ `isOnboarding` flag is correctly set/unset during onboarding flow

---

## Notes

- All monetary values in events are in USD
- Sessions are automatically tracked by Amplitude
- Device properties (OS, browser, etc.) are automatically captured
- User IDs are Firebase UIDs (work for both anonymous and authenticated users)
