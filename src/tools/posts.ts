import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ResponseFormat, LinkedInPost } from "../types.js";
import {
  restGet,
  restPost,
  restDelete,
  restPatch,
  handleApiError,
} from "../services/linkedin-client.js";
import { CHARACTER_LIMIT } from "../constants.js";

// ─── Schemas ────────────────────────────────────────────────────────────────

const CreatePostInputSchema = z
  .object({
    author_urn: z
      .string()
      .describe(
        "URN of the author. Use 'urn:li:person:{id}' for member posts. " +
          "Get your person ID from linkedin_get_profile (the 'sub' field)."
      ),
    text: z
      .string()
      .min(1)
      .max(3000)
      .describe("Post text content (max 3000 characters)"),
    visibility: z
      .enum(["PUBLIC", "CONNECTIONS", "LOGGED_IN"])
      .default("PUBLIC")
      .describe(
        "Post visibility: PUBLIC (anyone), CONNECTIONS (1st-degree connections), LOGGED_IN (LinkedIn members)"
      ),
    image_asset_urn: z
      .string()
      .optional()
      .describe(
        "Asset URN of an uploaded image to attach (from linkedin_upload_image). " +
          "Optional. Omit for text-only posts."
      ),
    article_url: z
      .string()
      .url()
      .optional()
      .describe("URL of an article to share as a link post. Optional."),
    article_title: z
      .string()
      .max(400)
      .optional()
      .describe("Title for the article link preview. Used only when article_url is provided."),
    article_description: z
      .string()
      .max(400)
      .optional()
      .describe(
        "Description for the article link preview. Used only when article_url is provided."
      ),
  })
  .strict();

const GetPostInputSchema = z
  .object({
    post_urn: z
      .string()
      .describe("URN of the post to retrieve (e.g., 'urn:li:share:7123456789')"),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable"),
  })
  .strict();

const ListPostsInputSchema = z
  .object({
    author_urn: z
      .string()
      .describe(
        "URN of the author whose posts to list. " +
          "Use 'urn:li:person:{id}' for members or 'urn:li:organization:{id}' for companies."
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20)
      .describe("Maximum number of posts to return (1–50, default: 20)"),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("Number of posts to skip for pagination (default: 0)"),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable"),
  })
  .strict();

const DeletePostInputSchema = z
  .object({
    post_urn: z
      .string()
      .describe("URN of the post to delete (e.g., 'urn:li:share:7123456789')"),
  })
  .strict();

const UpdatePostInputSchema = z
  .object({
    post_urn: z
      .string()
      .describe("URN of the post to update (e.g., 'urn:li:share:7123456789')"),
    text: z
      .string()
      .min(1)
      .max(3000)
      .describe("New text content for the post (max 3000 characters)"),
    visibility: z
      .enum(["PUBLIC", "CONNECTIONS", "LOGGED_IN"])
      .optional()
      .describe("Updated visibility. Omit to keep the existing value."),
  })
  .strict();

type CreatePostInput = z.infer<typeof CreatePostInputSchema>;
type GetPostInput = z.infer<typeof GetPostInputSchema>;
type ListPostsInput = z.infer<typeof ListPostsInputSchema>;
type DeletePostInput = z.infer<typeof DeletePostInputSchema>;
type UpdatePostInput = z.infer<typeof UpdatePostInputSchema>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function encodeUrn(urn: string): string {
  return encodeURIComponent(urn);
}

function formatPost(post: LinkedInPost): string {
  const lines: string[] = [];
  lines.push(`## Post ${post.id}`);
  lines.push(`- **Author:** ${post.author}`);
  lines.push(`- **Visibility:** ${post.visibility}`);
  lines.push(`- **State:** ${post.lifecycleState}`);
  if (post.createdAt) {
    lines.push(`- **Created:** ${new Date(post.createdAt).toISOString()}`);
  }
  if (post.commentary) {
    lines.push("", "**Text:**", post.commentary);
  }
  return lines.join("\n");
}

// ─── Tool Registration ───────────────────────────────────────────────────────

