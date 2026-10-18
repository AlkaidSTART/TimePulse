// 版本号变更时清理旧缓存（部署前更新）
const CACHE_VERSION = "v1.5"; // Vite 切换版本：清理旧 Next 静态资源
const CACHE_NAME = `timepulse-${CACHE_VERSION}`;
const RUNTIME_CACHE = `timepulse-runtime-${CACHE_VERSION}`;

// 修改缓存资源列表，只包含确定存在的文件
const urlsToCache = ["/", "/offline.html", "/favicon.ico", "/site.webmanifest"];

// 安装Service Worker
self.addEventListener("install", (event) => {
  console.log(`[SW] 安装新版本: ${CACHE_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] 缓存已打开");

      // 使用Promise.allSettled代替cache.addAll，这样即使某些资源请求失败，也不会导致整个缓存过程失败
      return Promise.allSettled(
        urlsToCache.map((url) =>
          fetch(url, { cache: "no-cache" }) // 强制从网络获取最新版本
            .then((response) => {
              if (!response || !response.ok) {
                console.log(`[SW] 无法缓存资源: ${url}`);
                return;
              }
              return cache.put(url, response);
            })
            .catch((err) =>
              console.log(`[SW] 缓存资源失败: ${url}, 错误: ${err}`),
            ),
        ),
      );
    }),
  );

  // 立即激活新版本的Service Worker
  self.skipWaiting();
});

// 激活Service Worker
self.addEventListener("activate", (event) => {
  console.log(`[SW] 激活新版本: ${CACHE_VERSION}`);
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE];
  const tasks = [
    // 清理旧缓存
    caches.keys().then((cacheNames) => {
      console.log("[SW] 检查缓存，当前版本:", CACHE_VERSION);
      console.log("[SW] 现有缓存:", cacheNames);
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log("[SW] 删除旧缓存:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
    // 立即接管页面，不等待刷新
    clients.claim(),
  ];

  // 开启导航预加载：导航请求与 SW 启动并行发出，省掉 SW 冷启动等待
  if (self.registration.navigationPreload) {
    tasks.push(
      self.registration.navigationPreload.enable().catch((err) => {
        console.log("[SW] 导航预加载开启失败:", err);
      }),
    );
  }

  event.waitUntil(Promise.all(tasks));
});

// 语言包 / 图片 / 图标 / 字体等不常变的静态资源：命中后缀即走 SWR
const STATIC_RESOURCE_PATTERN =
  /\.(?:webp|png|jpe?g|gif|svg|ico|woff2?|ttf|otf|json|txt|css|map)$/i;

function isStaticResourceRequest(url) {
  if (url.pathname.startsWith("/api/")) return false;
  return (
    url.pathname.startsWith("/locales/") ||
    STATIC_RESOURCE_PATTERN.test(url.pathname)
  );
}

function offlineJsonResponse() {
  return new Response(
    JSON.stringify({
      offline: true,
      message: "您当前处于离线模式，此操作需要网络连接",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
}

function offlineHtmlResponse() {
  return new Response("网络错误，您当前处于离线模式", {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "text/html" },
  });
}

function plainErrorResponse() {
  return new Response("网络错误，无法加载资源", {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "text/plain" },
  });
}

// 处理fetch请求
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 只接管 GET；非 GET（POST/PUT…）直接交给网络栈，避免破坏写操作
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === location.origin;

  // 写入运行时缓存：waitUntil 保证 SW 被回收前写入完成
  const cacheResponse = (target, response) => {
    if (!response || response.status !== 200 || response.type === "opaque") {
      return;
    }
    const responseToCache = response.clone();
    event.waitUntil(
      caches
        .open(RUNTIME_CACHE)
        .then((cache) => cache.put(target, responseToCache))
        .catch((err) => console.log(`[SW] 缓存请求失败: ${target.url}`, err)),
    );
  };

  // 1) 导航请求：网络优先（配合导航预加载）+ 缓存兜底 + 离线页
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloaded = await event.preloadResponse;
          if (preloaded && preloaded.status === 200) {
            cacheResponse(request, preloaded);
            return preloaded;
          }

          const response = await fetch(request, { cache: "no-cache" });
          if (response && response.status === 200) {
            cacheResponse(request, response);
            return response;
          }

          console.log(`[SW] 导航响应异常，尝试使用缓存: ${request.url}`);
          const cached = await caches.match(request);
          return cached || response;
        } catch (error) {
          console.log("[SW] 导航请求失败，尝试使用缓存:", request.url, error);
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline.html");
          return offline || offlineHtmlResponse();
        }
      })(),
    );
    return;
  }

  // 2) 构建产物（文件名自带哈希，永不变更）：Cache-First 秒开
  if (isSameOrigin && url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((response) => {
          cacheResponse(request, response);
          return response;
        });
      }),
    );
    return;
  }

  // 3) 静态资源（语言包/图片/图标/字体）：Stale-While-Revalidate
  //    缓存即时返回，后台静默刷新，部署更新最多滞后一次访问
  if (isSameOrigin && isStaticResourceRequest(url)) {
    const refresh = caches.open(RUNTIME_CACHE).then(async (cache) => {
      try {
        const response = await fetch(request);
        if (response && response.status === 200) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return undefined;
      }
    });
    event.waitUntil(refresh);

    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await refresh;
        if (response) return response;
        return plainErrorResponse();
      })(),
    );
    return;
  }

  // 4) 同源其他请求：网络优先（强制校验）+ 缓存兜底
  if (isSameOrigin) {
    event.respondWith(
      fetch(request, { cache: "no-cache" })
        .then((response) => {
          if (!response || response.status !== 200) {
            console.log(`[SW] 网络请求失败，尝试使用缓存: ${request.url}`);
            return caches
              .match(request)
              .then((cachedResponse) => cachedResponse || response);
          }

          cacheResponse(request, response);
          return response;
        })
        .catch((error) => {
          console.log("[SW] 网络请求失败，尝试使用缓存:", request.url, error);
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (url.pathname.includes("/api/")) return offlineJsonResponse();
            return caches
              .match("/offline.html")
              .then((offlineResponse) => offlineResponse || offlineHtmlResponse());
          });
        }),
    );
    return;
  }

  // 5) 跨域请求（如 CDN/字体）：网络优先 + 缓存兜底
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) {
          console.log(`[SW] 跨域请求失败，尝试使用缓存: ${request.url}`);
          return caches.match(request).then((cached) => cached || response);
        }

        cacheResponse(request, response);
        return response;
      })
      .catch((error) => {
        console.log("[SW] 跨域请求失败，尝试使用缓存:", request.url, error);
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (url.pathname.includes("/api/")) return offlineJsonResponse();
          return plainErrorResponse();
        });
      }),
  );
});

// 处理消息 - 接收倒计时信息并设置通知
self.addEventListener("message", (event) => {
  const data = event.data;

  if (data.action === "scheduleNotification") {
    const { title, timestamp, body, id } = data;

    console.log("[SW] 收到通知调度请求:", { title, timestamp, id });

    // 计算倒计时剩余时间
    const timeUntilNotification = timestamp - Date.now();

    console.log("[SW] 距离通知时间还有:", timeUntilNotification, "ms");

    if (timeUntilNotification <= 0) {
      // 如果时间已过，立即发送通知
      console.log("[SW] 立即发送通知:", title);
      showNotification(title, body, id);
    } else {
      // 设置定时器，到时间时发送通知
      console.log(
        "[SW] 设置定时器，将在",
        timeUntilNotification,
        "ms后发送通知",
      );

      // 为了提高可靠性，我们同时使用多种方式来确保通知能够发送
      const timerId = setTimeout(() => {
        console.log("[SW] 定时器触发，发送通知:", title);
        showNotification(title, body, id);
      }, timeUntilNotification);

      // 存储定时器ID，以便后续可能的取消操作
      if (!self.activeTimers) {
        self.activeTimers = new Map();
      }
      self.activeTimers.set(id, timerId);
    }
  } else if (data.action === "cancelNotification") {
    // 处理取消通知请求
    const { id } = data;
    console.log("[SW] 收到取消通知请求:", id);

    if (self.activeTimers && self.activeTimers.has(id)) {
      const timerId = self.activeTimers.get(id);
      clearTimeout(timerId);
      self.activeTimers.delete(id);
      console.log("[SW] 已取消通知定时器:", id);
    }

    // 同时取消已显示的通知
    self.registration.getNotifications({ tag: id }).then((notifications) => {
      notifications.forEach((notification) => {
        notification.close();
        console.log("[SW] 已关闭通知:", id);
      });
    });
  } else if (data.action === "updateCache") {
    // 处理缓存更新请求 - 清除所有运行时缓存
    console.log("[SW] 收到更新缓存请求，清除运行时缓存");
    event.waitUntil(
      caches
        .delete(RUNTIME_CACHE)
        .then(() => {
          console.log("[SW] 运行时缓存已清除");
          // 通知客户端缓存已更新
          return self.clients.matchAll();
        })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              action: "cacheUpdated",
              timestamp: Date.now(),
              hasUpdates: true,
            });
          });
          console.log("[SW] 缓存更新完成");
        })
        .catch((err) => {
          console.error("[SW] 清除缓存失败:", err);
        }),
    );
  }
});

// 显示通知的函数
function showNotification(title, body, id) {
  console.log("显示通知:", { title, body, id });

  try {
    self.registration.showNotification(title, {
      body: body || "倒计时已结束！",
      icon: "/android-chrome-192x192.png",
      badge: "/favicon.ico",
      tag: id,
      vibrate: [200, 100, 200],
      requireInteraction: true,
      data: {
        countdownId: id,
      },
      // 添加额外的选项以提高兼容性
      silent: false,
      renotify: true,
      timestamp: Date.now(),
    });
    console.log("通知显示成功:", title);
  } catch (error) {
    console.error("显示通知失败:", error);
  }
}

// 处理通知点击事件
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // 点击通知时打开应用并导航到相应倒计时
  const countdownId = event.notification.data.countdownId;
  const urlToOpen = new URL("/", self.location.origin);

  if (countdownId) {
    urlToOpen.searchParams.set("id", countdownId);
  }

  // 打开应用或将应用置于前台
  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // 检查应用是否已经打开
        for (let client of windowClients) {
          if (client.url === urlToOpen.href && "focus" in client) {
            return client.focus();
          }
        }
        // 如果应用没有打开，则打开新窗口
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen.href);
        }
      }),
  );
});
