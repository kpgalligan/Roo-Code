# Roo Code Custom Tools API

The Roo Code Custom Tools API allows you to extend Roo Code's capabilities by providing custom tool implementations when starting tasks via the API. This is an alternative to MCP (Model Context Protocol) for situations where you need more direct control over tool execution.

## Overview

Custom tools are passed to Roo Code when starting a new task through the API. These tools are executed within the Roo Code extension context and can perform any operations that your extension or application requires.

## Quick Start

```typescript
import { startNewTask } from '@roo-code/api'

// Define a custom tool
const customTools = [{
  definition: {
    name: "database_query",
    description: "Execute a database query and return results",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The SQL query to execute"
        },
        database: {
          type: "string", 
          description: "The database name to query"
        }
      },
      required: ["query"]
    }
  },
  executor: async (params) => {
    // Your custom implementation
    const { query, database = "default" } = params
    const result = await yourDatabaseClient.execute(query, database)
    return JSON.stringify(result, null, 2)
  }
}]

// Start a task with custom tools
const task = await startNewTask({
  task: "Analyze the user data in our database",
  customTools
})
```

## API Reference

### CustomTool Interface

```typescript
interface CustomTool {
  definition: CustomToolDefinition
  executor: CustomToolExecutor
}
```

### CustomToolDefinition

Defines the tool's metadata and parameters for the AI model:

```typescript
// Based on JSON Schema Draft 7
type CustomToolParameterType = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null"

interface CustomToolParameterSchema {
	type?: CustomToolParameterType | CustomToolParameterType[]
	description?: string
	enum?: any[]
	// for objects
	properties?: {
		[key: string]: CustomToolParameterSchema
	}
	required?: string[]
	// for arrays
	items?: CustomToolParameterSchema | CustomToolParameterSchema[]
	[key: string]: any
}

interface CustomToolDefinition {
  name: string
  description: string
  parameters: CustomToolParameterSchema & {
		type: "object"
		properties: {
			[key: string]: CustomToolParameterSchema
		}
	}
}
```

### CustomToolExecutor

The function that executes when the AI calls your tool:

```typescript
type CustomToolExecutor = (params: Record<string, any>) => Promise<string> | string
```

**Parameters:**
- `params`: Object containing the parameters passed by the AI model

**Returns:**
- `string` or `Promise<string>`: The result to return to the AI model

## Starting Tasks with Custom Tools

Use the `startNewTask` API with the `customTools` parameter:

```typescript
interface StartTaskOptions {
  task: string
  customTools?: CustomTool[]
  // ... other options
}

const task = await startNewTask({
  task: "Your task description",
  customTools: [/* your custom tools */]
})
```

## Tool Execution Flow

1. AI model decides to use a custom tool based on the tool descriptions in the system prompt
2. Roo Code receives the tool call with parameters
3. Your `executor` function is called with the parameters
4. The result is returned to the AI model to continue the conversation

## Example Implementations

### Database Query Tool

```typescript
const databaseTool = {
  definition: {
    name: "database_query",
    description: "Execute SQL queries against the application database",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The SQL query to execute"
        },
        database: {
          type: "string",
          description: "Database name (optional, defaults to 'main')"
        }
      },
      required: ["query"]
    }
  },
  executor: async (params) => {
    const { query, database = "main" } = params
    try {
      const result = await db.execute(query, database)
      return `Query executed successfully:\n${JSON.stringify(result, null, 2)}`
    } catch (error) {
      return `Database error: ${error.message}`
    }
  }
}
```

### API Call Tool

This example shows how to define a tool with various parameter types, including `enum`.

```typescript
const apiCallTool = {
  definition: {
    name: "api_call",
    description: "Make HTTP requests to external APIs",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The API endpoint URL"
        },
        method: {
          type: "string",
          description: "HTTP method",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH"]
        },
        headers: {
          type: "object",
          description: "Request headers as key-value pairs"
        },
        body: {
          type: "object",
          description: "Request body as a JSON object for POST/PUT requests"
        }
      },
      required: ["url", "method"]
    }
  },
  executor: async (params) => {
    const { url, method, headers = {}, body } = params
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      })
      
      const result = await response.text()
      return `API Response (${response.status}):\n${result}`
    } catch (error) {
      return `API call failed: ${error.message}`
    }
  }
}
```

### File System Operations Tool

