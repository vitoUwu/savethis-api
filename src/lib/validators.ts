import {
  type Record as PostRecord,
  isRecord as isPostRecord
} from "@atproto/api/dist/client/types/app/bsky/feed/post";
import type { RepoOp } from "../firehose";

export interface CreatePostOp {
  cid: unknown;
  path: string;
  action: "create";
  record: PostRecord;
}

export function isCreatePostCommit(op: RepoOp): op is CreatePostOp {
  return op.action === "create" && isPostRecord(op.record);
}
