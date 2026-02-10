# Firebase Functions Architecture Guide: Context Interface Pattern

## Overview
This is a Firebase Cloud Functions (Node.js 22) backend using the **Context Interface Pattern** to separate business logic from external services and Firebase Admin SDK.

## Technology Stack
- **Runtime**: Node.js 22
- **Framework**: Firebase Functions v6 (2nd gen)
- **Admin SDK**: Firebase Admin SDK v12
- **External APIs**: OpenAI, Stripe, Resend
- **Language**: TypeScript
- **Deployment**: Firebase CLI

## Core Architectural Principles

### 1. Context Interface Pattern for Cloud Functions
The application follows strict separation between business logic and external dependencies:

**Application Layer** (function handlers, business logic):
- Contains pure TypeScript logic describing *what* happens
- Never directly imports Firebase Admin, OpenAI, Stripe, etc. in business logic
- Only depends on interface types, never implementation types

**Context Interface Layer** (service integrations):
- Implements *how* things occur (database ops, API calls, email sending)
- Manages all external dependencies
- Transforms between third-party types and application types

### 2. Type Isolation

**CRITICAL**: Never leak third-party types into your application code.

❌ **Wrong** - Leaking Firebase Admin types:
```typescript
import { DocumentReference, Timestamp } from 'firebase-admin/firestore';
import Stripe from 'stripe';

interface Activity {
  ref: DocumentReference; // Leaked Firestore type
  createdAt: Timestamp;   // Leaked Firestore type
}

function processPayment(intent: Stripe.PaymentIntent) { ... } // Leaked Stripe type
```

✅ **Correct** - Define custom application types:
```typescript
// Define your own types that represent what your app needs
interface Activity {
  id: string;
  userId: string;
  week: number;
  year: number;
  completedTodos: CompletedTodo[];
  incompleteCount: number;
  aiSummary?: string;
  createdAt: string; // ISO string, not Firestore Timestamp
}

interface CompletedTodo {
  date: string;
  text: string;
  createdAt: string;
  completedAt: string;
  moveCount: number;
  completedWithTimeBox: boolean;
  hasUrl: boolean;
  tags: string[];
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
}

function processPayment(amount: number, userId: string): Promise<PaymentResult> { ... }
```

### 3. Context Design Pattern

Define interfaces for all external capabilities:

```typescript
// Database context interface
interface DatabaseContext {
  // User operations
  getUser(userId: string): Promise<AppUser | null>;
  updateUser(userId: string, updates: Partial<AppUser>): Promise<void>;

  // Todo operations
  getTodos(userId: string): Promise<Todo[]>;
  getTodosForWeek(userId: string, startDate: Date, endDate: Date): Promise<Todo[]>;
  updateTodo(id: string, updates: Partial<Todo>): Promise<void>;

  // Activity operations
  getActivity(userId: string, year: number, week: number): Promise<Activity | null>;
  createActivity(data: CreateActivityData): Promise<Activity>;
  updateActivity(id: string, updates: Partial<Activity>): Promise<void>;
}

// AI context interface
interface AIContext {
  generateWeeklySummary(request: SummaryRequest): Promise<SummaryResponse>;
  generateBatchSummaries(requests: SummaryRequest[]): Promise<BatchJobResult>;
  checkBatchStatus(batchId: string): Promise<BatchStatus>;
}

// Payment context interface
interface PaymentContext {
  createCheckoutSession(userId: string, priceId: string): Promise<CheckoutSession>;
  handleWebhook(payload: string, signature: string): Promise<WebhookResult>;
  getSubscription(subscriptionId: string): Promise<Subscription | null>;
}

// Email context interface
interface EmailContext {
  sendWelcomeEmail(to: string, name: string): Promise<void>;
  sendWeeklySummary(to: string, summary: string): Promise<void>;
}
```

**AVOID** escape hatches:
- ❌ `getFirestore()`
- ❌ `getStripeClient()`
- ❌ `getOpenAI()`
- ❌ `executeRaw(query)`

### 4. Implementation Guidelines

**Context Implementation**:

