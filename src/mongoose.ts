import { connect as _connect, model, Schema } from "mongoose";
import logger from "./logger";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not set");
}

interface IPost {
  postKey: string;
  savedBy: string;
  uri: string;
  cid: string;
  text?: string;
  authorHandle?: string;
}

export const PostModel = model(
  "Post",
  new Schema<IPost>(
    {
      savedBy: {
        required: true,
        type: String,
        index: true
      },
      postKey: {
        required: true,
        type: String,
        unique: true
      },
      uri: {
        required: true,
        type: String
      },
      cid: {
        required: true,
        type: String
      },
      text: String,
      authorHandle: String
    },
    {
      timestamps: true
    }
  )
);

const connect = async () => {
  logger.info("Connecting to mongodb");
  await _connect(MONGODB_URI);
  logger.info("Connected to mongodb");
};

connect();
