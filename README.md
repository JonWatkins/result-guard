# result-guard

A TypeScript utility for elegant, type-safe error handling. It wraps your code in a `Result` type that makes error handling explicit and type-safe, eliminating the need for try-catch blocks while maintaining full type information.

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Module Support](#module-support)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Common Patterns](#common-patterns)
- [Utility Functions](#utility-functions)
- [Configuration Types](#configuration-types)

## Features

- 🎯 **Type-Safe**: Full TypeScript support with discriminated unions and type guards
- 🔄 **Universal**: Works with both sync and async code
- 🛡️ **Robust**: Automatically converts thrown values to proper Error objects
- 🧬 **Preserves**: Keeps error stack traces and inheritance chains intact
- 🎨 **Flexible**: Supports custom error types
- ⚡ **Performant**: Zero dependencies, lightweight implementation
- 🔍 **Developer Friendly**: Great TypeScript inference and detailed error info
- 📦 **Module Support**: Works with both ESM and CommonJS

## Installation

```bash
npm install result-guard
```

## Module Support

result-guard supports both ESM (ECMAScript Modules) and CommonJS:

```typescript
// ESM
import { tryCatch, isSuccess } from 'result-guard';

// CommonJS
const { tryCatch, isSuccess } = require('result-guard');
```

The package automatically uses the correct format based on your project's configuration:
- If your package.json has `"type": "module"`, it uses ESM
- If not specified, it uses CommonJS
- You can also explicitly import the ESM version using the `.mjs` extension or `import` field

## Quick Start

```typescript
import { tryCatch, isSuccess } from 'result-guard';

// Sync example
const result = tryCatch(() => "hello world");
if (isSuccess(result)) {
  console.log(result.data); // TypeScript knows this is string
}

// Async example
const fetchUser = async (id: string) => {
  const result = await tryCatch(async () => {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  });

  if (isSuccess(result)) {
    return result.data; // Success case
  }
  // Error case - result.error is typed as Error
  console.error('Failed to fetch user:', result.error.message);
  return null;
};
```

## Core Concepts

### The Result Type

The `Result` type is a discriminated union that represents either success or failure:

```typescript
type Result<T, E = Error> = 
  | { data: T; error: null; isError: false }  // Success case
  | { data: null; error: E; isError: true }   // Failure case

// Example usage:
const divide = (a: number, b: number): Result<number> => {
  if (b === 0) {
    return { data: null, error: new Error("Division by zero"), isError: true };
  }
  return { data: a / b, error: null, isError: false };
};

const result = divide(10, 2);
if (!result.isError) {
  console.log(result.data); // TypeScript knows this is number
}
```

### Type Guards

Type guards help TypeScript narrow down the type:

```typescript
import { isSuccess, isFailure } from 'result-guard';

const result = tryCatch(() => "hello");

// TypeScript knows result.data is string here
if (isSuccess(result)) {
  console.log(result.data.toUpperCase());
}

// TypeScript knows result.error is Error here
if (isFailure(result)) {
  console.log(result.error.message);
}
```

### Custom Error Types

You can use your own error types for better error handling:

```typescript
class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

// Specify the error type as ApiError
const result = await tryCatch<Response, ApiError>(async () => {
  const response = await fetch('/api/data');
  if (!response.ok) {
    throw new ApiError(response.status, response.statusText);
  }
  return response;
});

if (isFailure(result)) {
  // TypeScript knows result.error is ApiError
  console.log(`API Error ${result.error.statusCode}: ${result.error.message}`);
}
```

## Common Patterns

### Early Return Pattern

Best for functions that should stop on error:

```typescript
async function processUserData(userId: string) {
  // Get user
  const userResult = await tryCatch(async () => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  });

  if (isFailure(userResult)) {
    return { error: `Failed to fetch user: ${userResult.error.message}` };
  }

  // Get user's posts
  const postsResult = await tryCatch(async () => {
    const response = await fetch(`/api/users/${userId}/posts`);
    return response.json();
  });

  if (isFailure(postsResult)) {
    return { error: `Failed to fetch posts: ${postsResult.error.message}` };
  }

  // Success case - both operations succeeded
  return {
    user: userResult.data,
    posts: postsResult.data
  };
}
```

### Destructuring Pattern

Good for simple cases where you want to handle both success and error inline:

```typescript
async function getLatestPost() {
  const { data: post, error } = await tryCatch(async () => {
    const response = await fetch('/api/posts/latest');
    return response.json();
  });

  if (error) {
    console.error('Failed to fetch post:', error);
    return null;
  }

  return post;
}
```

### Parallel Operations Pattern

Handle multiple operations that can succeed or fail independently:

```typescript
async function getDashboardData() {
  const [usersResult, postsResult, statsResult] = await Promise.all([
    tryCatch(() => fetch('/api/users').then(r => r.json())),
    tryCatch(() => fetch('/api/posts').then(r => r.json())),
    tryCatch(() => fetch('/api/stats').then(r => r.json()))
  ]);

  return {
    users: isSuccess(usersResult) ? usersResult.data : [],
    posts: isSuccess(postsResult) ? postsResult.data : [],
    stats: isSuccess(statsResult) ? statsResult.data : null,
    errors: [
      isFailure(usersResult) && 'Failed to load users',
      isFailure(postsResult) && 'Failed to load posts',
      isFailure(statsResult) && 'Failed to load stats'
    ].filter(Boolean)
  };
}
```

## Utility Functions

### Working with Events (`withEvents`)

Safely handle event emitters and streams:

```typescript
import { withEvents } from 'result-guard';
import { createReadStream } from 'fs';

async function readFileContents(filePath: string) {
  const stream = createReadStream(filePath);
  
  const result = await withEvents(
    stream,
    async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks).toString('utf8');
    },
    {
      timeout: 5000, // 5 second timeout
      cleanup: () => stream.destroy(), // Clean up the stream
      errorEvent: 'error' // Listen for 'error' events
    }
  );

  if (isSuccess(result)) {
    return result.data;
  }
  throw new Error(`Failed to read file: ${result.error.message}`);
}
```

### Processing Iterators (`withIterator`)

Safely process async iterators with timeout and early termination:

```typescript
import { withIterator } from 'result-guard';

async function processLargeDataSet() {
  async function* dataGenerator() {
    let page = 1;
    while (true) {
      const response = await fetch(`/api/data?page=${page}`);
      const data = await response.json();
      if (data.length === 0) break;
      yield* data;
      page++;
    }
  }

  const result = await withIterator(dataGenerator(), {
    timeout: 30000, // 30 second timeout
    maxItems: 1000, // Stop after 1000 items
    onItem: (item) => {
      // Stop if we find an invalid item
      if (!item.isValid) return false;
      // Continue processing
      return true;
    }
  });

  if (isSuccess(result)) {
    return result.data;
  }
  console.error('Failed to process data:', result.error);
  return [];
}
```

### Handling Callbacks (`withCallbacks`)

Convert callback-style APIs to promises:

```typescript
import { withCallbacks } from 'result-guard';
import { Database } from 'some-db-library';

function queryDatabase(sql: string, params: any[]) {
  return withCallbacks<any[]>(({ resolve, reject }) => {
    const db = new Database();
    
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });

    // Return cleanup function
    return () => db.close();
  }, {
    timeout: 5000 // 5 second timeout
  });
}

// Usage
const result = await queryDatabase('SELECT * FROM users WHERE id = ?', [123]);
if (isSuccess(result)) {
  console.log('Query results:', result.data);
}
```

### Running Concurrent Operations (`concurrent`)

Execute multiple operations with controlled concurrency and type safety:

```typescript
interface User { id: number; name: string; }
interface Post { id: number; title: string; }
interface Stats { visits: number; }

const results = await concurrent([
  async () => {
    const response = await fetch('/api/users');
    return response.json() as User[];
  },
  async () => {
    const response = await fetch('/api/posts');
    return response.json() as Post[];
  },
  async () => {
    const response = await fetch('/api/stats');
    return response.json() as Stats;
  }
], {
  maxConcurrent: 3,
  timeout: 5000
});

// TypeScript knows the exact types of each result
const [usersResult, postsResult, statsResult] = results;

return {
  users: isSuccess(usersResult) ? usersResult.data : [], // User[]
  posts: isSuccess(postsResult) ? postsResult.data : [], // Post[]
  stats: isSuccess(statsResult) ? statsResult.data : null, // Stats
};
```

## Configuration Types

### Common Options

All utility functions accept a timeout option:

```typescript
type TimeoutOptions = {
  timeout?: number; // Milliseconds before operation times out
};
```

### Event Handler Options

Options for `withEvents`:

```typescript
type EventOptions = TimeoutOptions & {
  errorEvent?: string; // Event name to listen for errors (default: 'error')
  cleanup?: () => void | Promise<void>; // Cleanup function
};
```

### Iterator Options

Options for `withIterator`:

```typescript
type IteratorOptions<T> = TimeoutOptions & {
  maxItems?: number; // Maximum number of items to process
  onItem?: (item: T) => boolean | Promise<boolean>; // Return false to stop
};
```

### Concurrent Operation Options

Options for `concurrent`:

```typescript
type ConcurrentOptions = TimeoutOptions & {
  maxConcurrent?: number; // Maximum parallel operations
  stopOnError?: boolean; // Stop all operations on first error
};
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 