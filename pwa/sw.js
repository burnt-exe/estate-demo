const CACHE = "bc-demo-cache-v1";
const ASSETS = [
  "../app.html",
  "../index.html",
  "../pricing.html",
  "../demo.html",
  "../assets/styles.css",
  "../assets/app.js",
  "../assets/demo-data.js",
  "../assets/marketing.js"
];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener("fetch", (e)=>{
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request).catch(()=>res))
  );
});
