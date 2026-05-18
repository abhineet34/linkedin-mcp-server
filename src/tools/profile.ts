import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ResponseFormat, LinkedInProfile } from "../types.js";
import { v2Get, handleApiError } from "../services/linkedin-client.js";

const GetProfileInputSchema = z
  .object({
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable"),
  })
  .strict();

type GetProfileInput = z.infer<typeof GetProfileInputSchema>;

export function registerProfileTools(server: McpServer): void {
  server.registerTool(
    "linkedin_get_profile",
    {
      title: "Get LinkedIn Profile",
      description: `Retrieve the authenticated LinkedIn member's profile information via the OIDC userinfo endpoint.

Returns the member's name, profile picture, email address, and locale.

Requires scopes: openid, profile, email

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "sub": string,           // LinkedIn member URN (e.g., "urn:li:person:abc123")
    "name": string,          // Full display name
    "given_name": string,    // First name
    "family_name": string,   // Last name
    "picture": string,       // Profile picture URL (optional)
    "email": string,         // Primary email address (optional)
    "email_verified": bool,  // Whether email is verified (optional)
    "locale": {
      "country": string,     // Country code
      "language": string     // Language code
    }
  }

Examples:
  - Use when: "Who am I logged in as?" → call with default params
  - Use when: "Get my LinkedIn email" → call with response_format='json', read email field
  - Don't use when: You need to look up someone else's profile (LinkedIn doesn't expose that via standard API)

Error Handling:
  - Returns auth error if LINKEDIN_ACCESS_TOKEN is missing or expired
  - Returns permission error if 'profile' scope is not granted`,
      inputSchema: GetProfileInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetProfileInput) => {
      try {
        const profile = await v2Get<LinkedInProfile>("/userinfo");

        const structured = profile as unknown as Record<string, unknown>;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
            structuredContent: structured,
          };
        }

        const lines = [
          `# LinkedIn Profile`,
          "",
          `**Name:** ${profile.name}`,
          `**Sub (URN):** ${profile.sub}`,
        ];
        if (profile.email) lines.push(`**Email:** ${profile.email}`);
        if (profile.locale) {
          lines.push(`**Locale:** ${profile.locale.language}-${profile.locale.country}`);
        }
        if (profile.picture) lines.push(`**Picture:** ${profile.picture}`);

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: structured,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