export function registerPostTools(server: McpServer): void {
  // Create post
  server.registerTool(
    "linkedin_create_post",
    {
      title: "Create LinkedIn Post",
      description: `Create a new post on LinkedIn on behalf of a member or organization.

Supports text-only posts, image posts (after uploading via linkedin_upload_image),
and article/link posts. Post length is capped at 3000 characters.

Requires scope: w_member_social (for member posts) or w_organization_social (for org posts)

Args:
  - author_urn (string): URN of the post author. Format: 'urn:li:person:{id}' for members.
      Get your ID from linkedin_get_profile's 'sub' field.
  - text (string): Post text (1–3000 characters, required)
  - visibility ('PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN'): Who can see the post (default: 'PUBLIC')
  - image_asset_urn (string, optional): Asset URN from linkedin_upload_image
  - article_url (string, optional): URL to share as a link post
  - article_title (string, optional): Link preview title (used with article_url)
  - article_description (string, optional): Link preview description (used with article_url)

Returns:
  The URN of the newly created post (e.g., 'urn:li:share:7123456789')

Examples:
  - Text post: { author_urn: "urn:li:person:abc", text: "Hello LinkedIn!" }
  - Image post: { author_urn: "urn:li:person:abc", text: "Check this out", image_asset_urn: "urn:li:digitalmediaAsset:..." }
  - Article share: { author_urn: "urn:li:person:abc", text: "Great read", article_url: "https://..." }

Error Handling:
  - 403 if w_member_social scope is missing
  - 400 if text exceeds 3000 chars or author URN is invalid`,
      inputSchema: CreatePostInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreatePostInput) => {
      try {
        const body: Record<string, unknown> = {
          author: params.author_urn,
          commentary: params.text,
          visibility: params.visibility,
          lifecycleState: "PUBLISHED",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
        };

        if (params.image_asset_urn) {
          body.content = {
            media: {
              id: params.image_asset_urn,
            },
          };
        } else if (params.article_url) {
          body.content = {
            article: {
              source: params.article_url,
              ...(params.article_title ? { title: params.article_title } : {}),
              ...(params.article_description
                ? { description: params.article_description }
                : {}),
            },
          };
        }

        const response = await restPost<{ id: string }>("/posts", body);
        const postUrn = response.id ?? "unknown";

        return {
          content: [
            {
              type: "text",
              text: `Post created successfully.\n\n**Post URN:** ${postUrn}`,
            },
          ],
          structuredContent: { post_urn: postUrn },
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // Get post
  server.registerTool(
    "linkedin_get_post",
    {
      title: "Get LinkedIn Post",
      description: `Retrieve a LinkedIn post by its URN.

NOTE: Reading posts requires the r_member_social scope for member posts or
r_organization_social for org posts. These scopes require LinkedIn approval and
are not available to all developers. If you only have w_member_social, use
linkedin_create_post and linkedin_list_posts instead.

Requires scope: r_member_social or r_organization_social

Args:
  - post_urn (string): Post URN (e.g., 'urn:li:share:7123456789')
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "id": string,              // Post URN
    "author": string,          // Author URN
    "commentary": string,      // Post text
    "visibility": string,      // PUBLIC | CONNECTIONS | LOGGED_IN
    "lifecycleState": string,  // PUBLISHED | DRAFT | DELETED
    "createdAt": number,       // Unix timestamp (ms)
    "lastModifiedAt": number,
    "content": object          // Media/article content (if any)
  }

Error Handling:
  - 403 if r_member_social scope is not approved for your app`,
      inputSchema: GetPostInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetPostInput) => {
      try {
        const post = await restGet<LinkedInPost>(
          `/posts/${encodeUrn(params.post_urn)}`
        );
        const structured = post as unknown as Record<string, unknown>;

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(post, null, 2) }],
            structuredContent: structured,
          };
        }

        return {
          content: [{ type: "text", text: formatPost(post) }],
          structuredContent: structured,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // List posts
  server.registerTool(
    "linkedin_list_posts",
    {
      title: "List LinkedIn Posts",
      description: `List posts by a LinkedIn member or organization.

NOTE: Listing posts requires the r_member_social scope (member) or
r_organization_social scope (org). These are approval-gated scopes.
For org posts, you also need to be an admin of the organization.

Requires scope: r_member_social or r_organization_social

Args:
  - author_urn (string): Author URN — 'urn:li:person:{id}' or 'urn:li:organization:{id}'
  - limit (number): Max posts to return, 1–50 (default: 20)
  - offset (number): Posts to skip for pagination (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  {
    "total": number,
    "count": number,
    "offset": number,
    "items": [Post],
    "has_more": boolean,
    "next_offset": number
  }

Error Handling:
  - 403 if r_member_social / r_organization_social scope is missing or not approved`,
      inputSchema: ListPostsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListPostsInput) => {
      try {
        const data = await restGet<{ elements: LinkedInPost[]; paging: { total: number } }>(
          "/posts",
          {
            q: "author",
            author: params.author_urn,
            count: params.limit,
            start: params.offset,
          }
        );

        const posts = data.elements ?? [];
        const total = data.paging?.total ?? posts.length;

        if (!posts.length) {
          return {
            content: [{ type: "text", text: "No posts found for this author." }],
            structuredContent: { total: 0, count: 0, offset: params.offset, items: [], has_more: false },
          };
        }

        const hasMore = total > params.offset + posts.length;
        const output = {
          total,
          count: posts.length,
          offset: params.offset,
          items: posts,
          has_more: hasMore,
          ...(hasMore ? { next_offset: params.offset + posts.length } : {}),
        };

        let text: string;
        if (params.response_format === ResponseFormat.JSON) {
          text = JSON.stringify(output, null, 2);
        } else {
          const lines = [
            `# Posts by ${params.author_urn}`,
            "",
            `Found ${total} posts (showing ${posts.length})`,
            "",
            ...posts.map(formatPost),
          ];
          text = lines.join("\n");
          if (text.length > CHARACTER_LIMIT) {
            text = text.slice(0, CHARACTER_LIMIT) + "\n\n[Response truncated — use offset parameter to page through results]";
          }
        }

        return {
          content: [{ type: "text", text }],
          structuredContent: output,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // Delete post
  server.registerTool(
    "linkedin_delete_post",
    {
      title: "Delete LinkedIn Post",
      description: `Permanently delete a LinkedIn post by its URN.

Only the author of the post can delete it. This action cannot be undone.

Requires scope: w_member_social (member posts) or w_organization_social (org posts)

Args:
  - post_urn (string): URN of the post to delete (e.g., 'urn:li:share:7123456789')

Returns:
  Confirmation message on success.

Error Handling:
  - 403 if you are not the author of the post
  - 404 if the post does not exist or is already deleted`,
      inputSchema: DeletePostInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: DeletePostInput) => {
      try {
        await restDelete(`/posts/${encodeUrn(params.post_urn)}`);
        return {
          content: [
            {
              type: "text",
              text: `Post deleted successfully.\n\n**Deleted URN:** ${params.post_urn}`,
            },
          ],
          structuredContent: { deleted_urn: params.post_urn },
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // Update post
  server.registerTool(
    "linkedin_update_post",
    {
      title: "Update LinkedIn Post",
      description: `Update the text or visibility of an existing LinkedIn post.

Only the author of the post can update it. Note that LinkedIn only allows
updating the commentary (text) and visibility after posting — content
attachments (images, articles) cannot be changed post-publish.

Requires scope: w_member_social (member posts) or w_organization_social (org posts)

Args:
  - post_urn (string): URN of the post to update (e.g., 'urn:li:share:7123456789')
  - text (string): New text content (1–3000 characters)
  - visibility ('PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN', optional): New visibility setting

Returns:
  Confirmation message on success.

Error Handling:
  - 403 if you are not the author of the post
  - 404 if the post does not exist`,
      inputSchema: UpdatePostInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: UpdatePostInput) => {
      try {
        const patch: Record<string, unknown> = {
          patch: {
            $set: {
              commentary: params.text,
              ...(params.visibility ? { visibility: params.visibility } : {}),
            },
          },
        };

        await restPatch(`/posts/${encodeUrn(params.post_urn)}`, patch);
        return {
          content: [
            {
              type: "text",
              text: `Post updated successfully.\n\n**Post URN:** ${params.post_urn}`,
            },
          ],
          structuredContent: { post_urn: params.post_urn },
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
