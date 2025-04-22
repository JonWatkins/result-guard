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

Execute multiple operations with controlled concurrency and precise type inference:

```typescript
// Example with typed functions
interface User { name: string; id: number }
interface Post { title: string; content: string }

const getUser = async (): Promise<User> => ({ name: 'bob', id: 1 });
const getPost = async (): Promise<Post> => ({ 
  title: 'Hello',
  content: 'World'
});

// TypeScript infers exact return types
const results = await concurrent([
  getUser,
  getPost
] as const);

const [userResult, postResult] = results;

if (!userResult.isError) {
  const user = userResult.data; // TypeScript knows this is User
  console.log(user.name, user.id);
}

if (!postResult.isError) {
  const post = postResult.data; // TypeScript knows this is Post
  console.log(post.title, post.content);
}

// Example with literal types
const literalResults = await concurrent([
  async () => 42 as const,
  async () => 'hello' as const,
  async () => ({ status: 'ok' as const })
] as const);

const [numResult, strResult, objResult] = literalResults;

if (!numResult.isError) {
  const num = numResult.data; // Type is exactly 42
  console.log(num); // TypeScript knows this is exactly 42
}

if (!strResult.isError) {
  const str = strResult.data; // Type is exactly 'hello'
  console.log(str); // TypeScript knows this is exactly 'hello'
}

if (!objResult.isError) {
  const obj = objResult.data; // Type is exactly { status: 'ok' }
  console.log(obj.status); // TypeScript knows this is exactly 'ok'
}

// With concurrency control
const results = await concurrent(
  [getUser, getPost],
  {
    timeout: 5000, // 5 second timeout
    maxConcurrent: 2, // Run at most 2 operations at once
    stopOnError: false // Continue on error
  }
);
```

The `concurrent` function provides:
- Precise type inference for each operation's return type
- Support for both typed functions and literal types
- Controlled concurrency with `maxConcurrent`
- Timeout handling for long-running operations
- Error handling with `stopOnError` option
- Type-safe access to results through destructuring

### Composing Utilities

The utility functions can be composed together using the `concurrent` function. Here's how to combine multiple utilities:

```typescript
import { concurrent, withEvents, withIterator, withCallbacks } from 'result-guard';
import { EventEmitter } from 'events';

// Example combining multiple utilities
async function processMultipleOperations() {
  // Create event emitters for testing
  const emitter1 = new EventEmitter();
  const emitter2 = new EventEmitter();

  // Define an async iterator
  async function* numberGenerator() {
    for (let i = 1; i <= 3; i++) {
      yield i;
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  // Run multiple operations concurrently
  const results = await concurrent([
    // Process first event emitter
    async () => {
      const result = await withEvents(
        emitter1,
        () => new Promise<string>(resolve => {
          emitter1.once('data', resolve);
          setTimeout(() => emitter1.emit('data', 'event1 data'), 1);
        })
      );
      return result.isError ? Promise.reject(result.error) : result.data;
    },

    // Process second event emitter
    async () => {
      const result = await withEvents(
        emitter2,
        () => new Promise<string>(resolve => {
          emitter2.once('data', resolve);
          setTimeout(() => emitter2.emit('data', 'event2 data'), 1);
        })
      );
      return result.isError ? Promise.reject(result.error) : result.data;
    },

    // Process an async iterator
    async () => {
      const result = await withIterator(numberGenerator());
      return result.isError ? Promise.reject(result.error) : result.data;
    },

    // Handle callbacks
    async () => {
      const result = await withCallbacks<string>(({ resolve }) => {
        const timeoutId = setTimeout(() => resolve('callback data'), 1);
        return () => clearTimeout(timeoutId);
      });
      return result.isError ? Promise.reject(result.error) : result.data;
    }
  ] as const);

  // Destructure and handle results
  const [event1Result, event2Result, iteratorResult, callbackResult] = results;

  return {
    event1: !event1Result.isError ? event1Result.data : null,
    event2: !event2Result.isError ? event2Result.data : null,
    numbers: !iteratorResult.isError ? iteratorResult.data : [],
    callbackData: !callbackResult.isError ? callbackResult.data : null,
    errors: results
      .filter(r => r.isError)
      .map(r => r.error.message)
  };
}

// Error handling example
async function handleErrors() {
  const emitter = new EventEmitter();
  
  const results = await concurrent([
    // Event emitter that errors
    async () => {
      const result = await withEvents(
        emitter,
        () => new Promise<string>((_, reject) => {
          emitter.once('error', reject);
          setTimeout(() => emitter.emit('error', new Error('event error')), 1);
        })
      );
      return result.isError ? Promise.reject(result.error) : result.data;
    },

    // Iterator that errors
    async () => {
      const result = await withIterator(async function* () {
        yield 1;
        throw new Error('iterator error');
      }());
      return result.isError ? Promise.reject(result.error) : result.data;
    },

    // Callback that errors
    async () => {
      const result = await withCallbacks<string>(({ reject }) => {
        const timeoutId = setTimeout(() => reject(new Error('callback error')), 1);
        return () => clearTimeout(timeoutId);
      });
      return result.isError ? Promise.reject(result.error) : result.data;
    }
  ] as const);

  // All operations should have failed
  const errors = results
    .filter(r => r.isError)
    .map(r => r.error.message);

  return errors; // ['event error', 'iterator error', 'callback error']
}

// Cleanup example
async function handleCleanup() {
  const cleanupCalls = {
    event: 0,
    iterator: 0,
    callback: 0
  };

  const emitter = new EventEmitter();
  
  await concurrent([
    // Event with cleanup
    async () => {
      const result = await withEvents(
        emitter,
        () => Promise.resolve('event data'),
        {
          cleanup: () => {
            cleanupCalls.event++;
          }
        }
      );
      return result.isError ? Promise.reject(result.error) : result.data;
    },

    // Iterator with cleanup
    async () => {
      const result = await withIterator((async function* () {
        try {
          yield 1;
        } finally {
          cleanupCalls.iterator++;
        }
      })());
      return result.isError ? Promise.reject(result.error) : result.data;
    },

    // Callback with cleanup
    async () => {
      const result = await withCallbacks<string>(({ resolve }) => {
        const timeoutId = setTimeout(() => resolve('callback data'), 1);
        return () => {
          clearTimeout(timeoutId);
          cleanupCalls.callback++;
        };
      });
      return result.isError ? Promise.reject(result.error) : result.data;
    }
  ] as const);

  return cleanupCalls; // { event: 1, iterator: 1, callback: 1 }
}
```