```typescript
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { DatabaseContext, Activity, Todo } from '../types';

class FirestoreDatabaseContext implements DatabaseContext {
  private db = getFirestore();

  async getActivity(userId: string, year: number, week: number): Promise<Activity | null> {
    const snapshot = await this.db
      .collection('activity')
      .where('userId', '==', userId)
      .where('year', '==', year)
      .where('week', '==', week)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return this.transformActivityDoc(doc);
  }

  async getTodosForWeek(userId: string, startDate: Date, endDate: Date): Promise<Todo[]> {
    const snapshot = await this.db
      .collection('todos')
      .where('userId', '==', userId)
      .where('createdAt', '>=', Timestamp.fromDate(startDate))
      .where('createdAt', '<=', Timestamp.fromDate(endDate))
      .get();

    return snapshot.docs.map(doc => this.transformTodoDoc(doc));
  }

  // Transform Firestore document to application type
  private transformActivityDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): Activity {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      week: data.week,
      year: data.year,
      completedTodos: data.completedTodos.map((todo: any) => ({
        date: todo.date,
        text: todo.text,
        createdAt: todo.createdAt,
        completedAt: todo.completedAt,
        moveCount: todo.moveCount || 0,
        completedWithTimeBox: todo.completedWithTimeBox || false,
        hasUrl: todo.hasUrl || false,
        tags: todo.tags || []
      })),
      incompleteCount: data.incompleteCount || 0,
      aiSummary: data.aiSummary,
      aiPersonalSummary: data.aiPersonalSummary,
      createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString()
    };
  }

  private transformTodoDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): Todo {
    const data = doc.data();
    return {
      id: doc.id,
      text: data.text,
      completed: data.completed,
      userId: data.userId,
      createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
      completedAt: data.completedAt?.toDate().toISOString()
    };
  }
}

// AI context implementation
class OpenAIContext implements AIContext {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateWeeklySummary(request: SummaryRequest): Promise<SummaryResponse> {
    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: this.formatSummaryRequest(request) }
      ],
      temperature: 0.7
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No summary generated');

    // Transform OpenAI response to application type
    return this.parseSummaryResponse(content);
  }

  private formatSummaryRequest(request: SummaryRequest): string {
    return `
      Generate summaries for week ${request.week}, ${request.year}:
      Completed todos: ${request.completedTodos.length}
      Incomplete todos: ${request.incompleteTodos.length}
      ...
    `;
  }

  private parseSummaryResponse(content: string): SummaryResponse {
    // Parse and transform to application type
    return {
      formalSummary: content.split('FORMAL:')[1]?.split('PERSONAL:')[0]?.trim() || '',
      personalSummary: content.split('PERSONAL:')[1]?.trim() || ''
    };
  }
}
```

**Function Handler**:

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// Initialize contexts (singleton pattern)
const databaseContext = new FirestoreDatabaseContext();
const aiContext = new OpenAIContext(process.env.OPENAI_API_KEY!);

// HTTP function
export const generateWeeklySummary = onRequest(
  { cors: true, secrets: ['OPENAI_API_KEY'] },
  async (request, response) => {
    try {
      // Extract and validate input
      const { userId, week, year } = request.body;

      // Use contexts, not direct dependencies
      const activity = await databaseContext.getActivity(userId, year, week);
      if (!activity) {
        response.status(404).json({ error: 'Activity not found' });
        return;
      }

      const summary = await aiContext.generateWeeklySummary({
        week,
        year,
        completedTodos: activity.completedTodos,
        incompleteTodos: []
      });

      await databaseContext.updateActivity(activity.id, {
        aiSummary: summary.formalSummary,
        aiPersonalSummary: summary.personalSummary
      });

      response.json({ success: true, summary });
    } catch (error) {
      console.error('Error generating summary:', error);
      response.status(500).json({ error: 'Internal error' });
    }
  }
);

// Scheduled function
export const triggerWeeklySummaries = onSchedule(
  { schedule: 'every monday 09:00', timeZone: 'America/Los_Angeles' },
  async (event) => {
    const users = await databaseContext.getAllActiveUsers();

    for (const user of users) {
      // Process each user...
    }
  }
);
```

### 5. Testing Strategy

**Always use mock contexts, never real external services.**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('generateWeeklySummary', () => {
  let mockDatabase: DatabaseContext;
  let mockAI: AIContext;

  beforeEach(() => {
    mockDatabase = {
      getActivity: vi.fn(),
      updateActivity: vi.fn(),
      // ... other methods
    };

    mockAI = {
      generateWeeklySummary: vi.fn(),
      // ... other methods
    };
  });

  it('should generate and save weekly summary', async () => {
    const mockActivity: Activity = {
      id: 'activity1',
      userId: 'user1',
      week: 42,
      year: 2025,
      completedTodos: [
        {
          date: '2025-10-20',
          text: 'Complete project',
          createdAt: '2025-10-20T10:00:00Z',
          completedAt: '2025-10-20T15:00:00Z',
          moveCount: 0,
          completedWithTimeBox: true,
          hasUrl: false,
          tags: ['work']
        }
      ],
      incompleteCount: 2,
      createdAt: '2025-10-20T10:00:00Z'
    };

    const mockSummary: SummaryResponse = {
      formalSummary: 'Made progress on project work.',
      personalSummary: 'Great job completing your project!'
    };

    vi.mocked(mockDatabase.getActivity).mockResolvedValue(mockActivity);
    vi.mocked(mockAI.generateWeeklySummary).mockResolvedValue(mockSummary);

    await generateSummaryForUser('user1', 42, 2025, mockDatabase, mockAI);

    expect(mockDatabase.getActivity).toHaveBeenCalledWith('user1', 2025, 42);
    expect(mockAI.generateWeeklySummary).toHaveBeenCalled();
    expect(mockDatabase.updateActivity).toHaveBeenCalledWith('activity1', {
      aiSummary: mockSummary.formalSummary,
      aiPersonalSummary: mockSummary.personalSummary
    });
  });
});
```

## Anti-Patterns to Avoid

