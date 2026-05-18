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
