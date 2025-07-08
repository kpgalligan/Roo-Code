import type { ToolName, ModeConfig, CustomTool } from "@roo-code/types"

import { TOOL_GROUPS, ALWAYS_AVAILABLE_TOOLS, DiffStrategy } from "../../../shared/tools"
import { McpHub } from "../../../services/mcp/McpHub"
import { Mode, getModeConfig, isToolAllowedForMode, getGroupName } from "../../../shared/modes"

import { ToolArgs } from "./types"
import { getExecuteCommandDescription } from "./execute-command"
import { getReadFileDescription } from "./read-file"
import { getFetchInstructionsDescription } from "./fetch-instructions"
import { getWriteToFileDescription } from "./write-to-file"
import { getSearchFilesDescription } from "./search-files"
import { getListFilesDescription } from "./list-files"
import { getInsertContentDescription } from "./insert-content"
import { getSearchAndReplaceDescription } from "./search-and-replace"
import { getListCodeDefinitionNamesDescription } from "./list-code-definition-names"
import { getBrowserActionDescription } from "./browser-action"
import { getAskFollowupQuestionDescription } from "./ask-followup-question"
import { getAttemptCompletionDescription } from "./attempt-completion"
import { getUseMcpToolDescription } from "./use-mcp-tool"
import { getAccessMcpResourceDescription } from "./access-mcp-resource"
import { getSwitchModeDescription } from "./switch-mode"
import { getNewTaskDescription } from "./new-task"
import { getCodebaseSearchDescription } from "./codebase-search"
import { CodeIndexManager } from "../../../services/code-index/manager"
import fs from "fs/promises"
import path from "path"
import os from "os"

function formatParameter(
	name: string,
	schema: any,
	required: boolean,
	indent: string = "",
): string {
	const details = [`type: ${schema.type}`, `required: ${required}`]
	if (schema.description) {
		details.push(`description: ${schema.description}`)
	}
	if (schema.enum) {
		details.push(`enum: [${schema.enum.join(", ")}]`)
	}

	let result = `${indent}- ${name} (${details.join(", ")})\n`

	if (schema.type === "object" && schema.properties) {
		result += `${indent}  Properties:\n`
		for (const [key, value] of Object.entries(schema.properties)) {
			result += formatParameter(
				key,
				value,
				schema.required?.includes(key) || false,
				`${indent}    `,
			)
		}
	} else if (schema.type === "array" && schema.items) {
		result += `${indent}  Items (repeat the <${name}> tag for each item):\n`
		if (schema.items.type === "object") {
			result += `${indent}    (format each object as a JSON string)\n`
		}
		if (Array.isArray(schema.items)) {
			// Handle tuple-like arrays
			schema.items.forEach((item: any, index: number) => {
				result += formatParameter(
					`[${index}]`,
					item,
					true,
					`${indent}      `,
				)
			})
		} else {
			// Handle object-like arrays
			result += formatParameter(
				"item",
				schema.items,
				true,
				`${indent}      `,
			)
		}
	}
	return result
}

function generateExample(
	toolName: string,
	schema: any,
	indent: string = "  ",
): string {
	let example = `<${toolName}>\n`
	if (schema.properties) {
		for (const [key, value] of Object.entries(schema.properties)) {
			if (value.type === "array") {
				example += `${indent}<${key}>${generateExampleValue(value.items)}</${key}>\n`
				example += `${indent}<${key}>${generateExampleValue(value.items)}</${key}>\n`
			} else {
				example += `${indent}<${key}>${generateExampleValue(value)}</${key}>\n`
			}
		}
	}
	example += `</${toolName}>`
	return example
}

function generateExampleValue(schema: any): any {
	if (schema.enum) {
		return schema.enum[0]
	}
	switch (schema.type) {
		case "string":
			return "string"
		case "number":
			return 123
		case "boolean":
			return true
		case "object":
			if (schema.properties) {
				const obj: Record<string, any> = {}
				for (const [key, value] of Object.entries(schema.properties)) {
					obj[key] = generateExampleValue(value)
				}
				return JSON.stringify(obj)
			}
			return "{...}"
		case "array":
			return "..."
		default:
			return "..."
	}
}

// Map of tool names to their description functions
const toolDescriptionMap: Record<string, (args: ToolArgs) => string | undefined> = {
	execute_command: (args) => getExecuteCommandDescription(args),
	read_file: (args) => getReadFileDescription(args),
	fetch_instructions: () => getFetchInstructionsDescription(),
	write_to_file: (args) => getWriteToFileDescription(args),
	search_files: (args) => getSearchFilesDescription(args),
	list_files: (args) => getListFilesDescription(args),
	list_code_definition_names: (args) => getListCodeDefinitionNamesDescription(args),
	browser_action: (args) => getBrowserActionDescription(args),
	ask_followup_question: () => getAskFollowupQuestionDescription(),
	attempt_completion: (args) => getAttemptCompletionDescription(args),
	use_mcp_tool: (args) => getUseMcpToolDescription(args),
	access_mcp_resource: (args) => getAccessMcpResourceDescription(args),
	codebase_search: () => getCodebaseSearchDescription(),
	switch_mode: () => getSwitchModeDescription(),
	new_task: (args) => getNewTaskDescription(args),
	insert_content: (args) => getInsertContentDescription(args),
	search_and_replace: (args) => getSearchAndReplaceDescription(args),
	apply_diff: (args) =>
		args.diffStrategy ? args.diffStrategy.getToolDescription({ cwd: args.cwd, toolOptions: args.toolOptions }) : "",
}