1. **Direct dependency imports in function logic**:
   ```typescript
   // ❌ Never do this
   import { getFirestore } from 'firebase-admin/firestore';
   import OpenAI from 'openai';

   export const myFunction = onRequest(async (req, res) => {
     const db = getFirestore(); // Direct Firestore usage
     const openai = new OpenAI({ apiKey: '...' }); // Direct OpenAI usage
   });
   ```

2. **Leaking third-party types**:
   ```typescript
   // ❌ Never do this
   import { DocumentSnapshot, Timestamp } from 'firebase-admin/firestore';

   interface Activity {
     snapshot: DocumentSnapshot; // Leaked Firestore type
     createdAt: Timestamp;       // Leaked Firestore type
   }
   ```

3. **Business logic in context implementations**:
   ```typescript
   // ❌ Keep contexts thin
   class FirestoreDatabaseContext {
     async createActivity(data: CreateActivityData): Promise<Activity> {
       // ❌ No business logic here
       if (data.completedTodos.length < 5) {
         throw new Error('Not enough completed todos');
       }
       // Business rules belong in application layer
     }
   }
   ```

4. **Hardcoded API keys**:
   ```typescript
   // ❌ Never hardcode secrets
   const openai = new OpenAI({ apiKey: 'sk-...' });

   // ✅ Use environment variables or Secret Manager
   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
   ```

5. **Untyped webhook handlers**:
   ```typescript
   // ❌ Don't use 'any' for webhooks
   export const stripeWebhook = onRequest(async (req: any, res: any) => {
     const event = req.body; // any type
   });

   // ✅ Define proper types
   interface StripeWebhookPayload {
     type: string;
     data: { object: unknown };
   }

   export const stripeWebhook = onRequest(async (req, res) => {
     const payload = req.body as StripeWebhookPayload;
   });
   ```

## Project Structure

```
functions/
├── src/
│   ├── contexts/              # Context implementations
│   │   ├── DatabaseContext.ts
│   │   ├── AIContext.ts
│   │   ├── PaymentContext.ts
│   │   └── EmailContext.ts
│   ├── types/                 # Application types
│   │   ├── activity.ts
│   │   ├── todo.ts
│   │   └── user.ts
│   ├── utils/                 # Pure utility functions
│   │   └── date.ts
│   ├── scripts/               # Admin scripts (not deployed)
│   │   └── generateWeekSummary.ts
│   ├── index.ts               # Function exports
│   ├── generateWeeklySummaries.ts
│   ├── triggerWeeklySummaries.ts
│   ├── createMomentum.ts
│   └── ... (other functions)
├── lib/                       # Compiled JavaScript (gitignored)
├── package.json
└── tsconfig.json
```

## Environment Variables and Secrets

**Functions v2 Secret Management**:

```typescript
import { defineSecret } from 'firebase-functions/params';

const openaiApiKey = defineSecret('OPENAI_API_KEY');
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

export const myFunction = onRequest(
  { secrets: [openaiApiKey, stripeSecretKey] },
  async (request, response) => {
    const aiContext = new OpenAIContext(openaiApiKey.value());
    const paymentContext = new StripeContext(stripeSecretKey.value());
    // ...
  }
);
```

**Setting secrets**:
```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set STRIPE_SECRET_KEY
```

## Benefits of This Architecture

1. **100% Unit Test Coverage**: Mock contexts enable testing without external APIs
2. **Cost Efficiency**: No API calls during testing
3. **Type Safety**: No third-party type leakage ensures compile-time safety
4. **Flexibility**: Easy to switch from OpenAI to another LLM provider
5. **Clear Boundaries**: Separation between business logic and external services
6. **Security**: Secrets properly managed, no hardcoded credentials
7. **Maintainability**: Changes to external APIs only affect context implementations

## Development Workflow

1. **Define application types** in `types/` directory
2. **Create context interface** with required operations
3. **Implement context** using Firebase Admin, OpenAI, etc.
4. **Write function handler** using context methods
5. **Test with mocks** using Vitest spies
6. **Deploy** to Firebase

## Scripts

- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm serve` - Run functions locally with Firebase emulators
- `pnpm deploy:functions` - Deploy functions to Firebase
- `pnpm logs` - View function logs
- `pnpm generate-summary` - Run admin script to generate weekly summary

## Important Notes

- Always run `pnpm build` before deploying
- Never hardcode API keys or secrets
- Use Firebase Secrets Manager for sensitive data
- Keep context implementations thin - business logic belongs in application layer
- Use ISO strings for dates, not Firestore Timestamps
- All external dependencies should be accessed through context interfaces
- Test functions locally with emulators before deploying
- Monitor function execution times and cold starts
- Use batching for operations that process many documents

## Firebase Functions Best Practices

1. **Use 2nd generation functions** (onRequest, onCall, onSchedule)
2. **Set appropriate memory and timeout** for each function
3. **Use concurrency limits** for functions that access shared resources
4. **Implement retry logic** for idempotent operations
5. **Log errors with context** for debugging
6. **Validate all input** from HTTP requests
7. **Use structured logging** for better monitoring
8. **Keep functions small and focused** - one responsibility per function
9. **Optimize cold start time** by minimizing imports and initialization
