/**
 * Example: Using Custom Tools with Roo Code API
 *
 * This example demonstrates how to create and use custom tools
 * when starting a task via the Roo Code API.
 */

import { RooCodeAPI, CustomTool } from "@roo-code/types"

// Example custom tool: Database Query Tool
const databaseQueryTool: CustomTool = {
	definition: {
		name: "database_query",
		description: "Execute a SQL query against the application database and return the results",
		parameters: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "The SQL query to execute",
					required: true,
				},
				database: {
					type: "string",
					description: "The database name to query (defaults to 'main')",
				},
			},
			required: ["query"],
		},
	},
	executor: async (params) => {
		// Your database query implementation here
		const { query, database = "main" } = params

		console.log(`Executing query on ${database}: ${query}`)

		// Mock database response
		if (query.toLowerCase().includes("select")) {
			return `Query executed successfully. Found 5 records matching your criteria.
			
Example results:
| id | name | email |
|----|------|-------|
| 1  | John | john@example.com |
| 2  | Jane | jane@example.com |`
		}

		return `Query executed successfully. ${Math.floor(Math.random() * 10)} rows affected.`
	},
}

// Example custom tool: API Call Tool
const apiCallTool: CustomTool = {
	definition: {
		name: "api_call",
		description: "Make HTTP requests to external APIs",
		parameters: {
			type: "object",
			properties: {
				url: {
					type: "string",
					description: "The URL to call",
					required: true,
				},
				method: {
					type: "string",
					description: "HTTP method (GET, POST, PUT, DELETE, etc.)",
				},
				headers: {
					type: "string",
					description: "JSON string of headers to include",
				},
				body: {
					type: "string",
					description: "Request body for POST/PUT requests",
				},
			},
			required: ["url"],
		},
	},
	executor: async (params) => {
		const { url, method = "GET", headers, body } = params

		try {
			const response = await fetch(url, {
				method,
				headers: headers ? JSON.parse(headers) : undefined,
				body: method !== "GET" ? body : undefined,
			})

			const data = await response.text()
			return `API call successful (${response.status}): ${data.slice(0, 500)}${data.length > 500 ? "..." : ""}`
		} catch (error) {
			return `API call failed: ${error.message}`
		}
	},
}

// Example custom tool: File System Operations
const fileSystemTool: CustomTool = {
	definition: {
		name: "custom_file_ops",
		description: "Perform custom file system operations like backup, compression, etc.",
		parameters: {
			type: "object",
			properties: {
				operation: {
					type: "string",
					description: "Operation to perform: backup, compress, encrypt",
					required: true,
				},
				path: {
					type: "string",
					description: "File or directory path",
					required: true,
				},
				options: {
					type: "string",
					description: "JSON string of operation-specific options",
				},
			},
			required: ["operation", "path"],
		},
	},
	executor: async (params) => {
		const { operation, path, options } = params

		// Mock implementation
		switch (operation) {
			case "backup":
				return `Created backup of ${path} at ${path}.backup-${Date.now()}`
			case "compress":
				return `Compressed ${path} - saved 45% space`
			case "encrypt":
				return `Encrypted ${path} using AES-256`
			default:
				return `Unknown operation: ${operation}`
		}
	},
}

// Usage example
async function startTaskWithCustomTools(api: RooCodeAPI) {
	const customTools = [databaseQueryTool, apiCallTool, fileSystemTool]

	const taskId = await api.startNewTask({
		configuration: {
			mode: "Code",
			autoApprovalEnabled: false, // Let user approve custom tool usage
		},
		text: `Help me analyze the user database and create a backup. 
		
Please:
1. Query the users table to get a count of active users
2. Make an API call to check the health of our external service
3. Create a backup of the important files in /data/users
		
Use the custom tools I've provided for these operations.`,
		customTools,
	})

	console.log(`Started task ${taskId} with custom tools`)

	// Listen for task completion
	api.on("taskCompleted", (completedTaskId, tokenUsage, toolUsage) => {
		if (completedTaskId === taskId) {
			console.log("Task completed!", { tokenUsage, toolUsage })
		}
	})

	return taskId
}

export { startTaskWithCustomTools, databaseQueryTool, apiCallTool, fileSystemTool }
