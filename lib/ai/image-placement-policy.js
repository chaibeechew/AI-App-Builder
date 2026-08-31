const TARGETS=Object.freeze({
  wallpaper:{usage:"builder wallpaper / full-page background",aspectRatio:"16:9",width:1920,height:1080,mobileCrop:"9:16 center-safe",safeArea:"Keep important subjects inside the middle 55% so desktop and phone crops both work."},
  background:{usage:"section or page background",aspectRatio:"16:9",width:1920,height:1080,mobileCrop:"9:16 center-safe",safeArea:"Avoid critical text or faces near the outer 20% edges."},
  hero:{usage:"App + Website hero",aspectRatio:"16:9",width:1600,height:900,mobileCrop:"4:5 / 9:16 adaptive",safeArea:"Keep the main subject away from headline/CTA space and preserve a clean text-safe region."},
  product:{usage:"product / listing card",aspectRatio:"4:3",width:1200,height:900,mobileCrop:"1:1 fallback",safeArea:"Keep the product fully visible with consistent breathing room around the object."},
  icon:{usage:"app icon",aspectRatio:"1:1",width:1024,height:1024,mobileCrop:"1:1",safeArea:"Keep the mark centered and readable at small sizes; avoid tiny text."},
  image:{usage:"content illustration / gallery",aspectRatio:"4:3",width:1200,height:900,mobileCrop:"4:5 adaptive",safeArea:"Keep the primary subject centered enough for responsive crops."}
});

export function getImagePlacementPolicy(mode="image"){
  const key=Object.prototype.hasOwnProperty.call(TARGETS,mode)?mode:"image";
  return {mode:key,...TARGETS[key]};
}

export function buildImagePlacementPrompt(prompt,mode="image"){
  const target=getImagePlacementPolicy(mode);
  return `${String(prompt||"").trim()}\n\nTARGET USAGE: ${target.usage}. Preferred canvas ${target.width}x${target.height} (${target.aspectRatio}). Responsive crop guidance: ${target.mobileCrop}. Composition rule: ${target.safeArea} Do not add text unless the customer explicitly requests it.`.trim();
}
