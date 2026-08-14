import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FORGE — AI Engineering Coach",
    short_name: "FORGE",
    description: "真实工程任务、有限 AI 提示、自动验收与能力复盘。",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f0e7",
    theme_color: "#ccff2e",
    orientation: "portrait-primary",
    lang: "zh-CN",
    categories: ["education", "productivity", "developer"],
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
