import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { v2Post, uploadBinaryToUrl, handleApiError } from "../services/linkedin-client.js";
import { AssetUploadResponse } from "../types.js";

const UploadImageInputSchema = z
  .object({
    author_urn: z
      .string()
      .describe(
        "URN of the owner of this asset. Use 'urn:li:person:{id}' for members. " +
          "Get your ID from linkedin_get_profile's 'sub' field."
      ),
    image_base64: z
      .string()
      .describe("Base64-encoded image data (JPEG or PNG)"),
    mime_type: z
      .enum(["image/jpeg", "image/png", "image/gif"])
      .default("image/jpeg")
      .describe("MIME type of the image (default: image/jpeg)"),
  })
  .strict();

type UploadImageInput = z.infer<typeof UploadImageInputSchema>;

export function registerMediaTools(server: McpServer): void {
  server.registerTool(
    "linkedin_upload_image",
    {
      title: "Upload LinkedIn Image",
      description: `Upload an image to LinkedIn and get an asset URN to use when creating an image post.

This is a two-step process handled automatically:
  1. Register the upload with LinkedIn to get a pre-signed upload URL
  2. PUT the image binary to that URL

After upload, use the returned asset URN as image_asset_urn in linkedin_create_post.

Requires scope: w_member_social

Args:
  - author_urn (string): Owner URN — 'urn:li:person:{id}' from linkedin_get_profile
  - image_base64 (string): Base64-encoded image file contents
  - mime_type ('image/jpeg' | 'image/png' | 'image/gif'): Image MIME type (default: image/jpeg)

Returns:
  {
    "asset_urn": string,  // e.g., "urn:li:digitalmediaAsset:C5600AQH..."
    "upload_url": string  // The URL that was used for upload (informational)
  }

Examples:
  - Use when: "Post an image to LinkedIn" → upload first, then create_post with asset URN
  - Don't use when: You only want a text post (image upload not needed)

Error Handling:
  - 403 if w_member_social scope is not granted
  - 400 if the author_urn format is invalid`,
      inputSchema: UploadImageInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: UploadImageInput) => {
      try {
        // Step 1: Register the upload
        const registerBody = {
          registerUploadRequest: {
            owner: params.author_urn,
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            serviceRelationships: [
              {
                identifier: "urn:li:userGeneratedContent",
                relationshipType: "OWNER",
              },
            ],
          },
        };

        const registerResponse = await v2Post<{
          value: {
            asset: string;
            uploadMechanism: {
              "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
                uploadUrl: string;
              };
            };
          };
        }>("/assets?action=registerUpload", registerBody);

        const assetUrn = registerResponse.value.asset;
        const uploadUrl =
          registerResponse.value.uploadMechanism[
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
          ].uploadUrl;

        // Step 2: Upload the binary
        const imageBuffer = Buffer.from(params.image_base64, "base64");
        await uploadBinaryToUrl(uploadUrl, imageBuffer, params.mime_type);

        const result = { asset_urn: assetUrn, upload_url: uploadUrl };

        return {
          content: [
            {
              type: "text",
              text: [
                "Image uploaded successfully.",
                "",
                `**Asset URN:** ${assetUrn}`,
                "",
                "Use this asset URN as the `image_asset_urn` parameter in `linkedin_create_post`.",
              ].join("\n"),
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
