import { AtpAgent, type AtpSessionData } from "@atproto/api";
import logger from "./logger";

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
  return Bun.write(SESSION_PATH, JSON.stringify(session));
}

const sessionFile = Bun.file(SESSION_PATH);
if (!(await sessionFile.exists())) {
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
  const session = await sessionFile.json();
  await agent.resumeSession(session);
  logger.log(`Session resumed @${agent.session?.handle}`);
}

export default agent;
