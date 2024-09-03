import { AtpAgent, type AtpSessionData } from "@atproto/api";
import logger from "./logger";
import fs from "node:fs";

const SESSION_PATH = "./src/session.json";
const IDENTIFIER = process.env.IDENTIFIER;
const PASSWORD = process.env.PASSWORD;

if (!IDENTIFIER || !PASSWORD) {
  throw new Error("IDENTIFIER and PASSWORD env variables are required");
}

const agent = new AtpAgent({
  service: "https://bsky.social",
  persistSession: (event, session) => {
    if (session) {
      logger.info("Persisting session", event);
      saveSessionLocally(session);
      return;
    }
  }
});

function saveSessionLocally(session: AtpSessionData) {
  return fs.writeFileSync(SESSION_PATH, JSON.stringify(session));
}

const sessionFile = fs.existsSync(SESSION_PATH)
  ? fs.readFileSync(SESSION_PATH, { encoding: "utf-8" })
  : null;
const sessionData: AtpSessionData | null = sessionFile
  ? JSON.parse(sessionFile)
  : null;
if (!sessionData || sessionData.handle !== IDENTIFIER) {
  const login = await agent.login({
    identifier: IDENTIFIER,
    password: PASSWORD
    // If you have 2FA enabled, you will receive the 2FA code in your inbox, copy the code and paste here
    // authFactorToken: "..."
  });

  const { didDoc: _, ...data } = login.data;

  const session: AtpSessionData = {
    ...data,
    active: login.data.active ?? true
  };

  await saveSessionLocally(session);
  logger.log(`Session created @${agent.session?.handle}`);
} else {
  await agent.resumeSession(sessionData);
  logger.log(`Session resumed @${agent.session?.handle}`);
}

export default agent;
