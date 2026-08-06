import { createFileRoute } from "@tanstack/react-router";
import { PrankVerification } from "@/components/common/prank-verification";

export const Route = createFileRoute("/_public/verify")({
  component: VerifyPage,
  head: () => ({
    meta: [
      {
        title: "人机验证",
      },
    ],
  }),
});

function VerifyPage() {
  return <PrankVerification />;
}
