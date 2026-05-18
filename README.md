# linkedin-mcp-server

MCP server for the LinkedIn REST API. Enables LLMs to manage LinkedIn posts, retrieve profiles, upload images, and look up organization pages.

## Tools

| Tool | Description | Required Scopes |
|---|---|---|
| `linkedin_get_profile` | Get authenticated member's profile (name, email, photo) | `openid profile email` |
| `linkedin_create_post` | Create text, image, or article post | `w_member_social` |
| `linkedin_get_post` | Retrieve a post by URN | `r_member_social` ¹ |
| `linkedin_list_posts` | List posts by member or org | `r_member_social` ¹ |
| `linkedin_update_post` | Update post text or visibility | `w_member_social` |
| `linkedin_delete_post` | Delete a post | `w_member_social` |
| `linkedin_upload_image` | Upload an image asset for attaching to posts | `w_member_social` |
| `linkedin_get_organization` | Lookup a company page by ID or vanity name | `rw_organization_admin` |
| `linkedin_get_org_follower_count` | Get follower count for an org page | `rw_organization_admin` |

> ¹ `r_member_social` and `r_organization_social` are approval-gated scopes not available to all developers.

## Authentication

LinkedIn uses **OAuth 2.0**. Generate an access token via the 3-legged OAuth flow in the [LinkedIn Developer Portal](https://developer.linkedin.com/) and set it as an environment variable:

```bash
export LINKEDIN_ACCESS_TOKEN=AQX...your_token_here...
```

Access tokens expire after **60 days**. Refresh tokens are only available to approved partner apps.

### Minimum Scopes

For the most common use case (post on behalf of a member):

```
openid profile email w_member_social
```

For organization page management, additionally request:

```
rw_organization_admin w_organization_social r_organization_social
```

## Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Run (stdio transport — for use with Claude Desktop / Claude Code)
LINKEDIN_ACCESS_TOKEN=<token> npm start
```

## Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/absolute/path/to/linkedin-mcp-server/dist/index.js"],
      "env": {
        "LINKEDIN_ACCESS_TOKEN": "AQX...your_token..."
      }
    }
  }
}
```

## HTTP Transport

For remote or multi-client deployments:

```bash
TRANSPORT=http LINKEDIN_ACCESS_TOKEN=<token> PORT=3000 npm start
# MCP endpoint: http://localhost:3000/mcp
# Health check:  http://localhost:3000/health
```

## Usage Examples

### Post a text update

```
linkedin_create_post({
  author_urn: "urn:li:person:abc123",   // from linkedin_get_profile → sub
  text: "Excited to share our latest update!",
  visibility: "PUBLIC"
})
```

### Post with an image

```
# Step 1 — upload the image
linkedin_upload_image({
  author_urn: "urn:li:person:abc123",
  image_base64: "<base64 string>",
  mime_type: "image/jpeg"
})
# → returns asset_urn: "urn:li:digitalmediaAsset:..."

# Step 2 — create the post with the asset
linkedin_create_post({
  author_urn: "urn:li:person:abc123",
  text: "Check out this image!",
  image_asset_urn: "urn:li:digitalmediaAsset:..."
})
```

### Share an article link

```
linkedin_create_post({
  author_urn: "urn:li:person:abc123",
  text: "Great read on AI trends",
  article_url: "https://example.com/article",
  article_title: "AI in 2026",
  article_description: "An overview of the latest developments"
})
```

### Look up a company page

```
linkedin_get_organization({
  lookup_by: "vanity_name",
  vanity_name: "microsoft"
})
```

## Limitations

LinkedIn's standard (self-serve) API does not expose:
- **Connections / network graph** — requires SNAP partner program
- **Messaging / InMail** — restricted to Sales Navigator and Recruiter partners
- **Job search** — requires Talent Solutions partner program
- **Deep profile reads for other members** — only your own profile via OIDC

## Development

```bash
# Type-check and watch
npm run dev

# Clean build artifacts
npm run clean && npm run build
```
