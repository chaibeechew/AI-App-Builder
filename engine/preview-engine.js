function slugify(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createPage(page, index) {
  return {
    id: `${slugify(page.name)}-${index + 1}`,
    name: page.name,
    purpose: page.purpose || "",
    components: [
      {
        type: "header",
        title: page.name,
      },
      {
        type: "content",
        description: page.purpose || "",
      },
    ],
  };
}

function createFeature(feature, index) {
  return {
    id: `${slugify(feature.name)}-${index + 1}`,
    name: feature.name,
    description: feature.description || "",
    enabled: true,
  };
}

function createDataModel(data, index) {
  return {
    id: `${slugify(data.name)}-${index + 1}`,
    name: data.name,
    fields: Array.isArray(data.fields) ? data.fields : [],
  };
}

function createAction(action, index) {
  return {
    id: `${slugify(action.name)}-${index + 1}`,
    name: action.name,
    description: action.description || "",
  };
}

export async function createPreview({ idea, specification }) {
  if (!specification) {
    throw new Error("Missing app specification");
  }

  const pages = Array.isArray(specification.pages)
    ? specification.pages.map(createPage)
    : [];

  const features = Array.isArray(specification.features)
    ? specification.features.map(createFeature)
    : [];

  const data = Array.isArray(specification.data)
    ? specification.data.map(createDataModel)
    : [];

  const actions = Array.isArray(specification.actions)
    ? specification.actions.map(createAction)
    : [];

  const appName =
    specification.name ||
    idea ||
    "AI Generated App";

  return {
    id: `app-${Date.now()}`,
    name: appName,
    description: specification.description || "",
    idea,

    status: "preview",

    pages,

    features,

    data,

    actions,

    navigation: pages.map((page) => ({
      id: page.id,
      label: page.name,
    })),

    createdAt: new Date().toISOString(),

    metadata: {
      generatedBy: "Autonomous AI Engine",
      version: "1.0",
    },
  };
}
