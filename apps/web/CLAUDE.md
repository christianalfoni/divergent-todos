# Web App Architecture Guide: Context Interface Pattern

## Overview
This is a React 19 + Vite 7 + Firebase frontend application using the **Context Interface Pattern** to separate UI logic from external dependencies.

## Technology Stack
- **Framework**: React 19, React Router DOM 7
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase Web SDK (Auth, Firestore, Functions)
- **State Management**: React Context API
- **Testing**: Vitest
- **UI Libraries**: Headless UI, Heroicons, Framer Motion, DnD Kit
- **Analytics**: PostHog

## Core Architectural Principles

### 1. Context Interface Pattern
The application follows a strict separation between UI logic and external dependencies:

**Application Layer** (React components, hooks, utilities):
- Contains pure TypeScript/React logic describing *what* happens
- Never directly imports Firebase, PostHog, or other external services
- Only depends on interface types, never implementation types

**Context Interface Layer** (contexts, providers):
- Implements *how* things occur (API calls, database operations, analytics)
- Manages all external dependencies
- Transforms between third-party types and application types

### 2. Type Isolation
**CRITICAL**: Never leak third-party types into your application code.

❌ **Wrong** - Leaking Firebase types:
```typescript
import { User } from 'firebase/auth';
import { DocumentReference } from 'firebase/firestore';

function useUser(): User | null { ... }
function getTodoRef(): DocumentReference { ... }
```

✅ **Correct** - Define custom application types:
```typescript
// Define your own types that represent what your app needs
interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  userId: string;
  createdAt: string; // ISO string, not Firestore Timestamp
}

function useUser(): AppUser | null { ... }
function useTodos(): Todo[] { ... }
```

### 3. Context Design Pattern

Define interfaces for all external capabilities:

```typescript
interface DatabaseContext {
  // Todo operations
  getTodos(userId: string): Promise<Todo[]>;
  createTodo(data: CreateTodoData): Promise<Todo>;
  updateTodo(id: string, updates: Partial<Todo>): Promise<void>;
  deleteTodo(id: string): Promise<void>;

  // Activity operations
  getWeekActivity(userId: string, year: number, week: number): Promise<Activity | null>;
}

interface AuthContext {
  user: AppUser | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

interface AnalyticsContext {
  trackEvent(name: string, properties?: Record<string, unknown>): void;
  identifyUser(userId: string, traits?: Record<string, unknown>): void;
}
```

**AVOID** escape hatches that bypass the abstraction:
- ❌ `getFirebaseAuth()`
- ❌ `getFirestoreDb()`
- ❌ `executeRaw(query)`

### 4. Implementation Guidelines

**Async Initialization**: Use static factory methods for contexts that need async setup:
```typescript
class FirebaseDatabaseContext implements DatabaseContext {
  private constructor(private db: Firestore, private auth: Auth) {}

  static async create(): Promise<FirebaseDatabaseContext> {
    const app = await initializeFirebase();
    return new FirebaseDatabaseContext(getFirestore(app), getAuth(app));
  }

  async getTodos(userId: string): Promise<Todo[]> {
    // Transform Firestore documents to application types
    const snapshot = await getDocs(
      query(collection(this.db, 'todos'), where('userId', '==', userId))
    );
    return snapshot.docs.map(doc => this.transformTodoDoc(doc));
  }

  private transformTodoDoc(doc: QueryDocumentSnapshot): Todo {
    const data = doc.data();
    return {
      id: doc.id,
      text: data.text,
      completed: data.completed,
      userId: data.userId,
      createdAt: data.createdAt.toDate().toISOString() // Transform Timestamp to ISO string
    };
  }
}
```

**React Context Integration**:
```typescript
const DatabaseContextInstance = React.createContext<DatabaseContext | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<DatabaseContext | null>(null);

  useEffect(() => {
    FirebaseDatabaseContext.create().then(setContext);
  }, []);

  if (!context) return <LoadingSpinner />;

  return (
    <DatabaseContextInstance.Provider value={context}>
      {children}
    </DatabaseContextInstance.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContextInstance);
  if (!context) throw new Error('useDatabase must be used within DatabaseProvider');
  return context;
}
```

### 5. Testing Strategy

