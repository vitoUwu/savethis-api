import { RichText } from "@atproto/api";
import {
  type ThreadViewPost,
  isThreadViewPost
} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { isRecord as isPostRecord } from "@atproto/api/dist/client/types/app/bsky/feed/post";
import type { Mention } from "@atproto/api/dist/client/types/app/bsky/richtext/facet";
import type { Main } from "@atproto/api/dist/client/types/com/atproto/repo/strongRef";
import agent from "./agent";
import { Firehose } from "./firehose.ts";
import { isCreatePostCommit } from "./lib/validators";
import logger from "./logger";
import { PostModel } from "./mongoose";

const client = new Firehose({
  autoReconnect: true,
  relay: "wss://bsky.network"
});

client.on("open", () => logger.info("Connected to firehose"));
client.on("error", logger.error);
client.on("commit", async (commit) => {
  const op = commit.ops[0];
  if (!op) {
    return;
  }

  if (isCreatePostCommit(op)) {
    const rt = new RichText({ text: op.record.text });
    rt.detectFacetsWithoutResolution();

    const tags =
      rt.facets?.flatMap((f) =>
        f.features.filter(
          (f): f is Mention => f.$type === "app.bsky.richtext.facet#mention"
        )
      ) ?? [];

    const didAgentReceiveMention = tags.some(
      (f) => f.did === agent.session?.handle
    );

    if (didAgentReceiveMention) {
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

          const parent: Main = {
            cid: thread.post.cid,
            uri: thread.post.uri
          };
          const root: Main | undefined =
            isPostRecord(thread.post.record) && thread.post.record.reply
              ? thread.post.record.reply.root
              : undefined;

          if (root) {
            await agent.post({
              createdAt: new Date().toISOString(),
              text: "Post saved successfully! Access it here: https://savethis.vercel.app/",
              langs: ["en"],
              reply: {
                parent,
                root
              }
            });
          } else {
            logger.warn("Root not found", thread);
          }
        }
      } catch (error) {
        logger.error("Something went wrong");
        logger.error(error);
      }
    }
  }
});
client.start();