export function getToolDescriptionsForMode(
	mode: Mode,
	cwd: string,
	supportsComputerUse: boolean,
	codeIndexManager?: CodeIndexManager,
	diffStrategy?: DiffStrategy,
	browserViewportSize?: string,
	mcpHub?: McpHub,
	customModes?: ModeConfig[],
	experiments?: Record<string, boolean>,
	partialReadsEnabled?: boolean,
	settings?: Record<string, any>,
	customTools?: CustomTool[],
): string {
	const config = getModeConfig(mode, customModes)
	const args: ToolArgs = {
		cwd,
		supportsComputerUse,
		diffStrategy,
		browserViewportSize,
		mcpHub,
		partialReadsEnabled,
		settings,
		experiments,
	}

	const tools = new Set<string>()

	// Add tools from mode's groups
	config.groups.forEach((groupEntry) => {
		const groupName = getGroupName(groupEntry)
		const toolGroup = TOOL_GROUPS[groupName]
		if (toolGroup) {
			toolGroup.tools.forEach((tool) => {
				if (
					isToolAllowedForMode(
						tool as ToolName,
						mode,
						customModes ?? [],
						undefined,
						undefined,
						experiments ?? {},
					)
				) {
					tools.add(tool)
				}
			})
		}
	})

	// Add always available tools
	ALWAYS_AVAILABLE_TOOLS.forEach((tool) => tools.add(tool))

	// Conditionally exclude codebase_search if feature is disabled or not configured
	if (
		!codeIndexManager ||
		!(codeIndexManager.isFeatureEnabled && codeIndexManager.isFeatureConfigured && codeIndexManager.isInitialized)
	) {
		tools.delete("codebase_search")
	}

	// Map tool descriptions for allowed tools
	const descriptions = Array.from(tools).map((toolName) => {
		const descriptionFn = toolDescriptionMap[toolName]
		if (!descriptionFn) {
			return undefined
		}

		return descriptionFn({
			...args,
			toolOptions: undefined, // No tool options in group-based approach
		})
	})

	// Add custom tool descriptions
	let customToolDescriptions = (customTools || []).map((customTool) => {
		let parameterDescriptions = "No parameters"
		if (customTool.definition.parameters.properties) {
			parameterDescriptions = Object.entries(
				customTool.definition.parameters.properties,
			)
				.map(([name, schema]) =>
					formatParameter(
						name,
						schema,
						customTool.definition.parameters.required?.includes(name) ||
							false,
					),
				)
				.join("")
		}

		const example = generateExample(
			customTool.definition.name,
			customTool.definition.parameters,
		)

		return `## ${customTool.definition.name}
${customTool.definition.description}

### Parameters
${parameterDescriptions}

### Example
\`\`\`xml
${example}
\`\`\`
`
	})

	if(customToolDescriptions.length > 0){
		const customToolsHeader = `# Custom Tools
		
The following tools are custom tools, provided by the agent for specific tasks. They are called in the same way that other standard tools are called.
		
		`;
		customToolDescriptions = [customToolsHeader, ...customToolDescriptions];
	}
	const allDescriptions = [...descriptions.filter(Boolean), ...customToolDescriptions]
	const allToolsDescription = `# Tools\n\n${allDescriptions.join("\n\n")}`
	const debugPath = path.join(path.join(os.homedir().toPosix(), 'temp'), 'touchlab-ai-debug')
	fs.mkdir(debugPath, {
		recursive: true,
	}).then(()=>{
		fs.writeFile(path.join(debugPath, `tools-description-${Date.now()}.md`), allToolsDescription).then(()=>{});
	});

	return allToolsDescription
}

// Export individual description functions for backward compatibility
export {
	getExecuteCommandDescription,
	getReadFileDescription,
	getFetchInstructionsDescription,
	getWriteToFileDescription,
	getSearchFilesDescription,
	getListFilesDescription,
	getListCodeDefinitionNamesDescription,
	getBrowserActionDescription,
	getAskFollowupQuestionDescription,
	getAttemptCompletionDescription,
	getUseMcpToolDescription,
	getAccessMcpResourceDescription,
	getSwitchModeDescription,
	getInsertContentDescription,
	getSearchAndReplaceDescription,
	getCodebaseSearchDescription,
}
