# LinkedIn MCP Server

> **Post to LinkedIn from Claude.** A Model Context Protocol (MCP) server that lets Claude Desktop, Claude Code, and any MCP-compatible AI assistant publish posts, upload images, and manage company pages on LinkedIn — using natural language.

[![Glama](https://glama.ai/mcp/servers/abhineet34/linkedin-mcp-server/badges/score.svg)](https://glama.ai/mcp/servers/abhineet34/linkedin-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.6+-purple.svg)](https://modelcontextprotocol.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/abhineet34/linkedin-mcp-server/pulls)

Imagine asking Claude *"draft a LinkedIn post about my latest project and publish it"* — and it just happens. That's what this MCP server enables.

---

## ✨ Features

| | |
|---|---|
| 📝 **Create posts** | Publish text, image, or article/link posts |
| 🖼️ **Upload images** | Attach images to posts in one workflow |
| ✏️ **Edit & delete** | Update post text/visibility or remove posts entirely |
| 👤 **Profile** | Fetch your name, email, photo, and LinkedIn URN |
| 🏢 **Companies** | Look up company pages by name or ID |
| 📊 **Follower counts** | Get follower stats for any company page |
| 🤖 **Works with any MCP client** | Claude Desktop, Claude Code, Cline, Continue, etc. |
| 🔐 **OAuth 2.0 secured** | Industry-standard auth, runs locally on your machine |

---

---

## 💬 What it looks like

Once connected, just talk to Claude naturally:

```
You:    Draft a LinkedIn post announcing my new open-source project and publish it.

Claude: Here's a draft:

        🚀 Just open-sourced linkedin-mcp-server — an MCP server that lets
        Claude post to LinkedIn directly. No more copy-pasting drafts.

        Built with TypeScript and the LinkedIn REST API. Star on GitHub if
        you find it useful!

        Should I post this?

You:    Yes, publish it.

Claude: ✅ Posted. URN: urn:li:share:7339284...
```

Other things you can ask:
- *"Look up the LinkedIn page for OpenAI and tell me how many followers they have"*
- *"Delete my last LinkedIn post"*
- *"Edit my latest post to add a link to the docs"*
- *"Share this article on LinkedIn with a short intro: https://..."*

---

## Before you start

You need three things installed on your computer:

1. **Node.js** (v18 or later) — [download here](https://nodejs.org/)
2. **Claude Desktop** — [download here](https://claude.ai/download)
3. A **LinkedIn access token** (explained in Step 2 below)

---

## Step 1 — Download and build the server

Open your **Terminal** and run these commands one by one:

```bash
git clone https://github.com/abhineet34/linkedin-mcp-server.git
cd linkedin-mcp-server
npm install
npm run build
```

When it finishes, you'll have a `dist/` folder. That's the built server.

Note down the **full path** to this folder — you'll need it in Step 3. To get it, run:

```bash
pwd
```

It will print something like `/Users/yourname/linkedin-mcp-server`. Remember this.

---

## Step 2 — Get a LinkedIn Access Token

This is the trickiest part. LinkedIn's developer portal has some quirks — follow these steps in order and you'll be fine.

### 2a. Create a LinkedIn Company Page (required, even for personal use)

LinkedIn forces every developer app to be linked to a **Company Page** — a personal profile URL will not work, and the "Member Data Portability" default page blocks access to all useful products. So you must create a real Company Page first.

1. Go to **[linkedin.com/company/setup/new](https://www.linkedin.com/company/setup/new)**
2. Choose **Company**
3. Fill in:
   - **Name** — your name, brand, or anything (e.g. "Your Name", "Yourname Dev")
   - **LinkedIn public URL** — auto-fills from the name
   - **Industry** — pick **Software Development** (or whatever fits your actual work)
   - **Organization size** — `0–1 employees`
   - **Organization type** — `Self-employed`
   - **Logo** — optional, any image
4. Check the verification box and click **Create page**

The page can stay empty — it just needs to exist.

### 2b. Create the developer app

1. Go to **[LinkedIn Developer Portal](https://developer.linkedin.com/)** and sign in
2. Click **Create app**
   - **App name** — anything (e.g. "My MCP")
   - **LinkedIn Page** — search for the page you just created and select it (don't paste a URL)
   - **App logo** — any image
   - Accept the legal agreement, click **Create app**

### 2c. Add required Products to the app

This is the step most people miss. Adding scopes alone is not enough — you also have to add the **Products** that provide those scopes.

1. Open your app and go to the **Products** tab
2. Click **Request access** on these two products:
   - **Sign In with LinkedIn using OpenID Connect** — provides `openid`, `profile`, `email`
   - **Share on LinkedIn** — provides `w_member_social`
3. Both are auto-approved instantly (no waiting). Refresh the page — they should appear under **"Added products"**

> If "Request access" is grayed out with a tooltip about Member Data Portability, you skipped Step 2a. Create a real Company Page, then create a **new** app linked to it (the old app cannot be fixed).

### 2d. Add a redirect URL

1. Go to the **Auth** tab of your app
2. Find **"Authorized redirect URLs for your app"** and click the pencil icon
3. Add this URL exactly:
   ```
   https://www.linkedin.com/developers/tools/oauth/redirect
   ```
4. Save

This is LinkedIn's own redirect URL — required for the token generator to work.

### 2e. Generate the access token

1. Go to **[linkedin.com/developers/tools/oauth/token-generator](https://www.linkedin.com/developers/tools/oauth/token-generator)**
2. Select your app from the dropdown
3. Check all four scopes:
   - ☑ `openid`
   - ☑ `profile`
   - ☑ `email`
   - ☑ `w_member_social`
4. Click **Request access token**
5. LinkedIn will pop up an authorization screen — click **Allow**
6. You'll see a long token starting with `AQX...` — **copy it now** (you only see it once)

> Your token expires after **60 days**. When it stops working, come back to this step and generate a new one.

---

## Step 3 — Connect to Claude Desktop

1. Open **Claude Desktop**
2. Go to **Settings → Developer → Edit Config**

   This opens a file called `claude_desktop_config.json`. Add the following inside it (replace the placeholder values):

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/Users/yourname/linkedin-mcp-server/dist/index.js"],
      "env": {
        "LINKEDIN_ACCESS_TOKEN": "paste-your-token-here"
      }
    }
  }
}
```

   - Replace `/Users/yourname/linkedin-mcp-server` with the path you noted in Step 1
   - Replace `paste-your-token-here` with the token from Step 2

3. Save the file and **restart Claude Desktop**

---

## Step 4 — Test it

In Claude Desktop, try:

> "What's my LinkedIn profile?"

Claude should respond with your name, email, and a long ID starting with `urn:li:person:...`. If it does — **you're all set!**

> 💡 **Save your URN.** The response includes something like `urn:li:person:izbpuvq9Vz`. This is your unique LinkedIn ID — Claude needs it as the `author_urn` when creating posts. You can just ask Claude *"remember my LinkedIn URN"* or copy it somewhere safe.

---

## Example things you can ask Claude

Once connected, just talk to Claude naturally:

- *"Post on LinkedIn: Excited to share my new project!"*
- *"Create a LinkedIn post sharing this article: https://..."*
- *"Delete my last LinkedIn post"*
- *"How many followers does the Microsoft LinkedIn page have?"*
- *"Look up the LinkedIn page for OpenAI"*

---

## Troubleshooting

**LinkedIn rejects my personal profile URL when creating an app**
- LinkedIn only accepts **Company Page URLs**, not personal profile URLs (`/in/...`)
- Go to Step 2a and create a Company Page first — your "company" can be just your name

**"Request access" buttons are grayed out on the Products tab**
- This happens if you selected "Member Data Portability (Member-only default Company Page)" when creating the app
- That default page locks all products. You need to create a real Company Page (Step 2a) and then create a **brand new app** linked to it — the existing app can't be fixed

**Token generator says "no scopes available"**
- You skipped Step 2c. Go to your app's **Products** tab and add "Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn"
- Wait a minute, refresh, then try the token generator again

**"redirect_uri does not match" error in the token generator**
- You skipped Step 2d. Go to the **Auth** tab and add `https://www.linkedin.com/developers/tools/oauth/redirect` as an authorized redirect URL

**Claude says it can't find the LinkedIn tool**
- Make sure you restarted Claude Desktop completely after editing the config file (Quit and reopen, not just close the window)
- Double-check the file path in the config points to `dist/index.js` and the file actually exists at that path
- Run the path in Terminal with `ls <path>` to confirm

**"Unauthorized" or 401 error**
- Your access token may have expired (they last 60 days)
- Go back to Step 2e and generate a new one, then update the config file and restart Claude Desktop

**"Permission denied" or 403 error**
- The action requires a scope you didn't include
- For posting, make sure all four scopes were checked in Step 2e
- Some tools (like reading other people's posts) require LinkedIn-approved scopes that aren't available to all developers

**Node.js not found**
- Install Node.js from [nodejs.org](https://nodejs.org/) and try again

---

## Available Tools

### ✅ Verified working with self-serve scopes

These tools work with the standard scopes anyone can grant themselves (`openid`, `profile`, `email`, `w_member_social`) and have been tested end-to-end:

| Tool | Description | Required scope |
|---|---|---|
| `linkedin_get_profile` | Get your LinkedIn profile (name, email, photo, URN) | `openid profile email` |
| `linkedin_create_post` | Create a post (text, image, or article/link) | `w_member_social` |
| `linkedin_update_post` | Edit a post's text or visibility | `w_member_social` |
| `linkedin_delete_post` | Delete a post | `w_member_social` |
| `linkedin_upload_image` | Upload an image to use in a post | `w_member_social` |

### ⚠️ Approval-gated (not tested with self-serve scopes)

These tools require LinkedIn-approved scopes that **are not available to all developers**. They're included in the codebase for users who have partner-level access (e.g., approved Marketing Developer Platform, Community Management API, or Page Admin programs), but they have **not been verified end-to-end** with the standard self-serve flow described in this README.

| Tool | Description | Required scope | LinkedIn approval needed? |
|---|---|---|---|
| `linkedin_get_post` | Get a post by its URN | `r_member_social` or `r_organization_social` | Yes |
| `linkedin_list_posts` | List posts by a member or company | `r_member_social` or `r_organization_social` | Yes |
| `linkedin_get_organization` | Look up a company page | `rw_organization_admin` | Yes (Page admin role) |
| `linkedin_get_org_follower_count` | Get a company page's follower count | `rw_organization_admin` | Yes (Page admin role) |

> If you have approved access to these scopes and successfully use any of these tools, please open an issue or PR — we'd love to confirm them as verified and document any quirks.

---

## 🛠️ Tech stack

- **TypeScript** — fully typed, strict mode
- **[@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)** — official MCP SDK
- **[Zod](https://zod.dev/)** — runtime schema validation
- **[Axios](https://axios-http.com/)** — HTTP client
- **LinkedIn REST API** v202604 (configurable via `LINKEDIN_API_VERSION` env var; v2 fallback used only for OIDC userinfo)

The codebase is intentionally small and easy to extend — one file per tool domain (`profile`, `posts`, `media`, `organizations`).

---

## 🤝 Contributing

Issues and PRs are welcome! If you have an idea, find a bug, or want to add a new LinkedIn API tool, open an issue first to discuss.

**Ideas for contributions:**
- Add tools for LinkedIn comments and reactions
- Add scheduled post support
- Add carousel post support (multi-image)
- Improve error messages with more context
- Add a CLI mode for direct usage outside MCP clients

---

## 🔗 Related projects

- **[Model Context Protocol](https://modelcontextprotocol.io/)** — the open standard this server is built on
- **[Anthropic Claude](https://claude.ai/)** — the AI assistant this server is primarily designed for
- **[MCP Server Registry](https://github.com/modelcontextprotocol/servers)** — a curated list of MCP servers
- **[Claude Desktop](https://claude.ai/download)** — install to use this server with Claude

---

## ⚠️ Disclaimer

This is an unofficial integration. It is not affiliated with, endorsed by, or sponsored by LinkedIn Corporation. Use responsibly and within [LinkedIn's API terms of service](https://legal.linkedin.com/api-terms-of-use).

---

## ⭐ Star the repo

If this saved you time, [star the repo](https://github.com/abhineet34/linkedin-mcp-server/stargazers) — it helps other developers find it.

---

## License

[MIT](LICENSE) © [Abhineet Pratap Singh](https://www.linkedin.com/in/mr-abhineet/)
