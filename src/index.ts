import { ComAtprotoSyncSubscribeRepos, RichText } from "@atproto/api";
import {
  type ThreadViewPost,
  isThreadViewPost
} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import type { Mention } from "@atproto/api/dist/client/types/app/bsky/richtext/facet";
import { Firehose } from "@skyware/firehose";
import agent from "./agent";
import { isCreatePost } from "./lib/validators";
import logger from "./logger";
import { PostModel } from "./mongoose";

const client = new Firehose({
  autoReconnect: true,
  relay: "wss://bsky.network"
});

client.on("open", () => logger.info("Connected to firehose"));
client.on("error", logger.error);
client.on("commit", async (commit) => {
  if (ComAtprotoSyncSubscribeRepos.isCommit(commit)) {
    const op = commit.ops[0];
    if (!op) {
      return;
    }

    if (isCreatePost(op)) {
      const rt = new RichText({ text: op.record.text });
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
          const uri = `at://${commit.repo}/${op.path}`;
          const postId = uri.split("/").pop();
          const post = await agent.getPostThread({ uri }).catch(() => null);
          const thread = post?.data.thread as ThreadViewPost;
          if (!thread || "notFound" in thread || "blocked" in thread) {
            return logger.warn("post not found or blocked");
          }

          if (thread.parent && isThreadViewPost(thread.parent)) {
            logger.info("Someone tagged me in a reply");
            const { uri, cid, text, author } = thread.parent.post;

            await PostModel.create({
              postKey: `${commit.repo}/${postId}`, // is there other way to do this?
              savedBy: commit.repo,
              uri,
              cid,
              text,
              authorHandle: author.handle
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
client.start();
