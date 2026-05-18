import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ResponseFormat, LinkedInOrganization } from "../types.js";
import { restGet, handleApiError } from "../services/linkedin-client.js";

// ─── Schemas ────────────────────────────────────────────────────────────────

const GetOrganizationInputSchema = z
  .object({
    lookup_by: z
      .enum(["id", "vanity_name"])
      .default("id")
      .describe("How to look up the organization: by numeric 'id' or by 'vanity_name' (URL slug)"),
    organization_id: z
      .string()
      .optional()
      .describe(
        "Numeric organization ID (required when lookup_by='id'). " +
          "Example: '1234567' from linkedin.com/company/1234567"
      ),
    vanity_name: z
      .string()
      .optional()
      .describe(
        "Organization vanity name — the slug in the LinkedIn URL. " +
          "E.g., 'microsoft' for linkedin.com/company/microsoft (required when lookup_by='vanity_name')"
      ),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable"),
  })
  .strict();

const GetOrgFollowerCountInputSchema = z
  .object({
    organization_id: z
      .string()
      .describe("Numeric organization ID (e.g., '1234567')"),
  })
  .strict();

type GetOrganizationInput = z.infer<typeof GetOrganizationInputSchema>;
type GetOrgFollowerCountInput = z.infer<typeof GetOrgFollowerCountInputSchema>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatOrganization(org: LinkedInOrganization): string {
  const lines = [
    `# ${org.localizedName}`,
    "",
    `**ID:** ${org.id}`,
  ];
  if (org.vanityName) lines.push(`**Vanity Name:** ${org.vanityName}`);
  if (org.localizedWebsite) lines.push(`**Website:** ${org.localizedWebsite}`);
  if (org.primaryOrganizationType) lines.push(`**Type:** ${org.primaryOrganizationType}`);
  if (org.locations && (org.locations as unknown[]).length > 0) {
    lines.push(`**Locations:** ${(org.locations as unknown[]).length} location(s)`);
  }
  return lines.join("\n");
}

// ─── Tool Registration ───────────────────────────────────────────────────────

export function registerOrganizationTools(server: McpServer): void {
  server.registerTool(
    "linkedin_get_organization",
    {
      title: "Get LinkedIn Organization",
      description: `Retrieve a LinkedIn organization (company) page by its numeric ID or vanity name.

Without admin access, returns public fields: id, localizedName, vanityName,
localizedWebsite, primaryOrganizationType, locations, and logoV2.
With admin access (rw_organization_admin scope), returns additional fields like
description, industries, staffCountRange, foundedOn, and specialties.

Requires scope: rw_organization_admin

Args:
  - lookup_by ('id' | 'vanity_name'): How to identify the org (default: 'id')
  - organization_id (string): Numeric org ID — required when lookup_by='id'
  - vanity_name (string): URL slug — required when lookup_by='vanity_name'
      E.g., 'microsoft' for linkedin.com/company/microsoft
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "id": string,
    "localizedName": string,
    "vanityName": string,
    "localizedWebsite": string,
    "primaryOrganizationType": string,
    "locations": [...],
    // Additional fields if you have admin access
  }

Examples:
  - By ID: { lookup_by: "id", organization_id: "1441" }   ← LinkedIn's own page
  - By vanity: { lookup_by: "vanity_name", vanity_name: "microsoft" }

Error Handling:
  - 403 if rw_organization_admin scope is missing
  - 404 if the organization ID or vanity name does not exist`,
      inputSchema: GetOrganizationInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetOrganizationInput) => {
      try {
        let org: LinkedInOrganization;

        if (params.lookup_by === "vanity_name") {
          if (!params.vanity_name) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: vanity_name is required when lookup_by='vanity_name'.",
                },
              ],
            };
          }
          const data = await restGet<{ elements: LinkedInOrganization[] }>(
            "/organizations",
            { q: "vanityName", vanityName: params.vanity_name }
          );
          if (!data.elements?.length) {
            return {
              content: [{ type: "text", text: `No organization found with vanity name '${params.vanity_name}'.` }],
            };
          }
          org = data.elements[0];
        } else {
          if (!params.organization_id) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: organization_id is required when lookup_by='id'.",
                },
              ],
            };
          }
          org = await restGet<LinkedInOrganization>(
            `/organizations/${params.organization_id}`
          );
        }

        const structured = org as unknown as Record<string, unknown>;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(org, null, 2) }],
            structuredContent: structured,
          };
        }

        return {
          content: [{ type: "text", text: formatOrganization(org) }],
          structuredContent: structured,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  server.registerTool(
    "linkedin_get_org_follower_count",
    {
      title: "Get LinkedIn Organization Follower Count",
      description: `Get the total number of LinkedIn members following an organization page.

Requires scope: rw_organization_admin

Args:
  - organization_id (string): Numeric organization ID (e.g., '1234567')

Returns:
  {
    "organization_id": string,
    "follower_count": number
  }

Examples:
  - Use when: "How many followers does our company page have?"
  - Use when: "Compare follower counts across organizations"

Error Handling:
  - 403 if rw_organization_admin scope is missing or you are not an admin of the org
  - 404 if the organization ID does not exist`,
      inputSchema: GetOrgFollowerCountInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetOrgFollowerCountInput) => {
      try {
        const data = await restGet<{ firstDegreeSize: number }>(
          `/networkSizes/urn:li:organization:${params.organization_id}`,
          { edgeType: "COMPANY_FOLLOWED_BY_MEMBER" }
        );

        const count = data.firstDegreeSize ?? 0;
        const result = {
          organization_id: params.organization_id,
          follower_count: count,
        };

        return {
          content: [
            {
              type: "text",
              text: `**Organization ID:** ${params.organization_id}\n**Follower Count:** ${count.toLocaleString()}`,
            },
          ],
          structuredContent: result,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
