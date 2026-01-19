# 🔧 Supabase MCP Setup Guide for Cursor

This guide will help you configure Supabase MCP so I can execute SQL migrations and manage your database directly.

## 📋 Prerequisites

1. **Your Supabase Project Details:**
   - Project Reference: `dtxbrnrpzepwoxooqwlj`
   - Project URL: `https://dtxbrnrpzepwoxooqwlj.supabase.co`

2. **Get Supabase Personal Access Token (PAT):**
   - Go to: https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Give it a name (e.g., "Cursor MCP")
   - Copy the token (you'll only see it once!)

## 🚀 Setup Method 1: Command-Based (Recommended for Full Access)

This method uses the official Supabase MCP server package.

### Step 1: Open Cursor Settings

1. Open Cursor
2. Press `Cmd+,` (macOS) or `Ctrl+,` (Windows/Linux) to open Settings
3. Go to **Features** → **MCP Servers** (or search for "MCP" in settings)

### Step 2: Add Supabase MCP Server

Click "Add Server" or edit the MCP servers JSON configuration:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=dtxbrnrpzepwoxooqwlj"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_PERSONAL_ACCESS_TOKEN_HERE"
      }
    }
  }
}
```

**Important:** 
- Replace `YOUR_PERSONAL_ACCESS_TOKEN_HERE` with the token you generated
- The `--project-ref` parameter limits access to your specific project
- Remove `--read-only` if you want write access (needed for migrations)

### Step 3: Restart Cursor

After saving the configuration, restart Cursor completely for the MCP server to initialize.

---

## 🌐 Setup Method 2: HTTP-Based (Simpler, but Read-Only by Default)

This uses Supabase's hosted MCP service.

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=dtxbrnrpzepwoxooqwlj"
    }
  }
}
```

**Note:** This method may require browser authentication when first used.

---

## ✅ Verify Setup

After restarting Cursor, I should be able to:
- ✅ Query your database
- ✅ Execute SQL migrations
- ✅ Manage schema changes
- ✅ View logs and resources

## 🔒 Security Notes

- **Personal Access Token**: Keep it secret! Never commit it to git.
- **Project Scope**: The `--project-ref` limits access to your specific project
- **Read-Only**: If you want write access, remove the `--read-only` flag (if present)

## 🐛 Troubleshooting

### Issue: "Server not found" or "Connection failed"
- **Solution**: Make sure you restarted Cursor after adding the configuration
- **Solution**: Verify your Personal Access Token is correct
- **Solution**: Check Cursor's MCP server logs (Help → Toggle Developer Tools → Console)

### Issue: "Unauthorized" errors
- **Solution**: Regenerate your Personal Access Token
- **Solution**: Ensure the token has the correct permissions

### Issue: MCP server doesn't appear
- **Solution**: Check the JSON syntax in your MCP settings
- **Solution**: Look for errors in Cursor's developer console

---

## 📚 Additional Resources

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Supabase MCP GitHub](https://github.com/supabase-community/supabase-mcp)
- [Cursor MCP Documentation](https://docs.cursor.com/context/model-context-protocol)

---

**After setup, let me know and I'll be able to apply the migrations directly!** 🚀
