import { getCourseworkUser } from "./guest-auth";
import CampusApp from "./components/campus-app";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCourseworkUser();
  return <CampusApp user={{ displayName: user?.displayName || "访客", email: user?.email || "" }} />;
}
