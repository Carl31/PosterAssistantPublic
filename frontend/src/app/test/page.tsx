"use client";
import Notification from "@/components/Notification";
import { notify } from "@/utils/notify";

export default function Page() {
  return (
    <>
      <Notification />
      <button
        onClick={() => notify("warning", "This is working!")}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Show Notification
      </button>
    </>
  );
}
