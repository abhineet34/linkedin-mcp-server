# LinkedIn MCP Server

Connect Claude (or any MCP client) to your LinkedIn account. Once set up, you can ask Claude to write and publish posts, upload images, look up company pages, and more — directly from your chat.

---

## What can it do?

- **Get your profile** — fetch your name, email, and photo
- **Create posts** — text, image, or article/link posts
- **Edit & delete posts** — update or remove posts you've published
- **Upload images** — attach images to your posts
- **Look up company pages** — search by name or ID
- **Get follower counts** — see how many followers a company page has

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

This token lets the server talk to LinkedIn on your behalf.

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/) and sign in
2. Click **Create app**
   - App name: anything (e.g. "My MCP")
   - LinkedIn page: your personal or company page
   - App logo: any image
3. After creating, go to the **Auth** tab of your app
4. Under **OAuth 2.0 scopes**, request these scopes:
   - `openid`
   - `profile`
   - `email`
   - `w_member_social`
5. Go to the **OAuth 2.0 tools** section (in the left sidebar of the portal)
6. Select your app, choose the scopes above, and click **Request access token**
7. Copy the token — it looks like `AQX...` and is very long

> Your token expires after **60 days**. When it stops working, come back here and generate a new one.

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

Claude should respond with your name and email. If it does — you're all set!

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

**Claude says it can't find the LinkedIn tool**
- Make sure you restarted Claude Desktop after editing the config file
- Double-check the file path in the config points to `dist/index.js`

**"Unauthorized" or "token" error**
- Your access token may have expired (they last 60 days)
- Go back to Step 2 and generate a new one, then update the config file

**"Permission denied" error**
- The action requires a scope you haven't granted
- Go back to Step 2 and make sure all four scopes are selected

**Node.js not found**
- Install Node.js from [nodejs.org](https://nodejs.org/) and try again

---

## Available Tools (for developers)

| Tool | Description |
|---|---|
| `linkedin_get_profile` | Get your LinkedIn profile |
| `linkedin_create_post` | Create a post (text, image, or article) |
| `linkedin_get_post` | Get a post by its URN |
| `linkedin_list_posts` | List posts by a member or company |
| `linkedin_update_post` | Edit a post's text or visibility |
| `linkedin_delete_post` | Delete a post |
| `linkedin_upload_image` | Upload an image to use in a post |
| `linkedin_get_organization` | Look up a company page |
| `linkedin_get_org_follower_count` | Get a company page's follower count |

---

## License

MIT
