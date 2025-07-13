"use client";

import { useEffect, useState } from "react";

type NotificationType = "info" | "error" | "warning" | "success";

interface Notification {
    id: number;
    type: NotificationType;
    text: string;
    leaving: boolean;
}

export default function Notification() {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const handler = (event: CustomEvent) => {
            const { type, text } = event.detail;
            const id = Date.now();

            setNotifications((prev) => [...prev, { id, type, text, leaving: false }]);

            // Mark it as leaving after 2.7s so the animation runs
            setTimeout(() => {
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === id ? { ...n, leaving: true } : n
                    )
                );
            }, 3000);

            // Remove it after the slide-out duration
            setTimeout(() => {
                setNotifications((prev) => prev.filter((n) => n.id !== id));
            }, 4000);
        };

        window.addEventListener("app-notify", handler as EventListener);

        return () => window.removeEventListener("app-notify", handler as EventListener);
    }, []);

    const alerts = {
        info: {
            icon: `<svg class="w-6 h-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>`,
            color: "blue-500",
        },
        error: {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>`,
            color: "red-500",
        },
        warning: {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
</svg>`,
            color: "yellow-500",
        },
        success: {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>`,
            color: "green-500",
        },
    };

    return (
        <div className="fixed top-5 right-5 left-5 sm:left-auto sm:right-5 z-50 flex flex-col space-y-2 max-w-sm w-[calc(100%-2.5rem)]">

            {/* have to include this so that tailwind doesnt purge unused classes */}
            <div className="hidden bg-blue-500"></div>
            <div className="hidden bg-green-500"></div>
            <div className="hidden bg-yellow-500"></div>
            <div className="hidden bg-red-500"></div>

            {notifications.map((n) => (
                <div
                    key={n.id}
                    className={`flex items-center text-white px-4 py-3 rounded-md shadow bg-${alerts[n.type].color} ${n.leaving ? "animate-slide-out" : "animate-slide-in"
                        }`}
                    dangerouslySetInnerHTML={{
                        __html: `${alerts[n.type].icon}<p>${n.text}</p>`,
                    }}
                />
            ))}
        </div>
    );
}
