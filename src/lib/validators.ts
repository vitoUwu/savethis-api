export enum OpType {
  Follow = "app.bsky.graph.follow",
  Like = "app.bsky.feed.like",
  Repost = "app.bsky.feed.repost",
  Post = "app.bsky.feed.post"
}

export interface Op {
  cid: string | null;
  path: string;
  action: string;
  payload?: any;
}

export interface FollowOp extends Op {
  payload: {
    $type: OpType.Follow;
    subject: string;
    createdAt: string;
  };
}

export interface LikeOp extends Op {
  payload: {
    $type: OpType.Like;
    subject: {
      cid: string;
      uri: string;
    };
    createdAt: string;
  };
}

export interface RepostOp extends Op {
  payload: {
    $type: OpType.Repost;
    subject: {
      cid: string;
      uri: string;
    };
    createdAt: string;
  };
}

export interface UnfollowOp extends Omit<Op, "payload" | "cid"> {
  action: "delete";
  cid: null;
}

export interface CreatePostOp extends Op {
  action: "create";
  payload: {
    text: string;
    $type: OpType.Post;
    langs: string[];
    reply?: {
      root: {
        cid: string;
        uri: string;
      };
      parent: {
        cid: string;
        uri: string;
      };
    };
    createdAt: string;
  };
}

export function isFollow(op: Op): op is FollowOp {
  return op.action === "create" && op.payload?.["$type"] === OpType.Follow;
}

export function isCreatePost(op: Op): op is CreatePostOp {
  return op.action === "create" && op.payload?.$type === OpType.Post;
}

export function isUnfollow(op: Op): op is UnfollowOp {
  return op.action === "delete" && op.action.includes(OpType.Follow);
}

export function isLike(op: Op): op is LikeOp {
  return op.payload?.["$type"] === OpType.Like;
}

export function isRepost(op: Op): op is RepostOp {
  return op.payload?.["$type"] === OpType.Repost;
}