This composition pattern provides:
- Type-safe composition of multiple utility functions
- Proper error propagation across all utilities
- Independent cleanup handling for each operation
- Concurrent execution with controlled concurrency
- Consistent error handling patterns
- Resource cleanup in all cases (success, error, timeout)

The key benefits of this approach are:
1. **Type Safety**: Full TypeScript support with proper type inference
2. **Error Handling**: Unified error handling across different types of operations
3. **Resource Management**: Guaranteed cleanup of resources
4. **Concurrency Control**: Ability to run operations in parallel with limits
5. **Flexibility**: Mix and match different utilities as needed

The `concurrent` function provides:
- Precise type inference for each operation's return type
- Support for both typed functions and literal types
- Controlled concurrency with `maxConcurrent`
- Timeout handling for long-running operations
- Error handling with `stopOnError` option
- Type-safe access to results through destructuring

### Piping Operations (`pipe`)

Compose operations in a sequential chain, passing results from one operation to the next:

```typescript
import { pipe, tryCatch } from 'result-guard';

async function fetchUserData(userId: string) {
  // Chain operations in a pipeline
  const result = await pipe(
    userId,
    [
      // First, get the user
      (id) => tryCatch(() => {
        return fetch(`/api/users/${id}`)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
            return res.json();
          });
      }),
      
      // Then, get their posts using the user data
      (user) => tryCatch(() => {
        return fetch(`/api/users/${user.id}/posts`)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
            return res.json();
          });
      }),
      
      // Finally, process the posts
      (posts) => tryCatch(() => {
        return posts.map(post => ({
          title: post.title,
          excerpt: post.body.substring(0, 100) + '...'
        }));
      })
    ]
  );

  if (result.isError) {
    console.error("Error in pipeline:", result.error.message);
    return null;
  }
  
  return result.data;
}
```

The pipe function:
- Takes an initial value and an array of operations
- Passes each successful result as input to the next operation
- Short-circuits on the first error
- Supports both synchronous and asynchronous operations
- Preserves full type safety throughout the chain
- Provides a clean, functional programming approach to sequential operations

This pattern is ideal for:
- Sequential API calls that depend on previous results
- Data transformations that need to happen in a specific order
- Complex validation chains
- Building up results through a series of transformations

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