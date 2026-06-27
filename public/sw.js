// Service worker for ÉLEVÉ Visuals admin push notifications.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "ÉLEVÉ Visuals", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "ÉLEVÉ Visuals";
  const options = {
    body: payload.body || "New form submission received.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.url || "/admin/notifications" },
    tag: payload.tag || undefined,
    silent: payload.silent === true,
    vibrate: payload.silent === true ? undefined : [120, 60, 120],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
