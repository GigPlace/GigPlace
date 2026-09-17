self.addEventListener("push", function (event) {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "New Submission", body: event.data.text() };
  }

  const title = data.title || "New Task Submission";
  const options = {
    body: data.body || "A worker just submitted a task.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "task-submission",
    data: data.url ? { url: data.url } : { url: "/admin/submissions" },
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/admin/submissions";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/admin") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});