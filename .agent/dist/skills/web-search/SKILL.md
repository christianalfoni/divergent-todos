---
name: web-search
description: Web search via Brave Search API. Use to search for documentation, facts, current information, or any web content when you need up-to-date information from the internet.
---

# Web Search

Provides web search capability using the Brave Search API.

## Prerequisites

Set the `BRAVE_API_KEY` environment variable with your Brave Search API key.

## Usage

```bash
./search.sh "<query>"
```

The script returns JSON results containing:
- Search results with title, URL, and description
- Structured data when available

## Example

```bash
./search.sh "latest Node.js features 2025"
./search.sh "how to use React useReducer hook"
```

## When to Use

Use this skill when you need to:
- Look up current documentation or APIs
- Find recent information not in your training data
- Verify facts or find examples online
- Research libraries, frameworks, or tools
