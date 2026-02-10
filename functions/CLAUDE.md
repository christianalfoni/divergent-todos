# TypeScript Architecture Guide: Context Interface Pattern

## Core Philosophy

Separate your application into two layers:

1. **Application Logic** - Pure TypeScript that describes _what_ happens
2. **Context Interface** - Implementations of _how_ things happen (async operations, 3rd party APIs, I/O)

The application should never directly import or call external dependencies. Instead, it receives a `Context` interface that provides all capabilities it needs.

## Pattern Overview

### The Context Interface

Define an interface containing all external capabilities your application needs:

```typescript
// context.ts
export interface AppContext {
  // Data access
  getUser(id: string): Promise<User>;
  saveUser(user: User): Promise<void>;

  // External services
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  uploadFile(file: Buffer, path: string): Promise<string>;

  // Utilities
  generateId(): string;
  getCurrentTime(): Date;
  logger: Logger;
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}
```

### The Application

Your app accepts the context and uses it to implement business logic:

```typescript
// app.ts
import { AppContext } from "./context";

export class UserService {
  constructor(private ctx: AppContext) {}

  async registerUser(email: string, name: string): Promise<User> {
    // Pure business logic - no direct dependencies
    const user: User = {
      id: this.ctx.generateId(),
      email,
      name,
      createdAt: this.ctx.getCurrentTime(),
    };

    await this.ctx.saveUser(user);

    await this.ctx.sendEmail(
      email,
      "Welcome!",
      `Hello ${name}, welcome to our service.`
    );

    this.ctx.logger.info("User registered", { userId: user.id });

    return user;
  }
}
```

### The Implementation

Create concrete implementations for different environments:

```typescript
// context.impl.ts
import { AppContext, Logger } from "./context";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { S3Client } from "@aws-sdk/client-s3";
import { db } from "./database";

export class ProductionContext implements AppContext {
  private s3: S3Client;
  private mailer: nodemailer.Transporter;

  constructor() {
    this.s3 = new S3Client({ region: "us-east-1" });
    this.mailer = nodemailer.createTransport({
      // ... config
    });
  }

  async getUser(id: string): Promise<User> {
    return db.users.findById(id);
  }

  async saveUser(user: User): Promise<void> {
    await db.users.insert(user);
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    await this.mailer.sendMail({ to, subject, text: body });
  }

  async uploadFile(file: Buffer, path: string): Promise<string> {
    // S3 upload implementation
    // ...
    return `https://cdn.example.com/${path}`;
  }

  generateId(): string {
    return uuidv4();
  }

  getCurrentTime(): Date {
    return new Date();
  }

  logger: Logger = {
    info: (message, meta) => console.log(message, meta),
    error: (message, error) => console.error(message, error),
    warn: (message, meta) => console.warn(message, meta),
  };
}
```

## Integration

The context is instantiated and passed to your application at the entry point. The exact mechanism depends on your application type:

- **Dependency Injection**: Create context instance, pass to constructors
- **React Context**: Wrap app with context provider, use hooks to access
- **Global Instance**: Create singleton context, import where needed
- **Function Parameters**: Pass context through function calls

The key principle: your application receives the context, it doesn't create it.

## Testing Pattern

Tests should always use a mock context. Never test with real external dependencies.

### Basic Mock Context

```typescript
// context.mock.ts
import { AppContext, Logger } from "./context";
import { vi } from "vitest";

export class MockContext implements AppContext {
  // Use vi.fn() for spies
  getUser = vi.fn<[string], Promise<User>>();
  saveUser = vi.fn<[User], Promise<void>>();
  sendEmail = vi.fn<[string, string, string], Promise<void>>();
  uploadFile = vi.fn<[Buffer, string], Promise<string>>();

  generateId = vi.fn(() => "test-id-123");
  getCurrentTime = vi.fn(() => new Date("2024-01-01T00:00:00Z"));

  logger: Logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };
}
```

### Writing Tests

```typescript
// app.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { UserService } from "./app";
import { MockContext } from "./context.mock";

