# Supabase MCP Permanent Connection - Project Configuration

## 📋 Connection Details
- **Server**: `https://mcp.supabase.com/mcp`
- **Project Ref**: `gpyuxjrnojqpcfvvzrlt`
- **Features Enabled**: docs, account, database, debugging, development, functions, branching
- **OAuth Status**: ✅ Authenticated (callback port 6754)

## 🔧 Configuration File
Location: `C:\Users\iamth\.gemini\config\mcp_config.json`

```json
{
  "mcpServers": {
    "supabase": {
      "serverUrl": "https://mcp.supabase.com/mcp?project_ref=gpyuxjrnojqpcfvvzrlt&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching"
    },
    "StitchMCP": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://stitch.googleapis.com/mcp",
        "--header",
        "X-Goog-Api-Key: AQ.Ab8RN6K9plKIRnRjtJvnH-fbLBRg5OhW58pNMDoSIanUps5A"
      ],
      "env": {}
    },
    "21st": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://21st.dev/api/mcp",
        "--header",
        "x-api-key:21st_sk_00cdd9271553184588d09d56ad595cbe5784696a2c1c73dcdcd1b42fe474e5d5"
      ]
    }
  }
}
```

## 🔐 Security Notes
- OAuth tokens are stored securely in the brain directory: `C:\Users\iamth\.gemini\antigravity-ide\brain\00ed8bc9-7996-46e5-a3d7-2022e3e499e9`
- Connection uses StreamableHTTPClientTransport with callback port 6754
- Only enabled features are: docs, account, database, debugging, development, functions, branching
- No unnecessary API access scopes granted

## ▶️ To Reconnect This Project
Run this command:
```powershell
npx mcp-remote 'https://mcp.supabase.com/mcp?project_ref=gpyuxjrnojqpcfvvzrlt&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching'
```

## 📝 Next Time You Open Antigravity
The MCP config will auto-load. If OAuth expires, run the command above to re-authenticate.

## 🔄 To Test Connection
```powershell
npx mcp-remote 'https://mcp.supabase.com/mcp?project_ref=gpyuxjrnojqpcfvvzrlt&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching' list_projects
```
