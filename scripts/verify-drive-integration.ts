import assert from "node:assert/strict";
import {
  createFolder,
  DriveApiError,
  fetchDriveFileContent,
  fetchDriveFileMeta,
  findImagesFolder,
  updateDriveFileContent,
  uploadBinaryFile,
} from "../src/lib/driveApi";
import { extractOpenFileId, parseDriveState } from "../src/lib/driveState";

const fileId = "file id/with-specials";
const launchState = {
  action: "open",
  ids: [fileId],
  userId: "drive-user",
};
const search = `?state=${encodeURIComponent(JSON.stringify(launchState))}`;

assert.deepEqual(parseDriveState(search), {
  ...launchState,
  folderId: undefined,
});
assert.equal(extractOpenFileId(search), fileId);
assert.equal(
  extractOpenFileId(
    `?state=${encodeURIComponent(JSON.stringify({ action: "create", ids: [fileId] }))}`,
  ),
  null,
);
assert.equal(extractOpenFileId("?state=not-json"), null);
assert.equal(extractOpenFileId(""), null);
assert.equal(
  extractOpenFileId(
    `?state=${encodeURIComponent(JSON.stringify({ action: "open", ids: [""] }))}`,
  ),
  null,
);
assert.equal(
  extractOpenFileId(
    `?state=${encodeURIComponent(JSON.stringify({ action: "open", ids: [42] }))}`,
  ),
  null,
);

interface FetchCall {
  url: string;
  init?: RequestInit;
}

const calls: FetchCall[] = [];
const token = "test-access-token";
const metadata = {
  id: fileId,
  name: "Drive document.md",
  mimeType: "text/markdown",
  modifiedTime: "2026-07-23T12:00:00.000Z",
  parents: ["parent-folder"],
};

globalThis.fetch = async (
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  const url = String(input);
  calls.push({ url, init });

  if (url.includes("alt=media")) {
    return new Response("# Loaded from Drive\n");
  }
  if (init?.method === "PATCH") {
    return Response.json({
      ...metadata,
      modifiedTime: "2026-07-23T12:05:00.000Z",
    });
  }
  if (init?.method === "POST" && url.includes("uploadType=multipart")) {
    return Response.json({ id: "image-file", name: "image.png" });
  }
  if (init?.method === "POST") {
    return Response.json({ id: "images-folder", name: "images" });
  }
  if (url.includes("?q=")) {
    return Response.json({
      files: [{ id: "images-folder", name: "images" }],
    });
  }
  return Response.json(metadata);
};

const [meta, content] = await Promise.all([
  fetchDriveFileMeta(fileId, token),
  fetchDriveFileContent(fileId, token),
]);

assert.deepEqual(meta, metadata);
assert.equal(content, "# Loaded from Drive\n");
assert.equal(calls.length, 2);
for (const call of calls) {
  assert.equal(
    (call.init?.headers as Record<string, string>).Authorization,
    `Bearer ${token}`,
  );
  assert.match(call.url, /file%20id%2Fwith-specials/);
}
assert(calls.some((call) => call.url.includes("fields=id,name,mimeType")));
assert(calls.some((call) => call.url.endsWith("?alt=media")));

calls.length = 0;
const saved = await updateDriveFileContent(fileId, token, "# Saved to Drive\n");
assert.equal(saved.modifiedTime, "2026-07-23T12:05:00.000Z");
assert.equal(calls.length, 1);
assert.equal(calls[0].init?.method, "PATCH");
assert.equal(calls[0].init?.body, "# Saved to Drive\n");
assert.equal(
  (calls[0].init?.headers as Record<string, string>)["Content-Type"],
  "text/markdown; charset=UTF-8",
);
assert.match(calls[0].url, /uploadType=media/);

calls.length = 0;
const folder = await findImagesFolder("parent-folder", token);
assert.equal(folder?.id, "images-folder");
const folderQuery = new URL(calls[0].url).searchParams.get("q");
assert.match(folderQuery ?? "", /'parent-folder' in parents/);
assert.match(folderQuery ?? "", /name = 'images'/);
assert.match(folderQuery ?? "", /application\/vnd\.google-apps\.folder/);

calls.length = 0;
await createFolder("parent-folder", "images", token);
assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
  name: "images",
  mimeType: "application/vnd.google-apps.folder",
  parents: ["parent-folder"],
});

calls.length = 0;
await uploadBinaryFile(
  "images-folder",
  "image.png",
  new Blob(["image-bytes"], { type: "image/png" }),
  token,
);
assert.equal(calls[0].init?.method, "POST");
assert.match(
  (calls[0].init?.headers as Record<string, string>)["Content-Type"],
  /^multipart\/related; boundary=/,
);
const multipartBody = await (calls[0].init?.body as Blob).text();
assert.match(multipartBody, /"name":"image\.png"/);
assert.match(multipartBody, /"parents":\["images-folder"\]/);
assert.match(multipartBody, /image-bytes/);

globalThis.fetch = async () =>
  Response.json(
    { error: { message: "Access token expired" } },
    { status: 401, statusText: "Unauthorized" },
  );
await assert.rejects(
  () => fetchDriveFileMeta(fileId, token),
  (error: unknown) =>
    error instanceof DriveApiError &&
    error.status === 401 &&
    error.message === "Access token expired",
);

console.log(
  "Drive integration verified: state validation, parallel metadata/content GETs, authenticated PATCH save, status-aware API errors, images folder lookup/creation, and multipart image upload.",
);
