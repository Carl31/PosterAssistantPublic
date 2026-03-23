import { Suspense } from "react";
import VerifyEmailSuccess from "./VerifyEmailSuccess";

export default function Page() {
  return (
    <Suspense fallback={<div>Verifying email...</div>}>
      <VerifyEmailSuccess />
    </Suspense>
  );
}

