import { ComAtprotoSyncSubscribeRepos, RichText } from "@atproto/api";
import {
  isThreadViewPost,
  type ThreadViewPost
} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import type { Mention } from "@atproto/api/dist/client/types/app/bsky/richtext/facet";
import {
  EventStreamError,
  XrpcEventStreamClient,
  subscribeRepos,
  type SubscribeReposMessage
} from "atproto-firehose";
import agent from "./agent";
import { isCreatePost } from "./lib/validators";
import logger from "./logger";
import { PostModel } from "./mongoose";

// @ts-expect-error "error" can be undefined for some reason
XrpcEventStreamClient.prototype.handleError = function (
  error: Error,
  message: string
) {
  console.error(error);
  this.emit(
    "error",
    new EventStreamError(error?.toString() || "Unknown error", message)
  );
  // this.close(); i shouldnt keep the connection open, but who cares
};

const client = subscribeRepos(`wss://bsky.network`, { decodeRepoOps: true });

client.on("error", logger.error);
client.on("message", async (message: SubscribeReposMessage) => {
  if (ComAtprotoSyncSubscribeRepos.isCommit(message)) {
    const op = message.ops[0];
    if (!op) {
      return;
    }

    if (isCreatePost(op)) {
      const rt = new RichText({ text: op.payload.text });
      rt.detectFacetsWithoutResolution();

      const tags =
        rt.facets?.flatMap((f) =>
          f.features.filter(
            (f): f is Mention => f.$type === "app.bsky.richtext.facet#mention"
          )
        ) ?? [];

      const someoneMentionatedMe = tags.some(
        (f) => f.did === agent.session?.handle
      );

      if (someoneMentionatedMe) {
        try {
          const uri = `at://${message.repo}/${op.path}`;
          const postId = uri.split("/").pop();
          const post = await agent.getPostThread({ uri }).catch(() => null);
          const thread = post?.data.thread as ThreadViewPost;
          if (!thread || "notFound" in thread || "blocked" in thread) {
            return logger.warn(`post not found or blocked`);
          }

          if (thread.parent && isThreadViewPost(thread.parent)) {
            logger.info(`Someone mentionated me in a reply`);
            await PostModel.create({
              postKey: `${message.repo}/${postId}`, // is there other way to do this?
              savedBy: message.repo,
              uri: thread.parent.post.uri,
              cid: thread.parent.post.cid
            });
            // TODO: send a notification to the user
          }
        } catch (error) {
          logger.error("Something went wrong");
          logger.error(error);
        }
      }
    }
  }
});