**Always use mock contexts with spies, never real external dependencies.**

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('TodoList', () => {
  it('should load and display todos', async () => {
    const mockDatabase: DatabaseContext = {
      getTodos: vi.fn().mockResolvedValue([
        { id: '1', text: 'Test todo', completed: false, userId: 'user1', createdAt: '2025-01-01' }
      ]),
      createTodo: vi.fn(),
      updateTodo: vi.fn(),
      deleteTodo: vi.fn(),
      // ... other methods
    };

    render(
      <DatabaseContextInstance.Provider value={mockDatabase}>
        <TodoList userId="user1" />
      </DatabaseContextInstance.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test todo')).toBeInTheDocument();
    });

    expect(mockDatabase.getTodos).toHaveBeenCalledWith('user1');
  });
});
```

## Anti-Patterns to Avoid

1. **Direct Firebase imports in components**:
   ```typescript
   // ❌ Never do this
   import { getFirestore, collection, getDocs } from 'firebase/firestore';

   function TodoList() {
     const db = getFirestore();
     // Direct Firebase usage in component
   }
   ```

2. **Leaking Firebase types**:
   ```typescript
   // ❌ Never do this
   import { Timestamp } from 'firebase/firestore';

   interface Todo {
     createdAt: Timestamp; // Leaked Firebase type
   }
   ```

3. **Optional context methods**:
   ```typescript
   // ❌ Avoid optional methods
   interface DatabaseContext {
     updateTodo?: (id: string, data: Partial<Todo>) => Promise<void>;
   }
   ```

4. **Business logic in context implementations**:
   ```typescript
   // ❌ Keep context implementations thin
   class FirebaseDatabaseContext {
     async createTodo(data: CreateTodoData): Promise<Todo> {
       // ❌ No business logic here
       if (data.text.length > 1000) {
         throw new Error('Todo too long');
       }
       // Business logic belongs in application layer
     }
   }
   ```

5. **Type casting in application code**:
   ```typescript
   // ❌ Never cast in application code
   function TodoList() {
     const todos = useTodos() as FirebaseTodo[];
   }

   // ✅ Type casting only acceptable in context implementations
   class FirebaseDatabaseContext {
     private transformDoc(doc: unknown): Todo {
       return doc as FirestoreTodo; // OK in implementation
     }
   }
   ```

## Project Structure

```
src/
├── contexts/               # Context implementations (external dependencies)
│   ├── DatabaseContext.tsx
│   ├── AuthContext.tsx
│   └── AnalyticsContext.tsx
├── components/            # React components (pure UI logic)
│   ├── TodoList.tsx
│   ├── TodoItem.tsx
│   └── ...
├── hooks/                 # Custom React hooks (application logic)
│   ├── useTodos.ts
│   ├── useAuth.ts
│   └── ...
├── utils/                 # Pure utility functions (no external deps)
│   ├── calendar.ts
│   ├── activity.ts
│   └── todos.ts
├── types/                 # Application type definitions
│   ├── todo.ts
│   ├── user.ts
│   └── activity.ts
├── firebase/              # Firebase initialization (context layer)
│   └── index.ts
└── App.tsx                # Root component with providers
```

## Benefits of This Architecture

1. **100% Unit Test Coverage**: Mock contexts enable testing without Firebase
2. **Type Safety**: No third-party type leakage ensures compile-time safety
3. **Flexibility**: Easy to switch from Firebase to another backend
4. **Clear Boundaries**: Separation of concerns between UI and external services
5. **Environment Portability**: Same code works in browser, Electron, mobile
6. **Maintainability**: Changes to Firebase API only affect context implementations

## Development Workflow

1. **Define application types first** in `types/` directory
2. **Create context interface** with required operations
3. **Implement context** using Firebase (or other service)
4. **Write components** using context hooks, never direct imports
5. **Test with mocks** using Vitest spies

## Scripts

- `pnpm dev` - Start Vite dev server
- `pnpm build` - Build for production
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm test` - Run Vitest in watch mode
- `pnpm test:run` - Run tests once
- `pnpm deploy:rules` - Deploy Firestore rules and indexes

## Important Notes

- Always run `pnpm typecheck` before committing
- Never import Firebase types outside of context implementations
- Keep context implementations thin - business logic belongs in application layer
- Use ISO strings for dates, not Firebase Timestamps
- All external dependencies should be accessed through context interfaces