```typescript
const customFileOpsTool = {
  definition: {
    name: "custom_file_ops",
    description: "Perform custom file system operations with business logic",
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          description: "The operation to perform",
          enum: ["backup", "deploy", "validate", "transform"]
        },
        path: {
          type: "string",
          description: "File or directory path"
        },
        options: {
          type: "object",
          description: "Operation-specific options"
        }
      },
      required: ["operation", "path"]
    }
  },
  executor: async (params) => {
    const { operation, path, options = {} } = params
    
    switch (operation) {
      case "backup":
        return await createBackup(path, options)
      case "deploy":
        return await deployFiles(path, options)
      case "validate":
        return await validateFiles(path, options)
      case "transform":
        return await transformFiles(path, options)
      default:
        return `Unknown operation: ${operation}`
    }
  }
}
```

## Best Practices

### Tool Design

1. **Clear Descriptions**: Provide detailed descriptions for tools and parameters so the AI understands when and how to use them
2. **Validation**: Validate parameters in your executor function and return meaningful error messages
3. **Error Handling**: Always handle errors gracefully and return descriptive error messages
4. **Return Format**: Return results as formatted strings that are useful for the AI model

### Parameter Handling

```typescript
executor: async (params) => {
  // Validate required parameters
  if (!params.query) {
    return "Error: 'query' parameter is required"
  }
  
  // Provide defaults for optional parameters
  const { query, database = "default", timeout = 30000 } = params
  
  // Type checking for complex parameters
  if (params.options && typeof params.options !== 'object') {
    return "Error: 'options' must be an object"
  }
  
  // Your implementation...
}
```

### Error Handling

```typescript
executor: async (params) => {
  try {
    const result = await someAsyncOperation(params)
    return `Success: ${JSON.stringify(result)}`
  } catch (error) {
    // Return user-friendly error messages
    if (error instanceof ValidationError) {
      return `Validation Error: ${error.message}`
    }
    if (error instanceof NetworkError) {
      return `Network Error: Unable to connect to service`
    }
    return `Unexpected Error: ${error.message}`
  }
}
```

## Debugging

### Tool Registration

Custom tools are automatically registered when you start a task. You can verify registration by checking the Roo Code output channel for messages like:

```
Using custom tool: your_tool_name
```

### Parameter Debugging

Log the parameters received by your executor:

```typescript
executor: async (params) => {
  console.log('Tool called with params:', JSON.stringify(params, null, 2))
  // Your implementation...
}
```

### Return Value Debugging

Ensure your executor returns a string value that provides useful information to the AI:

```typescript
executor: async (params) => {
  const result = await yourOperation(params)
  
  // Good: Descriptive return with context
  return `Operation completed successfully. Results:\n${JSON.stringify(result, null, 2)}`
  
  // Avoid: Just returning raw data without context
  // return JSON.stringify(result)
}
```

## Migration from MCP

If you're migrating from MCP to custom tools:

1. **Tool Definition**: Convert your MCP tool schema to `CustomToolDefinition` format
2. **Handler Function**: Move your MCP tool handler logic into the `executor` function
3. **Parameter Access**: Access parameters directly from the `params` object instead of MCP's request structure
4. **Return Values**: Return string results directly instead of MCP response objects

### MCP to Custom Tool Example

**MCP Version:**
```typescript
// MCP tool handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "query_db",
    description: "Query the database",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The SQL query to run" }
      },
      required: ["query"]
    }
  }]
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "query_db") {
    const result = await db.query(request.params.arguments.query)
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    }
  }
})
```

**Custom Tool Version:**
```typescript
const queryDbTool = {
  definition: {
    name: "query_db",
    description: "Query the database", 
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "SQL query to execute"
        }
      },
      required: ["query"]
    }
  },
  executor: async (params) => {
    const result = await db.query(params.query)
    return JSON.stringify(result, null, 2)
  }
}
```

## Limitations

- Custom tools are scoped to the specific task instance
- Tools must return string values (JSON stringify objects if needed)
- No built-in progress reporting (unlike MCP's streaming capabilities)
- Tools execute in the Roo Code extension context, not your extension context

## Support

For issues with custom tools:

1. Check the Roo Code output channel for error messages
2. Verify your tool definitions match the expected schema
3. Test your executor functions independently before integration
4. File issues at [Roo Code GitHub repository](https://github.com/RooCodeInc/Roo-Code/issues)