import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function Home() {
  const headersList = await headers()
  const host = headersList.get("host") || ""

  // Marketing domain serves the public website
  if (host === "markettingermd.com" || host === "www.markettingermd.com") {
    redirect("/site")
  }

  // Platform domain serves the app
  redirect("/dashboard")
}