describe("UserService", () => {
  let ctx: MockContext;
  let service: UserService;

  beforeEach(() => {
    ctx = new MockContext();
    service = new UserService(ctx);
  });

  it("should register a user and send welcome email", async () => {
    // Arrange
    const email = "test@example.com";
    const name = "Test User";

    // Act
    const result = await service.registerUser(email, name);

    // Assert
    expect(result).toEqual({
      id: "test-id-123",
      email,
      name,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    expect(ctx.saveUser).toHaveBeenCalledWith(result);
    expect(ctx.sendEmail).toHaveBeenCalledWith(
      email,
      "Welcome!",
      "Hello Test User, welcome to our service."
    );
    expect(ctx.logger.info).toHaveBeenCalledWith("User registered", {
      userId: "test-id-123",
    });
  });

  it("should handle email sending failure", async () => {
    // Arrange: Make sendEmail fail
    ctx.sendEmail.mockRejectedValue(new Error("SMTP error"));

    // Act & Assert
    await expect(
      service.registerUser("test@example.com", "Test")
    ).rejects.toThrow("SMTP error");

    // Verify user was saved before email failed
    expect(ctx.saveUser).toHaveBeenCalled();
  });
});
```

### Advanced: Testing Internal State

For testing internal behavior that isn't directly exposed, extend the mock context with test utilities:

```typescript
// context.mock.ts
export class TestableContext extends MockContext {
  private eventHandlers: Map<string, Function[]> = new Map();

  // Add test-only method to simulate events
  simulateWebhook(eventType: string, data: unknown): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.forEach((handler) => handler(data));
  }

  // Override to capture event registrations
  onWebhook(eventType: string, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }
}

// In test:
it("should handle webhook events", async () => {
  const ctx = new TestableContext();
  const service = new WebhookService(ctx);

  await service.start(); // Registers handlers

  // Trigger internal behavior
  ctx.simulateWebhook("payment.success", { amount: 100 });

  expect(ctx.logger.info).toHaveBeenCalledWith("Payment processed");
});
```

## Benefits

1. **Testability**: 100% unit test coverage without real databases, APIs, or I/O
2. **Flexibility**: Swap implementations (dev/staging/prod) without changing app code
3. **Clarity**: Clear boundary between "what" (logic) and "how" (implementation)
4. **Type Safety**: TypeScript ensures context interface is fully implemented
5. **Mockability**: Every external dependency can be spied on and controlled in tests
6. **Portability**: Same app logic works in Node, browser, edge workers, etc.

## Anti-Patterns to Avoid

❌ **Don't import dependencies directly in app code:**

```typescript
import { sendEmail } from './email-service'; // BAD

class UserService {
  async registerUser() {
    await sendEmail(...); // Tightly coupled
  }
}
```

❌ **Don't make context methods optional:**

```typescript
interface AppContext {
  sendEmail?: (to: string) => Promise<void>; // BAD - creates uncertainty
}
```

❌ **Don't put business logic in the context:**

```typescript
class ProductionContext implements AppContext {
  async registerUser(email: string) {
    // BAD - business logic belongs in app, not context
    const user = { email, createdAt: new Date() };
    await db.insert(user);
    await this.sendEmail(email, "Welcome!");
  }
}
```

❌ **Don't use type casting in application code:**

```typescript
// app.ts - BAD
class UserService {
  async getUser(id: string): Promise<User> {
    const data = await this.ctx.getUser(id);
    return data as User; // Type casting in app code - BAD
  }
}
```

✅ **Do use type casting only in context implementations:**

```typescript
// context.impl.ts - GOOD
class ProductionContext implements AppContext {
  async getUser(id: string): Promise<User> {
    const dbResult = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    return dbResult[0] as User; // Type casting is OK here
  }
}

// app.ts - GOOD
class UserService {
  async getUser(id: string): Promise<User> {
    return this.ctx.getUser(id); // No casting needed - trust the interface
  }
}
```

✅ **Do keep context methods simple and focused:**

```typescript
interface AppContext {
  saveUser(user: User): Promise<void>; // Simple, single responsibility
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}
```

## Summary

- **Context Interface** = All async operations, I/O, 3rd party services
- **Application** = Pure business logic that uses the context
- **Production Context** = Real implementations (database, APIs, etc.)
- **Mock Context** = Spy functions for testing
- **Tests** = Instantiate app with mock context, verify behavior via spies
- **Type Casting** = Only allowed in context implementations, never in application code

This pattern gives you complete control over testing while keeping your application code clean, focused, and portable.
