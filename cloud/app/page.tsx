import { requireChatGPTUser } from "./chatgpt-auth";
import CampusApp from "./components/campus-app";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireChatGPTUser("/");
  return <CampusApp user={{ displayName: user.displayName, email: user.email }} />;
}
