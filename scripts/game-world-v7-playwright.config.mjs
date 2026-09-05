export default {
  testDir:".",
  testMatch:"game-world-v7-browser-device.spec.mjs",
  timeout:60000,
  fullyParallel:false,
  workers:1,
  reporter:"line",
  use:{
    baseURL:"http://127.0.0.1:3000",
    headless:true,
    viewport:{width:390,height:844},
    hasTouch:true,
    isMobile:true,
    launchOptions:{args:["--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--disable-dev-shm-usage"]}
  }
};
